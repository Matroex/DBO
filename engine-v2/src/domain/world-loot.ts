import {rollLoot,validateLootTable,type LootRow,type LootBonus} from './loot.js';
export interface WorldLootTable {rows:readonly (LootRow & {smithBonus?:boolean})[];minimumPlayerLevel?:number}
export function rollWorldMobLoot(tables:Readonly<Record<string,WorldLootTable>>,input:{mapId:string;name:string;playerLevel:number;smithBonusPct:number;bonuses:LootBonus;customRows?:readonly LootRow[]},random:()=>number){
 if(!Number.isSafeInteger(input.playerLevel)||input.playerLevel<1||!Number.isFinite(input.smithBonusPct))throw Error('Invalid world loot input');
 const get=(key:string)=>{const t=tables[key];if(!t)throw Error('Missing loot table '+key);validateLootTable(t.rows);return t;};
 const hidden=get('hidden');
 const secret=input.playerLevel>=(hidden.minimumPlayerLevel??100)?rollLoot(hidden.rows,{gearPct:0,chipPct:0,spiritPct:0,doublePct:0},random):[];
 const keys=['common'];
 if(['forest','mountain'].includes(input.mapId))keys.push('forest');
 if(input.mapId==='centralForest'&&input.name==='Leśny Wojownik')keys.push('central_warrior');
 if(input.mapId==='mountainLake')keys.push('mountain_lake');
 if(input.mapId==='highTowerForest')keys.push('red_ribbon');
 const rows=input.customRows??keys.flatMap(key=>get(key).rows.map(row=>({...row,chancePct:row.smithBonus?Math.max(0,Math.min(100,row.chancePct+input.smithBonusPct)):row.chancePct})));
 return [...secret,...rollLoot(rows,input.bonuses,random)];
}
