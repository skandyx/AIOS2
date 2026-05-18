const { spawn } = require('child_process');
const fs = require('fs');
const LOG_PATH = '/home/z/my-project/server.log';

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
  
  childProcess = spawn('bun', ['run', 'dev'], {
    cwd: '/home/z/my-project',
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  
  let lastData = '';
  
  childProcess.stdout.on('data', (data) => {
    const str = data.toString();
    try { fs.appendFileSync(LOG_PATH, str); } catch(e) {}
    lastData = str;
  });
  
  childProcess.stderr.on('data', (data) => {
    const str = data.toString();
    try { fs.appendFileSync(LOG_PATH, str); } catch(e) {}
  });
  
  childProcess.on('exit', (code, signal) => {
    log(`Server exited (code=${code}, signal=${signal})`);
    childProcess = null;
    if (restartCount < 200) {
      const delay = Math.min(2000 + restartCount * 500, 10000);
      log(`Restarting in ${delay/1000}s... (attempt ${restartCount})`);
      setTimeout(startServer, delay);
    }
  });
  
  childProcess.on('error', (err) => {
    log(`Server spawn error: ${err.message}`);
    childProcess = null;
    if (restartCount < 200) {
      setTimeout(startServer, 3000);
    }
  });
}

// Clear old log
try { fs.writeFileSync(LOG_PATH, ''); } catch(e) {}

startServer();

// Health check - restart if port not listening for 30s
let lastSeenAlive = Date.now();
setInterval(() => {
  const { execSync } = require('child_process');
  try {
    const result = execSync('ss -tlnp 2>/dev/null | grep ":3000 " || true').toString().trim();
    if (result) {
      lastSeenAlive = Date.now();
    } else if (Date.now() - lastSeenAlive > 30000) {
      log('Health check: Port 3000 not listening for 30s, killing server...');
      if (childProcess) {
        try { childProcess.kill('SIGKILL'); } catch(e) {}
        childProcess = null;
      }
      lastSeenAlive = Date.now(); // Reset to avoid rapid kills
    }
  } catch (e) {}
}, 5000);

// Graceful shutdown
process.on('SIGTERM', () => { log('PM SIGTERM'); if (childProcess) childProcess.kill(); process.exit(0); });
process.on('SIGINT', () => { log('PM SIGINT'); if (childProcess) childProcess.kill(); process.exit(0); });

log('Process manager started');
