const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.argv.includes('--dev');
const hostname = '0.0.0.0';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });
  
  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
  
  // Limit concurrent connections
  server.maxConnections = 10;
  
  // Handle timeouts
  server.timeout = 30000;
  server.keepAliveTimeout = 5000;
  server.headersTimeout = 6000;
});
