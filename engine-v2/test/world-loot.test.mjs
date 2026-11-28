import test from 'node:test';
import assert from 'node:assert/strict';
import {rollWorldMobLoot} from '../dist/domain/world-loot.js';
const row=(itemId,chancePct=1)=>({itemId,quantity:1,chancePct});
const tables={common:{rows:[row('dust')]},red_ribbon:{rows:[row('badge')]},hidden:{minimumPlayerLevel:100,rows:[row('plans',.001)]}};
const input={mapId:'highTowerForest',name:'Warrior',playerLevel:99,smithBonusPct:0,bonuses:{gearPct:0,chipPct:0,spiritPct:0,doublePct:100}};
test('regional drops double but hidden drops do not',()=>{
 assert.deepEqual(rollWorldMobLoot(tables,input,()=>0),[{itemId:'dust',quantity:2},{itemId:'badge',quantity:2}]);
 assert.deepEqual(rollWorldMobLoot(tables,{...input,playerLevel:100},()=>0),[{itemId:'plans',quantity:1},{itemId:'dust',quantity:2},{itemId:'badge',quantity:2}]);
});
test('explicit empty custom loot replaces ordinary table',()=>assert.deepEqual(rollWorldMobLoot(tables,{...input,customRows:[]},()=>0),[]));
