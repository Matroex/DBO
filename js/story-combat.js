(()=>{'use strict';
const css=`.story-shade{position:fixed;inset:0;background:#030912df;z-index:99999;display:grid;place-items:center;padding:16px}.story-dialog{width:min(1050px,98vw);max-height:95vh;overflow:auto;background:#0c1b2b;border:1px solid #9a7a40;border-radius:12px;color:#e8edf4;padding:16px;font:14px Arial,sans-serif;box-shadow:0 25px 80px #000a}.story-heading{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;text-align:center;margin-bottom:12px}.story-heading strong:last-child{text-align:right}.story-heading b{color:#e6b85c}.story-columns{display:grid;grid-template-columns:minmax(145px,1fr) minmax(240px,2.1fr) minmax(145px,1fr);gap:12px}.story-fighter,.story-history{background:#111f2e;border:1px solid #3e5366;border-radius:7px;padding:10px;min-width:0}.story-avatar{width:80px;height:80px;border:2px solid #526a7c;margin:0 auto 8px;display:grid;place-items:center;font-size:42px;font-weight:800;background:#1d344b}.story-info{text-align:center;font-size:12px;color:#a9b9c9;line-height:1.7}.story-bar{height:11px;background:#354151;border-radius:3px;overflow:hidden;margin:4px 0 9px}.story-fill{height:100%;transition:width .2s}.story-stat{border:1px solid #435668;border-radius:4px;text-align:center;padding:9px 4px;margin-top:7px;font-size:12px}.story-stat strong{display:block;font-size:16px;margin-top:5px}.story-history{height:530px;display:flex;flex-direction:column}.story-title{text-align:center;font-weight:bold;padding:8px}.story-scroll{overflow-y:auto;flex:1;min-height:0;overscroll-behavior:contain}.story-round{text-align:center;color:#93a7b7;font-size:11px;margin:9px 0 5px}.story-line{max-width:82%;padding:9px;border-radius:5px;margin:5px 0;font-size:12px;line-height:1.4}.story-line.player{background:#123657;color:#89c6ff;margin-right:auto}.story-line.enemy{background:#50232b;color:#ff9ca3;margin-left:auto;text-align:right}.story-result{font-weight:bold}.story-result.win{color:#46d89b}.story-result.loss{color:#ff6474}.story-result.draw{color:#f0d25e}.story-close{display:block;width:100%;padding:9px;background:#a78043;border:0;border-radius:5px;font-weight:bold;cursor:pointer;color:#081522}.story-pvp-reward{margin-top:10px;min-height:58px;border:1px solid #465568;border-radius:5px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:16px;font-weight:800;padding:10px}.story-pvp-reward[hidden]{display:none}.story-pvp-reward.win{color:#46d89b;border-color:#28845c}.story-pvp-reward.loss{color:#ff6474;border-color:#9c3542}.story-pvp-reward.draw{color:#f0d25e;border-color:#88773c}.story-note{color:#a7b4c0;font-size:11px;margin-top:12px;text-align:center}@media(max-width:650px){.story-dialog{padding:7px}.story-columns{grid-template-columns:minmax(88px,1fr) minmax(135px,1.6fr) minmax(88px,1fr);gap:4px}.story-fighter,.story-history{padding:4px}.story-avatar{width:55px;height:55px;font-size:28px}.story-history{height:430px}.story-stat{font-size:10px;padding:5px 1px}.story-stat strong{font-size:12px}.story-line{max-width:94%;font-size:10px}}`;
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Math.max(0,Number(v)||0);
const dealt=(a,d)=>a>0?Math.max(0,a)*Math.max(.1,1-Math.max(0,d)/(2*a)):0;
function roll(percent){
 const chance=Math.min(100,number(percent));
 return chance>0&&Math.random()*100<chance;
}
function dodgeChance(defender,attacker){
 const lower=number(attacker.speed), difference=Math.max(0,number(defender.speed)-lower);
 return lower>=1000000?100*difference/lower:difference/10000;
}
function stunChance(chance,resistance){
 return Math.min(100,number(chance))*(1-Math.min(100,number(resistance))/100);
}
function combatRaceKey(race){
 const name=String(race||'').trim().toLowerCase();
 return ({ziemianin:'earthling',człowiek:'earthling',nameczanin:'namekian',namek:'namekian','demon mrozu':'frostDemon',majin:'majin'})[name];
}
function hit(attack,defense,attacker,technique=false,intelligenceReduction=0,defender={},forcedCriticalMultiplier=0){
 if(roll(dodgeChance(defender,attacker)))return {damage:0,critical:false,dodged:true};
 const penetration=Math.min(100,number(attacker.armorPenetration));
 const armor=defense*(technique ? 0.2 : 1)*(1-penetration/100);
 const outgoing=number(attacker.raceDamage?.[combatRaceKey(defender.race)]);
 const incoming=number(defender.raceReduction?.[combatRaceKey(attacker.race)]);
 const techniqueReduction=technique?number(defender.techniqueReductionPct):0;
 const average=Number(technique?attacker.averageTechniqueDamagePct:attacker.averageDamagePct)||0;
 const base=dealt(attack,armor)*Math.max(0,1+average/100)*(1-intelligenceReduction)*(1+outgoing/100)
  *Math.max(0,1-incoming/100)*Math.max(0,1-techniqueReduction/100);
 const chance=number(technique?attacker.techniqueCritChance:attacker.critChance);
 const critical=base>0&&(forcedCriticalMultiplier>0||roll(chance));
 const bonus=number(technique?attacker.techniqueCritDamage:attacker.critDamage);
 const criticalMultiplier=forcedCriticalMultiplier||((technique ? 2 : 1.2)+bonus/100);
 const reduction=Math.min(100,number(defender.criticalDamageReduction))/100;
 const guard=defender.guardTurns>0?defender.guardReduction:0;
 return {damage:(critical?base*criticalMultiplier*(1-reduction):base)*(1-guard),critical};
}
window.DBICombatHit=hit;
window.DBICombatRoll=roll;
window.DBICombatStunChance=stunChance;
const stats=(name,race,level,s)=>({name,race:s.race||race,level:s.level||level,speed:number(s.speed),attack:number(s.attack),
 averageDamagePct:Number(s.averageDamagePct)||0,averageTechniqueDamagePct:Number(s.averageTechniqueDamagePct)||0,
 raceDamage:s.raceDamage,raceReduction:s.raceReduction,techniqueReductionPct:number(s.techniqueReductionPct),techniqueValuePct:number(s.techniqueValuePct),
 statusSkills:s.statusSkills||{},bleedChance:number(s.bleedChance),
 stunChance:number(s.stunChance),stunResistance:number(s.stunResistance),
 criticalDamageReduction:number(s.criticalDamageReduction),
 critChance:number(s.critChance),critDamage:number(s.critDamage),
 techniqueCritChance:number(s.techniqueCritChance),techniqueCritDamage:number(s.techniqueCritDamage),
 armorPenetration:number(s.armorPenetration),defense:number(s.defense),intelligence:number(s.intelligence),techniqueKi:number(s.techniqueKi),techniqueAttackPvp:number(s.techniqueAttackPvp),techniqueAttackPvm:number(s.techniqueAttackPvm),techniqueDamageBonusPct:number(s.techniqueDamageBonusPct),moves:Array.isArray(s.moves)?s.moves:[],unlockedTechniques:Array.isArray(s.unlockedTechniques)?s.unlockedTechniques:[],lastTechniqueRound:{},maxHp:Math.max(1,number(s.maxHp)),maxKi:number(s.maxKi),power:Number.isFinite(Number(s.power))?Number(s.power):(['strength','speed','endurance','intelligence','ki'].every(k=>s[k]!==undefined)?['strength','speed','endurance','intelligence','ki'].reduce((v,k)=>v+number(s[k]),0):null),hp:Math.max(1,number(s.maxHp)),ki:number(s.maxKi),normal:0,tech:0,crit:0,techCrit:0});
// Wspólne obliczenia technik: KI, premia PvP/PvM, 20% Obrony, Inteligencja kontra KI.
function turnAttack(attacker,defender,round,mode){
 const message=resolveTurn(attacker,defender,round,mode);
 if(defender.guardTurns>0)defender.guardTurns--;
 return message;
}
function resolveTurn(attacker,defender,round,mode){
 const messages=[];
 if(attacker.bleedTurns>0){
  attacker.bleedTurns--;
  const guard=attacker.guardTurns>0?attacker.guardReduction:0;
  const damage=Math.min(attacker.hp,attacker.bleedDamage*(1-guard));
  attacker.hp-=damage;
  defender.normal+=damage;
  messages.push(attacker.name+': krwawienie · '+Math.round(damage*100)/100+' obrażeń');
  if(attacker.hp<=0)return messages.join(' · ');
 }
 const log=message=>[...messages,message].join(' · ');
 if(attacker.stunTurns>0){
  attacker.stunTurns--;
  return log(attacker.name+': ogłuszenie · pomija ruch');
 }
 const move=attacker.moves[round-1];
 const rank=number(attacker.statusSkills[move]);
 const skill=rank>0?move:null;
 if(skill==='skill:bron'){
  attacker.guardTurns=2;
  attacker.guardReduction=rank*.02;
  return log(attacker.name+': Mistrz obrony · redukcja '+(rank*2)+'% przez 2 tury');
 }
 const tech=typeof move==='string'&&move.startsWith('tech:')?attacker.unlockedTechniques.find(x=>'tech:'+x.id===move):null;
 const last=attacker.lastTechniqueRound[tech?.id];
 if(tech&&attacker.ki>=number(tech.mana)&&(last===undefined||round-last>13)){
  attacker.ki=Math.max(0,attacker.ki-number(tech.mana));attacker.lastTechniqueRound[tech.id]=round;
  const attack=Math.max(0,(number(tech.baseDamage)+number(mode==='pvp'?attacker.techniqueAttackPvp:attacker.techniqueAttackPvm)+attacker.techniqueKi*.01)*(1+attacker.techniqueValuePct/100)*(1+attacker.techniqueDamageBonusPct/100));
  const reduction=Math.min(.5,Math.max(0,(defender.intelligence-attacker.techniqueKi)*.00001));
  const result=hit(attack,defender.defense,attacker,true,reduction,defender);
  if(result.dodged)return log(defender.name+': unik techniki '+tech.name);
  const actual=Math.min(defender.hp,result.damage);
  const {critical}=result;
  defender.hp=Math.max(0,defender.hp-actual);
  attacker[critical?'techCrit':'tech']+=actual;
  return log(`${attacker.name}: ${tech.name}${critical?' (krytyk)':''} · ${Math.round(actual*100)/100} obrażeń · KI ${Math.ceil(attacker.ki)}/${Math.ceil(attacker.maxKi)}`);
 }
 const multiplier=skill==='skill:uderzenie'?1.1+(rank-1)*.005:0;
 const result=hit(attacker.attack,defender.defense,attacker,false,0,defender,multiplier);
 const name=skill==='skill:ogluszenie'?'Ogłuszający Cios':skill==='skill:krwawe'?'Krwawe Uderzenie':skill==='skill:uderzenie'?'Uderzenie KI':'atak pięścią';
 if(result.dodged)return log(defender.name+': unik · '+name);
 const actual=Math.min(defender.hp,result.damage);
 const {critical}=result;
 defender.hp=Math.max(0,defender.hp-actual);
 attacker[critical?'crit':'normal']+=actual;
 const effects=[];
 if(actual>0&&defender.hp>0&&skill==='skill:ogluszenie'&&roll(stunChance(rank+attacker.stunChance,defender.stunResistance))){
  defender.stunTurns=2;
  effects.push('ogłuszenie na 2 tury');
 }
 if(actual>0&&defender.hp>0&&skill==='skill:krwawe'&&roll(rank)){
  defender.bleedTurns=3;
  defender.bleedDamage=actual*.1;
  effects.push('krwawienie przez 3 tury');
 }
 return log([`${attacker.name}: ${name}${critical?' (krytyk)':''} · ${Math.round(actual*100)/100} obrażeń`,...effects].join(' · '));
}
// Symulacja turnieju bez UI, z identyczną kolejnością i wzorami jak pojedynek.
function weakenOpponents(first,second,firstReduction,secondReduction){
 const scales=[1-Math.min(100,number(secondReduction))/100,1-Math.min(100,number(firstReduction))/100];
 for(const [index,fighter] of [first,second].entries()){
  for(const key of ['speed','attack','defense','intelligence','techniqueKi','power']){
   if(fighter[key]!==null&&fighter[key]!==undefined)fighter[key]*=scales[index];
  }
 }
}
function simulate(player,enemy,mode='pvp'){
 const p=stats(player.name||'Gracz','',player.level||1,player),e=stats(enemy.name||'Przeciwnik','',enemy.level||1,enemy),log=[];
 weakenOpponents(p,e,player.enemyStatsReductionPct,enemy.enemyStatsReductionPct);
 const order=p.speed>=e.speed?[[p,e],[e,p]]:[[e,p],[p,e]];
 for(let round=1;round<=21;round++){
  for(const [attacker,defender] of order){
   log.push('Runda '+round+': '+turnAttack(attacker,defender,round,mode));
   if(p.hp<=0||e.hp<=0)return {outcome:p.hp>0?'win':'loss',log};
  }
 }
 return {outcome:'draw',log};
}
let running=false;
function open({characterId='test',playerName='Wojownik',playerRace='Wojownik',opponentName='Krillin',opponentStats,opponentArt='',playerStats,mode='story',onFinish}={}){
 if(running)return false;
 const data=window.DBIWorldInventory?.character?.()||{};
 const source=playerStats||data;
 const p=stats(playerName,playerRace,source.level||data.level||1,{...source,ki:source.techniqueKi});
 if(mode==='story'){
  try{const saved=JSON.parse(localStorage.getItem('dboidle_combat_layout_v1_'+characterId)||'{}');p.moves=Array.isArray(saved.story)?saved.story:[];
   const unlock=JSON.parse(localStorage.getItem('dboidle_technique_quest_unlock_v1_'+characterId)||'{}');
   p.unlockedTechniques=(window.DBIWorldTechniques?.()||[]).filter(x=>unlock?.[x.id]===true).map(x=>({id:x.id,name:x.name,baseDamage:x.baseDamage,mana:x.mana}));
   p.statusSkills=window.DBICombatStatusSkills?.(characterId)||{};
   p.techniqueAttackPvm=number(data.techniqueAttackPvm);p.techniqueKi=number(data.techniqueKi);p.techniqueDamageBonusPct=number(data.techniqueDamageBonusPct);
  }catch{}
 }
 // Statystyki przeciwnika są tymczasowe do czasu zatwierdzenia parametrów Krillina.
 const e=stats(opponentName,'Człowiek',3,opponentStats||{speed:3,attack:2,defense:1,maxHp:20,maxKi:5});
 weakenOpponents(p,e,source.enemyStatsReductionPct,opponentStats?.enemyStatsReductionPct);
 const order=p.speed>=e.speed?[['p',p,e],['e',e,p]]:[['e',e,p],['p',p,e]];
 let round=1,step=0,result=null;running=true;
 const shade=document.createElement('div');shade.className='story-shade';shade.setAttribute('role','dialog');shade.setAttribute('aria-modal','true');shade.setAttribute('aria-label',mode==='pvp'?'Walka PvP':'Walka fabularna');
 const inspection=mode==='story'?`<details class="story-inspection"><summary aria-label="Pokaż statystyki przeciwnika" title="Statystyki przeciwnika">🔍</summary><div>${[['Poziom',e.level],['Atak',e.attack],['Obrona',e.defense],['Szybkość',e.speed],['Maks. HP',e.maxHp],['Maks. KI',e.maxKi]].map(([label,value])=>`<div>${label}: <b>${value}</b></div>`).join('')}</div></details>`:'';
 const fighter=(f,key)=>`<div class="story-fighter"><div class="story-avatar">${key==='e'&&mode==='story'&&window.DBIWorld?.enemyPortraitImg?window.DBIWorld.enemyPortraitImg(f.name,opponentArt,'style="width:100%;height:100%;object-fit:cover"'):safe(f.name.slice(0,1).toUpperCase())}</div><div class="story-info">${key==='e'?inspection:''}Poziom ${f.level}<br>${safe(f.race)}<br>Moc: ${Math.round(f.power??(f.attack+f.defense+f.speed))}</div><div class="story-info">HP <span id="story-${key}-hptext"></span></div><div class="story-bar"><div class="story-fill" id="story-${key}-hp" style="background:#d94b55"></div></div><div class="story-info">KI <span id="story-${key}-kitext"></span></div><div class="story-bar"><div class="story-fill" id="story-${key}-ki" style="background:#3189e6"></div></div><div class="story-stat"><span class="story-result" id="story-${key}-result">Walka trwa</span></div>${[['normal','Zadane obrażenia'],['tech','Zadane obrażenia technik'],['crit','Obrażenia krytyczne'],['techCrit','Obrażenia krytyczne technik']].map(([k,label])=>`<div class="story-stat">${label}<strong id="story-${key}-${k}">0</strong></div>`).join('')}<div class="story-stat">Łącznie zadanych obrażeń<strong id="story-${key}-total">0</strong></div></div>`;
 shade.innerHTML=`<style>.story-inspection{float:right;position:relative}.story-inspection summary{cursor:pointer;list-style:none;padding:2px 6px}.story-inspection>div{position:absolute;right:0;top:100%;z-index:5;min-width:120px;padding:8px;background:#102334;color:white;border:1px solid #ac874b}</style><div class="story-dialog"><div class="story-heading"><strong>${safe(p.name)}</strong><b>VS · <span id="story-round">1 / 21</span></b><strong>${safe(e.name)}</strong></div><div class="story-columns">${fighter(p,'p')}<div class="story-history"><div class="story-title" id="story-title">Przebieg walki</div><div class="story-scroll" id="story-scroll"></div><div class="story-pvp-reward" id="story-pvp-reward" aria-live="polite" hidden></div></div>${fighter(e,'e')}</div><div class="story-note">${mode==='pvp'?'Walka PvP':'Walka fabularna'} · automatyczna · 0,5 s między atakami · maksymalnie 21 rund</div></div>`;
 document.body.append(shade);const get=id=>shade.querySelector('#story-'+id);const scroll=get('scroll');
 const render=()=>{get('round').textContent=`${Math.min(21,round)} / 21`;for(const [k,f] of [['p',p],['e',e]]){get(k+'-hptext').textContent=`${Math.ceil(f.hp)} / ${Math.ceil(f.maxHp)}`;get(k+'-kitext').textContent=`${Math.ceil(f.ki)} / ${Math.ceil(f.maxKi)}`;get(k+'-hp').style.width=(f.hp/f.maxHp*100)+'%';get(k+'-ki').style.width=(f.maxKi?f.ki/f.maxKi*100:0)+'%';for(const field of ['normal','tech','crit','techCrit'])get(k+'-'+field).textContent=Math.round(f[field]);get(k+'-total').textContent=Math.round(f.normal+f.tech+f.crit+f.techCrit);}};
 const log=(side,message)=>{const previous=scroll.scrollTop;const div=document.createElement('div');div.className='story-line '+(side==='p'?'player':'enemy');div.textContent=message;scroll.append(div);scroll.scrollTop=previous;};
 const end=outcome=>{result=outcome;clearInterval(timer);for(const [k,status] of [['p',outcome],['e',outcome==='win'?'loss':outcome==='loss'?'win':'draw']]){const el=get(k+'-result');el.className='story-result '+status;el.textContent=status==='win'?'ZWYCIĘSTWO':status==='loss'?'PORAŻKA':'REMIS';}get('title').innerHTML='<button type="button" class="story-close" id="story-finish">Zamknij</button>';if(mode==='pvp'){const change=Number(onFinish?.(outcome))||0;const reward=get('pvp-reward');reward.hidden=false;reward.className='story-pvp-reward '+(change>0?'win':change<0?'loss':'draw');reward.textContent=change>0?'Gratulacje! Zdobyłeś '+change+' sławy':change<0?'Niestety! Straciłeś '+Math.abs(change)+' sławy':'Remis! Bez zmian punktów sławy';}const closeFight=()=>{shade.remove();running=false;if(mode!=='pvp')onFinish?.(outcome);};get('finish').onclick=closeFight;shade.addEventListener('click',event=>{if(event.target===shade)closeFight();});render();};
 const timer=setInterval(()=>{if(result)return;const [side,attacker,defender]=order[step];if(step===0){const label=document.createElement('div');label.className='story-round';label.textContent='Runda '+round;scroll.append(label);}log(side,turnAttack(attacker,defender,round,mode));render();if(p.hp<=0||e.hp<=0){end(p.hp>0?'win':'loss');return;}step++;if(step===2){step=0;if(round===21){end('draw');return;}round++;}},500);
 render();return true;
}
window.DBIStoryCombat={open,simulate,isRunning:()=>running};
})();
