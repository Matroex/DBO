import test from 'node:test';
import assert from 'node:assert/strict';
import {heroWorldAttack,enemyWorldAttack} from '../dist/domain/world-attacks.js';
const r={normalCritPct:120,techniqueCritPct:200,dodgeThreshold:1000000,speedPerDodgePct:10000,techniqueArmorPct:20,minimumDamagePct:10,armorDivisor:2};
const t={kiAttackFactor:.01,intelligenceReductionFactor:.00001,maxIntelligenceReduction:.5,cooldownRounds:13};
const hit={attack:100,armor:0,attackerSpeed:0,defenderSpeed:0,technique:false,penetrationPct:0,criticalChancePct:0,criticalBonusPct:0,criticalReductionPct:0,averageDamagePct:0,outgoingRacePct:0,incomingRacePct:0,techniqueReductionPct:0,intelligenceReduction:0,guardReduction:0};
const enemy=()=>({hp:1000,max:1000,intelligence:0,stunResistancePct:0,stunnedUntil:0,bleedTicks:0,bleedDamage:0,nextBleedAt:null});
test('wave consumes KI once and strikes every living target',()=>{const h={ki:100,nextWaveAt:0,waveEnabled:true,attack:100,techniquePvm:0,techniqueKi:0,techniqueValuePct:0,techniqueDamagePct:0,stunPct:100,bleedPct:100,bossDamagePct:0};const a=enemy(),b=enemy();const result=heroWorldAttack(r,t,h,[a,b],0,()=>hit,()=>0,{boss:false,storySoldier:false,guardian:false});assert.equal(result.wave,true);assert.equal(h.ki,0);assert.equal(h.nextWaveAt,20000);assert.equal(a.hp,950);assert.equal(b.hp,950);assert.equal(a.stunnedUntil,3000);assert.equal(a.bleedDamage,9.5);});
test('boss reduction floor and special attack multiplier',()=>{const h={hp:1000};const result=enemyWorldAttack(r,h,hit,()=>.5,{boss:true,monsterReductionPct:100,bossReductionPct:50,special:true});assert.equal(result.damage,150);assert.equal(h.hp,850);});
