import {type CombatRules,dodgePct,criticalMultiplier,effectiveArmor,damageAfterArmor} from './combat.js';
export interface HitInput {
 attack:number;armor:number;attackerSpeed:number;defenderSpeed:number;technique:boolean;
 penetrationPct:number;criticalChancePct:number;criticalBonusPct:number;criticalReductionPct:number;
 averageDamagePct:number;outgoingRacePct:number;incomingRacePct:number;techniqueReductionPct:number;
 intelligenceReduction:number;guardReduction:number;forcedCriticalMultiplier?:number;
}
export interface HitResult {damage:number;critical:boolean;dodged:boolean}
export function resolveHit(r:CombatRules,i:HitInput,random:()=>number):HitResult{
 const finite=(n:number)=>{if(!Number.isFinite(n))throw Error('Invalid hit input');return n;};
 const positive=(n:number)=>Math.max(0,finite(n));
 const fraction=(n:number)=>Math.min(1,positive(n));
 const roll=(pct:number)=>{const chance=Math.min(100,positive(pct));if(chance===0)return false;const value=random();if(!Number.isFinite(value)||value<0||value>=1)throw Error('Invalid random sample');return value*100<chance;};
 if(roll(dodgePct(r,i.defenderSpeed,i.attackerSpeed)))return {damage:0,critical:false,dodged:true};
 const armor=effectiveArmor(r,i.armor,i.penetrationPct,i.technique);
 const base=damageAfterArmor(r,i.attack,armor)*Math.max(0,1+finite(i.averageDamagePct)/100)
 *(1-fraction(i.intelligenceReduction))*(1+positive(i.outgoingRacePct)/100)
 *Math.max(0,1-positive(i.incomingRacePct)/100)
 *Math.max(0,1-(i.technique?positive(i.techniqueReductionPct):0)/100);
 const forced=positive(i.forcedCriticalMultiplier??0);
 const critical=base>0&&(forced>0||roll(i.criticalChancePct));
 const multiplier=forced||criticalMultiplier(r,i.technique,i.criticalBonusPct);
 const damage=(critical?base*multiplier*(1-fraction(i.criticalReductionPct/100)):base)*(1-fraction(i.guardReduction));
 if(!Number.isFinite(damage))throw Error('Damage overflow');
 return {damage,critical,dodged:false};
}
export function stunChance(chancePct:number,resistancePct:number){
 if(!Number.isFinite(chancePct)||!Number.isFinite(resistancePct))throw Error('Invalid stun input');
 const clamp=(n:number)=>Math.min(100,Math.max(0,n));
 return clamp(chancePct)*(1-clamp(resistancePct)/100);
}
