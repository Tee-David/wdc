import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const files = new Map([
  ['/', [path.join(here, 'index.html'), 'text/html']],
  ['/preview.css', [path.join(here, 'preview.css'), 'text/css']],
  ['/preview.js', [path.join(here, 'preview.js'), 'text/javascript']],
  ['/components.js', [path.join(here, 'components.js'), 'text/javascript']],
  ['/fidelity.css', [path.join(here, 'fidelity.css'), 'text/css']],
  ['/admin.css', [path.join(root, 'frontend/components/admin/admin.css'), 'text/css']],
  ['/heading.woff2', [path.join(root, 'frontend/assets/fonts/SpaceGrotesk-Bold.woff2'), 'font/woff2']],
  ['/body.woff2', [path.join(root, 'frontend/assets/fonts/SpaceGrotesk-Medium.woff2'), 'font/woff2']],
]);
http.createServer((req, res) => {
  const file = files.get(new URL(req.url, 'http://localhost').pathname);
  if (!file || !fs.existsSync(file[0])) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'none'; frame-ancestors 'none'" });
  fs.createReadStream(file[0]).pipe(res);
}).listen(3147, '127.0.0.1', () => console.log('Design preview: http://127.0.0.1:3147'));
