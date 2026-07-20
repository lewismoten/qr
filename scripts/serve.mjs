import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';

import {
  createContentEncoder,
  selectContentEncoding,
  shouldCompress,
} from './server/compression.mjs';
import {
  createEntityTag,
  matchesEntityTag,
  parseByteRange,
} from './server/range.mjs';

const projectRoot = resolve(process.cwd());
const htmlRoot = resolve(projectRoot, 'src/html');
const generatedRoot = resolve(projectRoot, 'build/site');
const host = process.env.HOST || '127.0.0.1';
const port = Number.parseInt(process.env.PORT || '8080', 10);
const mounts = new Map([
  ['dist', [resolve(projectRoot, 'dist')]],
  ['locales', [resolve(projectRoot, 'build/locales')]],
  [
    'maps',
    [
      resolve(projectRoot, 'build/maps'),
      resolve(projectRoot, 'src/assets/maps'),
    ],
  ],
]);
const publicFiles = new Map([
  ['favicon.ico', resolve(projectRoot, 'src/assets/favicon.ico')],
  ['robots.txt', resolve(projectRoot, 'src/web/robots.txt')],
]);
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
  '.pmtiles': 'application/vnd.pmtiles',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
};

function safePath(root, relativePath) {
  const filePath = resolve(join(root, relativePath));
  return filePath === root || filePath.startsWith(`${root}/`) ? filePath : null;
}

function candidates(requestUrl) {
  const pathname = decodeURIComponent(
    new URL(requestUrl, 'http://localhost').pathname,
  );
  const relative = normalize(pathname).replace(/^[/\\]+/, '');
  const requested = relative || 'index.html';
  const [prefix, ...rest] = requested.split('/');
  if (mounts.has(prefix)) {
    return mounts
      .get(prefix)
      .map((root) => safePath(root, rest.join('/')))
      .filter(Boolean);
  }
  if (publicFiles.has(requested)) return [publicFiles.get(requested)];
  return [
    safePath(generatedRoot, requested),
    safePath(htmlRoot, requested),
  ].filter(Boolean);
}

async function findFile(requestUrl) {
  for (let filePath of candidates(requestUrl)) {
    try {
      const current = await stat(filePath);
      if (current.isDirectory()) filePath = join(filePath, 'index.html');
      return { filePath, fileStat: await stat(filePath) };
    } catch {
      // Localized deployment paths fall back to generated HTML.
    }
  }
  return null;
}

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed');
    return;
  }
  const match = await findFile(request.url);
  if (!match) {
    response
      .writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      .end('Not found');
    return;
  }
  const { filePath, fileStat } = match;
  const entityTag = createEntityTag(fileStat);
  if (!matchesEntityTag(request.headers['if-match'], entityTag)) {
    response.writeHead(412, { ETag: entityTag }).end();
    return;
  }
  const contentType =
    mimeTypes[extname(filePath).toLowerCase()] || 'application/octet-stream';
  const byteRange = parseByteRange(request.headers.range, fileStat.size);
  if (byteRange?.unsatisfiable) {
    response
      .writeHead(416, {
        'Content-Range': `bytes */${fileStat.size}`,
      })
      .end();
    return;
  }
  const encoding =
    !byteRange && shouldCompress(contentType, fileStat.size)
      ? selectContentEncoding(request.headers['accept-encoding'])
      : null;
  const headers = {
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache',
    'Content-Type': contentType,
    ETag: entityTag,
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    Vary: 'Accept-Encoding',
    'X-Content-Type-Options': 'nosniff',
  };
  if (byteRange) {
    headers['Content-Length'] = byteRange.length;
    headers['Content-Range'] =
      `bytes ${byteRange.start}-${byteRange.end}/${fileStat.size}`;
  }
  if (encoding) headers['Content-Encoding'] = encoding;
  else if (!byteRange) headers['Content-Length'] = fileStat.size;
  response.writeHead(byteRange ? 206 : 200, headers);
  if (request.method === 'HEAD') response.end();
  else {
    const encoder = createContentEncoder(encoding);
    const source = createReadStream(
      filePath,
      byteRange ? { start: byteRange.start, end: byteRange.end } : {},
    );
    const streams = encoder ? [source, encoder, response] : [source, response];
    pipeline(...streams).catch((error) => response.destroy(error));
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
