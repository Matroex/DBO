import test from 'node:test';
import assert from 'node:assert/strict';
import {worldMobStats} from '../dist/domain/world-mob.js';
const r={strengthPerLevel:4,lagunaStrengthPerLevel:0,speedPerLevel:2,endurancePerLevel:3,attackPerStrength:.5,defensePerEndurance:.1,hpPerLevel:5,hpBonusThreshold:100,hpBonus:5000,goldPerLevel:5};
test('legacy world mob stats and HP threshold',()=>{
 assert.equal(worldMobStats(r,'laguna',1).attack,0);
 assert.equal(worldMobStats(r,'forest',99).hp,495);
 assert.equal(worldMobStats(r,'armyBase',100).hp,5500);
 assert.equal(worldMobStats(r,'armyBase',100).attack,200);
 assert.equal(worldMobStats(r,'armyBase',100).gold,500);
});
