import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {makeServer} from '../src/server.mjs';
import {once} from 'node:events';
test('database-backed account lifecycle',async()=>{
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
 const server=makeServer({pool}).listen(0,'127.0.0.1');
 try{
  await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port+'/api/v1';
  const post=(path,data,token)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});
  assert.equal((await fetch(base+'/ready')).status,200);
  const login='ci_'+Date.now();
  assert.equal((await post('/auth/register',{login,password:'test-password'})).status,201);
  assert.equal((await post('/auth/register',{login,password:'test-password'})).status,409);
  assert.equal((await post('/auth/login',{login,password:'wrong-password'})).status,401);
  const r=await post('/auth/login',{login,password:'test-password'});assert.equal(r.status,200);
  const {token}=await r.json();
  const me=()=>fetch(base+'/auth/me',{headers:{Authorization:'Bearer '+token}});
  assert.deepEqual((await (await me()).json()).roles,['player']);
  assert.equal((await post('/auth/logout',{},token)).status,200);
  assert.equal((await me()).status,401);
 }finally{await new Promise(resolve=>server.close(resolve));await pool.end();}
});
