import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve(import.meta.dirname); const port=Number(process.env.PORT||4173);
http.createServer(async(req,res)=>{try {const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname === '/'?'/index.html':new URL(req.url,'http://localhost').pathname));if(!path.startsWith(root+ '/'.replace('/',process.platform==='win32'?'\\':'/'))){res.writeHead(403).end();return;}const data=await readFile(path);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp'})[extname(path)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404).end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`NEON RAIN http://localhost:${port}`));
