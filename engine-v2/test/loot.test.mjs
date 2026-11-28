import test from 'node:test';
import assert from 'node:assert/strict';
import {effectiveDropChance,rollLoot,validateLootTable} from '../dist/domain/loot.js';
const b={gearPct:2,chipPct:0,spiritPct:0,doublePct:0};
const rows=[{itemId:'dust',quantity:2,chancePct:1},{itemId:'disabled',quantity:1,chancePct:0}];
test('additive bonus and disabled rows',()=>{assert.equal(effectiveDropChance(1,b),3);assert.equal(effectiveDropChance(99,b),100);assert.equal(effectiveDropChance(0,b),0);assert.deepEqual(rollLoot(rows,b,()=>.029),[{itemId:'dust',quantity:2}]);assert.deepEqual(rollLoot(rows,b,()=>.03),[]);});
test('double reward applies once to successful loot',()=>{assert.deepEqual(rollLoot(rows,{...b,doublePct:100},()=>0),[{itemId:'dust',quantity:4}]);});
test('invalid quantities and chances rejected',()=>{assert.throws(()=>validateLootTable([{itemId:'dust',quantity:0,chancePct:1}]));assert.throws(()=>validateLootTable([{itemId:'dust',quantity:1,chancePct:101}]));});
