import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMobXpRules,mobRewardXp} from '../dist/domain/mob-rewards.js';
const r=validateMobXpRules({qualityBase:[50,100,150],highDifference:10,highMultiplier:1.2,positiveMultiplier:1.1,equalMultiplier:1,lowDifference:-5,lowMultiplier:.01,negativeStep:.1,spiritFactor:20,doubleMultiplier:2});
const b={guildEducation:0,gearExpPct:0,spiritExp:0,skillMobPct:0,gearMobPct:0,skillDoublePct:0,gearDoublePct:0,chipDoublePct:0};
test('legacy base and level differences',()=>{assert.equal(mobRewardXp(r,50,50,1,b,()=>.5),100n);assert.equal(mobRewardXp(r,50,55,1,b,()=>.5),1n);});
test('additive bonuses then double XP roll',()=>{const x={...b,guildEducation:10,gearExpPct:10,spiritExp:1,skillMobPct:5,gearMobPct:5,skillDoublePct:20,gearDoublePct:10,chipDoublePct:10};assert.equal(mobRewardXp(r,50,50,1,x,()=>.39),300n);assert.equal(mobRewardXp(r,50,50,1,x,()=>.4),150n);});
