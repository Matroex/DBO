import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {grantItem,listInventory} from '../src/inventory/repository.mjs';
import {equipItem,unequipItem} from '../src/inventory/equipment.mjs';
test('separate loadouts, requirements, occupied slots and safe unequip',async()=>{
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});const c=await pool.connect();
 try{
 await c.query('BEGIN');
 const a=(await c.query('INSERT INTO accounts(login,password_hash) VALUES($1,$2) RETURNING id',['eq_'+randomUUID(),'test'])).rows[0].id;
 const id=(await c.query("INSERT INTO characters(account_id,name,race_id,slot) VALUES($1,'Equipment test','saiyan',0) RETURNING id",[a])).rows[0].id;
 const rev=(await c.query("INSERT INTO content_revisions(schema_version) VALUES(1) RETURNING id")).rows[0].id;
 await c.query("INSERT INTO content_definitions(revision_id,kind,definition_id,data) VALUES($1,'item','test-sword',$2)",[rev,JSON.stringify({qualityIds:['common'],stackable:false,slot:'weapon',requiredLevel:1,requiredRace:'saiyan'})]);
 const items=await grantItem(c,{characterId:id,revisionId:rev,definitionId:'test-sword',qualityId:'common',quantity:2,capacity:2});
 const input={characterId:id,itemId:items[0].id,revisionId:rev,set:'main',slot:'weapon'};
 await assert.rejects(equipItem(c,{...input,slot:'boots'}),/Wrong/);
 await equipItem(c,input);
 await assert.rejects(equipItem(c,{...input,itemId:items[1].id}),/occupied/);
 await equipItem(c,{...input,itemId:items[1].id,set:'pvp'});
 assert.deepEqual((await listInventory(c,id)).map(x=>x.equipment_slot),['main:weapon','pvp:weapon']);
 assert.equal((await unequipItem(c,{characterId:id,set:'main',slot:'weapon',capacity:1})).bagSlot,0);
 await assert.rejects(unequipItem(c,{characterId:id,set:'pvp',slot:'weapon',capacity:1}),/Inventory full/);
 }finally{await c.query('ROLLBACK');c.release();await pool.end();}
});
