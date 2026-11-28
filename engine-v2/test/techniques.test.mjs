import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTechniqueRules,techniqueReady,techniqueAttack,intelligenceReduction} from '../dist/domain/techniques.js';
const r=validateTechniqueRules({kiAttackFactor:.01,intelligenceReductionFactor:.00001,maxIntelligenceReduction:.5,cooldownRounds:13});
test('KI cost and legacy cooldown boundary',()=>{assert.equal(techniqueReady(r,1,undefined,100,100),true);assert.equal(techniqueReady(r,1,undefined,99,100),false);assert.equal(techniqueReady(r,14,1,100,100),false);assert.equal(techniqueReady(r,15,1,100,100),true);});
test('technique damage and intelligence reduction',()=>{assert.equal(techniqueAttack(r,100,20,1000,0,0),130);assert.equal(intelligenceReduction(r,100000,0),.5);assert.equal(intelligenceReduction(r,100,200),0);});
