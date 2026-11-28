export function authHandler(auth){
 const attempts=new Map();
 function limited(ip){
  const now=Date.now();
  for(const [key,v] of attempts)if(v.until<=now)attempts.delete(key);
  if(!attempts.has(ip)&&attempts.size>=10000)return true;
  const v=attempts.get(ip)??{count:0,until:now+60000};
  v.count++;attempts.set(ip,v);return v.count>10;
 }
 const reply=(status,body)=>({status,body});
 const token=req=>/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization??'')?.[1];
 async function body(req){
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw Error('content_type');
  let size=0;const chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>4096)throw Error('body_size');chunks.push(chunk);}
  const v=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(!v||typeof v!=='object'||Array.isArray(v))throw Error('body');return v;
 }
 return async(req,path)=>{
  if(!['/api/v1/auth/register','/api/v1/auth/login','/api/v1/auth/logout','/api/v1/auth/me'].includes(path))return null;
  if(req.method!==(path.endsWith('/me')?'GET':'POST'))return reply(405,{error:'method_not_allowed'});
  if(path.endsWith('/register')||path.endsWith('/login')){
   if(limited(req.socket.remoteAddress??'unknown'))return reply(429,{error:'rate_limited'});
   let v;try{v=await body(req);}catch{return reply(400,{error:'invalid_request'});}
   if(typeof v.login!=='string'||typeof v.password!=='string')return reply(400,{error:'invalid_request'});
   if(path.endsWith('/register')){
    if(!/^[a-zA-Z0-9_]{3,32}$/.test(v.login)||v.password.length<8||Buffer.byteLength(v.password)>256)return reply(400,{error:'invalid_request'});
    try{return reply(201,await auth.register(v.login,v.password));}catch(e){if(e.code==='23505')return reply(409,{error:'registration_unavailable'});throw e;}
   }
   const t=await auth.login(v.login,v.password);
   return t?reply(200,{token:t}):reply(401,{error:'invalid_credentials'});
  }
  const t=token(req);
  if(!t)return reply(401,{error:'unauthorized'});
  if(path.endsWith('/logout')){await auth.logout(t);return reply(200,{status:'ok'});}
  const account=await auth.authenticate(t);
  return account?reply(200,account):reply(401,{error:'unauthorized'});
 };
}
