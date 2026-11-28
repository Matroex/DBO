export interface MobXpRules {qualityBase:[number,number,number];highDifference:number;highMultiplier:number;positiveMultiplier:number;equalMultiplier:number;lowDifference:number;lowMultiplier:number;negativeStep:number;spiritFactor:number;doubleMultiplier:number}
export function validateMobXpRules(input:unknown):MobXpRules{
 if(!input||typeof input!=='object')throw Error('Invalid mob XP rules');
 const v=input as Record<string,unknown>;
 const read=(k:string,min=0,max=1e6)=>{const n=v[k];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw Error('Invalid mob XP rule '+k);return n;};
 const q=v.qualityBase;if(!Array.isArray(q)||q.length!==3||q.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>1e6))throw Error('Invalid quality XP');
 const highDifference=read('highDifference',1),lowDifference=read('lowDifference',-1e6,-1);
 if(!Number.isInteger(highDifference)||!Number.isInteger(lowDifference))throw Error('Invalid level difference');
 return {qualityBase:[q[0],q[1],q[2]],highDifference,highMultiplier:read('highMultiplier'),positiveMultiplier:read('positiveMultiplier'),equalMultiplier:read('equalMultiplier'),lowDifference,lowMultiplier:read('lowMultiplier'),negativeStep:read('negativeStep'),spiritFactor:read('spiritFactor'),doubleMultiplier:read('doubleMultiplier',1)};
}
export interface XpBonuses {guildEducation:number;gearExpPct:number;spiritExp:number;skillMobPct:number;gearMobPct:number;skillDoublePct:number;gearDoublePct:number;chipDoublePct:number}
export function mobRewardXp(r:MobXpRules,mobLevel:number,playerLevel:number,quality:1|2|3,b:XpBonuses,random:()=>number):bigint{
 if(!Number.isSafeInteger(mobLevel)||mobLevel<1||!Number.isSafeInteger(playerLevel)||playerLevel<1||![1,2,3].includes(quality))throw Error('Invalid mob');
 if(Object.values(b).some(n=>!Number.isFinite(n)))throw Error('Invalid XP bonus');
 const d=mobLevel-playerLevel;
 const multiplier=d>=r.highDifference?r.highMultiplier:d>=1?r.positiveMultiplier:d===0?r.equalMultiplier:d<=r.lowDifference?r.lowMultiplier:1+d*r.negativeStep;
 const base=Math.max(1,Math.ceil(((r.qualityBase[quality-1]??0)+mobLevel)*multiplier));
 const bonus=1+(b.guildEducation+b.gearExpPct+r.spiritFactor*b.spiritExp+b.skillMobPct+b.gearMobPct)/100;
 let xp=Math.max(1,Math.floor(base*bonus));
 const chance=Math.min(100,Math.max(0,b.skillDoublePct+b.gearDoublePct+b.chipDoublePct));
 if(chance>0){const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw Error('Invalid random sample');if(n*100<chance)xp=Math.floor(xp*r.doubleMultiplier);}
 if(!Number.isSafeInteger(xp))throw Error('XP overflow');return BigInt(xp);
}
