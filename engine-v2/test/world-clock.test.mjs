import test from 'node:test';
import assert from 'node:assert/strict';
import {enemyInterval,heroInterval,advanceWorldClock,WORLD_CLOCK} from '../dist/domain/world-clock.js';
const state=()=>({started:0,processedThrough:0,nextHeroAttack:3000,nextRegen:5000,nextZenUse:1000,enemies:[],status:'running'});
const tick=(s,at)=>{if(s.nextHeroAttack===at)s.nextHeroAttack+=3000;if(s.nextRegen===at)s.nextRegen+=5000;if(s.nextZenUse===at)s.nextZenUse+=1000;};
test('legacy attack timing and green bean bonus',()=>{assert.equal(enemyInterval(0),3000);assert.equal(enemyInterval(50000,true),1500);assert.equal(heroInterval(0,0,true),1500);assert.equal(heroInterval(0,100000,false),100);});
test('bounded catch-up never skips pending events',()=>{const s=state();const a=advanceWorldClock(s,10000,tick,2);assert.equal(a.pending,true);assert.equal(a.processedThrough,2000);const b=advanceWorldClock(s,10000,tick);assert.equal(b.pending,false);assert.equal(b.processedThrough,10000);});
test('offline expiration occurs only after backlog is processed',()=>{const s=state();assert.equal(advanceWorldClock(s,WORLD_CLOCK.maxDurationMs,tick,1).status,'running');assert.equal(advanceWorldClock(s,WORLD_CLOCK.maxDurationMs,tick).status,'finished');});
