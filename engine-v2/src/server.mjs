import { createServer } from 'node:http';
import { route } from '../dist/application/api.js';
import { pathToFileURL } from 'node:url';
export function makeServer() {
  return createServer((req,res) => {
    let result;
    try {
      const path = new URL(req.url ?? '/', 'http://localhost').pathname;
      result = route(req.method ?? '',path);
    } catch {
      result = {status:400,body:{error:'bad_request'}};
    }
    res.writeHead(result.status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...result.headers});
    res.end(JSON.stringify(result.body));
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? '3000');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  makeServer().listen(port,'127.0.0.1',()=>console.log('DBOidle development API: http://127.0.0.1:'+port));
}
