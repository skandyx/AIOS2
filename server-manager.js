const { spawn } = require('child_process');
const path = require('path');

// Auto-detect project directory
const PROJECT_DIR = path.resolve(__dirname);

function startServer() {
  console.log(`[${new Date().toISOString()}] Starting Next.js dev server...`);
  
  const child = spawn('node', [path.join(PROJECT_DIR, 'node_modules/.bin/next'), 'dev', '-p', '3000'], {
    cwd: PROJECT_DIR,
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=1536' },
    stdio: 'inherit'
  });
  
  child.on('exit', (code, signal) => {
    console.log(`[${new Date().toISOString()}] Server exited with code ${code}, signal ${signal}`);
    console.log(`[${new Date().toISOString()}] Restarting in 2s...`);
    setTimeout(startServer, 2000);
  });
  
  child.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Server error:`, err);
    setTimeout(startServer, 2000);
  });
}

startServer();
