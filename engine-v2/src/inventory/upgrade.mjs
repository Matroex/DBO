import {createHash,randomInt} from 'node:crypto';
import {quoteUpgrade,resolveUpgrade} from '../../dist/domain/upgrade.js';
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

async function loadContext(db,characterId,race,bonuses){
 const {rows:[revision]}=await db.query("SELECT id FROM content_revisions WHERE status='published'");
 if(!revision)throw Error('Missing published content');
 const {rows:content}=await db.query(
  "SELECT kind,definition_id,data FROM content_definitions WHERE revision_id=$1 AND (kind='item' OR (kind='combat_rules' AND definition_id='item_scaling') OR (kind='recipe' AND definition_id='equipment-upgrades'))",[revision.id]);
 const {definitions,catalog}=readCatalog(content.filter(row=>row.kind==='item'));
 if(!bonuses){
  const {rows:[skill]}=await db.query("SELECT level FROM character_skills WHERE character_id=$1 AND skill_id='kowalstwo'",[characterId]);
  bonuses={smithRank:skill?.level??0};
 }
 const overrides=content.find(row=>row.kind==='recipe')?.data;
 const scaling=validateItemScalingRules(content.find(row=>row.kind==='combat_rules')?.data);
 return {revision,definitions,scaling,context:{race,catalog,bonuses,overrides}};
}

function itemQuality(source,row,scaling){
 if(source?.stackable!==false||typeof source.slot!=='string'||!Array.isArray(source.qualityIds))return -1;
 const quality=source.qualityIds.indexOf(row.quality_id);
 return quality<scaling.qualityMultipliers.length?quality:-1;
}
const quoteKey=(revision,row,quote)=>createHash('sha256')
 .update(JSON.stringify([revision.id,row.definition_id,row.quality_id,row.upgrade_level,quote])).digest('hex');

export async function listBagUpgrades(pool,{accountId,characterId}){
 const db=await pool.connect();
 try{
  await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const {rows:[character]}=await db.query('SELECT race_id FROM characters WHERE id=$1 AND account_id=$2',[characterId,accountId]);
  if(!character)throw Error('Character missing');
  const {revision,definitions,scaling,context}=await loadContext(db,characterId,character.race_id);
  const {rows}=await db.query('SELECT id,definition_id,upgrade_level,quality_id,quantity FROM inventory_items WHERE character_id=$1 AND bag_slot IS NOT NULL ORDER BY bag_slot',[characterId]);
  const {rows:[wallet]}=await db.query("SELECT balance FROM wallets WHERE character_id=$1 AND currency_id='gold'",[characterId]);
  const quantityById=new Map();
  for(const row of rows)quantityById.set(row.definition_id,(quantityById.get(row.definition_id)??0n)+BigInt(row.quantity));
  const items=[];
  for(const row of rows){
   const source=definitions.get(row.definition_id);
   if(BigInt(row.quantity)!==1n||itemQuality(source,row,scaling)<0)continue;
   const quote=quoteUpgrade(row.definition_id,row.upgrade_level,context);
   if(!quote||quote.requiresReforge&&!quote.targetId)continue;
   items.push({id:row.id,name:source.name??row.definition_id,level:row.upgrade_level,quote,quoteKey:quoteKey(revision,row,quote),
    targetName:quote.targetId?(definitions.get(quote.targetId)?.name??quote.targetId):null,
    materials:quote.materials.map(entry=>({...entry,name:definitions.get(entry.id)?.name??entry.id,
     available:(quantityById.get(entry.id)??0n).toString()}))});
  }
  await db.query('COMMIT');
  return {smithRank:context.bonuses.smithRank,gold:wallet?.balance??'0',items};
 }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}

// Internal service. Bonuses come from server-side character state, never request data.
export async function upgradeBagItem(pool,{accountId,characterId,itemId,operationId,expectedQuote,bonuses}){
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
  const {revision,definitions,scaling,context}=await loadContext(db,characterId,character.race_id,bonuses);
  const source=definitions.get(row.definition_id);
  const quality=itemQuality(source,row,scaling);
  if(quality<0)throw Error('Invalid upgrade item');
  const instance={id:row.id,definitionId:row.definition_id,quality,level:row.upgrade_level,bagSlot:row.bag_slot,
   attributes:row.attributes,inheritance:row.attributes.inheritance??{}};
  const outcome=resolveUpgrade(instance,context,scaling,randomInt(1_000_000_000)/1_000_000_000);
  if(!outcome)throw Error('Upgrade unavailable');
  const {quote,success,item}=outcome;
  if(expectedQuote!==undefined&&expectedQuote!==quoteKey(revision,row,quote))throw Error('Upgrade item changed');
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
