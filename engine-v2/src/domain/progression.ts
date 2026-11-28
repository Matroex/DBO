export interface ExperienceRules {maxLevel:number;firstEnd:number;secondEnd:number;thirdEnd:number;firstStep:number;secondBase:number;secondStep:number;thirdBase:number;thirdStep:number;exponentialBase:number;exponentialGrowth:number}
export const legacyExperienceRules:ExperienceRules={maxLevel:500,firstEnd:50,secondEnd:100,thirdEnd:200,firstStep:1000,secondBase:50000,secondStep:2000,thirdBase:150000,thirdStep:5000,exponentialBase:650000,exponentialGrowth:1.05};
export function requiredExperience(r:ExperienceRules,level:number):bigint{
 if(!Number.isSafeInteger(level)||level<1)throw Error('Invalid level');
 if(level>=r.maxLevel)return 0n;
 const n=level<=r.firstEnd?level*r.firstStep:level<=r.secondEnd?r.secondBase+(level-r.firstEnd)*r.secondStep:level<=r.thirdEnd?r.thirdBase+(level-r.secondEnd)*r.thirdStep:Math.ceil(r.exponentialBase*Math.pow(r.exponentialGrowth,level-r.thirdEnd));
 if(!Number.isSafeInteger(n)||n<=0)throw Error('Invalid experience threshold');
 return BigInt(n);
}
