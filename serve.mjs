import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.cwd());
const host = process.env.HOST || '127.0.0.1';
const port = Number.parseInt(process.env.PORT || '8080', 10);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
};

function getFilePath(requestUrl) {
  const pathname = decodeURIComponent(
    new URL(requestUrl, 'http://localhost').pathname,
  );
  const relativePath = normalize(pathname).replace(/^[/\\]+/, '');
  const filePath = resolve(join(root, relativePath || 'index.html'));
  return filePath === root || filePath.startsWith(`${root}/`) ? filePath : null;
}

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed');
    return;
  }

  let filePath;
  try {
    filePath = getFilePath(request.url);
    if (!filePath) throw new Error('Invalid path');
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) filePath = join(filePath, 'index.html');
    const finalStat = fileStat.isDirectory() ? await stat(filePath) : fileStat;
    response.writeHead(200, {
      'Cache-Control': 'no-cache',
      'Content-Length': finalStat.size,
      'Content-Type':
        mimeTypes[extname(filePath).toLowerCase()] ||
        'application/octet-stream',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Content-Type-Options': 'nosniff',
    });
    if (request.method === 'HEAD') response.end();
    else createReadStream(filePath).pipe(response);
  } catch {
    response
      .writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      .end('Not found');
  }
});

server.on('error', (error) => {
  console.error(
    `Unable to start the local server on ${host}:${port}: ${error.message}`,
  );
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`QR Code Generator available at http://${host}:${port}/`);
});
