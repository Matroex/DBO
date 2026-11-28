import {validateStarterRules} from '../../dist/domain/content.js';
import {baseVitals,validateVitalRules} from '../../dist/domain/vitals.js';
export class CharacterService {
 constructor(pool){this.pool=pool;}
 async list(accountId){
  const {rows}=await this.pool.query('SELECT id,name,race_id,slot,level,experience FROM characters WHERE account_id=$1 ORDER BY slot',[accountId]);
  return rows;
 }
 async create(accountId,input){
  if(!input||typeof input.name!=='string'||typeof input.raceId!=='string'||(input.childCode!==undefined&&typeof input.childCode!=='string'))throw Error('invalid_character');
  const name=input.name.trim(),childCode=(input.childCode??'').trim();
  if(name.length<3||name.length>64||childCode.length>256)throw Error('invalid_character');
  const db=await this.pool.connect();
  try{
   await db.query('BEGIN');
   const {rows:[account]}=await db.query('SELECT character_limit FROM accounts WHERE id=$1 FOR UPDATE',[accountId]);
   if(!account)throw Error('unauthorized');
   const {rows:[config]}=await db.query("SELECT r.id,d.data FROM content_revisions r JOIN content_definitions d ON d.revision_id=r.id WHERE r.status='published' AND d.kind='starter_rules' AND d.definition_id='default'");
   if(!config)throw Error('missing_content');
   const rules=validateStarterRules(config.data);
   const race=await db.query("SELECT 1 FROM content_definitions WHERE revision_id=$1 AND kind='race' AND definition_id=$2 AND data->'creationEnabled'='true'::jsonb",[config.id,input.raceId]);
   if(!race.rowCount)throw Error('invalid_character');
   const {rows}=await db.query('SELECT slot FROM characters WHERE account_id=$1',[accountId]);
   const used=new Set(rows.map(r=>r.slot));
   let slot=0;while(used.has(slot))slot++;
   if(slot>=account.character_limit||rows.length>=account.character_limit)throw Error('slot_limit');
   const {rows:[character]}=await db.query('INSERT INTO characters(account_id,name,race_id,slot,level,child_code,creation_revision_id) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,name,race_id,slot,level,experience',[accountId,name,input.raceId,slot,rules.level,childCode,config.id]);
   for(const [key,value] of Object.entries(rules.stats))await db.query('INSERT INTO character_stats(character_id,stat_id,value) VALUES($1,$2,$3)',[character.id,key,value]);
   for(const currency of ['gold','zeni','dragon_coin'])await db.query('INSERT INTO wallets(character_id,currency_id,balance) VALUES($1,$2,0)',[character.id,currency]);
   await db.query('COMMIT');return character;
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }
 async get(accountId,id){
  if(typeof id!=='string'||! /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))return null;
  const {rows:[character]}=await this.pool.query('SELECT id,name,race_id,slot,level,experience FROM characters WHERE account_id=$1 AND id=$2',[accountId,id]);
  if(!character)return null;
  const {rows}=await this.pool.query('SELECT stat_id,value FROM character_stats WHERE character_id=$1',[id]);
  const stats=Object.fromEntries(rows.map(r=>[r.stat_id,r.value]));
  const {rows:[config]}=await this.pool.query("SELECT d.data FROM content_revisions r JOIN content_definitions d ON d.revision_id=r.id WHERE r.status='published' AND d.kind='combat_rules' AND d.definition_id='vitals'");
  if(!config)throw Error('missing_vital_rules');
  const vitals=baseVitals(validateVitalRules(config.data),Number(stats.endurance),Number(stats.intelligence));
  const {rows:wallets}=await this.pool.query('SELECT currency_id,balance FROM wallets WHERE character_id=$1 ORDER BY currency_id',[id]);
  return {...character,stats,baseVitals:vitals,wallets:Object.fromEntries(wallets.map(r=>[r.currency_id,r.balance]))};
 }
}
