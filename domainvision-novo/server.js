const { createServer } = require('node:http');
const { createReadStream, existsSync, readFileSync } = require('node:fs');
const { access } = require('node:fs/promises');
const path = require('node:path');
const availability = require('./api/availability');
const appointments = require('./api/appointments');

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const localEnvFile = path.join(root, '.env.local');
if (existsSync(localEnvFile)) {
  for (const line of readFileSync(localEnvFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jfif': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/api/availability') return availability(req, res);
  if (pathname === '/api/appointments') return appointments(req, res);

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    res.writeHead(400).end('Bad Request');
    return;
  }

  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
  const filePath = path.resolve(root, relativePath);
  if (!filePath.startsWith(`${root}${path.sep}`) || relativePath.split(/[\\/]/).some((part) => part.startsWith('.'))) {
    res.writeHead(404).end('Not Found');
    return;
  }

  try {
    await access(filePath);
    res.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache',
    });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404).end('Not Found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Domain Vision disponível em http://localhost:${port}`);
});
