// Internal operation; caller must own the transaction and authorize the character.
const currencies=new Set(['gold','zeni','dragon_coin']);
export async function changeWallet(client,{characterId,currencyId,delta,operationId,reason}){
 if(!currencies.has(currencyId)||typeof reason!=='string'||!reason.trim()||reason.length>256)throw Error('Invalid wallet operation');
 if(typeof delta!=='bigint'||delta===0n||delta.toString().replace('-','').length>40)throw Error('Invalid wallet delta');
 await client.query('INSERT INTO wallets(character_id,currency_id,balance) VALUES($1,$2,0) ON CONFLICT DO NOTHING',[characterId,currencyId]);
 const locked=await client.query('SELECT balance FROM wallets WHERE character_id=$1 AND currency_id=$2 FOR UPDATE',[characterId,currencyId]);
 const balance=BigInt(locked.rows[0].balance);
 const previous=await client.query('SELECT delta,reason FROM wallet_ledger WHERE character_id=$1 AND currency_id=$2 AND operation_id=$3',[characterId,currencyId,operationId]);
 if(previous.rowCount){
 if(BigInt(previous.rows[0].delta)!==delta||previous.rows[0].reason!==reason)throw Error('Operation conflict');
 return {balance:balance.toString(),replayed:true};
 }
 const next=balance+delta;
 if(next<0n)throw Error('Insufficient funds');
 if(next.toString().length>40)throw Error('Wallet overflow');
 await client.query('UPDATE wallets SET balance=$3 WHERE character_id=$1 AND currency_id=$2',[characterId,currencyId,next.toString()]);
 await client.query('INSERT INTO wallet_ledger(character_id,currency_id,delta,operation_id,reason) VALUES($1,$2,$3,$4,$5)',[characterId,currencyId,delta.toString(),operationId,reason]);
 return {balance:next.toString(),replayed:false};
}
