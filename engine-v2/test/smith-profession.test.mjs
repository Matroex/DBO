import assert from 'node:assert/strict';
import test from 'node:test';
import {smithProfessionProgress} from '../dist/domain/smith-profession.js';

test('smith profession uses legacy costs, bonus threshold and level cap',()=>{
 const cases=[
  [0,1,0,10,0],[9,1,9,10,0],[10,2,0,20,0],
  [1899,19,189,190,0],[1900,20,0,200,10],
  [4349,29,289,290,10],[4350,30,0,0,10]
 ];
 for(const [total,level,experience,needed,upgradeBonus] of cases){
  assert.deepEqual(smithProfessionProgress(total),{total,level,experience,needed,upgradeBonus});
 }
 for(const total of [-1,1.5,4351,NaN])assert.throws(()=>smithProfessionProgress(total),/Invalid smith experience/);
});
