import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {once} from 'node:events';
import {makeServer} from '../src/server.mjs';
import {AuthService} from '../src/auth/service.mjs';
test('authenticated character endpoints enforce ownership and race availability',async()=>{
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
 const server=makeServer({pool}).listen(0,'127.0.0.1');
 try{
  await once(server,'listening');
  const auth=new AuthService(pool),suffix=Date.now();
  const a='http_a_'+suffix,b='http_b_'+suffix;
  await auth.register(a,'test-password');await auth.register(b,'test-password');
  const ta=await auth.login(a,'test-password'),tb=await auth.login(b,'test-password');
  const base='http://127.0.0.1:'+server.address().port+'/api/v1/characters';
  const headers=t=>({Authorization:'Bearer '+t,'Content-Type':'application/json'});
  const post=data=>fetch(base,{method:'POST',headers:headers(ta),body:JSON.stringify(data)});
  assert.equal((await fetch(base)).status,401);
  assert.equal((await post({name:'Locked',raceId:'majin'})).status,400);
  assert.equal((await post({name:'Cheat',raceId:'saiyan',stats:{strength:999}})).status,400);
  const r=await post({name:'Warrior',raceId:'saiyan'});assert.equal(r.status,201);
  const c=await r.json();
  assert.equal((await fetch(base+'/'+c.id,{headers:headers(tb)})).status,404);
  const own=await fetch(base+'/'+c.id,{headers:headers(ta)});assert.equal(own.status,200);
  assert.equal(Number((await own.json()).stats.strength),4);
  assert.equal((await (await fetch(base,{headers:headers(ta)})).json()).length,1);
 }finally{await new Promise(resolve=>server.close(resolve));await pool.end();}
});
