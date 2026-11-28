import {claimBattleReward} from './repository.mjs';
import {grantExperience} from '../character/progression.mjs';
import {changeWallet} from '../economy/wallet.mjs';
import {grantItem,defaultBagCapacity} from '../inventory/repository.mjs';

// Internal only: calculate must derive rewards from the stored battle and pinned content.
export async function grantRecordedRewards(pool,{battleId,characterId},calculate){
 return claimBattleReward(pool,{battleId,characterId},async(c,battle)=>{
  await c.query('SELECT id FROM characters WHERE id=$1 FOR UPDATE',[characterId]);
  const plan=await calculate(c,battle);
  if(typeof plan.xp!=='bigint'||plan.xp<0n||typeof plan.gold!=='bigint'||plan.gold<0n||!Array.isArray(plan.items))throw Error('Invalid reward plan');
  const progression=await grantExperience(c,characterId,battle.revision_id,plan.xp);
  const wallet=plan.gold===0n?null:await changeWallet(c,{characterId,currencyId:'gold',delta:plan.gold,operationId:battleId,reason:'battle_reward'});
  const items=[];
  for(const item of plan.items)items.push(...await grantItem(c,{characterId,revisionId:battle.revision_id,definitionId:item.definitionId,qualityId:item.qualityId,quantity:item.quantity,capacity:defaultBagCapacity}));
  return {xp:plan.xp.toString(),gold:plan.gold.toString(),progression,wallet,items};
 });
}
