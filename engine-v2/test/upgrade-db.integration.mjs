import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import pg from 'pg';
import {upgradeBagItem} from '../src/inventory/upgrade.mjs';
import {newSession} from '../src/auth/credentials.mjs';
import {makeServer} from '../src/server.mjs';
import {upgradeRulesV1 as rules} from '../dist/domain/upgrade-rules-v1.js';
import {quoteUpgrade} from '../dist/domain/upgrade.js';
import {validateBonusMap} from '../dist/domain/equipment-bonuses.js';
import {recordSmithExperience} from '../src/inventory/smith-experience.mjs';
import {changeWallet} from '../src/economy/wallet.mjs';

test('published smith catalog covers both race trees and every default ingredient',async()=>{
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
 try{
  const {rows}=await pool.query("SELECT d.definition_id,d.data FROM content_definitions d JOIN content_revisions r ON r.id=d.revision_id WHERE r.status='published' AND d.kind='item'");
  const definitions=new Map(rows.map(({definition_id,data})=>[definition_id,data]));
  const catalog=new Map();
  for(const [id,data] of definitions){
   assert.ok(data.name,id);
   const quality=data.qualityIds.indexOf(data.defaultQualityId);
   assert.ok(quality>=0,id);
   catalog.set(id,{id,...data,quality,base:validateBonusMap(data.base)});
  }
  const checkCosts=quote=>{
   for(const {id} of quote.materials)assert.equal(definitions.get(id)?.stackable,true,id);
  };
  for(const [race,recipes] of Object.entries(rules.recipes)){
   const context={race,catalog};
   for(const [source,target] of Object.entries(recipes)){
    assert.equal(definitions.get(source)?.stackable,false,source);
    assert.equal(definitions.get(target)?.stackable,false,target);
    assert.equal(definitions.get(source).slot,definitions.get(target).slot,source);
    if(source==='earth-100-zbroja'){
     assert.equal(quoteUpgrade(source,9,context),null);
     continue;
    }
    for(let level=0;level<=9;level++)checkCosts(quoteUpgrade(source,level,context));
    assert.equal(quoteUpgrade(source,9,context).targetId,target,source);
   }
   for(const id of Object.values(recipes).filter(id=>!Object.hasOwn(recipes,id))){
    for(let level=0;level<=11;level++)checkCosts(quoteUpgrade(id,level,context));
   }
  }
  const staff=definitions.get('starter-red-staff');
  assert.equal(staff.name,'Magiczny Czerwony Kij');
  assert.equal(definitions.get('sayan-50-miecz').base.techniqueAttackMax,60);
  assert.equal(definitions.get('dragon-ball-dust-common').defaultQualityId,'uncommon');
 }finally{await pool.end();}
});

test('profession experience commits with the paid action, replays once and supports rollback',async()=>{
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
 let accountId,characterId;
 async function record(input,commit=true){
  const db=await pool.connect();
  try{
   await db.query('BEGIN');
   const result=await recordSmithExperience(db,input);
   if(!result.replayed)await changeWallet(db,{characterId,currencyId:'gold',delta:-1n,
    operationId:input.operationId,reason:'smith_integration'});
   await db.query(commit?'COMMIT':'ROLLBACK');
   return result;
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
 }
 try{
  accountId=(await pool.query("INSERT INTO accounts(login,password_hash) VALUES($1,'test') RETURNING id",
   ['smith_'+randomUUID()])).rows[0].id;
  characterId=(await pool.query("INSERT INTO characters(account_id,name,race_id,slot) VALUES($1,$2,'saiyan',0) RETURNING id",
   [accountId,'Smith '+randomUUID()])).rows[0].id;
  await pool.query('INSERT INTO character_smith_progress(character_id,experience) VALUES($1,1049)',[characterId]);
  await pool.query("INSERT INTO wallets(character_id,currency_id,balance) VALUES($1,'gold',100)",[characterId]);
  const balance=async()=>(await pool.query("SELECT balance FROM wallets WHERE character_id=$1 AND currency_id='gold'",[characterId])).rows[0].balance;
  const craft={characterId,operationId:randomUUID(),kind:'craft',tier:500,success:true};
  const concurrent=await Promise.all([record(craft),record(craft)]);
  for(const result of concurrent){
   assert.equal(result.gained,5);
   assert.equal(result.progress.total,1054);
  }
  assert.deepEqual(concurrent.map(result=>result.replayed).sort(),[false,true]);
  await assert.rejects(record({...craft,success:false}),/operation conflict/);
  const unpaid={characterId,operationId:randomUUID(),kind:'quality',tier:1,success:true};
  assert.equal((await record(unpaid,false)).gained,6);
  assert.equal((await pool.query('SELECT experience FROM character_smith_progress WHERE character_id=$1',[characterId])).rows[0].experience,1054);
  assert.equal(await balance(),'99');
  const paid=await record(unpaid);
  assert.deepEqual([paid.gained,paid.progress.total,paid.replayed],[6,1060,false]);
  const failed={characterId,operationId:randomUUID(),kind:'quality',tier:0,success:false};
  assert.equal((await record(failed)).gained,0);
  assert.equal((await record(failed)).replayed,true);
  assert.equal((await record(craft)).progress.total,1054);
  assert.equal(await balance(),'97');
 }finally{
  try{
   if(characterId){
    await pool.query('DELETE FROM wallet_ledger WHERE character_id=$1',[characterId]);
    await pool.query('DELETE FROM characters WHERE id=$1',[characterId]);
   }
   if(accountId)await pool.query('DELETE FROM accounts WHERE id=$1',[accountId]);
  }finally{await pool.end();}
 }
});

test('upgrade charges once, rolls back incomplete payment and preserves a reforged item',async()=>{
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
 const server=makeServer({pool}).listen(0,'127.0.0.1');
 let accountId,characterId,revisionId,previousRevision;
 try{
  await once(server,'listening');
  accountId=(await pool.query("INSERT INTO accounts(login,password_hash) VALUES($1,'test') RETURNING id",
   ['upgrade_'+randomUUID()])).rows[0].id;
  characterId=(await pool.query("INSERT INTO characters(account_id,name,race_id,slot) VALUES($1,'Upgrade test','saiyan',0) RETURNING id",
   [accountId])).rows[0].id;
  const setup=await pool.connect();
  try{
   await setup.query('BEGIN');
   const old=(await setup.query("SELECT id FROM content_revisions WHERE status='published'")).rows[0].id;
   revisionId=(await setup.query("INSERT INTO content_revisions(schema_version,parent_revision_id) VALUES(1,$1) RETURNING id",[old])).rows[0].id;
   await setup.query("INSERT INTO content_definitions(revision_id,kind,definition_id,data) SELECT $1,kind,definition_id,data FROM content_definitions WHERE revision_id=$2",[revisionId,old]);
   await setup.query("INSERT INTO content_definitions(revision_id,kind,definition_id,data) VALUES($1,'recipe','equipment-upgrades',$2)",
    [revisionId,{upgradeRecipes:{'saiyan:sayan-50-miecz:1':{chance:0,materials:[]}}}]);
   await setup.query("UPDATE content_revisions SET status='archived' WHERE id=$1",[old]);
   await setup.query("UPDATE content_revisions SET status='published' WHERE id=$1",[revisionId]);
   await setup.query('COMMIT');
   previousRevision=old;
  }catch(error){await setup.query('ROLLBACK');throw error;}finally{setup.release();}
  const add=async(definition,slot,quantity,level=0,attributes={})=>(await pool.query(
   "INSERT INTO inventory_items(character_id,definition_id,quality_id,bag_slot,quantity,upgrade_level,attributes) VALUES($1,$2,'common',$3,$4,$5,$6) RETURNING id",
   [characterId,definition,slot,quantity,level,attributes])).rows[0].id;
  const itemId=await add('starter-red-staff',0,1,9,{plans:[1]});
  const dustId=await add('dragon-ball-dust',1,12);
  await pool.query("INSERT INTO wallets(character_id,currency_id,balance) VALUES($1,'gold',50000)",[characterId]);
  const request={accountId,characterId,itemId,operationId:randomUUID(),bonuses:{smithRank:1}};
  await assert.rejects(upgradeBagItem(pool,{...request,accountId:randomUUID()}),/Character missing/);
  await assert.rejects(upgradeBagItem(pool,request),/Insufficient upgrade materials/);
  const balance=async()=>(await pool.query("SELECT balance FROM wallets WHERE character_id=$1 AND currency_id='gold'",[characterId])).rows[0].balance;
  assert.equal(await balance(),'50000');
  await add('upgrade-reforger',2,1);
  const {token,hash}=newSession();
  await pool.query("INSERT INTO sessions(token_hash,account_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",[hash,accountId]);
  const base='http://127.0.0.1:'+server.address().port;
  const path=base+'/api/v1/characters/'+characterId+'/upgrades';
  const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
  assert.equal((await fetch(base+'/smith')).status,200);
  assert.equal((await fetch(base+'/smith.mjs')).status,200);
  assert.equal((await fetch(path)).status,401);
  assert.equal((await fetch(base+'/api/v1/characters/'+randomUUID()+'/upgrades',{headers})).status,404);
  await pool.query("INSERT INTO character_skills(character_id,skill_id,level) VALUES($1,'kowalstwo',1)",[characterId]);
  const probeId=await add('starter-red-staff',3,1,8);
  for(const [id,slot,level,attributes] of [
   ['znak-mistrza','main:symbol',5,{}],
   ['smith-chi-1','main:chi',0,{plans:[['upgradeMaterialDiscount',1],['upgradeChancePct',3]]}],
   ['znak-mistrza','pvp:symbol',9,{}]
  ])await pool.query(
   "INSERT INTO inventory_items(character_id,definition_id,quality_id,equipment_slot,upgrade_level,attributes) VALUES($1,$2,'common',$3,$4,$5)",
   [characterId,id,slot,level,attributes]);
  await pool.query("INSERT INTO character_stats(character_id,stat_id,value) VALUES($1,'upgradeChancePct',2)",[characterId]);
  const view=await (await fetch(path,{headers})).json();
  const entry=view.items.find(item=>item.id===itemId);
  assert.equal(view.smithRank,1);
  assert.deepEqual(view.profession,{total:0,level:1,experience:0,needed:10,upgradeBonus:0});
  assert.equal(entry.quote.gold,50000);
  const body={itemId,operationId:request.operationId,expectedQuote:entry.quoteKey};
  const post=input=>fetch(path,{method:'POST',headers,body:JSON.stringify(input)});
  const probe=view.items.find(item=>item.id===probeId);
  assert.equal(probe.quote.chance,37);
  assert.deepEqual(probe.quote.materials.map(material=>material.count),[1,1,1]);
  await pool.query("UPDATE inventory_items SET upgrade_level=4 WHERE character_id=$1 AND equipment_slot='main:symbol'",[characterId]);
  const changed=await post({itemId:probeId,operationId:randomUUID(),expectedQuote:probe.quoteKey});
  assert.equal(changed.status,409);
  assert.deepEqual(await changed.json(),{error:'quote_changed'});
  await pool.query('INSERT INTO character_smith_progress(character_id,experience) VALUES($1,1899)',[characterId]);
  const before=(await (await fetch(path,{headers})).json());
  const beforeProbe=before.items.find(item=>item.id===probeId);
  assert.deepEqual(before.profession,{total:1899,level:19,experience:189,needed:190,upgradeBonus:0});
  assert.equal(beforeProbe.quote.chance,36);
  await pool.query('UPDATE character_smith_progress SET experience=1900 WHERE character_id=$1',[characterId]);
  const after=(await (await fetch(path,{headers})).json());
  assert.deepEqual(after.profession,{total:1900,level:20,experience:0,needed:200,upgradeBonus:10});
  assert.equal(after.items.find(item=>item.id===probeId).quote.chance,46);
  const beforeCheckpoint=await post({itemId:probeId,operationId:randomUUID(),expectedQuote:beforeProbe.quoteKey});
  assert.equal(beforeCheckpoint.status,409);
  assert.deepEqual(await beforeCheckpoint.json(),{error:'quote_changed'});
  await pool.query('DELETE FROM inventory_items WHERE id=$1',[probeId]);
  assert.equal((await post({...body,bonuses:{smithRank:10}})).status,400);
  const stale=await post({...body,expectedQuote:'0'.repeat(64)});
  assert.equal(stale.status,409);
  assert.deepEqual(await stale.json(),{error:'quote_changed'});
  assert.equal(await balance(),'50000');
  const [first,second]=await Promise.all([post(body),post(body)]);
  assert.equal(first.status,200);
  assert.equal(second.status,200);
  const [result,replay]=await Promise.all([first.json(),second.json()]);
  assert.deepEqual(result,replay);
  assert.deepEqual([result.success,result.itemId,result.definitionId,result.level,result.bagSlot],[true,itemId,'sayan-50-miecz',0,0]);
  assert.equal(await balance(),'0');
  const {rows}=await pool.query('SELECT id,quantity,attributes FROM inventory_items WHERE character_id=$1 AND bag_slot IS NOT NULL ORDER BY bag_slot',[characterId]);
  assert.deepEqual(rows.map(row=>[row.id,row.quantity]),[[itemId,'1'],[dustId,'2']]);
  assert.deepEqual(rows[0].attributes.plans,[1]);
  assert.ok(Object.values(rows[0].attributes.inheritance).some(value=>value>0));
  assert.equal((await pool.query('SELECT 1 FROM wallet_ledger WHERE character_id=$1',[characterId])).rowCount,1);
  await pool.query("UPDATE wallets SET balance=55000 WHERE character_id=$1 AND currency_id='gold'",[characterId]);
  const failed=await upgradeBagItem(pool,{...request,operationId:randomUUID(),bonuses:{smithRank:1,main:-1}});
  assert.deepEqual([failed.success,failed.level,await balance()],[false,0,'0']);
  const {rows:[progress]}=await pool.query('SELECT experience FROM character_smith_progress WHERE character_id=$1',[characterId]);
  assert.equal(progress.experience,1900);
  const qualityPath=base+'/api/v1/characters/'+characterId+'/quality';
  const qualityPost=input=>fetch(qualityPath,{method:'POST',headers,body:JSON.stringify(input)});
  const getQuality=async()=>(await (await fetch(qualityPath,{headers})).json()).items.find(entry=>entry.id===itemId);
  await pool.query("INSERT INTO character_skills(character_id,skill_id,level) VALUES($1,'kowalstwo2',10)",[characterId]);
  await pool.query("UPDATE wallets SET balance=40000 WHERE character_id=$1 AND currency_id='gold'",[characterId]);
  const common=await getQuality();
  assert.equal(common.quote.chance,100);
  assert.equal(common.quote.gold,10000);
  const qualityAttempt={itemId,operationId:randomUUID(),expectedQuote:common.quoteKey};
  assert.equal((await qualityPost(qualityAttempt)).status,409);
  assert.equal(await balance(),'40000');
  assert.equal((await pool.query('SELECT experience FROM character_smith_progress WHERE character_id=$1',[characterId])).rows[0].experience,1900);
  await add('smith-upgrade-1',4,20);
  await add('smith-upgrade-2',5,20);
  await add('smith-quality-common',6,1);
  await add('smith-quality-rare',7,1);
  const completed=await qualityPost(qualityAttempt);
  assert.equal(completed.status,200);
  const qualityResult=await completed.json();
  assert.deepEqual([qualityResult.success,qualityResult.qualityId,qualityResult.level,qualityResult.experienceGained],[true,'uncommon',0,3]);
  assert.deepEqual(await (await qualityPost(qualityAttempt)).json(),qualityResult);
  assert.deepEqual(await (await post(qualityAttempt)).json(),{error:'operation_conflict'});
  assert.equal(await balance(),'30000');
  await pool.query("INSERT INTO character_stats(character_id,stat_id,value) VALUES($1,'qualityChancePct',-100)",[characterId]);
  const uncommon=await getQuality();
  const failQuality=await qualityPost({itemId,operationId:randomUUID(),expectedQuote:uncommon.quoteKey});
  assert.equal(failQuality.status,200);
  const lost=await failQuality.json();
  assert.deepEqual([lost.success,lost.qualityId,lost.experienceGained,await balance()],[false,'uncommon',0,'0']);
  assert.equal((await pool.query('SELECT experience FROM character_smith_progress WHERE character_id=$1',[characterId])).rows[0].experience,1903);
 }finally{
  try{
   if(characterId){
    await pool.query('DELETE FROM wallet_ledger WHERE character_id=$1',[characterId]);
    await pool.query('DELETE FROM characters WHERE id=$1',[characterId]);
   }
   if(accountId)await pool.query('DELETE FROM accounts WHERE id=$1',[accountId]);
   if(previousRevision)await pool.query(
    "UPDATE content_revisions SET status='archived' WHERE id=$1 AND status='published'",[revisionId])
    .then(()=>pool.query("UPDATE content_revisions SET status='published' WHERE id=$1",[previousRevision]));
  }finally{await new Promise(resolve=>server.close(resolve));await pool.end();}
 }
});
