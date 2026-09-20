// Runs the Expo web dev server behind a small proxy that makes the page cross-origin isolated.
// expo-sqlite on web needs SharedArrayBuffer, which browsers only expose on isolated pages, and
// Metro cannot set these headers on the HTML it serves itself.
//
//   npm run web   ->  open http://localhost:8091  (Metro itself listens on 8090)
const http = require('http');
const net = require('net');
const { spawn } = require('child_process');

const METRO_PORT = Number(process.env.METRO_PORT ?? 8090);
const PROXY_PORT = Number(process.env.PORT ?? 8091);

const metro = spawn('npx', ['expo', 'start', '--web', '--port', String(METRO_PORT)], {
  stdio: 'inherit',
  shell: true,
});
metro.on('exit', (code) => process.exit(code ?? 0));

const proxy = http.createServer((req, res) => {
  const upstream = http.request(
    { host: 'localhost', port: METRO_PORT, path: req.url, method: req.method, headers: req.headers },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode, {
        ...upstreamRes.headers,
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless',
      });
      upstreamRes.pipe(res);
    },
  );
  upstream.on('error', () => {
    res.statusCode = 502;
    res.end();
  });
  req.pipe(upstream);
});

// Forward WebSocket upgrades (fast refresh, dev tools) untouched.
proxy.on('upgrade', (req, socket, head) => {
  const upstream = net.connect(METRO_PORT, 'localhost', () => {
    const headers = Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`);
    upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n${headers.join('\r\n')}\r\n\r\n`);
    upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});

proxy.listen(PROXY_PORT, () => {
  console.log(`\nNoMie web (cross-origin isolated): http://localhost:${PROXY_PORT}\n`);
});
