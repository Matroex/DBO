import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {changeWallet} from '../src/economy/wallet.mjs';
test('wallet credit, replay, conflict and insufficient funds',async()=>{
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
 const c=await pool.connect();
 try{
 await c.query('BEGIN');
 const a=(await c.query('INSERT INTO accounts(login,password_hash) VALUES($1,$2) RETURNING id',['wallet_'+randomUUID(),'test'])).rows[0].id;
 const id=(await c.query("INSERT INTO characters(account_id,name,race_id,slot) VALUES($1,'Wallet test','saiyan',0) RETURNING id",[a])).rows[0].id;
 const op={characterId:id,currencyId:'gold',delta:100n,operationId:randomUUID(),reason:'test reward'};
 assert.deepEqual(await changeWallet(c,op),{balance:'100',replayed:false});
 assert.deepEqual(await changeWallet(c,op),{balance:'100',replayed:true});
 await assert.rejects(changeWallet(c,{...op,delta:101n}),/conflict/);
 await assert.rejects(changeWallet(c,{...op,delta:-101n,operationId:randomUUID()}),/Insufficient/);
 assert.deepEqual(await changeWallet(c,{...op,delta:-30n,operationId:randomUUID(),reason:'purchase'}),{balance:'70',replayed:false});
 assert.equal((await c.query('SELECT count(*) FROM wallet_ledger WHERE character_id=$1',[id])).rows[0].count,'2');
 }finally{await c.query('ROLLBACK');c.release();await pool.end();}
});
