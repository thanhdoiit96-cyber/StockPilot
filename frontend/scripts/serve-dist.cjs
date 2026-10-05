'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', 'dist');
const port = Number(process.argv[process.argv.indexOf('--port') + 1] || 4173);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/')) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const headers = {};
      for (const name of ['authorization', 'cookie', 'content-type', 'accept', 'x-auth-mode', 'x-csrf-token']) {
        if (req.headers[name]) headers[name] = req.headers[name];
      }
      const method = req.method || 'GET';
      const upstream = await fetch(`http://127.0.0.1:5000${req.url}`, {
        method,
        headers,
        body: method === 'GET' || method === 'HEAD' ? undefined : body,
        duplex: method === 'GET' || method === 'HEAD' ? undefined : 'half'
      });
      const responseHeaders = {
        'content-type': upstream.headers.get('content-type') || 'application/json'
      };
      const setCookies = typeof upstream.headers.getSetCookie === 'function' ? upstream.headers.getSetCookie() : [];
      if (setCookies.length) responseHeaders['set-cookie'] = setCookies;
      res.writeHead(upstream.status, responseHeaders);
      res.end(Buffer.from(await upstream.arrayBuffer()));
      return;
    }
    const requested = path.resolve(root, decodeURIComponent(req.url.split('?')[0].replace(/^\/+/, '')));
    const file = fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : path.join(root, 'index.html');
    res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  } catch (error) { res.writeHead(502); res.end(error.message); }
}).listen(port, '127.0.0.1', () => console.log(`UI http://127.0.0.1:${port}/`));
