import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBonusMap,characterBonus,sumEquipment,planAttributeMultiplier,combatBonuses} from '../dist/domain/equipment-bonuses.js';
test('aliases use first present value per source, including zero',()=>{assert.equal(characterBonus([{critChance:0},{criticalChance:50}],[{critChance:2,criticalChance:9},{criticalChance:3}],['critChance','criticalChance']),5);});
test('plan percentages add before multiplication',()=>assert.equal(planAttributeMultiplier([{allStatsPct:10},{strengthPct:20}],'strength'),1.3));
test('skill critical bonus and armor aliases',()=>{const x=combatBonuses([],[{criticalDamage:5,enemyArmorReduction:7}],{critDamage:2,techCritChance:3,techCritDamage:4});assert.equal(x.critDamage,7);assert.equal(x.armorPenetration,7);assert.equal(x.techniqueCritChance,3);});
test('invalid map rejected and inherited keys ignored',()=>{assert.throws(()=>validateBonusMap({attack:Infinity}));assert.equal(sumEquipment([Object.create({attack:100})],['attack']),0);});
