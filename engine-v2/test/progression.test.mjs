import test from 'node:test';
import assert from 'node:assert/strict';
import {requiredExperience,legacyExperienceRules as r} from '../dist/domain/progression.js';
test('legacy level thresholds',()=>{for(const [level,xp] of [[1,1000],[50,50000],[51,52000],[100,150000],[101,155000],[200,650000],[201,682500],[500,0]])assert.equal(requiredExperience(r,level),BigInt(xp));});
test('invalid level rejected',()=>assert.throws(()=>requiredExperience(r,0)));
