import {advanceWorldClock,enemyInterval,heroInterval,WORLD_CLOCK,type WorldClock} from './world-clock.js';
import {applyRegeneration,autoBeans,tickBleed,type BeanState,type BeanOptions} from './world-effects.js';
import {heroWorldAttack,enemyWorldAttack,type WorldAttackHero,type WorldAttackEnemy} from './world-attacks.js';
import {type CombatRules} from './combat.js';
import {type TechniqueRules} from './techniques.js';
import {type HitInput} from './hit.js';
export interface Enemy extends WorldAttackEnemy {id:string;speed:number;nextAttack:number;rewarded:boolean}
export interface Hero extends BeanState,WorldAttackHero {speed:number;attackSpeedPct:number}
export interface Battle extends WorldClock {hero:Hero;enemies:Enemy[];mode:'mob'|'boss'|'dungeon';guardian:boolean;generation:number;kills:number;outcome?:'win'|'loss'|'expired'}
export interface BattleContext {
 combat:CombatRules;techniques:TechniqueRules;beans:BeanOptions;regen:{hp:number;ki:number};monsterReductionPct:number;bossReductionPct:number;
 outgoing:(enemy:Enemy,wave:boolean)=>HitInput;incoming:(enemy:Enemy)=>HitInput;consume:(color:'green'|'red'|'blue')=>boolean;
 onKill:(enemy:Enemy,at:number)=>void;random:()=>number;
}
export function advanceWorldBattle(s:Battle,now:number,c:BattleContext,maxEvents:number=WORLD_CLOCK.maxEventsPerBatch){
 const boss=s.mode==='boss';
 const finish=(outcome:'win'|'loss')=>{s.status='finished';s.outcome=outcome;};
 const threshold=(e:Enemy)=>{if(s.guardian&&e.hp>0&&e.hp<=e.max/2&&!e.halfStrikeTriggered){e.halfStrikeTriggered=true;e.halfStrikePending=true;}};
 const reward=(e:Enemy,at:number)=>{if(e.hp>0||e.rewarded)return;e.rewarded=true;s.kills++;c.onKill(e,at);if(boss)finish('win');};
 const result=advanceWorldClock(s,now,(_clock,at)=>{
  if(s.nextBossRegen!=null&&s.nextBossRegen<=at){const e=s.enemies[0];if(e&&e.hp>0)e.hp=Math.min(e.max,e.hp+2000);s.nextBossRegen+=3000;}
  if(s.nextRegen<=at){applyRegeneration(s.hero,c.regen);s.nextRegen+=WORLD_CLOCK.regenMs;}
  for(const e of s.enemies){tickBleed(e,at);threshold(e);reward(e,at);if(s.status!=='running')return;}
  if(s.nextHeroAttack<=at){
   const living=s.enemies.filter(e=>e.hp>0);
   if(!living.length){
    if(boss){finish('win');return;}
    for(const e of s.enemies){e.hp=e.max;e.rewarded=false;e.stunnedUntil=0;e.nextBleedAt=null;e.bleedTicks=0;e.nextAttack=at+enemyInterval(e.speed);}
    s.generation++;
   }else{
    heroWorldAttack(c.combat,c.techniques,s.hero,living,at,(e,w)=>c.outgoing(e as Enemy,w),c.random,{boss,storySoldier:false,guardian:s.guardian});
    for(const e of living){reward(e,at);if(s.status!=='running')return;}
   }
   s.nextHeroAttack+=heroInterval(s.hero.speed,s.hero.attackSpeedPct,at<s.hero.greenUntil);
  }
  for(const e of s.enemies){
   if(e.hp<=0)continue;
   const special=!!e.halfStrikePending&&e.stunnedUntil<=at;
   if(!special&&e.nextAttack>at)continue;
   if(special){e.halfStrikePending=false;}else e.nextAttack+=enemyInterval(e.speed,boss);
   // A special strike does not consume the ordinary attack; advance a coincident ordinary clock on the next event.
   if(special&&e.nextAttack<=at)e.nextAttack=at+enemyInterval(e.speed,boss);
   if(e.stunnedUntil>at)continue;
   enemyWorldAttack(c.combat,s.hero,c.incoming(e),c.random,{boss,monsterReductionPct:c.monsterReductionPct,bossReductionPct:c.bossReductionPct,special});
   if(s.hero.hp<=0){finish('loss');return;}
  }
  if(s.nextZenUse<=at){autoBeans(s.hero,at,c.beans,c.consume);s.nextZenUse+=WORLD_CLOCK.beanCheckMs;}
 },maxEvents);
 if(s.status==='finished'&&!s.outcome)s.outcome='expired';
 return {...result,outcome:s.outcome};
}
