import {createHash,randomInt} from 'node:crypto';
import {changeWallet} from '../economy/wallet.mjs';
import {defaultBagCapacity,grantItem} from './repository.mjs';
import {consumeMaterials} from './upgrade.mjs';
import {recordSmithExperience} from './smith-experience.mjs';

async function transaction(pool,input,mutate,fn){
 const db=await pool.connect();
 try{
  await db.query(mutate?'BEGIN':'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const {rows:[character]}=await db.query(
   'SELECT race_id FROM characters WHERE id=$1 AND account_id=$2'+(mutate?' FOR UPDATE':''),
   [input.characterId,input.accountId]);
  if(!character)throw Error('Character missing');
  const result=await fn(db,character.race_id);
  await db.query('COMMIT');
  return result;
 }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}

async function getCatalog(db,race){
 const {rows:[revision]}=await db.query("SELECT id FROM content_revisions WHERE status='published'");
 if(!revision)throw Error('Missing published content');
 const {rows}=await db.query("SELECT kind,definition_id,data FROM content_definitions WHERE revision_id=$1 AND (kind='item' OR kind='recipe' AND definition_id='smith-crafting')",[revision.id]);
 const items=new Map(rows.filter(row=>row.kind==='item').map(row=>[row.definition_id,row.data]));
 const recipes=new Map();
 const data=rows.find(row=>row.kind==='recipe')?.data??{};
 for(const [id,recipe] of Object.entries(data)){
  if(!recipe||typeof recipe.name!=='string'||!Number.isSafeInteger(recipe.level)||recipe.level<1||
    !Number.isSafeInteger(recipe.gold)||recipe.gold<0||!Number.isFinite(recipe.chance)||recipe.chance<=0||recipe.chance>100||
    (recipe.race&&recipe.race!==race)||!Array.isArray(recipe.outputs)||!recipe.outputs.length||
    new Set(recipe.outputs).size!==recipe.outputs.length||!Array.isArray(recipe.materials)||recipe.materials.length>30)continue;
  if(!recipe.outputs.every(id=>{
   const item=items.get(id);
   return item?.stackable===false&&(!item.requiredRace||item.requiredRace===race)&&item.requiredLevel===recipe.level&&
    item.qualityIds?.includes('common');
  }))continue;
  if(!recipe.materials.every(row=>row&&items.has(row.id)&&!recipe.outputs.includes(row.id)&&
    Number.isSafeInteger(row.count)&&row.count>=1&&row.count<=4000)||
    new Set(recipe.materials.map(row=>row.id)).size!==recipe.materials.length)continue;
  const quote={name:recipe.name,level:recipe.level,chance:recipe.chance,gold:recipe.gold,
   materials:recipe.materials.map(({id,count})=>({id,count})),outputs:recipe.outputs};
  const quoteKey=createHash('sha256').update(JSON.stringify([revision.id,id,quote])).digest('hex');
  recipes.set(id,{...quote,quoteKey});
 }
 return {items,recipes,revisionId:revision.id};
}

export function listCrafts(pool,input){
 return transaction(pool,input,false,async(db,race)=>{
  const {characterId}=input;
  const {items,recipes}=await getCatalog(db,race);
  const {rows:[pending]}=await db.query("SELECT operation_id,result FROM craft_attempts WHERE character_id=$1 AND status='pending'",[characterId]);
  const {rows:[wallet]}=await db.query("SELECT balance FROM wallets WHERE character_id=$1 AND currency_id='gold'",[characterId]);
  const {rows:stock}=await db.query('SELECT definition_id,sum(quantity)::text AS quantity FROM inventory_items WHERE character_id=$1 AND bag_slot IS NOT NULL GROUP BY definition_id',[characterId]);
  const counts=new Map(stock.map(row=>[row.definition_id,row.quantity]));
  return {gold:wallet?.balance??'0',pending:pending?{operationId:pending.operation_id,...pending.result}:null,
   recipes:[...recipes].map(([id,recipe])=>({id,...recipe,
    outputs:recipe.outputs.map(id=>items.get(id).name),
    materials:recipe.materials.map(row=>({...row,name:items.get(row.id).name,available:counts.get(row.id)??'0'}))}))};
 });
}

export function attemptCraft(pool,input){
 return transaction(pool,input,true,async(db,race)=>{
  const {characterId,operationId,recipeId,expectedQuote}=input;
  const {rows:[prior]}=await db.query('SELECT recipe_id,result FROM craft_attempts WHERE character_id=$1 AND operation_id=$2',[characterId,operationId]);
  if(prior){
   if(prior.recipe_id!==recipeId)throw Error('Upgrade operation conflict');
   return prior.result;
  }
  const active=await db.query("SELECT 1 FROM craft_attempts WHERE character_id=$1 AND status='pending'",[characterId]);
  if(active.rowCount)throw Error('Craft pending');
  const {items,recipes,revisionId}=await getCatalog(db,race);
  const recipe=recipes.get(recipeId);
  if(!recipe||recipe.quoteKey!==expectedQuote)throw Error('Upgrade item changed');
  if(recipe.gold){
   const debit=await changeWallet(db,{characterId,currencyId:'gold',delta:-BigInt(recipe.gold),operationId,reason:'equipment_craft'});
   if(debit.replayed)throw Error('Upgrade operation conflict');
  }
  await consumeMaterials(db,characterId,null,recipe.materials);
  const success=randomInt(1_000_000_000)/10_000_000<recipe.chance;
  const definitionId=success?recipe.outputs[randomInt(recipe.outputs.length)]:null;
  const award=await recordSmithExperience(db,{characterId,operationId,kind:'craft',tier:recipe.level,success});
  if(award.replayed)throw Error('Upgrade operation conflict');
  const result={success,definitionId,name:definitionId?items.get(definitionId).name:null,experienceGained:award.gained};
  await db.query('INSERT INTO craft_attempts(character_id,operation_id,revision_id,recipe_id,status,result) VALUES($1,$2,$3,$4,$5,$6)',
   [characterId,operationId,revisionId,recipeId,success?'pending':'failed',JSON.stringify(result)]);
  return result;
 });
}

export function finishCraft(pool,input){
 return transaction(pool,input,true,async db=>{
  const {characterId,operationId,action}=input;
  const {rows:[row]}=await db.query('SELECT status,result,revision_id,delivered_item_id FROM craft_attempts WHERE character_id=$1 AND operation_id=$2',[characterId,operationId]);
  if(!row)throw Error('Upgrade item unavailable');
  const status=action==='claim'?'claimed':'discarded';
  if(row.status===status)return {status,itemId:row.delivered_item_id};
  if(row.status!=='pending')throw Error('Upgrade operation conflict');
  const itemId=action==='claim'?(await grantItem(db,{characterId,revisionId:row.revision_id,
   definitionId:row.result.definitionId,qualityId:'common',capacity:defaultBagCapacity}))[0].id:null;
  await db.query('UPDATE craft_attempts SET status=$3,delivered_item_id=$4 WHERE character_id=$1 AND operation_id=$2',
   [characterId,operationId,status,itemId]);
  return {status,itemId};
 });
}
