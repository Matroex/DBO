import {grantItem,defaultBagCapacity} from '../inventory/repository.mjs';
// Internal only. Ownership must be verified by the service before calling.
export async function claimWorldLoot(pool,{characterId,battleId}){
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  const lock=await c.query('SELECT id FROM characters WHERE id=$1 FOR UPDATE',[characterId]);
  if(!lock.rowCount)throw Error('Character missing');
  const q=await c.query('SELECT * FROM active_world_battles WHERE id=$1 AND character_id=$2 FOR UPDATE',[battleId,characterId]);
  const row=q.rows[0];if(!row)throw Error('Battle missing');
  if(row.status!=='finished')throw Error('Battle still running');
  const state=row.state;
  if(state.lootClaimed===true){await c.query('COMMIT');return {replayed:true,items:state.claimedLoot??[]};}
  const loot=state.pendingLoot??[];
  if(!Array.isArray(loot))throw Error('Invalid pending loot');
  const items=[];
  for(const item of loot){
   if(!Number.isSafeInteger(item.quantity)||item.quantity<1)throw Error('Invalid pending loot quantity');
   let remaining=item.quantity;
   while(remaining>0){
    const quantity=Math.min(remaining,1000000);
    items.push(...await grantItem(c,{characterId,revisionId:row.revision_id,definitionId:item.definitionId,qualityId:item.qualityId,quantity,capacity:defaultBagCapacity}));
    remaining-=quantity;
   }
  }
  state.pendingLoot=[];state.lootClaimed=true;state.claimedLoot=items;
  await c.query('UPDATE active_world_battles SET state=$2::jsonb,version=version+1,updated_at=now() WHERE id=$1',[battleId,JSON.stringify(state)]);
  await c.query('COMMIT');return {replayed:false,items};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
