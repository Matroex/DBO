import { createServer } from 'node:http';
import { route } from '../dist/application/api.js';
import { pathToFileURL } from 'node:url';
import { AuthService } from './auth/service.mjs';
import { authHandler } from './auth/http.mjs';
import pg from 'pg';
import {CharacterService} from './character/service.mjs';
import {characterHandler} from './character/http.mjs';
import {upgradeHandler} from './inventory/upgrade-http.mjs';
import {inventoryHandler} from './inventory/inventory-http.mjs';
import {readFile} from 'node:fs/promises';
const smithAssets=new Map([
 ['/smith',['smith.html','text/html; charset=utf-8']],
 ['/smith.mjs',['smith.mjs','text/javascript; charset=utf-8']]
]);
export function makeServer({pool}={}) {
 const service=pool?new AuthService(pool):null;
 const auth=service?authHandler(service):null;
 const characters=service?characterHandler(service,new CharacterService(pool)):null;
 const upgrades=service?upgradeHandler(service,pool):null;
 const inventory=service?inventoryHandler(service,pool):null;
 return createServer({requestTimeout:15000,headersTimeout:10000},async(req,res)=>{
  let result;
  try{
   const path=new URL(req.url??'/','http://localhost').pathname;
   const asset=smithAssets.get(path);
   if(asset&&req.method==='GET'){
    const [file,type]=asset;
    const body=await readFile(new URL('../public/'+file,import.meta.url));
    res.writeHead(200,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store',
     'Content-Security-Policy':"default-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"});
    res.end(body);
    return;
   }
   if(path==='/api/v1/ready'&&req.method==='GET'){
    if(!pool)result={status:503,body:{status:'not_ready'}};
    else{try{await pool.query('SELECT 1 FROM schema_migrations WHERE version=$1',['023_smith_crafting']).then(r=>{if(!r.rowCount)throw Error('migration missing');});result={status:200,body:{status:'ready'}};}catch{result={status:503,body:{status:'not_ready'}};}}
   }else result=(auth?await auth(req,path):null)??(characters?await characters(req,path):null)??(inventory?await inventory(req,path):null)??(upgrades?await upgrades(req,path):null)??route(req.method??'',path);
  }catch{result={status:500,body:{error:'internal_error'}};}
  res.writeHead(result.status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...result.headers});
  res.end(JSON.stringify(result.body));
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const port=Number(process.env.PORT??'3000');
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
 const pool=process.env.DATABASE_URL||process.env.PGHOST?new pg.Pool({
  connectionString:process.env.DATABASE_URL,max:10,connectionTimeoutMillis:3000,statement_timeout:5000
 }):undefined;
 pool?.on('error',()=>console.error('Database pool error'));
 const server=makeServer({pool});
 const host=process.env.DBO_BIND_HOST??'127.0.0.1';
 server.listen(port,host,()=>console.log('DBOidle API listening on '+host+':'+port));
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(async()=>{await pool?.end();}));
}
