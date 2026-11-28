import {validateBonusMap,type BonusMap} from './equipment-bonuses.js';
export interface ItemScalingRules {qualityMultipliers:number[];flatGrowth:number;percentTarget:number;percentTargetLevel:number;maxUpgrade:number}
export function validateItemScalingRules(input:unknown):ItemScalingRules{
 if(!input||typeof input!=='object')throw Error('Invalid scaling rules');
 const v=input as Record<string,unknown>;
 const read=(k:string,min:number,max:number,integer=false)=>{const n=v[k];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw Error('Invalid '+k);return n;};
 const q=v.qualityMultipliers;
 if(!Array.isArray(q)||q.length!==5||q.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<1||n>100))throw Error('Invalid quality multipliers');
 return {qualityMultipliers:[...q],flatGrowth:read('flatGrowth',1,100),percentTarget:read('percentTarget',0,100),percentTargetLevel:read('percentTargetLevel',1,100, true),maxUpgrade:read('maxUpgrade',1,100,true)};
}
const flat=new Set(['attack','attackMin','attackMax','defense','hp','maxHp','health','ki','maxKi','mana','damage','bonusDamage','physicalAttack','physicalAttackPower','attackPower','techniqueAttack','techniqueAttackMin','techniqueAttackMax','techniquePower','kiPoints','maxMp']);
const percent=new Set(['attackSpeedPct','moveSpeedPct','critChance','criticalChance','critDamage','criticalDamage','techniqueCritChance','techCritChance','techniqueCritDamage','techCritDamage','armorPenetration','enemyArmorReduction','bleedChance','stunChance','dodgeChance','criticalDamageReduction','stunResistance','faintResistance','expBonusPct','experienceBonusPct','doubleMobDropChance','doubleBossRewardsChance','goldBonusPct','battleGoldBonusPct','monsterDamageReductionPct']);
export function enhancedFlat(r:ItemScalingRules,value:number,level:number){
 let result=value;for(let i=0;i<level&&result<Number.MAX_SAFE_INTEGER;i++)result=Math.min(Number.MAX_SAFE_INTEGER,Math.ceil(result*r.flatGrowth));return result;
}
export function enhancedPercent(r:ItemScalingRules,base:number,level:number){
 if(base<=0||base>=r.percentTarget)return base;
 return Math.floor(base+(r.percentTarget-base)*Math.min(level,r.percentTargetLevel)/r.percentTargetLevel+1e-9);
}
export function scaleItem(r:ItemScalingRules,base:BonusMap,quality:number,level:number,equippable:boolean,upgradeEligible:boolean,inheritance:BonusMap={}):BonusMap{
 if(!Number.isInteger(quality)||quality<0||quality>=r.qualityMultipliers.length||!Number.isInteger(level)||level<0||level>r.maxUpgrade)throw Error('Invalid item grade');
 const values={...validateBonusMap(base)};
 for(const [key,value] of Object.entries(validateBonusMap(inheritance)))if((flat.has(key)||percent.has(key))&&value>0)values[key]=(values[key]??0)+value;
 const multiplier=equippable?(r.qualityMultipliers[quality]??1):1;
 if(!(equippable&&multiplier>1)&&!(level>0&&upgradeEligible))return values;
 const round=(n:number)=>multiplier===1?n:Math.round(n*multiplier*100)/100;
 for(const [key,value] of Object.entries(values)){
 if(value<=0)continue;
 if(flat.has(key))values[key]=enhancedFlat(r,round(value),level);
 else if(percent.has(key))values[key]=round(level>0?enhancedPercent(r,value,level):value);
 }
 return values;
}

export function reforgeInheritance(resolvedBase:BonusMap,factor=0.5):BonusMap{
 if(!Number.isFinite(factor)||factor<0||factor>1)throw Error('Invalid inheritance factor');
 return Object.fromEntries(Object.entries(validateBonusMap(resolvedBase)).filter(([key,value])=>(flat.has(key)||percent.has(key))&&value>0).map(([key,value])=>[key,Number((value*factor).toFixed(4))]));
}
