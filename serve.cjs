const { createServer } = require('http');
const { readFile, stat } = require('fs');
const { join, extname } = require('path');

const root = join(__dirname, 'dist');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};

const server = createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/') url = '/index.html';
  const p = join(root, url);
  readFile(p, (err, data) => {
    if (err) {
      readFile(join(root, 'index.html'), (e, d) => {
        if (e) { res.writeHead(404); res.end('Not found'); }
        else { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(d); }
      });
    } else {
      res.writeHead(200, { 'Content-Type': types[extname(p)] || 'application/octet-stream' });
      res.end(data);
    }
  });
});

server.listen(4321, () => {
  console.log('Server running at http://localhost:4321/');
});