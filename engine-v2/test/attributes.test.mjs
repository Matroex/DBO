import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAttributeRules,effectiveAttribute,pvmAttackRange,defense,modifiedVitals} from '../dist/domain/attributes.js';
const r=validateAttributeRules({attackPerStrength:.5,defensePerEndurance:.1,spiritAttackFactor:.5});
test('attribute modifier order matches legacy',()=>{assert.ok(Math.abs(effectiveAttribute(100,2,10,5,10,15,20)-300)<1e-9);});
test('attack range avoids double counting flat and ranged item attack',()=>{assert.deepEqual(pvmAttackRange(r,100,0,0,0,0,0,0,[{flat:99,min:5,max:8,range:2,planPvm:1}]),{min:58,max:61});});
test('defense preserves multiplicative guild and equipment bonuses',()=>{assert.ok(Math.abs(defense(r,100,2,3,5,10,20)-26.4)<1e-9);});
test('vitals preserve GM override and plan bonus',()=>{const v={baseHp:300,baseKi:500,hpPerEndurance:.1,kiPerIntelligence:.01};const m={gearFlat:50,gmPlanFlat:5,skillFlat:0,questFlat:0,gearPct:0,guildPct:0,guildFlat:0};assert.deepEqual(modifiedVitals(v,100,100,m,{...m,gearFlat:0},'pvm'),{maxHp:360,maxKi:501});assert.equal(modifiedVitals(v,100,100,{...m,gmOverride:1000},m,'pvp').maxHp,1005);});

test('PvP attack preserves separate flat bonuses',async()=>{const {pvpAttack}=await import('../dist/domain/attributes.js');assert.equal(pvpAttack(r,100,0,0,5,10,2,3,4,6),80);});
