const { spawn } = require('child_process');
const fs = require('fs');

const LOG_PATH = '/home/z/my-project/dev.log';

// Clear log
fs.writeFileSync(LOG_PATH, '');

function startServer() {
  const child = spawn('node', ['node_modules/.bin/next', 'dev', '-p', '3000'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=1536' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  
  child.unref();
  
  child.stdout.on('data', (data) => {
    try { fs.appendFileSync(LOG_PATH, data.toString()); } catch(e) {}
  });
  
  child.stderr.on('data', (data) => {
    try { fs.appendFileSync(LOG_PATH, data.toString()); } catch(e) {}
  });
  
  child.on('exit', (code, signal) => {
    const msg = `[${new Date().toISOString()}] Server exited (code=${code}, signal=${signal}), restarting in 3s...\n`;
    try { fs.appendFileSync(LOG_PATH, msg); } catch(e) {}
    setTimeout(startServer, 3000);
  });
  
  // Write PID file
  fs.writeFileSync('/home/z/my-project/next-server.pid', child.pid.toString());
  
  console.log(`Server started with PID ${child.pid}`);
}

startServer();

// Keep the process alive
setInterval(() => {
  // Just keep the event loop alive
}, 60000);
