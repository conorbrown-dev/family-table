import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.ttf':'font/ttf','.woff':'font/woff','.woff2':'font/woff2'};
export function createApp(root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist')){
 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);res.end();return;}
  if(pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(req.method==='HEAD'?'':JSON.stringify({status:'ready'}));return;}
  if(pathname.includes('\0')||pathname.split('/').some(p=>p==='..'||p.startsWith('.'))){res.writeHead(404);res.end();return;}
  let file=path.join(root,pathname==='/'?'index.html':pathname);
  try{if(!(await stat(file)).isFile())throw new Error();}catch{
   // Only app routes fall back to the SPA; missing assets must return 404.
   if(path.extname(pathname)||pathname.startsWith('/assets/')||pathname.startsWith('/_expo/')){res.writeHead(404);res.end();return;}
   file=path.join(root,'index.html');
  }
  try{const info=await stat(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Content-Length':info.size,'Cache-Control':path.extname(file)==='.html'?'no-cache':pathname.startsWith('/_expo/static/')?'public, max-age=31536000, immutable':'public, max-age=3600'});if(req.method==='HEAD')res.end();else createReadStream(file).on('error',()=>res.destroy()).pipe(res);}catch{res.writeHead(503);res.end('Application build is unavailable.');}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 createApp().listen(Number(process.env.PORT??8080),'0.0.0.0',()=>console.log('Family Table web server ready'));
}
