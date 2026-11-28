import type {CombatRules} from './combat.js';
import type {TechniqueRules} from './techniques.js';
import {resolveTurn,type Fighter,type Move,type TurnEvent} from './turn.js';
export interface DuelRules {maxRounds:number}
export interface DuelParticipant {fighter:Fighter;moves:readonly Move[];enemyStatsReductionPct:number}
export interface DuelLog {round:number;side:'player'|'enemy';events:TurnEvent[]}
export function validateDuelRules(input:unknown):DuelRules{
 const n=(input as Partial<DuelRules>|null)?.maxRounds;
 if(typeof n!=='number'||!Number.isInteger(n)||n<1||n>10000)throw Error('Invalid duel rounds');
 return {maxRounds:n};
}
function weaken(f:Fighter,pct:number):Fighter{
 if(!Number.isFinite(pct))throw Error('Invalid stat reduction');
 const scale=1-Math.min(100,Math.max(0,pct))/100;
 return {...f,speed:f.speed*scale,attack:f.attack*scale,armor:f.armor*scale,intelligence:f.intelligence*scale,kiStat:f.kiStat*scale,lastTechniqueRound:{...f.lastTechniqueRound}};
}
export function simulateDuel(r:CombatRules,t:TechniqueRules,rules:DuelRules,player:DuelParticipant,enemy:DuelParticipant,mode:'pvm'|'pvp',random:()=>number){
 const maxRounds=validateDuelRules(rules).maxRounds;
 let p=weaken(player.fighter,enemy.enemyStatsReductionPct),e=weaken(enemy.fighter,player.enemyStatsReductionPct);
 const order:('player'|'enemy')[]=p.speed>=e.speed?['player','enemy']:['enemy','player'];
 const log:DuelLog[]=[];
 const finish=(outcome:'win'|'loss'|'draw',rounds:number)=>({outcome,rounds,player:p,enemy:e,log});
 if(p.hp<=0||e.hp<=0)return finish(p.hp>0?'win':'loss',0);
 for(let round=1;round<=maxRounds;round++){
  for(const side of order){
   const isPlayer=side==='player';
   const move=(isPlayer?player.moves:enemy.moves)[round-1]??{kind:'normal'};
   const result=resolveTurn(r,t,isPlayer?p:e,isPlayer?e:p,move,round,mode,random);
   if(isPlayer){p=result.actor;e=result.target;}else{e=result.actor;p=result.target;}
   log.push({round,side,events:result.events});
   if(p.hp<=0||e.hp<=0)return finish(p.hp>0?'win':'loss',round);
  }
 }
 return finish('draw',maxRounds);
}
