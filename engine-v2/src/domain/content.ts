export const statIds = ['strength','speed','endurance','intelligence','ki'] as const;
export const raceIds = ['saiyan','ziemianin','demon-mrozu','nameczanin','majin'] as const;
export type StarterStats = Record<typeof statIds[number],number>;
export interface StarterRules { stats: StarterStats; level: number; slots: number; maxSlots: number; slotCost: number }
export const legacyStarterRules: StarterRules = {stats:{strength:4,speed:5,endurance:6,intelligence:2,ki:2},level:1,slots:5,maxSlots:10,slotCost:50};
export function validateStarterRules(value: unknown): StarterRules {
 if (!value || typeof value !== 'object') throw Error('Invalid starter rules');
 const v=value as Record<string,unknown>;
 const integer=(x:unknown,min:number,max:number):number=>{
  if(typeof x!=='number'||!Number.isSafeInteger(x)||x<min||x>max) throw Error('Invalid numeric rule');
  return x;
 };
 if(!v.stats||typeof v.stats!=='object') throw Error('Invalid stats');
 const raw=v.stats as Record<string,unknown>;
 if(Object.keys(raw).length!==statIds.length) throw Error('Unexpected stats');
 const stats=Object.fromEntries(statIds.map(k=>[k,integer(raw[k],0,Number.MAX_SAFE_INTEGER)])) as StarterStats;
 const maxSlots=integer(v.maxSlots,5,10);
 return {stats,level:integer(v.level,1,2147483647),slots:integer(v.slots,5,maxSlots),maxSlots,slotCost:integer(v.slotCost,0,Number.MAX_SAFE_INTEGER)};
}
