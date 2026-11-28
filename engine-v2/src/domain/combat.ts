export interface CombatRules {normalCritPct:number;techniqueCritPct:number;dodgeThreshold:number;speedPerDodgePct:number;techniqueArmorPct:number;minimumDamagePct:number;armorDivisor:number}
export function validateCombatRules(input:unknown):CombatRules {
 if(!input||typeof input!=='object')throw Error('Invalid combat rules');
 const v=input as Record<string,unknown>;
 const read=(k:string,min:number,max:number)=>{const n=v[k];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw Error('Invalid combat rule: '+k);return n;};
 return {normalCritPct:read('normalCritPct',0,1e6),techniqueCritPct:read('techniqueCritPct',0,1e6),dodgeThreshold:read('dodgeThreshold',1,1e12),speedPerDodgePct:read('speedPerDodgePct',1,1e12),techniqueArmorPct:read('techniqueArmorPct',0,100),minimumDamagePct:read('minimumDamagePct',0,100),armorDivisor:read('armorDivisor',.000001,1e6)};
}
const nonnegative=(n:number)=>{if(!Number.isFinite(n)||n<0)throw Error('Invalid combat value');return n;};
export function dodgePct(r:CombatRules,defenderSpeed:number,attackerSpeed:number){
 const low=nonnegative(attackerSpeed),diff=Math.max(0,nonnegative(defenderSpeed)-low);
 return Math.min(100,low>=r.dodgeThreshold?100*diff/low:diff/r.speedPerDodgePct);
}
export function criticalMultiplier(r:CombatRules,technique:boolean,bonusPct:number){
 return ((technique?r.techniqueCritPct:r.normalCritPct)+nonnegative(bonusPct))/100;
}
export function effectiveArmor(r:CombatRules,armor:number,penetrationPct:number,technique:boolean){
 return nonnegative(armor)*(technique?r.techniqueArmorPct/100:1)*(1-Math.min(100,nonnegative(penetrationPct))/100);
}
export function damageAfterArmor(r:CombatRules,attack:number,armor:number){
 nonnegative(attack);nonnegative(armor);
 return attack===0?0:attack*Math.max(r.minimumDamagePct/100,1-armor/(r.armorDivisor*attack));
}
