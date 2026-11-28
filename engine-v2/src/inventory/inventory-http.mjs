import {defaultBagCapacity,listInventory,moveBagItem} from './repository.mjs';
import {equipItem,unequipItem} from './equipment.mjs';

const uuid='[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}';
const id=new RegExp('^'+uuid+'$','i');
const pathPattern=new RegExp('^/api/v1/characters/('+uuid+')/inventory$','i');
const errors=new Map([
 ['Item not available','item_unavailable'],['Item not in bag','item_unavailable'],
 ['Equipment slot empty','slot_empty'],['Equipment slot occupied','slot_occupied'],
 ['Required race','required_race'],['Required level','required_level'],
 ['Wrong equipment slot','wrong_slot'],['Inventory full','inventory_full']
]);
const reply=(status,body)=>({status,body});
async function readAction(req){
 if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw Error();
 const chunks=[];
 let size=0;
 for await(const chunk of req){size+=chunk.length;if(size>4096)throw Error();chunks.push(chunk);}
 const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error();
 const {action,itemId,set,slot,destination}=input;
 const keys=Object.keys(input).length;
 const validItem=typeof itemId==='string'&&id.test(itemId);
 if(action==='move'&&keys===3&&validItem&&Number.isSafeInteger(destination)&&destination>=0&&destination<defaultBagCapacity)
  return {action,itemId,destination};
 const validSlot=['main','pvp'].includes(set)&&typeof slot==='string'&&/^[a-z0-9_-]{1,64}$/i.test(slot);
 if(action==='equip'&&keys===4&&validItem&&validSlot)return {action,itemId,set,slot};
 if(action==='unequip'&&keys===3&&validSlot)return {action,set,slot};
 throw Error();
}

export function inventoryHandler(auth,pool){
 return async(req,path)=>{
  const characterId=pathPattern.exec(path)?.[1];
  if(!characterId)return null;
  if(req.method!=='GET'&&req.method!=='POST')return {...reply(405,{error:'method_not_allowed'}),headers:{Allow:'GET, POST'}};
  const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
  const account=token?await auth.authenticate(token):null;
  if(!account)return reply(401,{error:'unauthorized'});
  let input;
  if(req.method==='POST'){
   try{input=await readAction(req);}catch{return reply(400,{error:'invalid_request'});}
  }
  const db=await pool.connect();
  try{
   await db.query(input?'BEGIN':'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
   const own=await db.query('SELECT id FROM characters WHERE id=$1 AND account_id=$2'+(input?' FOR UPDATE':''),
    [characterId,account.id]);
   if(!own.rowCount){
    await db.query('ROLLBACK');
    return reply(404,{error:'not_found'});
   }
   if(input){
    const args={...input,characterId,capacity:defaultBagCapacity};
    if(input.action==='move')await moveBagItem(db,args);
    else if(input.action==='unequip')await unequipItem(db,args);
    else{
     const {rows:[revision]}=await db.query("SELECT id FROM content_revisions WHERE status='published'");
     if(!revision)throw Error('Missing published content');
     await equipItem(db,{...args,revisionId:revision.id});
    }
   }
   const items=await listInventory(db,characterId);
   await db.query('COMMIT');
   return reply(200,{capacity:defaultBagCapacity,items});
  }catch(error){
   await db.query('ROLLBACK');
   if(errors.has(error.message))return reply(409,{error:errors.get(error.message)});
   throw error;
  }finally{db.release();}
 };
}
