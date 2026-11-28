import test from 'node:test';
import assert from 'node:assert/strict';
import {regeneration,applyRegeneration,startBleed,tickBleed,autoBeans} from '../dist/domain/world-effects.js';
test('regeneration scales at level 100 and caps vitals',()=>{assert.deepEqual(regeneration(100,1,0,0),{hp:3,ki:1});const v={hp:99,ki:49.5,maxHp:100,maxKi:50};applyRegeneration(v,regeneration(100,1,0,0));assert.deepEqual(v,{hp:100,ki:50,maxHp:100,maxKi:50});});
test('bleed snapshots current HP and lasts ten ticks without refreshing',()=>{const e={hp:1000,bleedTicks:0,bleedDamage:0,nextBleedAt:null};assert.equal(startBleed(e,0),true);assert.equal(startBleed(e,500),false);for(let i=1;i<=10;i++)assert.equal(tickBleed(e,i*1000),10);assert.equal(e.hp,900);assert.equal(e.nextBleedAt,null);});
test('beans consume in green red blue order and do not revive',()=>{const v={hp:70,ki:20,maxHp:100,maxKi:100,nextGreenAt:0,greenUntil:0};assert.deepEqual(autoBeans(v,0,{green:true},()=>true),['green','red','blue']);assert.equal(v.hp,80);assert.equal(v.ki,100);assert.equal(v.greenUntil,600000);v.hp=0;assert.deepEqual(autoBeans(v,1000,{},()=>{throw Error('must not consume')}),[]);});
