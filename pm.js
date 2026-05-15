const { spawn, execSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const LOG_PATH = '/home/z/my-project/dev.log';

let childProcess = null;
let restartCount = 0;

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  fs.appendFileSync(LOG_PATH, line);
}

function startServer() {
  log('Starting Next.js dev server...');
  
  childProcess = spawn('bun', ['run', 'dev'], {
    cwd: '/home/z/my-project',
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  });
  
  childProcess.stdout.on('data', (data) => {
    fs.appendFileSync(LOG_PATH, data.toString());
  });
  
  childProcess.stderr.on('data', (data) => {
    fs.appendFileSync(LOG_PATH, data.toString());
  });
  
  childProcess.on('exit', (code, signal) => {
    log(`Server exited (code=${code}, signal=${signal})`);
    childProcess = null;
    restartCount++;
    if (restartCount < 100) {
      log(`Restarting in 2s... (restart #${restartCount})`);
      setTimeout(startServer, 2000);
    } else {
      log('Max restarts reached. Giving up.');
    }
  });
  
  childProcess.on('error', (err) => {
    log(`Server error: ${err.message}`);
    childProcess = null;
    restartCount++;
    if (restartCount < 100) {
      log(`Restarting in 2s... (restart #${restartCount})`);
      setTimeout(startServer, 2000);
    }
  });
}

function healthCheck() {
  // Check if port 3000 is listening
  try {
    const result = execSync('ss -tlnp 2>/dev/null | grep ":3000 " || true').toString().trim();
    if (!result) {
      log('Health check: Port 3000 not listening!');
      if (childProcess) {
        log('Killing dead server process...');
        try { childProcess.kill('SIGKILL'); } catch(e) {}
        childProcess = null;
      }
    }
  } catch (e) {
    // Ignore
  }
}

// Clear log and start
fs.writeFileSync(LOG_PATH, '');
startServer();

// Health check every 10 seconds
setInterval(healthCheck, 10000);

// Keep process alive
process.on('SIGTERM', () => { log('PM received SIGTERM'); if (childProcess) childProcess.kill(); process.exit(0); });
process.on('SIGINT', () => { log('PM received SIGINT'); if (childProcess) childProcess.kill(); process.exit(0); });

log('Process manager started');
