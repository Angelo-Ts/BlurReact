import http from 'node:http';
import { build } from 'esbuild';
const result = await build({ entryPoints: ['tests/fixture.jsx'], bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"development"' } });
const js = result.outputFiles[0].contents;
const html = `<!doctype html><html><head><meta charset="UTF-8"><title>React persistence test</title><style>body{font:16px system-ui;margin:40px;background:#eef2f9;color:#172033}button{padding:8px;margin:4px}article{padding:24px;background:white;border:1px solid #bbb;border-radius:12px;margin:20px 0;width:500px}.secret{font-size:22px}iframe{width:600px;height:180px}#fixed{position:fixed;right:20px;top:20px;background:#f99;padding:15px}.spacer{height:900px}canvas,img,svg,video{width:180px;height:80px}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>`;
function serve(req, res) {
  if (req.url === '/fixture.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(js); }
  else if (req.url === '/frame') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><html><body><p id="frame-secret">Frame secret</p></body></html>'); }
  else { res.setHeader('Content-Type', 'text/html'); res.end(html); }
}
http.createServer(serve).listen(4173, '127.0.0.1');
http.createServer(serve).listen(4174, '127.0.0.1');
