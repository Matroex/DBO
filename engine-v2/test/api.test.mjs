import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { route } from '../dist/application/api.js';
import { makeServer } from '../src/server.mjs';
test('health reports process only, not database readiness',()=>{
  assert.deepEqual(route('GET','/api/v1/health').body,{status:'ok',version:'0.2.0',database:'not_connected'});
});
test('unknown routes and unsupported methods fail closed',()=>{
  assert.equal(route('GET','/missing').status,404);
  assert.equal(route('POST','/api/v1/health').status,405);
});
test('all modules explicitly planned',()=>{
  const m=route('GET','/api/v1/modules').body.modules;
  assert.equal(Object.keys(m).length,12);
  assert.ok(Object.values(m).every(x=>x==='planned'));
});
test('HTTP integration',async()=>{
  const server=makeServer().listen(0,'127.0.0.1');
  try {
    await once(server,'listening');
    const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/v1/health');
    assert.equal(r.status,200);
    assert.equal((await r.json()).database,'not_connected');
  } finally { await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve())); }
});
