import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {resolveRecordedDuel} from '../src/battle/duel-service.mjs';
import {grantRecordedRewards} from '../src/battle/rewards.mjs';
const hit={attack:0,armor:0,attackerSpeed:0,defenderSpeed:0,technique:false,penetrationPct:0,criticalChancePct:0,criticalBonusPct:0,criticalReductionPct:0,averageDamagePct:0,outgoingRacePct:0,incomingRacePct:0,techniqueReductionPct:0,intelligenceReduction:0,guardReduction:0};
const participant=(attack,speed)=>({fighter:{hp:100,ki:100,attack,armor:0,speed,intelligence:0,kiStat:0,techniquePvm:0,techniquePvp:0,techniqueValuePct:0,techniqueDamagePct:0,normal:hit,technique:hit,stunChancePct:0,stunResistancePct:0,bleedTurns:0,bleedDamage:0,stunTurns:0,guardTurns:0,guardReduction:0,lastTechniqueRound:{}},moves:[],enemyStatsReductionPct:0});
test('recorded battle rewards are atomic, concurrent-safe and owner-bound',async()=>{
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
 try{
 const a=(await pool.query('INSERT INTO accounts(login,password_hash) VALUES($1,$2) RETURNING id',['battle_'+randomUUID(),'test'])).rows[0].id;
 const make=async(slot)=>(await pool.query("INSERT INTO characters(account_id,name,race_id,slot) VALUES($1,$2,'saiyan',$3) RETURNING id",[a,'Battle '+slot,slot])).rows[0].id;
 const characterId=await make(0),other=await make(1);
 const revisionId=(await pool.query("INSERT INTO content_revisions(schema_version) VALUES(1) RETURNING id")).rows[0].id;
 await pool.query("INSERT INTO content_definitions(revision_id,kind,definition_id,data) SELECT $1,kind,definition_id,data FROM content_definitions WHERE revision_id=(SELECT id FROM content_revisions WHERE status='published') AND kind='combat_rules' AND definition_id IN ('hit','techniques','duel','experience')",[revisionId]);
 await pool.query("INSERT INTO content_definitions(revision_id,kind,definition_id,data) VALUES($1,'item','test-battle-loot',$2)",[revisionId,JSON.stringify({qualityIds:['common'],stackable:true})]);
 const win=await resolveRecordedDuel(pool,{characterId,revisionId,mode:'story',player:participant(100,100),enemy:participant(100,50)},()=>.5);
 assert.equal(win.outcome,'win');
 const key={battleId:win.battleId,characterId};
 const plan=()=>({xp:100n,gold:25n,items:[{definitionId:'test-battle-loot',qualityId:'common',quantity:2}]});
 await assert.rejects(grantRecordedRewards(pool,{...key,characterId:other},plan),/not eligible/);
 await assert.rejects(grantRecordedRewards(pool,key,()=>({...plan(),items:[{definitionId:'missing',qualityId:'common',quantity:1}]})),/Unknown item/);
 assert.equal((await pool.query('SELECT experience FROM characters WHERE id=$1',[characterId])).rows[0].experience,'0');
 assert.equal((await pool.query('SELECT count(*) FROM wallet_ledger WHERE character_id=$1',[characterId])).rows[0].count,'0');
 const results=await Promise.all([grantRecordedRewards(pool,key,plan),grantRecordedRewards(pool,key,plan)]);
 assert.equal(results.filter(x=>x.replayed).length,1);
 assert.deepEqual(results[0].reward,results[1].reward);
 assert.equal((await pool.query('SELECT experience FROM characters WHERE id=$1',[characterId])).rows[0].experience,'100');
 assert.equal((await pool.query("SELECT balance FROM wallets WHERE character_id=$1 AND currency_id='gold'",[characterId])).rows[0].balance,'25');
 assert.equal((await pool.query('SELECT sum(quantity) AS n FROM inventory_items WHERE character_id=$1',[characterId])).rows[0].n,'2');
 const loss=await resolveRecordedDuel(pool,{characterId,revisionId,mode:'story',player:participant(100,50),enemy:participant(100,100)},()=>.5);
 assert.equal(loss.outcome,'loss');
 await assert.rejects(grantRecordedRewards(pool,{battleId:loss.battleId,characterId},plan),/not eligible/);
 }finally{await pool.end();}
});
