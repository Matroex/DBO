import assert from 'node:assert/strict';
import test from 'node:test';
import {smithProfessionExperience,smithProfessionProgress} from '../dist/domain/smith-profession.js';

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

test('craft and quality award the exact legacy experience across all three bands',()=>{
 const craft=[[2,1,3,1,4,2,6,3],[1,0,2,1,3,1,5,2],[0,0,1,0,2,1,4,2]];
 const quality=[[4,2,6,4,8,6,10,8],[2,0,4,2,6,4,10,8],[1,0,2,0,5,2,10,8]];
 for(const [total,band,bonus] of [[0,0,0],[449,0,0],[450,1,0],[1049,1,0],[1050,1,2],[1899,1,2],[1900,2,2]]){
  for(const [kind,tiers,rows] of [['craft',[1,100,250,500],craft],['quality',[0,1,2,3],quality]]){
   for(const [index,tier] of tiers.entries()){
    for(const success of [true,false]){
     const base=rows[band][2*index+(success?0:1)];
     const gained=base?base+bonus:0;
     assert.deepEqual(smithProfessionExperience(total,{kind,tier,success}),
      {gained,progress:smithProfessionProgress(total+gained)});
    }
   }
  }
 }
 assert.equal(smithProfessionExperience(100,{kind:'craft',tier:123,success:true}).gained,0);
 assert.equal(smithProfessionExperience(4349,{kind:'quality',tier:3,success:true}).gained,1);
 assert.equal(smithProfessionExperience(4350,{kind:'quality',tier:3,success:true}).gained,0);
 assert.throws(()=>smithProfessionExperience(0,{kind:'quality',tier:4,success:true}),/Invalid smith attempt/);
});
