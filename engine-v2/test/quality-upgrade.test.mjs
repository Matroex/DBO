import assert from 'node:assert/strict';
import test from 'node:test';
import {quoteQuality} from '../dist/domain/quality-upgrade.js';

test('quality tiers preserve legacy costs and the five excluded categories',()=>{
 const qualityIds=['common','uncommon','rare','epic','legendary'];
 const gear={slot:'bron',qualityIds};
 const rows=[[90,10000,5,'common',1],[70,30000,15,'rare',1],[40,100000,30,'epic',2],[10,1000000,100,'legendary',5]];
 for(const [tier,[chance,gold,units,module,modules]] of rows.entries()){
  assert.deepEqual(quoteQuality(gear,tier,0),{version:1,qualityId:qualityIds[tier+1],chance,gold,materials:[
   {id:'smith-upgrade-1',count:units},{id:'smith-upgrade-2',count:units},{id:'smith-quality-'+module,count:modules}
  ]});
 }
 assert.equal(quoteQuality(gear,4,0),null);
 assert.equal(quoteQuality(gear,0,50).chance,100);
 for(const slot of ['chi','symbol','znak','stroj','esencja','scouter']){
  assert.equal(quoteQuality({...gear,slot},0,0),null);
 }
});
