import test from 'node:test';
import assert from 'node:assert/strict';
import {validateItemScalingRules,scaleItem} from '../dist/domain/item-scaling.js';
const r=validateItemScalingRules({"qualityMultipliers":[1,1.1,1.25,1.5,2],"flatGrowth":1.5,"percentTarget":5,"percentTargetLevel":9,"maxUpgrade":10});
test('quality before flat growth, after percent growth',()=>assert.deepEqual(scaleItem(r,{attack:5,critChance:1},3,1,true,true),{attack:12,critChance:1.5}));
test('percent reaches five at +9 and higher values stay',()=>assert.deepEqual(scaleItem(r,{critChance:1,critDamage:8},0,9,true,true),{critChance:5,critDamage:8}));
test('materials do not scale',()=>assert.deepEqual(scaleItem(r,{attack:5},4,0,false,false),{attack:5}));
test('inheritance before scaling, unrelated bonus untouched',()=>assert.deepEqual(scaleItem(r,{attack:5,allStats:2},0,1,true,true,{attack:3,allStats:9}),{attack:12,allStats:2}));
