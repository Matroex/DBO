export function characterHandler(auth,characters){
 return async(req,path)=>{
  const match=/^\/api\/v1\/characters(?:\/([^/]+))?$/.exec(path);
  if(!match)return null;
  const reply=(status,body)=>({status,body});
  const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
  const account=token?await auth.authenticate(token):null;
  if(!account)return reply(401,{error:'unauthorized'});
  if(req.method==='GET'){
   if(!match[1])return reply(200,await characters.list(account.id));
   const character=await characters.get(account.id,match[1]);
   return character?reply(200,character):reply(404,{error:'not_found'});
  }
  if(req.method!=='POST'||match[1])return reply(405,{error:'method_not_allowed'});
  let input;
  try{
   if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw Error();
   const chunks=[];let size=0;
   for await(const chunk of req){size+=chunk.length;if(size>4096)throw Error();chunks.push(chunk);}
   input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['name','raceId','childCode'].includes(k)))throw Error();
  }catch{return reply(400,{error:'invalid_request'});}
  try{return reply(201,await characters.create(account.id,input));}
  catch(e){
   if(e.message==='invalid_character')return reply(400,{error:'invalid_character'});
   if(e.message==='slot_limit'||e.code==='23505')return reply(409,{error:'character_unavailable'});
   throw e;
  }
 };
}
