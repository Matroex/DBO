import test from 'node:test';
import assert from 'node:assert/strict';
import {gainExperience,validateExperienceRules,legacyExperienceRules as r,mobExperience} from '../dist/domain/progression.js';
test('legacy curve validates',()=>assert.deepEqual(validateExperienceRules(r),r));
test('multiple level ups and overflow',()=>assert.deepEqual(gainExperience(r,1,900n,2200n),{level:3,experience:100n,accepted:2200n}));
test('level cap discards excess',()=>assert.deepEqual(gainExperience({...r,maxLevel:2},1,900n,500n),{level:2,experience:0n,accepted:100n}));
test('mob level and quality',()=>{assert.equal(mobExperience(10,10,1),60);assert.equal(mobExperience(10,10,3),160);assert.equal(mobExperience(10,15,1),1);assert.equal(mobExperience(20,10,1),84);});
