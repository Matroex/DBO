import test from 'node:test';
import assert from 'node:assert/strict';
import {legacyStarterRules,validateStarterRules} from '../dist/domain/content.js';
import {validateIdentity} from '../dist/domain/content-policy.js';
test('legacy starter defaults preserved',()=>assert.deepEqual(validateStarterRules(legacyStarterRules),legacyStarterRules));
test('editable stats validated',()=>{
 const v=structuredClone(legacyStarterRules);v.stats.strength=15;
 assert.equal(validateStarterRules(v).stats.strength,15);
 v.stats.strength=-1;assert.throws(()=>validateStarterRules(v));
});
test('reject inconsistent slot configuration',()=>assert.throws(()=>validateStarterRules({...legacyStarterRules,slots:9,maxSlots:6})));
test('stable content identities',()=>{validateIdentity('quest','first-journey');assert.throws(()=>validateIdentity('script','x'));assert.throws(()=>validateIdentity('quest','../x'));});
