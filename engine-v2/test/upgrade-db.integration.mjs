import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import pg from 'pg';
import {upgradeBagItem} from '../src/inventory/upgrade.mjs';
import {newSession} from '../src/auth/credentials.mjs';
import {makeServer} from '../src/server.mjs';

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
   for(const id of ['starter-red-staff','sayan-50-miecz']){
    await setup.query("INSERT INTO content_definitions(revision_id,kind,definition_id,data) VALUES($1,'item',$2,$3) ON CONFLICT(revision_id,kind,definition_id) DO UPDATE SET data=EXCLUDED.data",
     [revisionId,id,{slot:'weapon',stackable:false,qualityIds:['common'],requiredRace:'saiyan',base:{attack:10}}]);
   }
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
  const view=await (await fetch(path,{headers})).json();
  const entry=view.items.find(item=>item.id===itemId);
  assert.equal(view.smithRank,1);
  assert.equal(entry.quote.gold,50000);
  const body={itemId,operationId:request.operationId,expectedQuote:entry.quoteKey};
  const post=input=>fetch(path,{method:'POST',headers,body:JSON.stringify(input)});
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
  const {rows}=await pool.query('SELECT id,quantity,attributes FROM inventory_items WHERE character_id=$1 ORDER BY bag_slot',[characterId]);
  assert.deepEqual(rows.map(row=>[row.id,row.quantity]),[[itemId,'1'],[dustId,'2']]);
  assert.deepEqual(rows[0].attributes.plans,[1]);
  assert.ok(rows[0].attributes.inheritance.attack>0);
  assert.equal((await pool.query('SELECT 1 FROM wallet_ledger WHERE character_id=$1',[characterId])).rowCount,1);
  await pool.query("UPDATE wallets SET balance=55000 WHERE character_id=$1 AND currency_id='gold'",[characterId]);
  const failed=await upgradeBagItem(pool,{...request,operationId:randomUUID(),bonuses:{smithRank:1,main:-1}});
  assert.deepEqual([failed.success,failed.level,await balance()],[false,0,'0']);
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
