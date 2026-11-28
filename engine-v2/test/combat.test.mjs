import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCombatRules,dodgePct,criticalMultiplier,effectiveArmor,damageAfterArmor} from '../dist/domain/combat.js';
const r=validateCombatRules({normalCritPct:120,techniqueCritPct:200,dodgeThreshold:1000000,speedPerDodgePct:10000,techniqueArmorPct:20,minimumDamagePct:10,armorDivisor:2});
test('critical bonus adds directly to base percentage',()=>{assert.equal(criticalMultiplier(r,false,1),1.21);assert.equal(criticalMultiplier(r,true,1),2.01);});
test('dodge switches on slower speed',()=>{assert.equal(dodgePct(r,2010000,2000000),.5);assert.equal(dodgePct(r,510000,500000),1);assert.ok(Math.abs(dodgePct(r,2000000,1100000)-81.81818181818181)<1e-10);assert.equal(dodgePct(r,3000000,2000000),50);assert.equal(dodgePct(r,1000000,0),100);assert.equal(dodgePct(r,1,2),0);});
test('armor reduction and technique armor share same calculation',()=>{assert.equal(effectiveArmor(r,1000,30,false),700);assert.equal(effectiveArmor(r,1000,30,true),140);assert.equal(damageAfterArmor(r,100,100),50);assert.equal(damageAfterArmor(r,100,10000),10);});
