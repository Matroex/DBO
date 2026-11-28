import {hashPassword,verifyPassword,newSession,sessionHash} from './credentials.mjs';
export class AuthService {
 constructor(pool){this.pool=pool;}
 async register(login,password){
  if(typeof login!=='string'||! /^[a-zA-Z0-9_]{3,32}$/.test(login))throw Error('Invalid login');
  const hash=await hashPassword(password);
  const db=await this.pool.connect();
  try{
   await db.query('BEGIN');
   const {rows:[account]}=await db.query('INSERT INTO accounts(login,password_hash) VALUES($1,$2) RETURNING id,login',[login,hash]);
   await db.query("INSERT INTO account_roles(account_id,role) VALUES($1,'player')",[account.id]);
   await db.query('COMMIT');return account;
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
 async login(login,password){
  if(typeof login!=='string'||login.length>64||typeof password!=='string'||Buffer.byteLength(password)>256)return null;
  const {rows:[account]}=await this.pool.query('SELECT id,password_hash FROM accounts WHERE lower(login)=lower($1)',[login]);
  const dummy='scrypt-v1:'+'0'.repeat(32)+':'+'0'.repeat(128);
  const valid=await verifyPassword(password,account?.password_hash??dummy);
  if(!account||!valid)return null;
  const {token,hash}=newSession();
  await this.pool.query("INSERT INTO sessions(token_hash,account_id,expires_at) VALUES($1,$2,now()+interval '24 hours')",[hash,account.id]);
  return token;
 }
 async authenticate(token){
  let hash;try{hash=sessionHash(token);}catch{return null;}
  const {rows:[account]}=await this.pool.query("SELECT a.id,a.login,ARRAY(SELECT role FROM account_roles WHERE account_id=a.id ORDER BY role) AS roles FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=$1 AND s.expires_at>now()",[hash]);
  return account??null;
 }
 async logout(token){
  let hash;try{hash=sessionHash(token);}catch{return;}
  await this.pool.query('DELETE FROM sessions WHERE token_hash=$1',[hash]);
 }
}
