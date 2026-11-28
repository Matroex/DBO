export interface TechniqueRules {kiAttackFactor:number;intelligenceReductionFactor:number;maxIntelligenceReduction:number;cooldownRounds:number}
export function validateTechniqueRules(input:unknown):TechniqueRules{
 if(!input||typeof input!=='object')throw Error('Invalid technique rules');
 const v=input as Record<string,unknown>;
 const read=(k:string,max:number)=>{const n=v[k];if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>max)throw Error('Invalid technique rule '+k);return n;};
 const cooldownRounds=read('cooldownRounds',100000);if(!Number.isInteger(cooldownRounds))throw Error('Invalid cooldown');
 return {kiAttackFactor:read('kiAttackFactor',1e6),intelligenceReductionFactor:read('intelligenceReductionFactor',1),maxIntelligenceReduction:read('maxIntelligenceReduction',1),cooldownRounds};
}
const nonnegative=(n:number)=>{if(!Number.isFinite(n)||n<0)throw Error('Invalid technique value');return n;};
export function techniqueReady(r:TechniqueRules,round:number,lastRound:number|undefined,ki:number,cost:number){
 return nonnegative(ki)>=nonnegative(cost)&&(lastRound===undefined||round-lastRound>r.cooldownRounds);
}
export function techniqueAttack(r:TechniqueRules,base:number,modeAttack:number,kiStat:number,valuePct:number,damagePct:number){
 const result=(nonnegative(base)+nonnegative(modeAttack)+nonnegative(kiStat)*r.kiAttackFactor)*(1+valuePct/100)*(1+damagePct/100);
 if(!Number.isFinite(result))throw Error('Invalid technique damage');return Math.max(0,result);
}
export function intelligenceReduction(r:TechniqueRules,defenderIntelligence:number,attackerKiStat:number){
 return Math.min(r.maxIntelligenceReduction,Math.max(0,(nonnegative(defenderIntelligence)-nonnegative(attackerKiStat))*r.intelligenceReductionFactor));
}
