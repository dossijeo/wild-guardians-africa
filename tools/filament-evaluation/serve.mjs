import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
const root = resolve('.');
const types = {'.html':'text/html', '.js':'text/javascript', '.wasm':'application/wasm', '.json':'application/json', '.glb':'model/gltf-binary'};
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, (pathname.startsWith('/assets/') || pathname.startsWith('/content/') ? './public' : '.') + pathname);
    if (!file.startsWith(root + sep)) {res.writeHead(403).end(); return;}
    const bytes = await readFile(file);
    res.writeHead(200, {'Content-Type': types[extname(file)] ?? 'application/octet-stream',
      'Cross-Origin-Opener-Policy':'same-origin', 'Cross-Origin-Embedder-Policy':'require-corp', 'Cache-Control':'no-store'}).end(bytes);
  } catch {res.writeHead(404).end('Not found');}
}).listen(5296, '127.0.0.1', () => console.log('Filament gate: http://127.0.0.1:5296/tools/filament-evaluation/index.html'));
