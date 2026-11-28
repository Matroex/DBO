import test from 'node:test';
import assert from 'node:assert/strict';
import {standardUpgradeAllowed} from '../dist/domain/upgrade-policy.js';
test('special equipment excluded from standard enhancement',()=>{for(const slot of ['chi','symbol','stroj','Strój treningowy','esencja','scouter'])assert.equal(standardUpgradeAllowed(slot),false);assert.equal(standardUpgradeAllowed('weapon'),true);});
