import {listBagUpgrades,upgradeBagItem} from './upgrade.mjs';

const uuid='[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}';
const idPattern=new RegExp('^'+uuid+'$','i');
const pathPattern=new RegExp('^/api/v1/characters/('+uuid+')/upgrades$','i');
const conflicts=new Map([
 ['Upgrade item changed','quote_changed'],['Upgrade operation conflict','operation_conflict'],
 ['Insufficient funds','insufficient_gold'],['Insufficient upgrade materials','insufficient_materials'],
 ['Upgrade unavailable','upgrade_unavailable'],['Invalid upgrade item','upgrade_unavailable'],
 ['Invalid upgrade result','upgrade_unavailable']
]);
const reply=(status,body)=>({status,body});

async function readAttempt(req){
 if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw Error();
 const chunks=[];
 let size=0;
 for await(const chunk of req){size+=chunk.length;if(size>4096)throw Error();chunks.push(chunk);}
 const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 if(!data||Object.keys(data).length!==3||typeof data.itemId!=='string'||!idPattern.test(data.itemId)||
    typeof data.operationId!=='string'||!idPattern.test(data.operationId)||
    typeof data.expectedQuote!=='string'||!/^[a-f0-9]{64}$/.test(data.expectedQuote))throw Error();
 return {itemId:data.itemId,operationId:data.operationId,expectedQuote:data.expectedQuote};
}

export function upgradeHandler(auth,pool){
 return async(req,path)=>{
  const match=pathPattern.exec(path);
  if(!match)return null;
  if(req.method!=='GET'&&req.method!=='POST')return {...reply(405,{error:'method_not_allowed'}),headers:{Allow:'GET, POST'}};
  const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
  const account=token?await auth.authenticate(token):null;
  if(!account)return reply(401,{error:'unauthorized'});
  const input={accountId:account.id,characterId:match[1]};
  try{
   if(req.method==='GET')return reply(200,await listBagUpgrades(pool,input));
   let attempt;
   try{attempt=await readAttempt(req);}catch{return reply(400,{error:'invalid_request'});}
   return reply(200,await upgradeBagItem(pool,{...input,...attempt}));
  }catch(error){
   if(['Character missing','Upgrade item unavailable'].includes(error.message))return reply(404,{error:'not_found'});
   if(conflicts.has(error.message))return reply(409,{error:conflicts.get(error.message)});
   throw error;
  }
 };
}
