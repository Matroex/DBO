import {randomUUID} from 'node:crypto';
import {advanceWorldBattle} from '../../dist/domain/world-battle.js';
import {updateWorldBattle} from './world-repository.mjs';
import {grantExperience} from '../character/progression.mjs';
import {changeWallet} from '../economy/wallet.mjs';
const beanIds={red:'zen-bean-red',blue:'zen-bean-blue',green:'zen-bean-green'};
// Internal only. Context and reward plans must be derived from trusted server data.
export async function settleWorldBattle(pool,{characterId,battleId},buildContext,calculateKill){
 return updateWorldBattle(pool,{characterId,battleId},async(c,state,row)=>{
  const context=await buildContext(c,state,row);
  const inventory=(await c.query('SELECT id,definition_id,quantity FROM inventory_items WHERE character_id=$1 AND bag_slot IS NOT NULL AND definition_id=ANY($2::text[]) ORDER BY bag_slot FOR UPDATE',[characterId,Object.values(beanIds)])).rows;
  const used=new Map(),kills=[];
  const consume=color=>{
   const item=inventory.find(i=>i.definition_id===beanIds[color]&&Number(i.quantity)>0);
   if(!item)return false;item.quantity=Number(item.quantity)-1;used.set(item.id,item.quantity);return true;
  };
  advanceWorldBattle(state,Math.max(state.processedThrough,Date.now()),{...context,consume,onKill:(enemy,at)=>kills.push({enemy:structuredClone(enemy),at})},1000);
  for(const [id,qty] of used){
   if(qty===0)await c.query('DELETE FROM inventory_items WHERE id=$1 AND character_id=$2',[id,characterId]);
   else await c.query('UPDATE inventory_items SET quantity=$2 WHERE id=$1 AND character_id=$3',[id,qty,characterId]);
  }
  let xp=0n,gold=0n;
  const loot=Array.isArray(state.pendingLoot)?state.pendingLoot:[];
  for(const kill of kills){
   const plan=await calculateKill(c,row,kill);
   if(typeof plan.xp!=='bigint'||plan.xp<0n||typeof plan.gold!=='bigint'||plan.gold<0n||!Array.isArray(plan.items))throw Error('Invalid world reward plan');
   xp+=plan.xp;gold+=plan.gold;
   for(const item of plan.items){
    if(typeof item.definitionId!=='string'||typeof item.qualityId!=='string'||!Number.isSafeInteger(item.quantity)||item.quantity<1)throw Error('Invalid world loot');
    const old=loot.find(x=>x.definitionId===item.definitionId&&x.qualityId===item.qualityId);
    if(old){old.quantity+=item.quantity;if(!Number.isSafeInteger(old.quantity))throw Error('Loot overflow');}
    else loot.push({definitionId:item.definitionId,qualityId:item.qualityId,quantity:item.quantity});
   }
  }
  if(xp>0n)await grantExperience(c,characterId,row.revision_id,xp);
  if(gold>0n)await changeWallet(c,{characterId,currencyId:'gold',delta:gold,operationId:randomUUID(),reason:'world_battle_reward'});
  state.pendingLoot=loot;state.earnedXp=(BigInt(state.earnedXp??'0')+xp).toString();state.earnedGold=(BigInt(state.earnedGold??'0')+gold).toString();
  return state;
 });
}
