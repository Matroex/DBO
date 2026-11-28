import {randomInt} from 'node:crypto';
import {resolveUpgrade} from '../../dist/domain/upgrade.js';
import {validateItemScalingRules} from '../../dist/domain/item-scaling.js';
import {changeWallet} from '../economy/wallet.mjs';

function readCatalog(rows){
 const definitions=new Map(),catalog=new Map();
 for(const {definition_id:id,data} of rows){
  definitions.set(id,data);
  const {slot,name=id,qualityIds,defaultQualityId=qualityIds?.[0],requiredRace,base={}}=data;
  // qualityIds are ordered by the scaling rules, from lowest to highest.
  const quality=Array.isArray(qualityIds)?qualityIds.indexOf(defaultQualityId):-1;
  catalog.set(id,{id,slot,name,quality,requiredRace,base});
 }
 return {definitions,catalog};
}

async function consumeMaterials(db,characterId,itemId,materials){
 const costs=new Map();
 for(const {id,count} of materials)costs.set(id,(costs.get(id)??0n)+BigInt(count));
 if(!costs.size)return;
 const {rows}=await db.query(
  'SELECT id,definition_id,quantity FROM inventory_items WHERE character_id=$1 AND id<>$2 AND bag_slot IS NOT NULL AND definition_id=ANY($3::text[]) ORDER BY bag_slot DESC FOR UPDATE',
  [characterId,itemId,[...costs.keys()]]);
 const deductions=[];
 for(const row of rows){
  const remaining=costs.get(row.definition_id);
  const quantity=BigInt(row.quantity);
  const consumed=remaining<quantity?remaining:quantity;
  if(!consumed)continue;
  deductions.push([row.id,quantity-consumed]);
  costs.set(row.definition_id,remaining-consumed);
 }
 if([...costs.values()].some(count=>count>0n))throw Error('Insufficient upgrade materials');
 for(const [id,left] of deductions){
  if(left)await db.query('UPDATE inventory_items SET quantity=$2 WHERE id=$1',[id,left.toString()]);
  else await db.query('DELETE FROM inventory_items WHERE id=$1',[id]);
 }
}

// Internal service. Bonuses come from server-side character state, never request data.
export async function upgradeBagItem(pool,{accountId,characterId,itemId,operationId,bonuses}){
 const db=await pool.connect();
 try{
  await db.query('BEGIN');
  const {rows:[character]}=await db.query(
   'SELECT race_id FROM characters WHERE id=$1 AND account_id=$2 FOR UPDATE',[characterId,accountId]);
  if(!character)throw Error('Character missing');
  const {rows:[previous]}=await db.query(
   'SELECT item_id,result FROM upgrade_attempts WHERE character_id=$1 AND operation_id=$2',[characterId,operationId]);
  if(previous){
   if(previous.item_id!==itemId.toLowerCase())throw Error('Upgrade operation conflict');
   await db.query('COMMIT');
   return previous.result;
  }
  const {rows:[row]}=await db.query(
   'SELECT * FROM inventory_items WHERE character_id=$1 AND id=$2 AND bag_slot IS NOT NULL AND quantity=1 FOR UPDATE',[characterId,itemId]);
  if(!row)throw Error('Upgrade item unavailable');
  const {rows:[revision]}=await db.query("SELECT id FROM content_revisions WHERE status='published'");
  if(!revision)throw Error('Missing published content');
  const {rows:content}=await db.query(
   "SELECT kind,definition_id,data FROM content_definitions WHERE revision_id=$1 AND (kind='item' OR (kind='combat_rules' AND definition_id='item_scaling') OR (kind='recipe' AND definition_id='equipment-upgrades'))",[revision.id]);
  const {definitions,catalog}=readCatalog(content.filter(row=>row.kind==='item'));
  const source=definitions.get(row.definition_id);
  const quality=Array.isArray(source?.qualityIds)?source.qualityIds.indexOf(row.quality_id):-1;
  const scaling=validateItemScalingRules(content.find(row=>row.kind==='combat_rules')?.data);
  if(source?.stackable!==false||typeof source.slot!=='string'||quality<0||quality>=scaling.qualityMultipliers.length)throw Error('Invalid upgrade item');
  const overrides=content.find(row=>row.kind==='recipe')?.data;
  const instance={id:row.id,definitionId:row.definition_id,quality,level:row.upgrade_level,bagSlot:row.bag_slot,
   attributes:row.attributes,inheritance:row.attributes.inheritance??{}};
  const outcome=resolveUpgrade(instance,{race:character.race_id,catalog,bonuses,overrides},scaling,randomInt(1_000_000_000)/1_000_000_000);
  if(!outcome)throw Error('Upgrade unavailable');
  const {quote,success,item}=outcome;
  const target=definitions.get(item.definitionId);
  const qualityId=target?.qualityIds?.[item.quality];
  if(target?.stackable!==false||!qualityId||item.level>2147483647)throw Error('Invalid upgrade result');
  if(quote.gold){
   const debit=await changeWallet(db,{characterId,currencyId:'gold',delta:-BigInt(quote.gold),operationId,reason:'equipment_upgrade'});
   if(debit.replayed)throw Error('Upgrade operation conflict');
  }
  await consumeMaterials(db,characterId,row.id,quote.materials);
  if(success){
   const attributes=quote.requiresReforge?{...item.attributes,inheritance:item.inheritance}:item.attributes;
   await db.query('UPDATE inventory_items SET definition_id=$2,quality_id=$3,upgrade_level=$4,attributes=$5 WHERE id=$1',
    [row.id,item.definitionId,qualityId,item.level,JSON.stringify(attributes)]);
  }
  const result={success,quote,itemId:row.id,definitionId:item.definitionId,qualityId,level:item.level,bagSlot:item.bagSlot};
  await db.query('INSERT INTO upgrade_attempts(character_id,operation_id,item_id,revision_id,result) VALUES($1,$2,$3,$4,$5)',
   [characterId,operationId,row.id,revision.id,JSON.stringify(result)]);
  await db.query('COMMIT');
  return result;
 }catch(error){
  await db.query('ROLLBACK');
  throw error;
 }finally{db.release();}
}
