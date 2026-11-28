export type BonusMap=Readonly<Record<string,number>>;
export function validateBonusMap(input:unknown):BonusMap{
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid bonus map');
 const entries=Object.entries(input);
 if(entries.length>512)throw Error('Too many bonuses');
 for(const [key,value] of entries)if(!/^[a-zA-Z][a-zA-Z0-9_]{0,79}$/.test(key)||['constructor','prototype'].includes(key)||typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>1e15)throw Error('Invalid bonus '+key);
 return Object.fromEntries(entries);
}
// Input maps must already contain resolved quality, upgrade, plan and chip values.
export function readBonus(map:BonusMap,aliases:readonly string[]):number|undefined{
 for(const key of aliases)if(Object.hasOwn(map,key)){const value=map[key];if(typeof value==='number'&&Number.isFinite(value))return value;}
 return undefined;
}
export function sumEquipment(items:readonly BonusMap[],aliases:readonly string[]):number{
 const n=items.reduce((total,item)=>total+(readBonus(item,aliases)??0),0);
 if(!Number.isFinite(n))throw Error('Bonus overflow');return n;
}
export function characterBonus(sources:readonly BonusMap[],items:readonly BonusMap[],aliases:readonly string[]):number{
 const base=sources.map(source=>readBonus(source,aliases)).find(n=>n!==undefined)??0;
 return base+sumEquipment(items,aliases);
}
export function planAttributeMultiplier(items:readonly BonusMap[],key:'strength'|'speed'|'endurance'|'intelligence'|'ki'){
 return 1+(sumEquipment(items,['allStatsPct'])+sumEquipment(items,[key+'Pct']))/100;
}
export function combatBonuses(sources:readonly BonusMap[],items:readonly BonusMap[],skills:{critDamage:number;techCritChance:number;techCritDamage:number}){
 const value=(...keys:string[])=>characterBonus(sources,items,keys);
 return {bleedChance:value('bleedChance'),stunChance:value('stunChance'),stunResistance:value('stunResistance','faintResistance'),criticalDamageReduction:value('criticalDamageReduction'),critChance:value('critChance','criticalChance'),critDamage:value('critDamage','criticalDamage')+skills.critDamage,techniqueCritChance:value('techniqueCritChance','techCritChance')+skills.techCritChance,techniqueCritDamage:value('techniqueCritDamage','techCritDamage')+skills.techCritDamage,armorPenetration:value('armorPenetration','enemyArmorReduction')};
}
