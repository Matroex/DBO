import {changeWallet} from '../economy/wallet.mjs';
import {grantItem,defaultBagCapacity} from '../inventory/repository.mjs';
// Internal only. Ownership must be verified by the service before calling.
export async function claimWorldLoot(pool,{characterId,battleId,sell=[]}){
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  const lock=await c.query('SELECT id FROM characters WHERE id=$1 FOR UPDATE',[characterId]);
  if(!lock.rowCount)throw Error('Character missing');
  const q=await c.query('SELECT * FROM active_world_battles WHERE id=$1 AND character_id=$2 FOR UPDATE',[battleId,characterId]);
  const row=q.rows[0];if(!row)throw Error('Battle missing');
  if(row.status!=='finished')throw Error('Battle still running');
  const state=row.state;
  if(state.lootClaimed===true){await c.query('COMMIT');return {replayed:true,items:state.claimedLoot??[],soldGold:state.soldGold??'0'};}
  const loot=state.pendingLoot??[];
  if(!Array.isArray(loot))throw Error('Invalid pending loot');
  if(!Array.isArray(sell)||sell.some(i=>!Number.isSafeInteger(i)||i<0||i>=loot.length)||new Set(sell).size!==sell.length)throw Error('Invalid sale selection');
  const selected=new Set(sell);let soldGold=0n;
  const items=[];
  for(const [index,item] of loot.entries()){
   if(!Number.isSafeInteger(item.quantity)||item.quantity<1)throw Error('Invalid pending loot quantity');
   if(selected.has(index)){
    const def=await c.query("SELECT data FROM content_definitions WHERE revision_id=$1 AND kind='item' AND definition_id=$2",[row.revision_id,item.definitionId]);
    const d=def.rows[0]?.data;
    if(!d||d.sellable===false||item.definitionId==='quest-turtle-stone'||!Number.isSafeInteger(d.sell)||d.sell<=0)throw Error('Item cannot be sold');
    soldGold+=BigInt(d.sell)*BigInt(item.quantity);continue;
   }
   let remaining=item.quantity;
   while(remaining>0){
    const quantity=Math.min(remaining,1000000);
    items.push(...await grantItem(c,{characterId,revisionId:row.revision_id,definitionId:item.definitionId,qualityId:item.qualityId,quantity,capacity:defaultBagCapacity}));
    remaining-=quantity;
   }
  }
  if(soldGold>0n)await changeWallet(c,{characterId,currencyId:'gold',delta:soldGold,operationId:battleId,reason:'world_loot_sale'});
  state.soldGold=soldGold.toString();state.pendingLoot=[];state.lootClaimed=true;state.claimedLoot=items;
  await c.query('UPDATE active_world_battles SET state=$2::jsonb,version=version+1,updated_at=now() WHERE id=$1',[battleId,JSON.stringify(state)]);
  await c.query('COMMIT');return {replayed:false,items,soldGold:state.soldGold};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
