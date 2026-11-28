import {enhancedFlat,enhancedPercent,type ItemScalingRules} from './item-scaling.js';
export interface SignBonus {key:string;base:number;mode:'flat'|'percent';threshold:number}
export function validateSignBonuses(input:unknown):SignBonus[]{
 if(!Array.isArray(input)||input.length>32)throw Error('Invalid sign definition');
 const seen=new Set<string>();
 return input.map(row=>{
 if(!row||typeof row!=='object'||typeof row.key!=='string'||! /^[a-zA-Z][a-zA-Z0-9_]{0,79}$/.test(row.key)||['constructor','prototype'].includes(row.key)||seen.has(row.key)||typeof row.base!=='number'||!Number.isFinite(row.base)||row.base<0||row.base>1e12||!['flat','percent'].includes(row.mode)||!Number.isInteger(row.threshold)||row.threshold<0||row.threshold>100)throw Error('Invalid sign bonus');
 seen.add(row.key);return {key:row.key,base:row.base,mode:row.mode,threshold:row.threshold};
 });
}
export function resolveSignBonuses(r:ItemScalingRules,definition:unknown,level:number){
 if(!Number.isInteger(level)||level<0||level>r.maxUpgrade)throw Error('Invalid sign level');
 return Object.fromEntries(validateSignBonuses(definition).filter(b=>level>=b.threshold).map(b=>[b.key,b.mode==='flat'?enhancedFlat(r,b.base,level-b.threshold):enhancedPercent(r,b.base,level-b.threshold)]));
}
