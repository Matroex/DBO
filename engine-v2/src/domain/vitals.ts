export interface VitalRules {baseHp:number;baseKi:number;hpPerEndurance:number;kiPerIntelligence:number}
export function validateVitalRules(input:unknown):VitalRules {
 if(!input||typeof input!=='object')throw Error('Invalid vital rules');
 const v=input as Record<string,unknown>;
 const read=(key:string,min:number):number=>{const n=v[key];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>1e12)throw Error('Invalid vital rule: '+key);return n;};
 return {baseHp:read('baseHp',1),baseKi:read('baseKi',0),hpPerEndurance:read('hpPerEndurance',0),kiPerIntelligence:read('kiPerIntelligence',0)};
}
export function baseVitals(rules:VitalRules,endurance:number,intelligence:number){
 if(!Number.isFinite(endurance)||!Number.isFinite(intelligence)||endurance<0||intelligence<0)throw Error('Invalid stats');
 return {maxHp:rules.baseHp+endurance*rules.hpPerEndurance,maxKi:rules.baseKi+intelligence*rules.kiPerIntelligence};
}
