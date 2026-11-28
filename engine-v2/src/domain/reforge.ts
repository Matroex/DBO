import {scaleItem,reforgeInheritance,type ItemScalingRules} from './item-scaling.js';
import {standardUpgradeAllowed} from './upgrade-policy.js';
import type {BonusMap} from './equipment-bonuses.js';
export interface ReforgeDefinition {id:string;slot:string;quality:number;requiredRace?:string;base:BonusMap}
export interface ReforgeInstance {id:string;definitionId:string;quality:number;level:number;bagSlot:number;inheritance:BonusMap;attributes:Readonly<Record<string,unknown>>}
export function reforge(r:ItemScalingRules,instance:ReforgeInstance,source:ReforgeDefinition,target:ReforgeDefinition,race:string,recipeTarget:string,factor=0.5):ReforgeInstance{
 if(instance.definitionId!==source.id||instance.level!==9||!standardUpgradeAllowed(source.slot)||!standardUpgradeAllowed(target.slot)||source.slot!==target.slot||target.id===source.id||target.id!==recipeTarget||(target.requiredRace&&target.requiredRace!==race))throw Error('Invalid reforge');
 if(!Number.isInteger(target.quality)||target.quality<0||target.quality>=r.qualityMultipliers.length)throw Error('Invalid target quality');
 const resolved=scaleItem(r,source.base,instance.quality,9,true,true,instance.inheritance);
 return {...instance,definitionId:target.id,quality:target.quality,level:0,inheritance:reforgeInheritance(resolved,factor)};
}
