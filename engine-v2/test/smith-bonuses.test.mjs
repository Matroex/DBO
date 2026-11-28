import assert from 'node:assert/strict';
import test from 'node:test';
import {resolveSmithBonuses} from '../dist/domain/smith-bonuses.js';

const scaling={qualityMultipliers:[1,1.1,1.25,1.5,2],flatGrowth:1.5,percentTarget:5,percentTargetLevel:9,maxUpgrade:10};
const signs={'znak-mistrza':[{key:'upgradeChancePct',base:1,mode:'percent',threshold:5}]};

test('smith bonuses combine character stats, sign thresholds and validated plans',()=>{
 const sign={id:'znak-mistrza',base:{},level:4};
 const chi={id:'smith-chi-1',base:{upgradeChancePct:2},level:0,reinforced:true,
  plans:[['upgradeChancePct',11],['upgradeChancePct',3],['upgradeChancePct',7],['defense',3],['hp',5],['upgradeMaterialDiscount',1]]};
 const character={upgradeChancePct:2,upgradeMaterialDiscount:1};
 assert.deepEqual(resolveSmithBonuses(scaling,signs,character,[sign,chi]),{main:7,mainMaterialDiscount:1,qualityChance:0});
 assert.deepEqual(resolveSmithBonuses(scaling,signs,character,[{...sign,level:8},{...chi,reinforced:false}]),
  {main:9,mainMaterialDiscount:2,qualityChance:0});
});
