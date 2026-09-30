import http from 'node:http';
import {readFile} from 'node:fs/promises';
const assets = ['styles.css', 'hub.css', 'app.js', 'core.js', 'booking.js', 'booking-core.js', 'booking-pdf.js', 'favicon.ico', 'fonts/InterVariable.woff2'];
const files = Object.fromEntries(assets.map(file => [`/${file}`, file]));
Object.assign(files, {'/':'index.html', '/index.html':'index.html', '/invoice/':'invoice/index.html', '/invoice/index.html':'invoice/index.html', '/booking-confirmation/':'booking-confirmation/index.html', '/booking-confirmation/index.html':'booking-confirmation/index.html'});
const prefix = '/syho-event-manager';
const server = http.createServer(async (req, res) => {
  let pathname = new URL(req.url, 'http://localhost').pathname;
  const projectPath = pathname === prefix || pathname.startsWith(`${prefix}/`);
  if (pathname === prefix) { res.writeHead(301, {Location:`${prefix}/`}); res.end(); return; }
  if (projectPath) pathname = pathname.slice(prefix.length);
  if (pathname === '/invoice' || pathname === '/booking-confirmation') {
    res.writeHead(301, {Location:`${projectPath ? prefix : ''}${pathname}/`}); res.end(); return;
  }
  const file = files[pathname];
  if (!file) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const content = await readFile(new URL(file, import.meta.url));
    const extension = file.split('.').pop();
    res.setHeader('Content-Type', {html:'text/html; charset=utf-8', css:'text/css', js:'text/javascript', ico:'image/x-icon', woff2:'font/woff2'}[extension]);
    res.end(content);
  } catch { res.writeHead(500); res.end('Unable to read file'); }
});
server.listen(Number(process.env.PORT || 4174), '127.0.0.1', () => console.log(`SYHO Event Manager: http://localhost:${server.address().port}`));
