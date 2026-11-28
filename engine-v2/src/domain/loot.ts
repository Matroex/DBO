export interface LootRow {itemId:string;quantity:number;chancePct:number}
export interface LootBonus {gearPct:number;chipPct:number;spiritPct:number;doublePct:number}
export function validateLootTable(input:unknown):LootRow[]{
 if(!Array.isArray(input)||input.length>10000)throw Error('Invalid loot table');
 return input.map(row=>{
 if(!row||typeof row!=='object'||typeof row.itemId!=='string'||! /^[a-z0-9][a-z0-9_.:-]{0,127}$/.test(row.itemId)||!Number.isSafeInteger(row.quantity)||row.quantity<1||row.quantity>1000000||typeof row.chancePct!=='number'||!Number.isFinite(row.chancePct)||row.chancePct<0||row.chancePct>100)throw Error('Invalid loot row');
 return {itemId:row.itemId,quantity:row.quantity,chancePct:row.chancePct};
 });
}
export function effectiveDropChance(base:number,b:LootBonus){
 if(!Number.isFinite(base)||Object.values(b).some(n=>!Number.isFinite(n)))throw Error('Invalid loot chance');
 return base<=0?0:Math.min(100,Math.max(0,base+b.gearPct+b.chipPct+b.spiritPct));
}
export function rollLoot(rows:readonly LootRow[],b:LootBonus,random:()=>number){
 const roll=(pct:number)=>{if(pct<=0)return false;const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw Error('Invalid random sample');return n*100<pct;};
 const loot:{itemId:string;quantity:number}[]=[];
 for(const row of validateLootTable(rows))if(roll(effectiveDropChance(row.chancePct,b)))loot.push({itemId:row.itemId,quantity:row.quantity});
 if(loot.length&&roll(Math.min(100,Math.max(0,b.doublePct))))return loot.map(row=>({...row,quantity:row.quantity*2}));
 return loot;
}
