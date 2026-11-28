import { createServer } from 'node:http';
import { route } from '../dist/application/api.js';
import { pathToFileURL } from 'node:url';
import { AuthService } from './auth/service.mjs';
import { authHandler } from './auth/http.mjs';
import pg from 'pg';
import {CharacterService} from './character/service.mjs';
import {characterHandler} from './character/http.mjs';
export function makeServer({pool}={}) {
 const service=pool?new AuthService(pool):null;
 const auth=service?authHandler(service):null;
 const characters=service?characterHandler(service,new CharacterService(pool)):null;
 return createServer({requestTimeout:15000,headersTimeout:10000},async(req,res)=>{
  let result;
  try{
   const path=new URL(req.url??'/','http://localhost').pathname;
   if(path==='/api/v1/ready'&&req.method==='GET'){
    if(!pool)result={status:503,body:{status:'not_ready'}};
    else{try{await pool.query('SELECT 1 FROM schema_migrations WHERE version=$1',['006_vital_rules']).then(r=>{if(!r.rowCount)throw Error('migration missing');});result={status:200,body:{status:'ready'}};}catch{result={status:503,body:{status:'not_ready'}};}}
   }else result=(auth?await auth(req,path):null)??(characters?await characters(req,path):null)??route(req.method??'',path);
  }catch{result={status:500,body:{error:'internal_error'}};}
  res.writeHead(result.status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...result.headers});
  res.end(JSON.stringify(result.body));
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const port=Number(process.env.PORT??'3000');
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
 const pool=process.env.DATABASE_URL?new pg.Pool({connectionString:process.env.DATABASE_URL,max:10,connectionTimeoutMillis:3000,statement_timeout:5000}):undefined;
 pool?.on('error',()=>console.error('Database pool error'));
 const server=makeServer({pool});
 server.listen(port,'127.0.0.1',()=>console.log('DBOidle development API: http://127.0.0.1:'+port));
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(async()=>{await pool?.end();}));
}
