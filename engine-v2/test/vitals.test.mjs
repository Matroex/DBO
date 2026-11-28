import test from 'node:test';
import assert from 'node:assert/strict';
import {baseVitals,validateVitalRules} from '../dist/domain/vitals.js';
test('configured base HP and KI preserve legacy stat coefficients',()=>{
 const rules=validateVitalRules({baseHp:300,baseKi:500,hpPerEndurance:.1,kiPerIntelligence:.01});
 assert.deepEqual(baseVitals(rules,6,2),{maxHp:300.6,maxKi:500.02});
 assert.deepEqual(baseVitals({...rules,baseHp:400},0,0),{maxHp:400,maxKi:500});
 assert.throws(()=>validateVitalRules({...rules,baseHp:0}));
});
