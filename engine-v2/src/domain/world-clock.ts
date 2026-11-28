export const WORLD_CLOCK={maxDurationMs:43200000,regenMs:5000,beanCheckMs:1000,normalBaseMs:3000,bossBaseMs:2000,minEnemyMs:1500,speedFactor:.01,minHeroMs:100,maxEventsPerBatch:150000} as const;
export function enemyInterval(speed:number,boss=false){
 if(!Number.isFinite(speed))throw Error('Invalid speed');
 return Math.max(WORLD_CLOCK.minEnemyMs,(boss?WORLD_CLOCK.bossBaseMs:WORLD_CLOCK.normalBaseMs)-Math.max(0,speed)*WORLD_CLOCK.speedFactor);
}
export function heroInterval(speed:number,attackSpeedPct:number,greenActive:boolean){
 if(!Number.isFinite(attackSpeedPct))throw Error('Invalid attack speed bonus');
 return Math.max(WORLD_CLOCK.minHeroMs,enemyInterval(speed)/(1+Math.max(0,attackSpeedPct+(greenActive?100:0))/100));
}
export interface EnemyClock {hp:number;nextAttack:number;nextBleedAt?:number|null}
export interface WorldClock {started:number;processedThrough:number;nextHeroAttack:number;nextRegen:number;nextZenUse:number;nextBossRegen?:number|null;enemies:EnemyClock[];status:'running'|'finished'}
export function nextWorldEvent(s:WorldClock){
 return Math.min(s.nextHeroAttack,s.nextRegen,s.nextZenUse,s.nextBossRegen??Infinity,...s.enemies.filter(e=>e.hp>0).map(e=>Math.min(e.nextAttack,e.nextBleedAt??Infinity)));
}
// The caller processes all events at the selected instant in legacy order and advances their clocks.
// A bounded batch must not mark unprocessed time as processed or expire a fight prematurely.
export function advanceWorldClock(s:WorldClock,now:number,process:(s:WorldClock,at:number)=>void,maxEvents:number=WORLD_CLOCK.maxEventsPerBatch){
 if(!Number.isFinite(now)||!Number.isSafeInteger(maxEvents)||maxEvents<1||now<s.processedThrough)throw Error('Invalid clock advance');
 const end=s.started+WORLD_CLOCK.maxDurationMs,until=Math.min(now,end);
 let events=0;
 while(s.status==='running'&&events<maxEvents){
  const next=nextWorldEvent(s);
  if(next>until)break;
  if(!Number.isFinite(next)||next<s.processedThrough)throw Error('Invalid event time');
  process(s,next);events++;s.processedThrough=next;
  if(s.status==='running'&&nextWorldEvent(s)<=next)throw Error('Event clock did not advance');
 }
 const pending=s.status==='running'&&nextWorldEvent(s)<=until;
 if(!pending&&s.status==='running'){s.processedThrough=until;if(until===end)s.status='finished';}
 return {events,pending,processedThrough:s.processedThrough,status:s.status};
}
