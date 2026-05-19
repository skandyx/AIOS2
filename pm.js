const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Auto-detect project directory (where pm.js lives)
const PROJECT_DIR = path.resolve(__dirname);
const LOG_PATH = path.join(PROJECT_DIR, 'server.log');

let childProcess = null;
let restartCount = 0;

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}\n`;
  try { fs.appendFileSync(LOG_PATH, line); } catch(e) {}
}

function startServer() {
  restartCount++;
  log(`Starting Next.js dev server (attempt #${restartCount})...`);

  // Use node directly instead of bun — more stable for long-running processes
  childProcess = spawn('node', [path.join(PROJECT_DIR, 'node_modules/.bin/next'), 'dev', '-p', '3000'], {
    cwd: PROJECT_DIR,
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=1536',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  childProcess.stdout.on('data', (data) => {
    const str = data.toString();
    try { fs.appendFileSync(LOG_PATH, str); } catch(e) {}
  });

  childProcess.stderr.on('data', (data) => {
    const str = data.toString();
    try { fs.appendFileSync(LOG_PATH, str); } catch(e) {}
  });

  childProcess.on('exit', (code, signal) => {
    log(`Server exited (code=${code}, signal=${signal})`);
    childProcess = null;
    if (restartCount < 500) {
      const delay = Math.min(3000 + restartCount * 200, 15000);
      log(`Restarting in ${delay/1000}s... (attempt ${restartCount})`);
      setTimeout(startServer, delay);
    }
  });

  childProcess.on('error', (err) => {
    log(`Server spawn error: ${err.message}`);
    childProcess = null;
    if (restartCount < 500) {
      setTimeout(startServer, 3000);
    }
  });
}

startServer();

// Health check — restart if port not listening for 60s
let lastSeenAlive = Date.now();
setInterval(() => {
  const { execSync } = require('child_process');
  try {
    const result = execSync('ss -tlnp 2>/dev/null | grep ":3000 " || true').toString().trim();
    if (result) {
      lastSeenAlive = Date.now();
    } else if (Date.now() - lastSeenAlive > 60000) {
      log('Health check: Port 3000 not listening for 60s, killing server...');
      if (childProcess) {
        try { childProcess.kill('SIGKILL'); } catch(e) {}
        childProcess = null;
      }
      lastSeenAlive = Date.now();
    }
  } catch (e) {}
}, 10000);

// Graceful shutdown
process.on('SIGTERM', () => { log('PM SIGTERM'); if (childProcess) childProcess.kill(); process.exit(0); });
process.on('SIGINT', () => { log('PM SIGINT'); if (childProcess) childProcess.kill(); process.exit(0); });

log(`Process manager started (project dir: ${PROJECT_DIR})`);
