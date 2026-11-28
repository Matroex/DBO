import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {AuthService} from '../src/auth/service.mjs';
import {CharacterService} from '../src/character/service.mjs';
test('character creation uses published content and isolates accounts',async()=>{
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
 try{
  const auth=new AuthService(pool),service=new CharacterService(pool);
  const suffix=Date.now();
  const a=await auth.register('char_a_'+suffix,'test-password');
  const b=await auth.register('char_b_'+suffix,'test-password');
  const c=await service.create(a.id,{name:'Warrior',raceId:'saiyan'});
  assert.equal(c.level,1);assert.equal(c.slot,0);
  const saved=await service.get(a.id,c.id);
  assert.equal(Number(saved.stats.strength),4);
  assert.equal(Number(saved.stats.speed),5);
  assert.deepEqual(saved.baseVitals,{maxHp:300.6,maxKi:500.02});
  assert.deepEqual(saved.wallets,{gold:'0',zeni:'0',dragon_coin:'0'});
  assert.equal(await service.get(b.id,c.id),null);
  assert.deepEqual(await service.list(b.id),[]);
  await assert.rejects(service.create(a.id,{name:'Invalid',raceId:'unknown'}));
  await assert.rejects(service.create(a.id,{name:'warrior',raceId:'ziemianin'}));
  for(const raceId of ['majin','nameczanin','demon-mrozu'])await assert.rejects(service.create(a.id,{name:'Locked',raceId}),/invalid_character/);
  const outcomes=await Promise.allSettled(Array.from({length:6},(_,i)=>service.create(a.id,{name:'Warrior '+i,raceId:'ziemianin'})));
  assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,4);
  assert.equal((await service.list(a.id)).length,5);
 }finally{await pool.end();}
});
