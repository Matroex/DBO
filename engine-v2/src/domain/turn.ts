import {type CombatRules} from './combat.js';
import {resolveHit,stunChance,type HitInput} from './hit.js';
import {type TechniqueRules,techniqueReady,techniqueAttack,intelligenceReduction} from './techniques.js';
export interface Fighter {
 hp:number;ki:number;attack:number;armor:number;speed:number;intelligence:number;kiStat:number;
 techniquePvm:number;techniquePvp:number;techniqueValuePct:number;techniqueDamagePct:number;
 normal:HitInput;technique:HitInput;stunChancePct:number;stunResistancePct:number;
 bleedTurns:number;bleedDamage:number;stunTurns:number;guardTurns:number;guardReduction:number;
 lastTechniqueRound:Record<string,number>;
}
export type Move={kind:'normal'}|{kind:'guard'|'stun'|'bleed'|'kiStrike';rank:number}|{kind:'technique';id:string;cost:number;baseDamage:number};
export interface TurnEvent {kind:string;damage?:number;critical?:boolean}
export function resolveTurn(r:CombatRules,t:TechniqueRules,actor:Fighter,target:Fighter,move:Move,round:number,mode:'pvm'|'pvp',random:()=>number){
 const a={...actor,lastTechniqueRound:{...actor.lastTechniqueRound}},d={...target,lastTechniqueRound:{...target.lastTechniqueRound}};
 const events:TurnEvent[]=[];
 const roll=(pct:number)=>{const p=Math.min(100,Math.max(0,pct));if(p===0)return false;const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw Error('Invalid random sample');return n*100<p;};
 const finish=()=>{if(d.guardTurns>0)d.guardTurns--;return {actor:a,target:d,events};};
 if(a.hp<=0||d.hp<=0)return {actor:a,target:d,events};
 if(a.bleedTurns>0){a.bleedTurns--;const damage=Math.min(a.hp,a.bleedDamage*(1-(a.guardTurns>0?a.guardReduction:0)));a.hp-=damage;events.push({kind:'bleedTick',damage});if(a.hp<=0)return finish();}
 if(a.stunTurns>0){a.stunTurns--;events.push({kind:'stunned'});return finish();}
 if(move.kind==='guard'&&move.rank>0){a.guardTurns=2;a.guardReduction=move.rank*.02;events.push({kind:'guard'});return finish();}
 const tech=move.kind==='technique'&&techniqueReady(t,round,a.lastTechniqueRound[move.id],a.ki,move.cost)?move:undefined;
 if(tech){a.ki-=tech.cost;a.lastTechniqueRound[tech.id]=round;}
 const attack=tech?techniqueAttack(t,tech.baseDamage,mode==='pvp'?a.techniquePvp:a.techniquePvm,a.kiStat,a.techniqueValuePct,a.techniqueDamagePct):a.attack;
 const result=resolveHit(r,{...(tech?a.technique:a.normal),attack,armor:d.armor,attackerSpeed:a.speed,defenderSpeed:d.speed,technique:!!tech,intelligenceReduction:tech?intelligenceReduction(t,d.intelligence,a.kiStat):0,guardReduction:d.guardTurns>0?d.guardReduction:0,forcedCriticalMultiplier:move.kind==='kiStrike'&&move.rank>0?1.1+(move.rank-1)*.005:0},random);
 if(result.dodged){events.push({kind:'dodge'});return finish();}
 const damage=Math.min(d.hp,result.damage);d.hp-=damage;events.push({kind:tech?'technique':'hit',damage,critical:result.critical});
 if(!tech&&damage>0&&d.hp>0){
 if(move.kind==='stun'&&move.rank>0&&roll(stunChance(move.rank+a.stunChancePct,d.stunResistancePct))){d.stunTurns=2;events.push({kind:'stun'});}
 if(move.kind==='bleed'&&move.rank>0&&roll(move.rank)){d.bleedTurns=3;d.bleedDamage=damage*.1;events.push({kind:'bleed'});}
 }
 return finish();
}
