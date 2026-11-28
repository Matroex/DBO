import {randomBytes,scrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt);
const options={N:32768,r:8,p:1,maxmem:64*1024*1024};
export async function hashPassword(password){
 if(typeof password!=='string'||password.length<8||Buffer.byteLength(password)>256) throw Error('Invalid password');
 const salt=randomBytes(16);
 const key=await derive(password,salt,64,options);
 return 'scrypt-v1:'+salt.toString('hex')+':'+key.toString('hex');
}
export async function verifyPassword(password,encoded){
 if(typeof password!=='string'||Buffer.byteLength(password)>256||typeof encoded!=='string')return false;
 const m=/^scrypt-v1:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(encoded);
 if(!m)return false;
 const key=await derive(password,Buffer.from(m[1],'hex'),64,options);
 return timingSafeEqual(key,Buffer.from(m[2],'hex'));
}
export function newSession(){
 const token=randomBytes(32).toString('base64url');
 return {token,hash:sessionHash(token)};
}
export function sessionHash(token){
 if(typeof token!=='string'||! /^[A-Za-z0-9_-]{43}$/.test(token))throw Error('Invalid token');
 return createHash('sha256').update(token).digest('hex');
}
