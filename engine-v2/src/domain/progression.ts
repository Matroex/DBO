export interface ExperienceRules {maxLevel:number;firstEnd:number;secondEnd:number;thirdEnd:number;firstStep:number;secondBase:number;secondStep:number;thirdBase:number;thirdStep:number;exponentialBase:number;exponentialGrowth:number}
export const legacyExperienceRules:ExperienceRules={maxLevel:500,firstEnd:50,secondEnd:100,thirdEnd:200,firstStep:1000,secondBase:50000,secondStep:2000,thirdBase:150000,thirdStep:5000,exponentialBase:650000,exponentialGrowth:1.05};
export function requiredExperience(r:ExperienceRules,level:number):bigint{
 if(!Number.isSafeInteger(level)||level<1)throw Error('Invalid level');
 if(level>=r.maxLevel)return 0n;
 const n=level<=r.firstEnd?level*r.firstStep:level<=r.secondEnd?r.secondBase+(level-r.firstEnd)*r.secondStep:level<=r.thirdEnd?r.thirdBase+(level-r.secondEnd)*r.thirdStep:Math.ceil(r.exponentialBase*Math.pow(r.exponentialGrowth,level-r.thirdEnd));
 if(!Number.isSafeInteger(n)||n<=0)throw Error('Invalid experience threshold');
 return BigInt(n);
}

export function validateExperienceRules(input:unknown):ExperienceRules{
 if(!input||typeof input!=='object')throw Error('Invalid experience rules');
 const v=input as Record<string,unknown>;
 const read=(k:keyof ExperienceRules)=>{const n=v[k];if(typeof n!=='number'||!Number.isFinite(n)||n<=0||(k!=='exponentialGrowth'&&!Number.isSafeInteger(n)))throw Error('Invalid experience rule '+k);return n;};
 const r={maxLevel:read('maxLevel'),firstEnd:read('firstEnd'),secondEnd:read('secondEnd'),thirdEnd:read('thirdEnd'),firstStep:read('firstStep'),secondBase:read('secondBase'),secondStep:read('secondStep'),thirdBase:read('thirdBase'),thirdStep:read('thirdStep'),exponentialBase:read('exponentialBase'),exponentialGrowth:read('exponentialGrowth')};
 if(r.maxLevel>10000||r.firstEnd>r.secondEnd||r.secondEnd>r.thirdEnd||r.exponentialGrowth<1)throw Error('Invalid experience curve');
 for(let l=1;l<r.maxLevel;l++)requiredExperience(r,l);
 return r;
}
export function gainExperience(r:ExperienceRules,level:number,experience:bigint,amount:bigint){
 if(!Number.isSafeInteger(level)||level<1||experience<0n||amount<0n)throw Error('Invalid progression state');
 if(level>=r.maxLevel)return {level,experience:0n,accepted:0n};
 if(experience>=requiredExperience(r,level))throw Error('Invalid stored experience');
 let remaining=amount;
 while(remaining>0n&&level<r.maxLevel){
 const room=requiredExperience(r,level)-experience;
 if(remaining<room){experience+=remaining;remaining=0n;break;}
 remaining-=room;experience=0n;level++;
 }
 return {level,experience,accepted:amount-remaining};
}
export function mobExperience(mobLevel:number,playerLevel:number,quality:1|2|3){
 if(!Number.isSafeInteger(mobLevel)||mobLevel<1||!Number.isSafeInteger(playerLevel)||playerLevel<1||![1,2,3].includes(quality))throw Error('Invalid mob experience input');
 const diff=mobLevel-playerLevel;
 const multiplier=diff>=10?1.2:diff>=1?1.1:diff===0?1:diff<=-5?.01:1+diff*.1;
 return Math.max(1,Math.ceil((50*quality+mobLevel)*multiplier));
}
