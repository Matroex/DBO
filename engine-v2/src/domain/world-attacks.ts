import {resolveHit,stunChance,type HitInput} from './hit.js';
import {type CombatRules} from './combat.js';
import {techniqueAttack,intelligenceReduction,type TechniqueRules} from './techniques.js';
import {startBleed,type BleedingEnemy} from './world-effects.js';
const round=(n:number)=>Math.round(n*100000)/100000;
const roll=(pct:number,random:()=>number)=>{if(!Number.isFinite(pct))throw Error('Invalid chance');if(pct<=0)return false;const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw Error('Invalid random sample');return n*100<Math.min(100,pct);};
export interface WorldAttackHero {ki:number;nextWaveAt:number;waveEnabled:boolean;attack:number;techniquePvm:number;techniqueKi:number;techniqueValuePct:number;techniqueDamagePct:number;stunPct:number;bleedPct:number;bossDamagePct:number}
export interface WorldAttackEnemy extends BleedingEnemy {intelligence:number;stunResistancePct:number;stunnedUntil:number;max:number;halfStrikeTriggered?:boolean;halfStrikePending?:boolean}
export function heroWorldAttack(r:CombatRules,t:TechniqueRules,h:WorldAttackHero,targets:WorldAttackEnemy[],at:number,hitInput:(e:WorldAttackEnemy,technique:boolean)=>HitInput,random:()=>number,opts:{boss:boolean;storySoldier:boolean;guardian:boolean}){
 const wave=h.waveEnabled&&at>=h.nextWaveAt&&h.ki>=100;
 if(wave){h.ki=round(h.ki-100);h.nextWaveAt=at+20000;}
 const power=wave?techniqueAttack(t,50,h.techniquePvm,h.techniqueKi,h.techniqueValuePct,h.techniqueDamagePct):h.attack;
 const results=[];
 for(const e of targets){
  if(e.hp<=0)continue;
  const hit=resolveHit(r,{...hitInput(e,wave),attack:power,technique:wave,intelligenceReduction:wave?intelligenceReduction(t,e.intelligence,h.techniqueKi):0},random);
  const actual=Math.min(e.hp,hit.damage*(opts.boss?1+Math.max(0,h.bossDamagePct)/100:1));
  e.hp=round(Math.max(0,e.hp-actual));
  if(opts.guardian&&e.hp>0&&e.hp<=e.max/2&&!e.halfStrikeTriggered){e.halfStrikeTriggered=true;e.halfStrikePending=true;}
  if(!hit.dodged&&!opts.storySoldier&&e.hp>0){
   if(roll(stunChance(h.stunPct,e.stunResistancePct),random))e.stunnedUntil=at+3000;
   if(e.nextBleedAt===null&&roll(h.bleedPct,random))startBleed(e,at);
  }
  results.push({...hit,actual,defeated:e.hp<=0});
 }
 return {wave,results};
}
export function enemyWorldAttack(r:CombatRules,h:{hp:number},input:HitInput,random:()=>number,opts:{boss:boolean;monsterReductionPct:number;bossReductionPct:number;special:boolean}){
 const hit=resolveHit(r,{...input,technique:false,intelligenceReduction:0},random);
 const reduction=Math.max(0,opts.monsterReductionPct);
 const multiplier=opts.boss?Math.max(.5,(1-Math.min(100,reduction)/100)*(1-Math.min(50,opts.bossReductionPct)/100)):Math.max(0,1-reduction/100);
 const damage=hit.damage*multiplier*(opts.special?3:1);
 h.hp=round(Math.max(0,h.hp-damage));
 return {...hit,damage,defeated:h.hp<=0};
}
