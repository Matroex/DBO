import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {grantItem,moveBagItem,listInventory} from '../src/inventory/repository.mjs';
test('grant distinct equipment, swap slots and reject full bag',async()=>{
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});const c=await pool.connect();
 try{
 await c.query('BEGIN');
 const a=(await c.query('INSERT INTO accounts(login,password_hash) VALUES($1,$2) RETURNING id',['inv_'+randomUUID(),'test'])).rows[0].id;
 const id=(await c.query("INSERT INTO characters(account_id,name,race_id,slot) VALUES($1,'Inventory test','saiyan',0) RETURNING id",[a])).rows[0].id;
 const rev=(await c.query("INSERT INTO content_revisions(schema_version) VALUES(1) RETURNING id")).rows[0].id;
 await c.query("INSERT INTO content_definitions(revision_id,kind,definition_id,data) VALUES($1,'item','test-sword',$2)",[rev,JSON.stringify({qualityIds:['common'],stackable:false})]);
 const input={characterId:id,revisionId:rev,definitionId:'test-sword',qualityId:'common',quantity:2,capacity:2};
 const items=await grantItem(c,input);
 assert.equal(items.length,2);assert.notEqual(items[0].id,items[1].id);
 await assert.rejects(grantItem(c,{...input,quantity:1}),/Inventory full/);
 await moveBagItem(c,{characterId:id,itemId:items[0].id,destination:1,capacity:2});
 const list=await listInventory(c,id);assert.equal(list[0].id,items[1].id);assert.equal(list[1].id,items[0].id);
 }finally{await c.query('ROLLBACK');c.release();await pool.end();}
});
