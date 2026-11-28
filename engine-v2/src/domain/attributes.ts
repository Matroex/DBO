import type {VitalRules} from './vitals.js';
export interface AttributeRules {attackPerStrength:number;defensePerEndurance:number;spiritAttackFactor:number}
export function validateAttributeRules(input:unknown):AttributeRules{
 if(!input||typeof input!=='object')throw Error('Invalid attribute rules');
 const v=input as Record<string,unknown>;
 const read=(key:string)=>{const n=v[key];if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>1e6)throw Error('Invalid attribute rule '+key);return n;};
 return {attackPerStrength:read('attackPerStrength'),defensePerEndurance:read('defensePerEndurance'),spiritAttackFactor:read('spiritAttackFactor')};
}
const finite=(n:number)=>{if(!Number.isFinite(n))throw Error('Invalid attribute value');return n;};
const pct=(n:number)=>1+finite(n)/100;
export function effectiveAttribute(base:number,planMultiplier:number,spiritPct:number,signFlat:number,skillFlat:number,guildFlat:number,guildPct:number){
 return finite((finite(base)*finite(planMultiplier)*pct(spiritPct)+finite(signFlat)+finite(skillFlat)+finite(guildFlat))*pct(guildPct));
}
export interface AttackItem {flat?:number;min?:number;max?:number;range?:number;planPvm?:number}
export function pvmAttackRange(r:AttributeRules,strength:number,attackPct:number,spiritAttackPct:number,fixed:number,minExtra:number,maxExtra:number,skillAttack:number,items:readonly AttackItem[]){
 const base=Math.max(0,Math.ceil(finite(strength)*r.attackPerStrength*pct(attackPct+spiritAttackPct*r.spiritAttackFactor)));
 let min=0,max=0;
 for(const item of items){const flat=item.flat??0,extra=(item.range??0)+(item.planPvm??0);min+=finite((item.min??flat)+extra);max+=finite((item.max??item.min??flat)+extra);}
 return {min:Math.max(0,finite(base+fixed+minExtra+min+skillAttack)),max:Math.max(0,finite(base+fixed+maxExtra+max+skillAttack))};
}
export function defense(r:AttributeRules,endurance:number,skill:number,gear:number,quest:number,gearPct:number,guildPct:number){
 return Math.max(0,finite((endurance*r.defensePerEndurance+skill+gear+quest)*pct(gearPct)*pct(guildPct)));
}
export interface VitalModifiers {gearFlat:number;gmOverride?:number;gmPlanFlat:number;skillFlat:number;questFlat:number;gearPct:number;guildPct:number;guildFlat:number}
function vital(base:number,m:VitalModifiers,min:number){
 return Math.max(min,finite(((m.gmOverride??(base+m.gearFlat))+(m.gmOverride!==undefined?m.gmPlanFlat:0)+m.skillFlat+m.questFlat)*pct(m.gearPct)*pct(m.guildPct)+m.guildFlat));
}
export function modifiedVitals(r:VitalRules,endurance:number,intelligence:number,hp:VitalModifiers,ki:VitalModifiers,mode:'pvm'|'pvp'){
 return {maxHp:vital(r.baseHp+endurance*r.hpPerEndurance,hp,mode==='pvp'?1:.01),maxKi:vital(r.baseKi+intelligence*r.kiPerIntelligence,ki,0)};
}

export function pvpAttack(r:AttributeRules,strength:number,attackPct:number,spiritAttackPct:number,pvpFlat:number,gearAttack:number,gearRange:number,planPvp:number,skillAttack:number,guildAttack:number){
 return Math.max(0,finite(Math.ceil(strength*r.attackPerStrength*pct(attackPct+spiritAttackPct*r.spiritAttackFactor))+pvpFlat+gearAttack+gearRange+planPvp+skillAttack+guildAttack));
}
