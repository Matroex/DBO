const menus=[
 {name:'ŚWIAT',page:'Mapa świata'},
 {name:'POSTAĆ',options:['Pulpit','Statystyki','Profil Postaci','Walka','Ekwipunek','Misje','Aktywności']},
 {name:'AKTYWNOŚCI',options:['Turniej','Event','Pole bitwy','Trening','Rozwój Duchowy','Szybka podróż']},
 {name:'WZMOCNIENIA',options:['Techniki','Umiejętności','Smocze kule','Ulepszanie','Kowalstwo']},
 {name:'SPOŁECZNOŚĆ',options:['Ranking']},
 {name:'GILDIA',page:'Gildia'},
 {name:'POCZTA',page:'Poczta'},
 {name:'BAZA WIEDZY',disabled:true}
];
const nav=document.querySelector('#nav');
const defaultPage=document.querySelector('#pageBody').innerHTML;
const dropdown=document.querySelector('#dropdown');
let opened=null,exp=0,level=1;
const DBI_MAX_LEVEL=500;
// Wymagane EXP na przejście z aktualnego poziomu na następny.
function dbiRequiredExp(lvl){
 lvl=Math.max(1,Math.floor(Number(lvl)||1));
 if(lvl>=DBI_MAX_LEVEL)return 0;
 if(lvl<=50)return lvl*1000;
 if(lvl<=100)return 50000+(lvl-50)*2000;
 if(lvl<=200)return 150000+(lvl-100)*5000;
 return Math.ceil(650000*Math.pow(1.05,lvl-200));
}
function dbiExpMultiplier(){
 const gear=dbiMainBonus('expBonusPct','experienceBonusPct');
 return 1+(gear+20*(window.DBISpiritual?.currentBonuses()?.exp||0))/100;
}
function dbiGainExp(amount,pvm=false){
 const base=Math.max(0,Math.floor((Number(amount)||0)*dbiExpMultiplier()));
 let remaining=pvm?dbiDoublePvmExp(base,dbiSkillBonuses()):base;
 if(level>=DBI_MAX_LEVEL)return 0;
 const gained=remaining;
 while(remaining>0&&level<DBI_MAX_LEVEL){
  const need=dbiRequiredExp(level);
  const room=need-exp;
  if(remaining<room){exp+=remaining;remaining=0;break}
  remaining-=room;exp=0;level++;
 }
 if(level>=DBI_MAX_LEVEL)exp=0;
 renderExp();dbiSaveProgress();
 return gained-remaining;
}
function dbiMobExp(mobLevel,playerLevel,mobName=''){
 const quality=/\(super\)/i.test(mobName)?3:/\(silny\)/i.test(mobName)?2:1;
 const baseExp=50*quality+Math.max(1,Math.floor(Number(mobLevel)||1));
 const difference=mobLevel-playerLevel;
 const multiplier=difference>=10?1.2:difference>=1?1.1:difference===0?1:difference<=-5?.01:1+difference*.1;
 return Math.max(1,Math.ceil(baseExp*multiplier));
}
function dbiDoublePvmExp(exp,skills){
 const chance=skills.doublePvmExp+dbiMainBonus('doublePvmExpPct')+dbiMainBonus('chipDoublePvmExpPct');
 return chance>0&&Math.random()*100<chance?exp*2:exp;
}
function dbiGrantMobKills(count,mobLevel=1,mobName=''){
 const skills=dbiSkillBonuses();
 let gained=0;
 for(let i=0;i<count&&level<DBI_MAX_LEVEL;i++){
  const reward=dbiDoublePvmExp(Math.max(1,Math.floor(dbiMobExp(mobLevel,level,mobName)*(dbiExpMultiplier()+(skills.mobExp+dbiMainBonus('mobExpPct'))/100))),skills);
  gained+=reward;exp+=reward;
  while(level<DBI_MAX_LEVEL&&exp>=dbiRequiredExp(level)){
   exp-=dbiRequiredExp(level);level++;
  }
 }
 if(level>=DBI_MAX_LEVEL)exp=0;
 if(count>0){renderExp();dbiSaveProgress()}
 return gained;
}
// v2.0 — wspólna sesja konta i aktywna postać.
const DBI_SESSION_KEY='dboidle_demo_session_v1';
const DBI_ACTIVE_KEY='dboidle_active_character_v1';
let dbiSession=null,dbiActive=null,dbiCharacters=[],dbiCharacterIndex=-1;
try { dbiSession=JSON.parse(sessionStorage.getItem(DBI_SESSION_KEY)||'null'); } catch {}
try { dbiActive=JSON.parse(sessionStorage.getItem(DBI_ACTIVE_KEY)||'null'); } catch {}
if (!dbiSession?.name) {
  location.replace('login.html');
} else if (!dbiActive?.id || dbiActive.account!==dbiSession.name.toLowerCase()) {
  location.replace('characters.html');
} else {
  const dbiCharactersKey='dboidle_characters_v1_'+dbiSession.name.toLowerCase();
  try { const data=JSON.parse(localStorage.getItem(dbiCharactersKey)||'[]'); dbiCharacters=Array.isArray(data)?data:[]; } catch {}
  dbiCharacterIndex=dbiCharacters.findIndex(c=>c.id===dbiActive.id);
  if(dbiCharacterIndex<0) location.replace('characters.html');
  else {
    const character=dbiCharacters[dbiCharacterIndex];
    // Uzupełnij wyłącznie brakujące atrybuty starszych postaci.
    const initial={strength:4,speed:5,endurance:6,intelligence:2,ki:2};
    const statAliases={strength:['strength','sila'],speed:['speed','szybkosc'],endurance:['endurance','wytrzymalosc'],intelligence:['intelligence','inteligencja'],ki:['ki','KI']};
    character.stats={...(character.stats||{})};
    let upgraded=false;
    for(const [key,defaultValue] of Object.entries(initial)){
      const existing=[character.stats,character.attributes,character.baseStats,character].some(src=>src&&statAliases[key].some(alias=>src[alias]!==undefined&&src[alias]!==null));
      if(!existing){character.stats[key]=defaultValue;upgraded=true}
    }
    if(upgraded)localStorage.setItem(dbiCharactersKey,JSON.stringify(dbiCharacters));
    level=Math.max(1,Math.min(DBI_MAX_LEVEL,Math.floor(Number(character.level)||1)));
    exp=Math.max(0,Number(character.exp)||0);
    if(level>=DBI_MAX_LEVEL)exp=0;
    else {while(level<DBI_MAX_LEVEL&&exp>=dbiRequiredExp(level)){exp-=dbiRequiredExp(level);level++}}
    document.querySelector('#name').textContent=character.name;
    const avatarBox=document.getElementById('hudAvatar');
    avatarBox.textContent=Array.from(character.name.trim())[0]?.toLocaleUpperCase('pl')||'?';
    const portrait=character.avatar||character.portrait;
    if(typeof portrait==='string'&&/^assets\/[a-z0-9/_-]+\.(png|webp|jpg)$/i.test(portrait)){
     const image=new Image();image.alt='';
     image.onload=()=>avatarBox.replaceChildren(image);
     image.src=portrait;
    }
    const raceField=document.querySelector('.mini-stats strong');
    if(raceField)raceField.textContent=character.race||'Nie wybrano';
  }
}
const dbiIsGameMaster=()=>dbiCharacterIndex>=0&&window.DBIGmAccess.hasSession()&&window.DBIGmAccess.allowed(dbiSession?.name);
if(dbiIsGameMaster())menus.push({name:'GM',page:'Panel GM'});
function dbiSaveProgress(){
  if(!dbiSession?.name||dbiCharacterIndex<0)return;
  const key='dboidle_characters_v1_'+dbiSession.name.toLowerCase();
  let all=[];
  try {const data=JSON.parse(localStorage.getItem(key)||'[]');all=Array.isArray(data)?data:[]}catch{}
  const i=all.findIndex(c=>c.id===dbiActive.id);
  if(i<0)return;
  all[i]={...all[i],level,exp};
  localStorage.setItem(key,JSON.stringify(all));
}

// Liczniki w nagłówku odczytują istniejące zapisy, bez nadpisywania walut.
function formatHudCurrency(amount){
 const value=Math.max(0,Math.floor(amount));
 if(value<1000000)return value.toLocaleString('pl-PL');
 return (Math.floor(value/10000)/100).toLocaleString('pl-PL',{maximumFractionDigits:2})+'kk';
}
function dbiRefreshHeaderWallet(){
 const id=String(dbiActive?.id||'test');
 const gold=Number(localStorage.getItem('dboidle_gold_v1_'+id))||0;
 let dragon=0;
 try{dragon=Math.max(0,Number(JSON.parse(localStorage.getItem('dboidle_dragon_wallet_v1_'+id)||'{}').coins)||0)}catch{}
 const premium=Number(localStorage.getItem('dboidle_premium_v1_'+id))||0;
 const fmt=n=>Math.max(0,Math.floor(n)).toLocaleString('pl-PL');
 const values=[['dbiHeaderGold',gold],['dbiHeaderDragon',dragon],['dbiHeaderPremium',premium]];
 for(const [name,value] of values){const el=document.getElementById(name);if(el){el.textContent=formatHudCurrency(value);el.parentElement.title=fmt(value);document.getElementById(name+'Full').textContent=fmt(value)}}
}
window.DBIRefreshWallet=dbiRefreshHeaderWallet;
window.addEventListener('storage',dbiRefreshHeaderWallet);
dbiRefreshHeaderWallet();
const setLog=t=>{const log=document.querySelector('#log');if(log)log.textContent=t};
function showPage(title,section){
  if(title==='Panel GM'&&!dbiIsGameMaster())title='Pulpit';
  nav.dataset.page=title;
  if(dbiActive?.id)sessionStorage.setItem('dboidle_last_page_'+dbiActive.id,JSON.stringify({title,section}));
  // Reset stanu przeciągania przy każdej zmianie widoku.
  dragIndex=null;dragActive=false;dragSourceElement=null;clearTimeout(tabHoverTimer);tabHoverTimer=null;
  if(document.querySelector('.game')?.classList.contains('world-view')){try{window.DBIWorld?.stop?.()}catch(error){console.warn('Zatrzymanie widoku świata:',error)}}
  document.querySelector('.game').classList.toggle('world-view',title==='Mapa świata');
  if(title==='Mapa świata'){
    document.querySelector('.game').classList.remove('equipment-view');
    document.querySelector('#breadcrumb').textContent='ŚWIAT / BŁĘKITNA LAGUNA';
    window.DBIWorld.start(document.querySelector('#pageBody'),dbiActive?.id);
    opened=null;renderNav();return;
  }
 document.querySelector('.game').classList.toggle('equipment-view',title==='Ekwipunek'||title==='Panel GM'||title==='Ulepszanie'||title==='Kowalstwo');
 if(title==='Pulpit'){
   window.DBIPulpit.render(dbiActive?.id,dbiCharacters[dbiCharacterIndex]);
   opened=null;renderNav();return;
 }
 if(title==='Poczta'){dbiRenderMail();opened=null;renderNav();return;}
 if(title==='Panel GM'&&dbiIsGameMaster()){renderGM();opened=null;renderNav();return;}
 if(title==='Ekwipunek'){renderEquipment();opened=null;renderNav();return;}
 if(title==='Profil Postaci'){renderCharacterProfile();opened=null;renderNav();return;}
 if(title==='Walka'){renderCombatLayout();opened=null;renderNav();return;}
 if(title==='Statystyki'){renderCharacterStatistics();opened=null;renderNav();return;}
 if(title==='Rozwój Duchowy'){window.DBISpiritual.render();opened=null;renderNav();return;}
 if(title==='Trening'){renderTraining();opened=null;renderNav();return;}
 if(title==='Misje'){renderMissions();opened=null;renderNav();return;}
 if(title==='Aktywności'){renderDailyActivities();opened=null;renderNav();return;}
 if(title==='Ranking'){renderCommunityRanking();opened=null;renderNav();return;}
 if(title==='Turniej'){renderTournament();opened=null;renderNav();return;}
 if(title==='Event'){renderEvent();opened=null;renderNav();return;}
 if(title==='Szybka podróż'){renderFastTravel();opened=null;renderNav();return;}
 if(title==='Pole bitwy'){renderBattlefield();opened=null;renderNav();return;}
 if(title==='Techniki'){renderTechniques();opened=null;renderNav();return;}
 if(title==='Umiejętności'){renderSkillTree();opened=null;renderNav();return;}
 if(title==='Ulepszanie'){dragIndex=null;dragActive=false;dragSourceElement=null;clearTimeout(tabHoverTimer);tabHoverTimer=null;opened=null;renderNav();renderUpgradePanel();return;}
 if(title==='Kowalstwo'){dbiSmithSelection=null;opened=null;renderNav();renderBlacksmith();return;}
 if(title==='Gildia'){window.DBIGuild.render();opened=null;renderNav();return;}
 document.querySelector('#pageBody').innerHTML=defaultPage;

 document.querySelector('#breadcrumb').textContent=section?section+' / '+title:title;
 document.querySelector('#contentTitle').textContent=title;
 document.querySelector('#contentDescription').textContent='Widok „'+title+'” — miejsce na docelową zawartość. Funkcje dodamy w kolejnych etapach.';
 setLog('Otworzono: '+(section?section+' → ':'')+title);
 opened=null;renderNav();
}

// Fala uderzeniowa — technika zablokowana do odblokowania przyszłym questem.
// Koszt KI przy UŻYCIU to Mana; KI w WYMAGANIACH ulepszenia to statystyka postaci.
const DBI_TECHNIQUES=[{
 id:'fala_uderzeniowa',name:'Fala uderzeniowa',
 description:'Technika wymyślona przez Genialnego Żółwia. Wysyła falę skompresowanej KI, zadając wysokie obrażenia.',
 useMana:100,duration:'1 tura',baseDamage:50,
 images:[1,2,3,4,5].map(i=>'assets/techniques/fala_uderzeniowa_'+i+'.png'),
 upgrades:[
  {to:2,gold:5000,kiStat:200,level:'250'},
  {to:3,gold:15000,kiStat:10000,level:'500'},
  {to:4,gold:50000,kiStat:1000000,level:'G200'},
  {to:5,gold:1000000,kiStat:100000000,level:'B50'}
 ]
}];
const dbiTechKey=()=>`dboidle_techniques_v1_${dbiActive.id}`;
function dbiTechniqueState(){try{return JSON.parse(localStorage.getItem(dbiTechKey())||'{}')||{}}catch{return {}}}
function dbiTechniqueUnlocked(def){
 // Quest odblokowujący zostanie dodany później; obecnie żadna akcja w UI nie ustawia tej flagi.
 try{const data=JSON.parse(localStorage.getItem('dboidle_technique_quest_unlock_v1_'+dbiActive.id)||'{}');return data?.[def.id]===true}catch{return false}
}
function dbiTechniqueKiStat(){
 const c=dbiCharacters[dbiCharacterIndex]||{};
 for(const obj of [c.stats,c.attributes,c.baseStats,c]){
  if(!obj||typeof obj!=='object')continue;
  for(const k of ['ki','KI','kiStat','statKi']){
   if(obj[k]!==undefined&&Number.isFinite(Number(obj[k])))return Number(obj[k]);
  }
 }
 return 0;
}
function dbiTechniqueLevelReached(code){
 if(/^\d+$/.test(code))return level>=Number(code);
 // Poziomy G i B będą sprawdzane po wdrożeniu systemu odrodzeń.
 return false;
}
function dbiTechniqueUpgrade(def){
 if(!dbiTechniqueUnlocked(def))return {ok:false,reason:'Technika zablokowana. Odblokujesz ją później przez zadanie.'};
 const state=dbiTechniqueState(),rank=Math.max(1,Math.min(5,Math.floor(Number(state[def.id])||1)));
 const step=def.upgrades[rank-1];
 if(!step)return {ok:false,reason:'Technika osiągnęła maksymalny poziom.'};
 if(!dbiTechniqueLevelReached(step.level))return {ok:false,reason:'Wymagany poziom postaci: '+step.level+'.'};
 if(dbiTechniqueKiStat()<step.kiStat)return {ok:false,reason:'Za niska statystyka KI.'};
 const walletKey='dboidle_gold_v1_'+dbiActive.id;
 const gold=Number(localStorage.getItem(walletKey))||0;
 if(gold<step.gold)return {ok:false,reason:'Za mało złota.'};
 localStorage.setItem(walletKey,String(gold-step.gold));
 state[def.id]=rank+1;
 localStorage.setItem(dbiTechKey(),JSON.stringify(state));
 dbiRefreshHeaderWallet();
 return {ok:true};
}
// Wspólny wzór technik: niezależny od zwykłego ataku i od aktualnej many.
// Pierwsza wartość = PvM / boss / fabuła, druga = PvP / Pole Bitwy / turniej.
function dbiTechniquePower(baseDamage,mode='pvm',includeAverage=true){
 const pvp=mode==='pvp';
 const c=(pvp?dbiArenaPvpStats(dbiCharacters[dbiCharacterIndex]||{},true):window.DBIWorldInventory?.character?.())||{};
 const value=Number(pvp?c.techniqueAttackPvp:c.techniqueAttackPvm)||0;
 const ki=Math.max(0,Number(c.techniqueKi)||0);
 const percent=Math.max(0,Number(c.techniqueDamageBonusPct)||0);
 return Math.max(0,(Math.max(0,Number(baseDamage)||0)+value+ki*.01)*(1+(Number(c.techniqueValuePct)||0)/100)*(1+percent/100)*(includeAverage?1+(Number(c.averageTechniqueDamagePct)||0)/100:1));
}
function dbiTechniqueReduction(intelligence,attackerKi){
 return Math.min(.5,Math.max(0,((Number(intelligence)||0)-(Number(attackerKi)||0))*.00001));
}
window.DBITechniqueCombat={power:(baseDamage,mode)=>dbiTechniquePower(baseDamage,mode,false),reduction:dbiTechniqueReduction};
function renderTechniques(){
 hideItemPopups();
 document.querySelector('#breadcrumb').textContent='WZMOCNIENIA / TECHNIKI';
 const host=document.querySelector('#pageBody'),state=dbiTechniqueState();
 const visibleTechniques=DBI_TECHNIQUES.filter(dbiTechniqueUnlocked);
 host.innerHTML=`<section class="dbi-techniques">
 <h2>Techniki</h2><div class="dbi-techniques-divider"></div>
 <div id="dbiTechList">${visibleTechniques.length?visibleTechniques.map(t=>{
  const rank=Math.max(1,Math.min(5,Math.floor(Number(state[t.id])||1)));
  const unlocked=dbiTechniqueUnlocked(t),step=t.upgrades[rank-1];
  return `<article class="dbi-tech-card">
   <div class="dbi-tech-art"><img src="${esc(t.images[rank-1])}" alt="Fala uderzeniowa — poziom ${rank}"></div>
   <div class="dbi-tech-details">
    <h3>${esc(t.name)} <span class="dbi-tech-level">Poziom ${rank}/5</span></h3>
    <p class="dbi-tech-description">${esc(t.description)}</p>
    <p><strong>Koszt użycia techniki:</strong> ${t.useMana} pkt KI (Many)</p>
    <p><strong>Czas trwania techniki:</strong> ${esc(t.duration)}</p>
    <p><strong>Obrażenia techniki (PvM):</strong> ${dbiTechniquePower(t.baseDamage,'pvm').toLocaleString('pl-PL',{maximumFractionDigits:2})} pkt</p>
    <p><strong>Obrażenia techniki (PvP):</strong> ${dbiTechniquePower(t.baseDamage,'pvp').toLocaleString('pl-PL',{maximumFractionDigits:2})} pkt</p>
    <p class="dbi-tech-lock">${unlocked?'Odblokowana':'🔒 Zablokowana — wymaga przyszłego zadania'}</p>
    ${step?`<p class="dbi-tech-requirements"><strong>Ulepszenie do poziomu ${step.to}:</strong> <img class="dbi-gold-icon" src="assets/ui/gold.png" alt="" width="16" height="16">${step.gold.toLocaleString('pl-PL')} złota · statystyka KI ${step.kiStat.toLocaleString('pl-PL')} · poziom postaci ${step.level}</p>`:'<p class="dbi-tech-requirements">Osiągnięto poziom 5/5.</p>'}
    <div class="dbi-tech-upgrade-status" role="status" aria-atomic="true" style="color:#ffc28b"></div>
   </div><button class="dbi-tech-upgrade" type="button" data-tech-id="${esc(t.id)}" ${unlocked&&step?'':'disabled'}>Ulepsz</button>
  </article>`;
 }).join(''):'<div class="dbi-tech-empty">Nie potrafisz wykonać jeszcze żadnej techniki</div>'}</div>
 ${visibleTechniques.length?'<p class="dbi-tech-note">Wymagane KI przy ulepszaniu to statystyka postaci, nie Mana. Ulepszenie pobiera wyłącznie złoto. Poziomy G200 i B50 zostaną podłączone po wdrożeniu odrodzeń.</p>':''}
 </section>`;
 host.querySelectorAll('[data-tech-id]').forEach(btn=>btn.onclick=()=>{
  const def=DBI_TECHNIQUES.find(t=>t.id===btn.dataset.techId);
  if(!def)return;
  const result=dbiTechniqueUpgrade(def);
  if(!result.ok){
   btn.closest('.dbi-tech-card').querySelector('.dbi-tech-upgrade-status').textContent=result.reason;
   return;
  }
  renderTechniques();
 });
}
// Ranking lokalnych, rzeczywiście utworzonych postaci.
const DBI_RANK_CATEGORIES=[
 ['exp','Doświadczenie'],['level','Poziom postaci'],['battlePoints','Punkty walki'],
 ['pvpWins','Wygrane pojedynki PvP'],['tournaments','Wygrane turnieje'],
 ['fame','Punkty sławy'],['bosses','Pokonane bossy'],['dragonBalls','Zebrane smocze kule'],
 ['medals','Zdobyte medale'],['achievements','Osiągnięcia'],['spirit','Poziom Rozwoju Duchowego']
];
let dbiRankCategory='exp',dbiRankQuery='',dbiRankPage=0;
function dbiRankRead(key,fallback=null){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch{return fallback}}
function dbiRankCharacters(){
 const result=[],ids=new Set();
 for(let i=0;i<localStorage.length;i++){
  const key=localStorage.key(i);
  if(!key?.startsWith('dboidle_characters_v1_'))continue;
  const list=dbiRankRead(key,[]);
  if(!Array.isArray(list))continue;
  for(const c of list){
   if(!c||typeof c.id!=='string'||!c.id||typeof c.name!=='string'||ids.has(c.id))continue;
   ids.add(c.id);
   const dash=dbiRankRead('dboidle_dashboard_v1_'+c.id,{});
   const spirit=dbiRankRead('dboidle_spiritual_v1_'+c.id,{});
   const metrics={exp:Number(c.exp)||0,level:Number(c.level)||1,
    battlePoints:Number(dash.battlePoints)||0,pvpWins:Number(dash.pvpWins)||0,
    tournaments:Number(dash.tournaments)||0,fame:Number(dash.fame??500)||0,
    bosses:Number(dash.bosses)||0,dragonBalls:Number(dash.dragonBalls)||0,
    medals:Number(dash.medals)||0,achievements:Number(dash.achievements)||0,
    spirit:Number(spirit.level)||1};
   result.push({character:c,metrics});
  }
 }
 return result;
}
function dbiRankSorted(){
 return dbiRankCharacters().sort((a,b)=>b.metrics[dbiRankCategory]-a.metrics[dbiRankCategory]||
 b.metrics.level-a.metrics.level||a.character.name.localeCompare(b.character.name,'pl')||
 a.character.id.localeCompare(b.character.id));
}
function renderCommunityRanking(){
 hideItemPopups();
 document.querySelector('#breadcrumb').textContent='SPOŁECZNOŚĆ / RANKING';
 const host=document.querySelector('#pageBody');
 host.innerHTML=`<section class="dbi-ranking">
 <h2>🏆 Ranking postaci</h2>
 <div class="dbi-ranking-controls"><label>Kategoria <select id="dbiRankCategory">${DBI_RANK_CATEGORIES.map(([key,label])=>`<option value="${key}" ${key===dbiRankCategory?'selected':''}>${esc(label)}</option>`).join('')}</select></label>
 <label>Szukaj postaci <input type="search" id="dbiRankSearch" placeholder="Nazwa postaci" value="${esc(dbiRankQuery)}"></label></div>
 <div class="dbi-ranking-scroll"><table class="dbi-ranking-table"><thead><tr><th>Poz.</th><th>Nazwa postaci</th><th>Gildia</th><th>Poziom</th><th id="dbiRankMetric"></th></tr></thead><tbody id="dbiRankRows"></tbody></table></div>
 <div class="dbi-ranking-footer"><span id="dbiRankCount"></span><div><button type="button" id="dbiRankPrev">◀ Poprzednia</button><span id="dbiRankPagination"></span><button type="button" id="dbiRankNext">Następna ▶</button></div></div></section>`;
 const redraw=()=>{
  const all=dbiRankSorted();
  const filtered=all.map((x,i)=>({...x,rank:i+1})).filter(x=>x.character.name.toLocaleLowerCase('pl').includes(dbiRankQuery.toLocaleLowerCase('pl')));
  const pages=Math.max(1,Math.ceil(filtered.length/20));dbiRankPage=Math.min(dbiRankPage,pages-1);
  document.querySelector('#dbiRankMetric').textContent=DBI_RANK_CATEGORIES.find(x=>x[0]===dbiRankCategory)?.[1]||'Wynik';
  document.querySelector('#dbiRankRows').innerHTML=filtered.slice(dbiRankPage*20,(dbiRankPage+1)*20).map(x=>
   `<tr><td>${x.rank}</td><td><button type="button" class="dbi-ranking-name" data-rank-id="${esc(x.character.id)}">${esc(x.character.name)}</button></td>
   <td>${esc(x.character.guild||x.character.guildName||'—')}</td><td>${x.metrics.level.toLocaleString('pl-PL')}</td>
   <td>${x.metrics[dbiRankCategory].toLocaleString('pl-PL')}</td></tr>`).join('')||
   '<tr><td colspan="5" class="dbi-ranking-empty">Nie znaleziono postaci.</td></tr>';
  document.querySelector('#dbiRankCount').textContent=`Znaleziono: ${filtered.length} · wszystkich postaci: ${all.length}`;
  document.querySelector('#dbiRankPagination').textContent=`Strona ${dbiRankPage+1} z ${pages}`;
  document.querySelector('#dbiRankPrev').disabled=dbiRankPage===0;
  document.querySelector('#dbiRankNext').disabled=dbiRankPage>=pages-1;
  document.querySelectorAll('[data-rank-id]').forEach(btn=>btn.onclick=()=>{
   const entry=all.find(x=>x.character.id===btn.dataset.rankId);
   if(entry)dbiOpenRankProfile(entry.character);
  });
 };
 document.querySelector('#dbiRankCategory').onchange=e=>{dbiRankCategory=e.target.value;dbiRankPage=0;redraw()};
 document.querySelector('#dbiRankSearch').oninput=e=>{dbiRankQuery=e.target.value;dbiRankPage=0;redraw()};
 document.querySelector('#dbiRankPrev').onclick=()=>{dbiRankPage--;redraw()};
 document.querySelector('#dbiRankNext').onclick=()=>{dbiRankPage++;redraw()};
 redraw();
}
function dbiOpenRankProfile(character){
 const existing=document.getElementById('dbiRankModal');if(existing)existing.remove();
 const overlay=document.createElement('div');overlay.className='dbi-ranking-overlay';overlay.id='dbiRankModal';
 overlay.innerHTML='<div class="dbi-ranking-dialog" role="dialog" aria-modal="true" aria-label="Podgląd profilu postaci"><button class="dbi-ranking-close" type="button" aria-label="Zamknij profil">✕</button><div class="dbi-ranking-profile"></div></div>';
 document.body.append(overlay);
 const dismiss=()=>{overlay.remove();document.removeEventListener('keydown',onKey)};
 const onKey=e=>{if(e.key==='Escape')dismiss()};
 overlay.addEventListener('mousedown',e=>{if(e.target===overlay)dismiss()});
 overlay.querySelector('.dbi-ranking-close').onclick=dismiss;
 document.addEventListener('keydown',onKey);
 renderCharacterProfile(character,overlay.querySelector('.dbi-ranking-profile'),true);
 overlay.querySelector('.dbi-ranking-close').focus();
}

// Arena PvP: jedynie prawdziwe postacie z lokalnego zapisu.
// Rozstrzyganie pojedynków i naliczanie sławy zostaną podłączone do przyszłego silnika PvP.
const DBI_ARENA_REFRESH_LIMIT=2,DBI_ARENA_DAILY_FIGHTS=10,DBI_ARENA_COOLDOWN=30*60*1000;
const dbiArenaKey=()=>`dboidle_arena_v1_${dbiActive?.id||'unknown'}`;
const dbiArenaToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
function dbiArenaState(){
 const raw=dbiRankRead(dbiArenaKey(),{}),today=dbiArenaToday();
 return {day:today,refreshes:raw.day===today?Math.min(2,Math.max(0,Number(raw.refreshes)||0)):0,
 fights:raw.day===today?Math.min(10,Math.max(0,Number(raw.fights)||0)):0,
 opponents:raw.day===today&&Array.isArray(raw.opponents)?raw.opponents:[],
 lastFight:Number(raw.lastFight)||0,
 opponentCooldowns:raw.opponentCooldowns&&typeof raw.opponentCooldowns==='object'?raw.opponentCooldowns:{}};
}
function dbiArenaSave(state){localStorage.setItem(dbiArenaKey(),JSON.stringify(state))}
function dbiArenaFame(c){return Number(dbiRankRead('dboidle_dashboard_v1_'+c.id,{})?.fame??c.fame??500)||0}
function dbiArenaShuffle(a){const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
function dbiArenaDraw(){
 const self=dbiRankCharacters().find(x=>x.character.id===dbiActive?.id)?.character;
 const fame=dbiArenaFame(self||{id:dbiActive?.id});
 const others=dbiRankCharacters().map(x=>x.character).filter(x=>x.id!==dbiActive?.id);
 // "Podobna" oznacza różnicę do 100 punktów sławy (włącznie).
 const higher=others.filter(c=>dbiArenaFame(c)>fame+100);
 const similar=others.filter(c=>Math.abs(dbiArenaFame(c)-fame)<=100);
 const lower=others.filter(c=>dbiArenaFame(c)<fame-100);
 return [...dbiArenaShuffle(higher).slice(0,2),...dbiArenaShuffle(similar).slice(0,3),...dbiArenaShuffle(lower).slice(0,2)].map(c=>c.id);
}
function dbiArenaFameLoss(myFame,opponentFame){
 const diff=myFame-opponentFame;
 return diff>100?Math.floor(diff/100)*10:0;
}
// Turniej lokalny: zapis per dzień/kategoria, automatyczna drabinka 32 uczestników.
// Bez serwera dane innych przeglądarek nie są współdzielone.
const DBI_TOURNAMENT_CATEGORIES=[
 {id:'1-20',label:'1–20',min:1,max:20},
 {id:'21-50',label:'21–50',min:21,max:50},
 {id:'51-100',label:'51–100',min:51,max:100}
];
const DBI_TOURNAMENT_FEE=10000;
const DBI_TOURNAMENT_REWARDS={
 '1-20':{premium:5,chest:'turniej-skrzynka-mala'},
 '21-50':{premium:10,chest:'turniej-skrzynka-srednia'},
 '51-100':{premium:13,chest:'turniej-skrzynka-duza'}
};
function dbiTournamentAward(date,category,state){
 if(!state.finished||!state.winner||state.winner.npc||state.rewardGranted)return;
 const id=String(state.winner.id),reward=DBI_TOURNAMENT_REWARDS[category.id];
 if(!reward)return;
 // Nagrody zapisujemy dla zwycięskiej postaci, nie dla aktualnie wybranej.
 const goldKey='dboidle_gold_v1_'+id,premiumKey='dboidle_premium_v1_'+id,invKey='dboidle_inventory_v1_'+id;
 const inv=dbiRankRead(invKey,[]);
 if(!Array.isArray(inv))return;
 const gold=Math.max(0,Number(localStorage.getItem(goldKey))||0);
 const premium=Math.max(0,Number(localStorage.getItem(premiumKey))||0);
 inv.push(reward.chest);
 localStorage.setItem(invKey,JSON.stringify(inv));
 localStorage.setItem(goldKey,String(gold+50000));
 localStorage.setItem(premiumKey,String(premium+reward.premium));
 // Synchronizacja ekwipunku w pamięci, gdy zwycięzca jest aktywną postacią.
 if(String(dbiActive?.id)===id){
  inventory.push(reward.chest);inventoryPlacement.push(null);
  dbiSaveInventory();dbiRefreshHeaderWallet();
 }
 state.rewardGranted=true;
 dbiTournamentWrite(date,category.id,state);
}

const dbiTournamentDate=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const dbiTournamentKey=(date,cat)=>`dboidle_tournament_v1_${date}_${cat}`;
const dbiTournamentRead=(date,cat)=>dbiRankRead(dbiTournamentKey(date,cat),{entrants:[],rounds:[],winner:null,finished:false});
function dbiTournamentWrite(date,cat,data){localStorage.setItem(dbiTournamentKey(date,cat),JSON.stringify(data))}
const dbiTournamentWindow=()=>{const d=new Date(),minute=d.getHours()*60+d.getMinutes();return minute<900?'before':minute<1080?'open':'closed'};
function dbiTournamentEscape(s){return esc(String(s??''))}
function dbiTournamentStats(c){
 if(c.npc)return {speed:5,attack:Math.ceil(5*.5),defense:5,maxHp:5,maxKi:5};
 return dbiArenaPvpStats(c.snapshot||c,false);
}
function dbiTournamentDuel(a,b){
 const p=dbiTournamentStats(a),e=dbiTournamentStats(b);
 // Wspólny silnik obliczeń używany również w Polu Bitwy.
 const result=window.DBIStoryCombat?.simulate?.({...p,name:a.name},{...e,name:b.name},'pvp');
 if(result){
  if(result.outcome==='win')return {winner:a,loser:b,draw:false,log:result.log};
  if(result.outcome==='loss')return {winner:b,loser:a,draw:false,log:result.log};
  return Math.random()<.5?{winner:a,loser:b,draw:true,log:result.log}:{winner:b,loser:a,draw:true,log:result.log};
 }
 // Awaryjnie zachowujemy stary wynik, jeżeli silnik walki nie został załadowany.
 const damage=(atk,def)=>atk>0?atk*Math.max(.1,1-Math.max(0,def)/(2*atk)):0;
 let hpA=Math.max(1,p.maxHp),hpB=Math.max(1,e.maxHp);
 for(let r=0;r<21;r++)for(const side of (p.speed>=e.speed?[0,1]:[1,0])){
  if(side===0){hpB-=damage(p.attack,e.defense);if(hpB<=0)return {winner:a,loser:b,draw:false}}
  else{hpA-=damage(e.attack,p.defense);if(hpA<=0)return {winner:b,loser:a,draw:false}}
 }
 return Math.random()<.5?{winner:a,loser:b,draw:true}:{winner:b,loser:a,draw:true};
}
function dbiTournamentResolve(date,category){
 const state=dbiTournamentRead(date,category.id);
 if(state.finished){dbiTournamentAward(date,category,state);return state;}
 const players=(state.entrants||[]).map(c=>({...c}));
 while(players.length<32){
  players.push({id:`npc-${category.id}-${players.length}`,name:'Zawodnik Turnieju',npc:true,level:1});
 }
 // Fisher-Yates: losowe pozycje 1–32.
 for(let i=players.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[players[i],players[j]]=[players[j],players[i]]}
 state.start=players.map((p,i)=>({...p,position:i+1}));
 let current=players,rounds=[];
 while(current.length>1){
  const matches=[],winners=[];
  for(let i=0;i<current.length;i+=2){
   const a=current[i],b=current[i+1],result=dbiTournamentDuel(a,b);
   matches.push({a:{id:a.id,name:a.name,npc:!!a.npc},b:{id:b.id,name:b.name,npc:!!b.npc},
    winnerId:result.winner.id,draw:result.draw,log:result.log||[]});
   winners.push(result.winner);
  }
  rounds.push(matches);current=winners;
 }
 state.rounds=rounds;state.winner={id:current[0].id,name:current[0].name,npc:!!current[0].npc};
 state.finished=true;state.finishedAt=Date.now();
 dbiTournamentWrite(date,category.id,state);
 dbiTournamentAward(date,category,state);
 // Licznik zwycięstw aktualizujemy tylko raz dla zwycięzcy turnieju.
 if(!state.winner.npc){
  const key='dboidle_dashboard_v1_'+state.winner.id;
  const dashboard=dbiRankRead(key,{});
  dashboard.tournaments=Math.max(0,Math.trunc(Number(dashboard.tournaments)||0))+1;
  localStorage.setItem(key,JSON.stringify(dashboard));
 }
 return state;
}
function dbiTournamentEnroll(category,date){
 if(dbiTournamentWindow()!=='open')return;
 const c=dbiCharacters[dbiCharacterIndex];
 if(!c||level<category.min||level>category.max)return;
 const state=dbiTournamentRead(date,category.id);
 if(state.finished||state.entrants.some(x=>x.id===c.id)||state.entrants.length>=32)return;
 const key='dboidle_gold_v1_'+c.id,gold=Number(localStorage.getItem(key))||0;
 if(gold<DBI_TOURNAMENT_FEE){alert('Potrzebujesz 10 000 złota, aby zapisać się na turniej.');return}
 // Pobranie opłaty i zapis tylko po walidacji limitu miejsc.
 localStorage.setItem(key,String(gold-DBI_TOURNAMENT_FEE));
 state.entrants.push({id:c.id,name:c.name,level,stats:{...(c.stats||{})},
  snapshot:{...c,level,stats:{...(c.stats||{})}}});
 dbiTournamentWrite(date,category.id,state);
 dbiRefreshHeaderWallet();
 renderTournament();
}
function renderEvent(){
 hideItemPopups();
 document.querySelector('#breadcrumb').textContent='AKTYWNOŚCI / EVENT';
 document.querySelector('#pageBody').innerHTML=`<section class="dbi-tournament" aria-label="Event"><header class="dbi-tournament-header"><span class="eyebrow">WYDARZENIA SPECJALNE</span><h2>Event</h2><p>Aktualnie nie trwa żadne wydarzenie specjalne</p></header></section>`;
}

// Drzewko umiejętności: punkty = floor(poziom / 5), bez resetu.
// Bonusy pasywne i efekty aktywne zostaną podłączone po zatwierdzeniu wartości.
const DBI_SKILL_NODES=[
 {id:'medytacja',name:'Mistrz Medytacji',x:50,y:5,req:[],type:'passive'},
 {id:'trening',name:'Trening ponad wszystko',x:25,y:17,req:['medytacja'],type:'passive'},
 {id:'ogluszenie',name:'Ogłuszający Cios',x:50,y:17,req:['medytacja'],type:'active'},
 {id:'kowalstwo',name:'Podstawowe Kowalstwo',x:75,y:17,req:['medytacja'],type:'passive'},
 {id:'mistrz',name:'Prawdziwy Mistrz',x:25,y:30,req:['trening','ki'],type:'passive'},
 {id:'ki',name:'Pierwsze Kroki KI',x:50,y:30,req:['trening','ogluszenie','kowalstwo'],type:'passive'},
 {id:'kowalstwo2',name:'Zaawansowane Kowalstwo',x:75,y:30,req:['kowalstwo','ki'],type:'passive'},
 {id:'postawa',name:'Postawa do walki',x:50,y:43,req:['ki'],type:'passive'},
 {id:'bron',name:'Mistrz obrony',x:30,y:56,req:['postawa'],type:'active'},
 {id:'uderzenie',name:'Uderzenie KI',x:70,y:56,req:['postawa'],type:'active'},
 {id:'wszystko',name:'Wszystko albo nic',x:50,y:68,req:['postawa'],type:'passive'},
 {id:'pogromca',name:'Pogromca Potworów',x:50,y:81,req:['wszystko'],type:'passive'},
 {id:'krwawe',name:'Krwawe Uderzenie',x:50,y:94,req:['pogromca'],type:'active'}
];
const DBI_SKILL_BY_ID=Object.fromEntries(DBI_SKILL_NODES.map(n=>[n.id,n]));
const dbiSkillKey=()=>`dboidle_skills_v1_${dbiActive?.id||'none'}`;
function dbiSkillRead(){try{const x=JSON.parse(localStorage.getItem(dbiSkillKey())||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch{return {}}}
function dbiSkillRank(data,id){
 return Math.max(0,Math.min(10,Math.trunc(Number(data[id])||0)));
}
function dbiSkillBonuses(data=dbiSkillRead()){
 const rank=id=>dbiSkillRank(data,id);
 const second=id=>Math.max(0,rank(id)-5);
 return {
  stats:50*rank('medytacja'),attack:5*second('medytacja'),
  trainingBase:rank('trening'),trainingResult:second('trening'),
  upgrade:rank('kowalstwo'),materialDiscount:Number(rank('kowalstwo')>=6),
  quality:rank('kowalstwo2'),addBonus:second('kowalstwo2'),
  critDamage:rank('mistrz')/10,techCritDamage:second('mistrz')/2,
  techniqueAttack:10*rank('ki'),techCritChance:second('ki')/2,
  hp:100*rank('postawa'),defense:20*second('postawa'),
  doubleBossDrop:rank('wszystko')/2,mobGold:10*second('wszystko'),
  mobExp:10*rank('pogromca'),doublePvmExp:second('pogromca')
 };
}
const DBI_SKILL_EFFECT_TEXT={
 medytacja:'+50 do pięciu statystyk / poziom · od 6: +5–5 wartości ataku / poziom',
 trening:'+1% do bazy treningu / poziom · od 6: +1% do wyniku / poziom',
 kowalstwo:'Odblokowuje ulepszanie · +1% powodzenia / poziom · od 6: −1 szt. każdego zwykłego składnika',
 kowalstwo2:'+1% szansy podniesienia jakości / poziom · od 6: +1% szansy dodania bonusu / poziom · dodawanie bonusów w przygotowaniu',
 mistrz:'+0,1% obrażeń krytycznych / poziom · od 6: +0,5% obrażeń krytycznych technik / poziom',
 ki:'+10 do bazowych obrażeń technik / poziom · od 6: +0,5% szansy krytyka technik / poziom',
 postawa:'+100 maks. HP / poziom · od 6: +20 Obrony / poziom',
 wszystko:'+0,5% szansy na podwójny łup bossa / poziom · od 6: +10% złota z mobów / poziom',
 pogromca:'+10% EXP z mobów / poziom · od 6: +1% szansy na podwójne EXP PvM / poziom',
 ogluszenie:'1% szansy ogłuszenia / poziom · cel traci 2 tury',
 bron:'2% redukcji obrażeń / poziom przez 2 tury · bez ataku',
 uderzenie:'Pewny krytyk: 110% na 1. poziomie · +0,5% za każdy kolejny poziom',
 krwawe:'1% szansy krwawienia / poziom · 3 tury'
};
function dbiSkillSpent(data){return DBI_SKILL_NODES.reduce((a,n)=>a+Math.max(0,Math.min(10,Math.trunc(Number(data[n.id])||0))),0)}
function dbiSkillCanUnlock(node,data){return node.req.every(id=>Number(data[id])>=1)}
function dbiSkillSpend(id){
 const node=DBI_SKILL_BY_ID[id];if(!node)return;
 const data=dbiSkillRead(),current=Math.max(0,Math.min(10,Math.trunc(Number(data[id])||0)));
 if(current>=10||!dbiSkillCanUnlock(node,data)||dbiSkillSpent(data)>=Math.floor(level/5))return;
 data[id]=current+1;localStorage.setItem(dbiSkillKey(),JSON.stringify(data));renderSkillTree();
}
function dbiSkillTooltipValues(id,rank){
 if(!rank)return ['Brak aktywnego efektu'];
 const b=dbiSkillBonuses({[id]:rank});
 const number=value=>value.toLocaleString('pl-PL',{maximumFractionDigits:2});
 const effects={
  medytacja:[`+${b.stats} do Siły, Szybkości, Wytrzymałości, Inteligencji i KI`,b.attack&&`+${b.attack}–${b.attack} do wartości ataku`],
  trening:[`+${b.trainingBase}% do bazy treningu`,b.trainingResult&&`+${b.trainingResult}% do wyniku treningu`],
  kowalstwo:['Odblokowuje ulepszanie przedmiotów',`+${b.upgrade}% do szansy ulepszenia`,b.materialDiscount&&'−1 szt. każdego zwykłego składnika (z wyłączeniem Pyłu Smoczych Kul i Przekuwacza)'],
  kowalstwo2:[`+${b.quality}% do szansy podniesienia jakości`,b.addBonus&&`+${b.addBonus}% do szansy dodania bonusu (w przygotowaniu)`],
  mistrz:[`+${number(b.critDamage)}% do mnożnika krytyka`,b.techCritDamage&&`+${number(b.techCritDamage)}% do mnożnika krytyka techniki`],
  ki:[`+${b.techniqueAttack} do bazowych obrażeń technik`,b.techCritChance&&`+${number(b.techCritChance)}% do szansy krytyka techniki`],
  postawa:[`+${b.hp} maks. HP`,b.defense&&`+${b.defense} do Obrony`],
  wszystko:[`+${number(b.doubleBossDrop)}% do szansy na podwójny łup bossa`,b.mobGold&&`+${b.mobGold}% złota z mobów`],
  pogromca:[`+${b.mobExp}% EXP z mobów`,b.doublePvmExp&&`+${b.doublePvmExp}% do szansy na podwójne EXP PvM`],
  ogluszenie:[`${rank}% bazowej szansy na ogłuszenie na 2 tury`],
  bron:[`${rank*2}% redukcji obrażeń przez 2 tury · bez ataku`],
  uderzenie:[`${number(110+(rank-1)*0.5)}% obrażeń trafienia · pewny krytyk po trafieniu`],
  krwawe:[`${rank}% szansy na krwawienie przez 3 tury`,'Co turę zadaje 10% obrażeń z trafienia nakładającego efekt']
 };
 return effects[id].filter(Boolean);
}
function dbiSkillTooltipHtml(node,data){
 const rank=dbiSkillRank(data,node.id);
 const missing=node.req.filter(id=>!dbiSkillRank(data,id)).map(id=>DBI_SKILL_BY_ID[id].name);
 const effectLines=value=>dbiSkillTooltipValues(node.id,value).map(text=>`<div>${esc(text)}</div>`).join('');
 return `<div class="tip-name">${esc(node.name)}</div>
  <div>${node.type==='active'?'Aktywna':'Pasywna'} · poziom ${rank}/10</div>
  <div class="tip-stats">${effectLines(rank)}</div>
  ${rank<10?`<div class="tip-stats"><strong>Poziom ${rank+1}</strong>${effectLines(rank+1)}</div>`:''}
  <div class="tip-description">${esc(DBI_SKILL_EFFECT_TEXT[node.id])}</div>
  ${missing.length?`<div>Wymaga: ${esc(missing.join(', '))}</div>`:''}`;
}
function renderSkillTree(){
 hideItemPopups();
 document.querySelector('#breadcrumb').textContent='WZMOCNIENIA / UMIEJĘTNOŚCI';
 const host=document.querySelector('#pageBody'),data=dbiSkillRead();
 const points=Math.max(0,Math.floor(level/5)-dbiSkillSpent(data));
 const links=DBI_SKILL_NODES.flatMap(node=>node.req.map(req=>{
  const source=DBI_SKILL_BY_ID[req];
  const active=Number(data[req])>=1;
  return `<line x1="${source.x}" y1="${source.y}" x2="${node.x}" y2="${node.y}" class="dbi-skill-line${active?' lit':''}"/>`;
 })).join('');
 const nodes=DBI_SKILL_NODES.map((node,i)=>{
  const lv=Math.max(0,Math.min(10,Math.trunc(Number(data[node.id])||0)));
  const unlocked=dbiSkillCanUnlock(node,data),available=unlocked&&lv<10&&points>0;
  return `<button type="button" class="dbi-skill-node${lv?' learned':''}${unlocked?' accessible':' locked'}${available?' spendable':''}" style="--sx:${node.x}%;--sy:${node.y}%;${available?'':'cursor:default'}" data-skill="${node.id}" aria-label="${esc(node.name)} · poziom ${lv}/10" aria-disabled="${!available}">
  <span class="dbi-skill-art"><img src="assets/skills/${node.id}.png" alt="" draggable="false"><span class="dbi-skill-level">${lv===10?'Max.':lv}</span></span>
  <span class="dbi-skill-label">${esc(node.name)}${node.type==='active'?'<small>(Aktywne)</small>':''}</span>
  </button>`;
 }).join('');
 host.innerHTML=`<section class="dbi-skill-panel"><header class="dbi-skill-head"><h2>Umiejętności</h2><p>Rozwijaj swoje umiejętności walki jak i fechtunku, aby zwiększyć swoją siłę</p><div class="dbi-skill-points">Dostępne punkty: <strong>${points}</strong></div></header>
 <div class="dbi-skill-scroll"><div class="dbi-skill-canvas"><svg class="dbi-skill-paths" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${links}</svg>${nodes}</div></div>
 <p class="dbi-skill-foot">1 punkt za każde pełne 5 poziomów postaci. Kliknięcie umiejętności natychmiast i nieodwracalnie wydaje punkt. Każdy kafelek: maks. 10 poziomów.</p></section>`;
 const tip=document.createElement('div');
 tip.id='dbiSkillTooltip';
 tip.className='item-tooltip';
 tip.setAttribute('role','tooltip');
 tip.style.maxWidth='calc(100vw - 16px)';
 tip.hidden=true;
 host.querySelector('.dbi-skill-panel').append(tip);
 let active=null;
 const hide=button=>{
  if(active!==button)return;
  button.removeAttribute('aria-describedby');
  tip.hidden=true;
  active=null;
 };
 host.querySelectorAll('[data-skill]').forEach(button=>{
  const icon=button.querySelector('.dbi-skill-art');
  const show=(x,y)=>{
   if(active)hide(active);
   tip.innerHTML=dbiSkillTooltipHtml(DBI_SKILL_BY_ID[button.dataset.skill],data);
   tip.hidden=false;
   active=button;
   button.setAttribute('aria-describedby',tip.id);
   positionPopup(tip,x,y);
  };
  icon.addEventListener('pointerenter',event=>{
   if(event.pointerType!=='touch')show(event.clientX,event.clientY);
  });
  icon.addEventListener('pointermove',event=>{
   if(active===button)positionPopup(tip,event.clientX,event.clientY);
  });
  icon.addEventListener('pointerleave',()=>hide(button));
  button.addEventListener('focus',()=>{
   if(!button.matches(':focus-visible'))return;
   const rect=icon.getBoundingClientRect();
   show(rect.right,rect.top);
  });
  button.addEventListener('blur',()=>hide(button));
  button.addEventListener('keydown',event=>{if(event.key==='Escape')hide(button)});
  button.addEventListener('click',()=>{
   if(button.getAttribute('aria-disabled')!=='true')dbiSkillSpend(button.dataset.skill);
  });
 });
}

// Układ walki: 21 zaplanowanych ruchów osobno dla fabularnych i PvP.
// Układ walki: cooldown Fali Uderzeniowej 13 tur; silniki PvP i turnieju korzystają z zapisu.
const DBI_COMBAT_COOLDOWNS={'tech:fala_uderzeniowa':13};
const dbiCombatCooldown=id=>DBI_COMBAT_COOLDOWNS[id]??1;
const dbiCombatCanPlace=(moves,index,id)=>!id||moves.every((existing,i)=>existing!==id||i===index||Math.abs(i-index)>dbiCombatCooldown(id));
let dbiCombatLayoutMode='story';
const dbiCombatLayoutKey=()=>`dboidle_combat_layout_v1_${dbiActive?.id||'none'}`;
function dbiCombatLayoutRead(){
 try{const value=JSON.parse(localStorage.getItem(dbiCombatLayoutKey())||'{}');return value&&typeof value==='object'?value:{}}catch{return {}}
}
function dbiCombatLayoutAvailable(){
 const skills=dbiSkillRead();
 const techniques=DBI_TECHNIQUES.filter(t=>dbiTechniqueUnlocked(t)).map(t=>({id:'tech:'+t.id,name:t.name,image:t.images[Math.max(0,Math.min(4,Number(dbiTechniqueState()[t.id]||1)-1))],kind:'Technika'}));
 const active=DBI_SKILL_NODES.filter(n=>n.type==='active'&&Number(skills[n.id])>=1).map(n=>({id:'skill:'+n.id,name:n.name,image:'assets/skills/'+n.id+'.png',kind:'Umiejętność'}));
 return {techniques,active,all:[...techniques,...active]};
}
function dbiCombatLayoutGet(mode){
 const raw=dbiCombatLayoutRead()[mode];
 return Array.from({length:21},(_,i)=>typeof raw?.[i]==='string'?raw[i]:null);
}
function dbiCombatLayoutSet(mode,index,id){
 if(!['story','pvp'].includes(mode)||index<0||index>=21)return false;
 const available=dbiCombatLayoutAvailable().all;
 if(id!==null&&!available.some(x=>x.id===id))return false;
 const data=dbiCombatLayoutRead(),moves=dbiCombatLayoutGet(mode);
 if(!dbiCombatCanPlace(moves,index,id))return false;
 moves[index]=id;data[mode]=moves;
 localStorage.setItem(dbiCombatLayoutKey(),JSON.stringify(data));return true;
}
function renderCombatLayout(){
 hideItemPopups();
 document.querySelector('#breadcrumb').textContent='POSTAĆ / WALKA';
 const host=document.querySelector('#pageBody');
 const mode=dbiCombatLayoutMode,available=dbiCombatLayoutAvailable(),moves=dbiCombatLayoutGet(mode);
 const lookup=Object.fromEntries(available.all.map(x=>[x.id,x]));
 const source=(items,empty)=>items.length?items.map(x=>`<div class="dbi-combat-source" draggable="true" tabindex="0" data-combat-source="${esc(x.id)}" title="Przeciągnij na wybrany ruch lub kliknij, a następnie wybierz ruch"><img src="${esc(x.image)}" alt=""><span>${esc(x.name)}</span></div>`).join(''):`<p class="dbi-combat-empty">${empty}</p>`;
 const slots=moves.map((id,i)=>{const item=lookup[id];return `<button type="button" class="dbi-combat-slot${item?' filled':''}" data-combat-slot="${i}" title="Ruch ${i+1}: ${item?esc(item.name):'zwykły atak'} — kliknij, aby ustawić lub usunąć"><span class="dbi-combat-order">${i+1}</span>${item?`<img src="${esc(item.image)}" alt=""><span class="dbi-combat-slot-label">${esc(item.name)}</span>`:'<span class="dbi-combat-normal">Atak</span>'}</button>`}).join('');
 host.innerHTML=`<section class="dbi-combat-panel"><header class="dbi-combat-head"><h2>Układ Walki</h2><p>Ułóż 21 ruchów dla każdego rodzaju pojedynku. Puste pole oznacza zwykły atak.</p></header>
 <div class="dbi-combat-layout"><aside class="dbi-combat-side"><h3>Techniki</h3><div class="dbi-combat-sources">${source(available.techniques,'Nie masz jeszcze odblokowanych technik.')}</div></aside>
 <main class="dbi-combat-center"><div class="dbi-combat-tabs"><button type="button" data-combat-mode="story" class="${mode==='story'?'selected':''}">Fabularne</button><button type="button" data-combat-mode="pvp" class="${mode==='pvp'?'selected':''}">PvP</button></div><div class="dbi-combat-grid">${slots}</div><p id="dbiCombatFeedback" class="dbi-combat-feedback" aria-live="polite">Przeciągnij zdolność na ruch albo kliknij zdolność i wybierz pole. Kliknij zajęte pole bez wyboru, aby je wyczyścić.</p></main>
 <aside class="dbi-combat-side"><h3>Umiejętności</h3><div class="dbi-combat-sources">${source(available.active,'Nie masz jeszcze odblokowanych aktywnych umiejętności.')}</div></aside></div>
 <p class="dbi-combat-foot">Fala uderzeniowa: 13 tur odnowienia po użyciu (ponowne użycie najwcześniej po 13 innych ruchach). Pozostałe zdolności: na razie zakaz użycia w sąsiednich ruchach. Efekty aktywnych umiejętności zostaną dodane później. Odblokowane techniki są wykonywane w walce.</p></section>`;
 let selected=null;
 let dragging=null;
 const feedback=host.querySelector('#dbiCombatFeedback');
 const slotsEls=[...host.querySelectorAll('[data-combat-slot]')];
 const canPlace=(index,id)=>!id||(available.all.some(x=>x.id===id)&&dbiCombatCanPlace(moves,index,id));
 const markBlocked=id=>{
  slotsEls.forEach(el=>{
   const index=Number(el.dataset.combatSlot);
   const blocked=!!id&&!canPlace(index,id);
   el.classList.toggle('dbi-combat-blocked',blocked);
   el.setAttribute('aria-disabled',String(blocked));
  });
 };
 const setFeedback=message=>{feedback.textContent=message};
 const assign=(index,id)=>{
  if(dbiCombatLayoutSet(mode,index,id)){renderCombatLayout();return}
  setFeedback('Nie można ustawić tej zdolności: pole jest zablokowane przez czas odnowienia (Fala uderzeniowa: 13 tur) lub sąsiedni ruch.');
 };
 host.querySelectorAll('[data-combat-mode]').forEach(btn=>btn.addEventListener('click',()=>{dbiCombatLayoutMode=btn.dataset.combatMode;renderCombatLayout()}));
 host.querySelectorAll('[data-combat-source]').forEach(el=>{
  el.addEventListener('dragstart',e=>{
   dragging=el.dataset.combatSource;
   e.dataTransfer.setData('text/plain',dragging);
   e.dataTransfer.effectAllowed='copy';
   markBlocked(dragging);
  });
  el.addEventListener('dragend',()=>{dragging=null;markBlocked(selected);slotsEls.forEach(x=>x.classList.remove('drop-target'))});
  el.addEventListener('click',()=>{
   selected=el.dataset.combatSource;
   host.querySelectorAll('.dbi-combat-source').forEach(x=>x.classList.toggle('chosen',x===el));
   markBlocked(selected);
   setFeedback('Wybrano: '+el.textContent.trim()+'. Kliknij ruch, aby przypisać zdolność. Czerwone pola są niedostępne.');
  });
  el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click()}});
 });
 slotsEls.forEach(el=>{
  const index=Number(el.dataset.combatSlot);
  el.addEventListener('dragover',e=>{
   if(!dragging||!canPlace(index,dragging)){e.dataTransfer.dropEffect='none';return}
   e.preventDefault();e.dataTransfer.dropEffect='copy';el.classList.add('drop-target');
  });
  el.addEventListener('dragleave',()=>el.classList.remove('drop-target'));
  el.addEventListener('drop',e=>{
   e.preventDefault();el.classList.remove('drop-target');
   const id=e.dataTransfer.getData('text/plain');
   if(!canPlace(index,id)){setFeedback('To pole jest czerwone — nie można tu umieścić tej zdolności.');return}
   assign(index,id);
  });
  el.addEventListener('click',()=>{
   if(selected&&!canPlace(index,selected)){setFeedback('To pole jest czerwone — nie można tu umieścić tej zdolności.');return}
   assign(index,selected||null);
  });
 });

}

function renderFastTravel(){
 // Wyłącznie statyczna makieta UI: nie tworzy akcji, teleportów ani zapisów.
 hideItemPopups();
 document.querySelector('#breadcrumb').textContent='AKTYWNOŚCI / SZYBKA PODRÓŻ';
 document.querySelector('#pageBody').innerHTML=`
 <section class="dbi-fast-travel" aria-label="Szybka podróż — podgląd interfejsu">
  <header class="dbi-ft-top">
   <div class="dbi-ft-title">
    <img src="assets/ui/dojo-controls/map.png" alt="" aria-hidden="true">
    <div><span class="dbi-ft-overline">MAPA SZLAKÓW</span><h2>Szybka podróż</h2></div>
   </div>
   <p>Przegląd miejsc i punktów podróży świata wojowników.</p>
   <span class="dbi-ft-tag">PODGLĄD SYSTEMU</span>
  </header>
  <div class="dbi-ft-layout">
   <section class="dbi-ft-map-panel" aria-label="Mapa szlaków">
    <header class="dbi-ft-section-title"><span class="dbi-ft-decor">✦</span><h3>Mapa świata</h3><small>Szlaki i lokalizacje</small></header>
    <div class="dbi-ft-map-illustration">
     <img src="assets/ui/fast-travel/mapa-przejsc.webp" alt="Ilustracja mapy z Wioską Ryūen, Doliną Sosen, Ruinami Astralnymi i Klasztorem Niebiańskiej Pięści. Trasy i znaczniki są częścią ilustracji, nie są interaktywne.">
     <div class="dbi-ft-map-badge">✦ Zaznaczona: Dolina Sosen</div>
    </div>
    <div class="dbi-ft-map-legend"><span><i class="dbi-ft-dot dbi-ft-dot-current"></i> Wybrana na makiecie</span><span><i class="dbi-ft-dot"></i> Pozostałe miejsca</span><span class="dbi-ft-muted">Mapa poglądowa</span></div>
   </section>
   <aside class="dbi-ft-side" aria-label="Lista punktów szybkiej podróży">
    <div class="dbi-ft-section-title"><span class="dbi-ft-decor">✧</span><h3>Punkty podróży</h3></div>
    <p class="dbi-ft-side-info">Przykładowe miejsca docelowe. Wybór i teleportacja nie są jeszcze dostępne.</p>
    <div class="dbi-ft-destinations" aria-label="Miejsca z mapy">
     <div class="dbi-ft-destination" aria-disabled="true"><span class="dbi-ft-location-icon">⌂</span><div><strong>Wioska Ryūen</strong><small>Osada wojowników</small></div><span class="dbi-ft-destination-mark">◇</span></div>
     <div class="dbi-ft-destination is-preview" aria-disabled="true"><span class="dbi-ft-location-icon">♠</span><div><strong>Dolina Sosen</strong><small>Leśna dolina</small></div><span class="dbi-ft-destination-mark">◆</span></div>
     <div class="dbi-ft-destination" aria-disabled="true"><span class="dbi-ft-location-icon">✧</span><div><strong>Klasztor Niebiańskiej Pięści</strong><small>Górskie sanktuarium</small></div><span class="dbi-ft-destination-mark">◇</span></div>
     <div class="dbi-ft-destination" aria-disabled="true"><span class="dbi-ft-location-icon">♜</span><div><strong>Ruiny Astralne</strong><small>Starożytne ruiny</small></div><span class="dbi-ft-destination-mark">◇</span></div>
    </div>
    <div class="dbi-ft-detail">
      <img src="assets/ui/fast-travel/dolina-sosen.webp" alt="Widok leśnej Doliny Sosen">
      <div class="dbi-ft-detail-caption"><span>WYBRANY CEL — PODGLĄD</span><strong>Dolina Sosen</strong><p>Spokojna dolina pośród sosen i górskich szlaków.</p></div>
    </div>
    <button class="dbi-ft-travel-btn" type="button" disabled aria-label="Rozpocznij podróż — funkcja niedostępna">✦ Rozpocznij podróż</button>
    <p class="dbi-ft-inactive">Przycisk demonstracyjny — podróż nie została jeszcze zaimplementowana.</p>
   </aside>
  </div>
 </section>`;
}
function renderTournament(){
 const host=document.querySelector('#pageBody');
 document.querySelector('#breadcrumb').textContent='AKTYWNOŚCI / TURNIEJ';
 const date=dbiTournamentDate(),phase=dbiTournamentWindow();
 // Rozstrzygamy również po ponownym wejściu na stronę po godzinie 18:00.
 if(phase==='closed')DBI_TOURNAMENT_CATEGORIES.forEach(cat=>dbiTournamentResolve(date,cat));
 const phaseText=phase==='before'?'Zapisy od 15:00':phase==='open'?'Trwają zapisy':'Zapisy zakończone';
 const rows=DBI_TOURNAMENT_CATEGORIES.map(cat=>{
  const s=dbiTournamentRead(date,cat.id);
  const eligible=level>=cat.min&&level<=cat.max;
  const enrolled=s.entrants.some(x=>x.id===dbiActive?.id);
  const button=eligible&&!s.finished?(enrolled?'<span class="dbi-tournament-joined">✓ Zapisano</span>':
   phase==='open'&&s.entrants.length<32?`<button type="button" data-tournament-enroll="${cat.id}">Zapisz się · <img class="dbi-gold-icon" src="assets/ui/gold.png" alt="" width="16" height="16">10 000 złota</button>`:
   '<span class="dbi-tournament-status">Zapisy niedostępne</span>'):'—';
  const status=s.finished?'Rozstrzygnięty':s.entrants.length>=32?'Komplet uczestników':phaseText;
  return `<tr><td><strong>${cat.label} LVL</strong></td><td><strong>${s.entrants.length} / 32</strong></td><td><span class="dbi-tournament-status">${status}</span></td><td>${button}</td></tr>`;
 }).join('');
 const finished=DBI_TOURNAMENT_CATEGORIES.map(cat=>({cat,state:dbiTournamentRead(date,cat.id)})).filter(x=>x.state.finished);
 host.innerHTML=`<section class="dbi-tournament" aria-label="Turniej">
 <header class="dbi-tournament-header"><span class="eyebrow">ŚWIATOWY TURNIEJ SZTUK WALKI</span><h2>🏆 Turniej</h2>
 <p>Codzienny turniej eliminacyjny. 32 losowe pozycje startowe, pięć rund i jeden zwycięzca. Wolne miejsca zajmują NPC „Zawodnik Turnieju”. Remisy rozstrzyga losowanie 50/50.</p>
 <div class="dbi-tournament-hours"><span>🕒 Zapisy: <strong>15:00–18:00</strong></span><span>👥 <strong>32 uczestników</strong> w kategorii</span><span>📅 ${date}</span></div></header>
 <div class="dbi-tournament-table-wrap"><table class="dbi-tournament-table"><thead><tr><th>Przedział poziomów</th><th>Liczba miejsc</th><th>Status turnieju</th><th>Zapisy</th></tr></thead><tbody>${rows}</tbody></table></div>
 <div class="dbi-tournament-note">Opłata za zapis: <img class="dbi-gold-icon" src="assets/ui/gold.png" alt="" width="16" height="16">10 000 złota. Walki są automatyczne, bez zmian punktów sławy. Nagrody za zwycięstwo: 50 000 złota, waluta premium (5 / 10 / 13) oraz skrzynka turniejowa odpowiednia do kategorii. Turniej działa obecnie na danych zapisanych w tej przeglądarce.</div>
 ${finished.map(({cat,state})=>`<div class="dbi-tournament-results"><h3>${cat.label} LVL — zwycięzca: ${dbiTournamentEscape(state.winner.name)}</h3>
 <details><summary>Zobacz drabinkę i wyniki pięciu rund</summary>${state.rounds.map((matches,i)=>`<div class="dbi-tournament-round"><h4>${['1/16 finału','1/8 finału','Ćwierćfinały','Półfinały','Finał'][i]}</h4>
 ${matches.map(m=>`<div class="dbi-tournament-match">${dbiTournamentEscape(m.a.name)} vs ${dbiTournamentEscape(m.b.name)} · <strong>${dbiTournamentEscape(m.winnerId===m.a.id?m.a.name:m.b.name)}</strong>${m.draw?' (remis, losowanie)':''}${m.log?.length?`<details><summary>Przebieg walki</summary>${m.log.map(line=>`<div>${dbiTournamentEscape(line)}</div>`).join('')}</details>`:''}</div>`).join('')}</div>`).join('')}</details></div>`).join('')}
 </section>`;
 host.querySelectorAll('[data-tournament-enroll]').forEach(button=>{
  button.onclick=()=>{const cat=DBI_TOURNAMENT_CATEGORIES.find(x=>x.id===button.dataset.tournamentEnroll);if(cat)dbiTournamentEnroll(cat,date)};
 });
 if(window.dbiTournamentRefreshTimer)clearInterval(window.dbiTournamentRefreshTimer);
 window.dbiTournamentRefreshTimer=setInterval(()=>{
  if(!host.isConnected||!host.querySelector('.dbi-tournament')){clearInterval(window.dbiTournamentRefreshTimer);window.dbiTournamentRefreshTimer=null;return}
  if(dbiTournamentDate()!==date||dbiTournamentWindow()!==phase)renderTournament();
 },10000);
}

function renderBattlefield(){
 hideItemPopups();
 document.querySelector('#breadcrumb').textContent='AKTYWNOŚCI / POLE BITWY';
 const host=document.querySelector('#pageBody');
 host.innerHTML=`<section class="dbi-arena"><h2>Pole Bitwy</h2>
 <p class="dbi-arena-intro">Zdobywaj sławę przez pokonywanie przeciwników, ale uważaj — atakowanie słabszych od siebie będzie Cię kosztować sławę.</p>
 <div class="dbi-arena-stats"><div><small>Aktualny ranking</small><strong id="dbiArenaRank">—</strong></div><div><small>Aktualna sława</small><strong id="dbiArenaFame">—</strong></div></div>
 <div class="dbi-arena-toolbar"><span id="dbiArenaRefreshInfo"></span><button type="button" id="dbiArenaRefresh">⟳ Losuj nowych przeciwników</button></div>
 <div class="dbi-arena-scroll"><table class="dbi-arena-table"><thead><tr><th>Nazwa postaci</th><th>Aktualny ranking</th><th>Sława</th><th>Walka</th></tr></thead><tbody id="dbiArenaRows"></tbody></table></div>
 <div class="dbi-arena-footer"><span id="dbiArenaFights"></span></div>
 <p class="dbi-arena-hint">Wygrana: +10 sławy · przegrana: −10 sławy. Atak na słabszego o ponad 100 sławy: dodatkowy koszt zależny od różnicy. Walka PvP: 21 rund, szybszy atakuje pierwszy. Remis nie przyznaje sławy.</p>
 </section>`;
 const refresh=()=>{
  const state=dbiArenaState(),all=dbiRankCharacters();
  const self=all.find(x=>x.character.id===dbiActive?.id)?.character;
  const myFame=dbiArenaFame(self||{id:dbiActive?.id});
  const ranked=[...all].sort((a,b)=>dbiArenaFame(b.character)-dbiArenaFame(a.character)||b.metrics.level-a.metrics.level||a.character.name.localeCompare(b.character.name,'pl'));
  const position=ranked.findIndex(x=>x.character.id===dbiActive?.id);
  document.querySelector('#dbiArenaRank').textContent=position<0?'—':`#${position+1}`;
  document.querySelector('#dbiArenaFame').textContent=myFame.toLocaleString('pl-PL');
  document.querySelector('#dbiArenaRefreshInfo').textContent=`Odświeżenia: ${state.refreshes}/${DBI_ARENA_REFRESH_LIMIT} dzisiaj`;
  document.querySelector('#dbiArenaRefresh').disabled=state.refreshes>=DBI_ARENA_REFRESH_LIMIT;
  document.querySelector('#dbiArenaFights').textContent=`Limit pojedynków: ${state.fights}/${DBI_ARENA_DAILY_FIGHTS}`;
  const now=Date.now();
  const rows=state.opponents.map(id=>ranked.find(x=>x.character.id===id)).filter(Boolean);
  document.querySelector('#dbiArenaRows').innerHTML=rows.map(x=>{
   const c=x.character,enemyFame=dbiArenaFame(c),pos=ranked.findIndex(y=>y.character.id===c.id)+1;
   const cost=dbiArenaFameLoss(myFame,enemyFame);
   const remaining=Math.max(0,DBI_ARENA_COOLDOWN-(now-(Number(state.opponentCooldowns[c.id])||0)));
   const seconds=Math.ceil(remaining/1000);
   const timer=`${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor(seconds%3600/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
   return `<tr><td><button class="dbi-arena-name" type="button" data-arena-profile="${esc(c.id)}">${esc(c.name)}</button></td><td>#${pos}</td><td>${enemyFame.toLocaleString('pl-PL')}</td><td><button type="button" class="dbi-arena-fight" data-arena-fight="${esc(c.id)}" ${remaining||state.fights>=DBI_ARENA_DAILY_FIGHTS?'disabled':''}>${remaining?timer:'Walcz'}</button>${cost?`<small class="dbi-arena-warning">Koszt ataku: ${cost} sławy</small>`:''}</td></tr>`;
  }).join('')||'<tr><td colspan="4" class="dbi-arena-empty">Brak dostępnych przeciwników w lokalnym zapisie lub w wymaganych przedziałach sławy.</td></tr>';
  host.querySelectorAll('[data-arena-profile]').forEach(b=>b.onclick=()=>{const c=all.find(x=>x.character.id===b.dataset.arenaProfile)?.character;if(c)dbiOpenRankProfile(c)});
  host.querySelectorAll('[data-arena-fight]').forEach(b=>b.onclick=()=>{
   const c=all.find(x=>x.character.id===b.dataset.arenaFight)?.character;if(c)dbiArenaBattlePlaceholder(c);
  });
 };
 let state=dbiArenaState();
 if(!state.opponents.length){state.opponents=dbiArenaDraw();dbiArenaSave(state)}
 document.querySelector('#dbiArenaRefresh').onclick=()=>{
  const next=dbiArenaState();if(next.refreshes>=DBI_ARENA_REFRESH_LIMIT)return;
  next.refreshes++;next.opponents=dbiArenaDraw();dbiArenaSave(next);refresh();
 };
 refresh();
 // Zegar odświeża się co sekundę, tylko kiedy widoczna jest ta sama plansza.
 if(window.dbiArenaCountdownTimer)clearInterval(window.dbiArenaCountdownTimer);
 window.dbiArenaCountdownTimer=setInterval(()=>{
  if(!host.isConnected||!host.querySelector('.dbi-arena')){clearInterval(window.dbiArenaCountdownTimer);window.dbiArenaCountdownTimer=null;return;}
  refresh();
 },1000);
}

// Techniki w pojedynkach turowych: zapis układu i odblokowania przypisane do postaci.
function dbiCombatStatusSkills(id){
 const skills=dbiRankRead('dboidle_skills_v1_'+id,{});
 return Object.fromEntries(['ogluszenie','bron','uderzenie','krwawe'].map(skill=>['skill:'+skill,dbiSkillRank(skills,skill)]));
}
window.DBICombatStatusSkills=dbiCombatStatusSkills;
function dbiCombatFighterTechniques(character,mode){
 const id=character?.id;
 if(!id)return {moves:Array(21).fill(null),unlocked:[]};
 const layout=dbiRankRead('dboidle_combat_layout_v1_'+id,{});
 const unlock=dbiRankRead('dboidle_technique_quest_unlock_v1_'+id,{});
 const moves=Array.from({length:21},(_,i)=>typeof layout?.[mode]?.[i]==='string'?layout[mode][i]:null);
 return {moves,unlocked:DBI_TECHNIQUES.filter(t=>unlock?.[t.id]===true).map(t=>({id:t.id,name:t.name,baseDamage:t.baseDamage,mana:t.useMana}))};
}
function dbiArenaPvpStats(character,isSelf){
 const source=character?.stats||{};
 const base=k=>Number(source[k]??character?.[k])||0;
 const loadout=isSelf?equipped.PvP:dbiRankRead('dboidle_equipped_v1_'+character.id,{})?.PvP;
 const gear=Object.values(loadout||{}).map(itemById).filter(Boolean);
 const signStats=dbiEquippedAllStats(loadout);
 const spirit=isSelf?window.DBISpiritual?.currentBonuses?.():dbiRankRead('dboidle_spiritual_v1_'+character.id,{})?.bonuses;
 const statMultiplier=1+(Number(spirit?.stats)||0)/100;
 const skills=dbiSkillBonuses(dbiRankRead('dboidle_skills_v1_'+character.id,{}));
 const effective=(value,key)=>value*statMultiplier*dbiPlanAttributeMultiplier(gear,key)+signStats+skills.stats;
 const sum=(...keys)=>gear.reduce((n,item)=>n+(dbiStatNumber(item,keys)||0),0);
 const strength=effective(base('strength'),'strength'),speed=effective(base('speed'),'speed');
 const endurance=effective(base('endurance'),'endurance'),intelligence=effective(base('intelligence'),'intelligence');
 const techniqueKi=effective(Number(source.kiStat??source.kiPower??source.ki??source.KI??character.kiStat??character.kiPower??character.ki??0)||0,'ki');
 const techniqueFixed=base('techniqueAttack')+sum('techniqueAttack','techniquePower')+skills.techniqueAttack;
 const techniqueAttackPvp=base('techniqueAttackMax')+sum('techniqueAttackMax')+techniqueFixed;
 const techniqueDamageBonusPct=base('techniqueDamageBonusPct')+sum('techniqueDamageBonusPct');
 const tech=dbiCombatFighterTechniques(character,'pvp');
 // PvP: odrębny bonus ataku PvP; nie korzystamy z redukcji PvM.
 const percent=dbiCharacterBonus(character,gear,['attackValuePct','attackBonusPct','attackPct','attackPowerPct','physicalAttackPct','bonusAttackPct'])+(Number(spirit?.attack)||0)*.5;
 const atk=Math.max(0,Math.ceil(strength*.5*(1+percent/100))+sum('pvpAttack')+sum('attackMax','attackMin','attack','physicalAttack','physicalAttackPower','attackPower')+sum('attackRange')+sum('planAttackPvp')+skills.attack);
 return {...dbiCombatHitBonuses(character,gear,skills),...dbiPlanCombatFields(character,gear),level:Number(character.level)||1,speed,
  attack:atk,defense:Math.max(0,(endurance*.1+skills.defense+sum('defense')+(Number(source.questDefenseBonus)||0))*(1+sum('defensePct')/100)),
  maxHp:Math.max(1,(Number(source.gmMaxHp??(50+endurance*.01+sum('hp','maxHp','health')))+(source.gmMaxHp!=null?dbiPlanRolledTotal(gear,'hp'):0)+skills.hp+(Number(source.questMaxHp)||0))*(1+sum('maxHpPct')/100)),
  maxKi:Math.max(0,(Number(source.gmMaxKi??(100+intelligence*.01+sum('kiPoints','maxKi','maxMp','mana','ki')))+(source.gmMaxKi!=null?dbiPlanRolledTotal(gear,'maxKi'):0))*(1+sum('maxKiPct')/100)),
  intelligence,techniqueKi,techniqueAttackPvp,techniqueDamageBonusPct,techniqueValuePct:sum('techniqueValuePct'),gloryBonus:sum('gloryBonus'),
  moves:tech.moves,unlockedTechniques:tech.unlocked,statusSkills:dbiCombatStatusSkills(character.id)};
}
function dbiArenaBattlePlaceholder(opponent){
 const state=dbiArenaState();
 if(state.fights>=DBI_ARENA_DAILY_FIGHTS||Date.now()-(Number(state.opponentCooldowns[opponent?.id])||0)<DBI_ARENA_COOLDOWN)return;
 const self=dbiRankCharacters().find(x=>x.character.id===dbiActive?.id)?.character;
 if(!self||!opponent||self.id===opponent.id||!state.opponents.includes(opponent.id))return;
 if(window.DBIStoryCombat?.isRunning?.())return;
 const myFame=dbiArenaFame(self),enemyFame=dbiArenaFame(opponent);
 const cost=dbiArenaFameLoss(myFame,enemyFame);
 const playerStats=dbiArenaPvpStats(self,true);
 const started=window.DBIStoryCombat?.open?.({
  mode:'pvp',playerName:self.name,playerRace:self.race||'Wojownik',
  playerStats,
  opponentName:opponent.name,
  opponentStats:dbiArenaPvpStats(opponent,false),
  onFinish:(outcome)=>{
   const next=dbiArenaState();
   next.fights=Math.min(DBI_ARENA_DAILY_FIGHTS,next.fights+1);
   // Cooldown jest zapisywany już w chwili rozpoczęcia pojedynku.
   dbiArenaSave(next);
   // Remis nie zmienia slawy. Wygrana ze znacznie slabszym kosztuje
   // punkty wedlug istniejacego przelicznika, zamiast dawac +10.
   // Zmiana jest transferem 1:1 pomiedzy dwiema postaciami.
   const change=outcome==='draw'?0:outcome==='loss'?-10:cost>0?-cost:10;
   const gloryBonus=outcome==='win'?playerStats.gloryBonus:0;
   if(change!==0||gloryBonus){
    window.DBIPulpit?.setFame?.(self.id,myFame+change+gloryBonus);
    window.DBIPulpit?.setFame?.(opponent.id,enemyFame-change);
   }
   if(outcome==='win')window.DBIPulpit?.add?.(self.id,'pvpWins',1);
   if(document.querySelector('.dbi-arena'))renderBattlefield();
   return change+gloryBonus;
  }
 });
 if(!started){alert('Nie można uruchomić pojedynku PvP.');return;}
 // Rozpoczęcie odliczania dokładnie po kliknięciu Walcz, a nie po Zamknij.
 const startedAt=Date.now();
 const next=dbiArenaState();
 next.lastFight=startedAt;
 next.opponentCooldowns[opponent.id]=startedAt;
 dbiArenaSave(next);
 if(document.querySelector('.dbi-arena'))renderBattlefield();
}

let dbiMailOpenId=null;
function dbiRenderMail(status=''){
 hideItemPopups();
 document.querySelector('#breadcrumb').textContent='POCZTA';
 const id=dbiActive?.id;
 const post=window.DBILocalPost;
 const inbox=id?post.inbox(id):[];
 const current=inbox.find(entry=>entry.id===dbiMailOpenId);
 const item=current?.attachment?itemById(current.attachment.ref):null;
 const attachment=current?.attachment?`<div class="dbi-mail-attachment">
  ${item?dbiItemArt(item):''}<span>${esc(item?.name||'Nieznany przedmiot')}${item?.enhancement?' +'+item.enhancement:''} ×${current.attachment.count}</span>
  <button type="button" class="gold-button" data-mail-claim ${current.claimed||!item?'disabled':''}>${current.claimed?'Odebrano':'Odbierz'}</button></div>`:'';
 const host=document.querySelector('#pageBody');
 host.innerHTML=`<section class="dbi-mail"><h2>Poczta</h2><div class="dbi-mail-grid">
  <ul class="dbi-mail-list">${inbox.length?inbox.map(entry=>`<li><button type="button" data-mail-open="${esc(entry.id)}" class="${entry.read?'':'is-new'}" aria-pressed="${entry.id===dbiMailOpenId}">${esc(entry.subject)}<br><small>${esc(entry.sender)} · ${esc(new Date(entry.date).toLocaleString('pl-PL'))}</small></button></li>`).join(''):'<li>Skrzynka jest pusta.</li>'}</ul>
  <article class="dbi-mail-message">${current?`<h3>${esc(current.subject)}</h3><small>Od: ${esc(current.sender)}</small><p>${esc(current.body)}</p>${attachment}`:'Wybierz wiadomość.'}</article>
 </div><p role="status">${esc(status)}</p></section>`;
 host.querySelectorAll('[data-mail-open]').forEach(button=>button.onclick=async()=>{
  const selected=button.dataset.mailOpen;
  try{
   await post.lock(()=>post.markRead(id,selected));
   if(!host.querySelector('.dbi-mail'))return;
   dbiMailOpenId=selected;
   dbiRenderMail();renderNav();
  }catch{dbiRenderMail('Nie udało się otworzyć wiadomości.')}
 });
 const claim=host.querySelector('[data-mail-claim]');
 if(claim&&!claim.disabled)claim.onclick=async()=>{
  claim.disabled=true;
  try{
   const ok=await post.lock(()=>post.claim(id,current.id,itemById));
   dbiReloadLocalInventory();
   if(host.querySelector('.dbi-mail'))dbiRenderMail(ok?'Odebrano załącznik.':'Załącznik został już odebrany.');
  }catch(error){if(host.querySelector('.dbi-mail'))dbiRenderMail(error.message||'Nie udało się odebrać załącznika.')}
 };
}
function dbiReloadLocalInventory(){
 const records=dbiRankRead(DBI_INV_KEY,[]);
 const layout=dbiRankRead(DBI_INV_POS_KEY,{});
 if(!Array.isArray(records))return;
 inventory=records;
 inventoryPlacement=records.map((ref,i)=>layout?.items?.[i]===ref?layout.positions?.[i]??null:null);
 dbiLastPositionSave='';
}
window.addEventListener('storage',event=>{
 const id=dbiActive?.id;
 if(!id)return;
 const post=window.DBILocalPost;
 if(event.key===post.mailKey(id)){
  if(document.querySelector('.dbi-mail'))dbiRenderMail();
  renderNav();
 }
 if(event.key===DBI_INV_POS_KEY){
  dbiReloadLocalInventory();
  if(document.querySelector('.equipment-view .eq-panel')&&!document.querySelector('.dbi-upgrade,.dbi-smith'))renderEquipment();
 }
 if(event.key==='dboidle_characters_v1_'+dbiSession?.name?.toLowerCase()){
  const records=dbiRankRead(event.key,[]);
  const index=records.findIndex(c=>c.id===id);
  if(index<0){location.replace('characters.html');return}
  dbiCharacters=records;dbiCharacterIndex=index;
  level=Math.max(1,Math.min(DBI_MAX_LEVEL,Number(records[index].level)||1));
  exp=level>=DBI_MAX_LEVEL?0:Math.max(0,Number(records[index].exp)||0);
  renderExp();
 }
 if(['dboidle_gold_v1_','dboidle_dragon_wallet_v1_','dboidle_premium_v1_'].some(prefix=>event.key===prefix+id))dbiRefreshHeaderWallet();
});
function renderNav(){
 const scroll=nav.scrollTop;
 nav.replaceChildren();
 const icons=['map','hero','training','battle','♟','guild','✉','quests','⚙'];
 menus.forEach((menu,index)=>{
  const button=document.createElement('button');
  button.type='button';
  button.dataset.category=String(index);
  const icon=icons[index];
  if(['♟','✉','⚙'].includes(icon)){
   const symbol=document.createElement('span');
   symbol.className='rail-symbol';symbol.setAttribute('aria-hidden','true');
   symbol.textContent=icon;button.append(symbol);
  }else{
   const image=new Image();image.className='rail-icon';image.alt='';
   image.src='assets/ui/dojo-controls/'+icon+'.png';button.append(image);
  }
  const label=menu.name==='GM'?'GM':menu.name[0]+menu.name.slice(1).toLocaleLowerCase('pl');
  const caption=document.createElement('span');caption.className='rail-caption';caption.textContent=label;button.append(caption);
  button.disabled=!!menu.disabled;
  if(menu.page===nav.dataset.page)button.setAttribute('aria-current','page');
  if(menu.options?.includes(nav.dataset.page))button.classList.add('rail-current');
  if(menu.page==='Poczta'&&dbiActive?.id){
   const count=window.DBILocalPost.inbox(dbiActive.id).filter(entry=>!entry.read).length;
   if(count)button.append(' ('+count+')');
  }
  nav.append(button);
  if(!menu.options){
   if(menu.page)button.onclick=()=>showPage(menu.page,menu.name);
   return;
  }
  const panel=document.createElement('div');
  panel.className='rail-options';panel.id='rail-options-'+index;
  panel.hidden=opened!==index;
  button.setAttribute('aria-controls',panel.id);
  button.setAttribute('aria-expanded',String(!panel.hidden));
  button.onclick=()=>{
   opened=opened===index?null:index;
   for(const toggle of nav.querySelectorAll('[aria-controls]')){
    const expanded=Number(toggle.dataset.category)===opened;
    toggle.setAttribute('aria-expanded',String(expanded));
    document.getElementById(toggle.getAttribute('aria-controls')).hidden=!expanded;
   }
   const offset=button.getBoundingClientRect().top-nav.getBoundingClientRect().top;
   if(offset<0)nav.scrollTop+=offset;
  };
  for(const name of menu.options){
   const option=document.createElement('button');option.type='button';option.textContent=name;
   if(nav.dataset.page===name)option.setAttribute('aria-current','page');
   option.onclick=()=>showPage(name,menu.name);
   panel.append(option);
  }
  nav.append(panel);
 });
 nav.scrollTop=scroll;
}
nav.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&opened!==null){
  const button=nav.querySelector('[data-category="'+opened+'"]');button.click();button.focus();
 }
});
function renderExp(){
 document.querySelector('#level').textContent=level;
 const needed=dbiRequiredExp(level);
 document.querySelector('#expText').textContent=level>=DBI_MAX_LEVEL?'MAX LVL · 500':exp.toLocaleString('pl-PL')+' / '+needed.toLocaleString('pl-PL')+' EXP';
 document.querySelector('#balls').title=document.querySelector('#expText').textContent;
 document.querySelector('#balls').setAttribute('aria-label',document.querySelector('#expText').textContent);
 const balls=document.querySelector('#balls');balls.replaceChildren();
 for(let i=0;i<4;i++){
  const ball=document.createElement('div');ball.className='ball'+(level>=DBI_MAX_LEVEL||exp>=needed*(i+1)/4?' active':'');ball.textContent='★';
  ball.title='Smocza kula '+(i+1)+' — '+((i+1)*25)+'% postępu do następnego poziomu';balls.append(ball);
 }
}
document.querySelector('#expButton').addEventListener('click',()=>{
 const oldLevel=level,received=dbiGainExp(25);
 setLog(level>oldLevel?'Awans! Osiągnięto poziom '+level+'.':received?'Zdobyto '+received+' EXP.':'Osiągnięto maksymalny poziom 500.');
});
document.querySelector('#switchCharacter').addEventListener('click',()=>{window.DBIWorld?.stop();dbiSaveProgress();sessionStorage.removeItem(DBI_ACTIVE_KEY);location.href='characters.html';});
window.DBISpiritual.setCharacter(dbiActive?.id);
renderNav();if(dropdown){dropdown.hidden=true;dropdown.replaceChildren()}renderExp();



// v0.8 — wspólny katalog, dwukratkowe wyposażenie, lokalny panel GM
// Usunięte podstawowe przedmioty testowe — także ze starszych lokalnych katalogów.
const DBI_REMOVED_ITEM_IDS=new Set(["opaska-001", "bron-001", "naszyjnik-001", "zbroja-001", "rekawice-001", "buty-001", "skuter-001", "pierscien-001", "quest-red-magic-staff", "quest-old-necklace"]);
const dbiIsRemovedItemRef=ref=>DBI_REMOVED_ITEM_IDS.has(String(ref||'').split('~')[0]);
let catalog=dbiLoadCatalog().filter(item=>!DBI_REMOVED_ITEM_IDS.has(item.id));

// Grafiki sześciu istniejących materiałów kowalskich (bez zmian ich właściwości).
const DBI_SMITH_MATERIAL_IMAGES={
 'smith-ki':'assets/items/smith-ki.png',
 'smith-chi':'assets/items/smith-chi.png',
 'smith-symbol':'assets/items/smith-symbol.png',
 'smith-stroj':'assets/items/smith-stroj.png',
 'smith-esencja':'assets/items/smith-esencja.png',
 'smith-scouter':'assets/items/smith-scouter.png'
};
const DBI_CRAFT_MATERIAL_NAMES={
 'smith-chi':'Odłamek Energii CHI','smith-symbol':'Fragment Symbolu',
 'smith-stroj':'Włókno Treningowe','smith-esencja':'Kryształ Esencji',
 'smith-scouter':'Układ Scoutera','smith-ki':'Skondensowane KI'
};
for(const [id,name] of Object.entries(DBI_CRAFT_MATERIAL_NAMES)){
 const item=catalog.find(entry=>entry.id===id);
 if(item)Object.assign(item,{name,slot:'materiał'});
 else catalog.push({id,name,slot:'materiał',icon:'⚒️',image:DBI_SMITH_MATERIAL_IMAGES[id],quality:'Pospolity',requiredLevel:1});
}
for(const item of catalog){
 const image=DBI_SMITH_MATERIAL_IMAGES[item.id];
 if(image)item.image=image;
}
// Aktualizacja nazw istniejących materiałów i cztery osobne moduły jakości.
// Nie zmieniamy globalnych kolorów jakości ani działania Kowalstwa.
const DBI_SMITH_RENAMED={
 'smith-upgrade-1':'Substancja Wynosząca',
 'smith-upgrade-2':'Części zamienne',
 'smith-upgrade-module':'Moduł Jakości'
};
for(const item of catalog){
 if(Object.prototype.hasOwnProperty.call(DBI_SMITH_RENAMED,item.id))item.name=DBI_SMITH_RENAMED[item.id];
}
// Grafiki dwóch istniejących materiałów — bez zmian ich działania.
const DBI_UPGRADE_MATERIAL_IMAGES={
 'smith-upgrade-1':'assets/items/smith-upgrade-1.png',
 'smith-upgrade-2':'assets/items/smith-upgrade-2.png'
};
for(const item of catalog){
 const image=DBI_UPGRADE_MATERIAL_IMAGES[item.id];
 if(image)item.image=image;
}
const DBI_QUALITY_MODULES=[
 {id:'smith-quality-common',name:'Moduł Zwykły',image:'assets/items/smith-quality-common.png'},
 {id:'smith-quality-rare',name:'Moduł Rzadki',image:'assets/items/smith-quality-rare.png'},
 {id:'smith-quality-epic',name:'Moduł Epicki',image:'assets/items/smith-quality-epic.png'},
 {id:'smith-quality-legendary',name:'Moduł Legendarny',image:'assets/items/smith-quality-legendary.png'}
];
for(const module of DBI_QUALITY_MODULES){
 const existing=catalog.find(item=>item.id===module.id);
 if(existing){existing.name=module.name;existing.image=module.image;existing.slot='materiał';}
 else catalog.push({...module,slot:'materiał',icon:'💠',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Materiał do ulepszania jakości przedmiotów.'});
}
dbiSaveCatalog(catalog);

// Aktualizacja istniejącej Esencji 1 (zachowujemy ID i zapis wyposażenia).
const DBI_WHITE_ESSENCE={id:'smith-esencja-1',name:'Biała Esencja',slot:'esencja',icon:'✧',image:'assets/items/biala-esencja.png',quality:'Pospolity',requiredLevel:1,hp:20,maxHp:0,health:0,attack:0,defense:0,ki:0,description:'+20 maksymalnego HP'};
const dbiWhiteEssenceExisting=catalog.find(item=>item.id===DBI_WHITE_ESSENCE.id);
if(dbiWhiteEssenceExisting){
 // Usuń dawne bonusy HP, aby bonus +20 nie został policzony wielokrotnie.
 Object.assign(dbiWhiteEssenceExisting,DBI_WHITE_ESSENCE);
}else catalog.push({...DBI_WHITE_ESSENCE});
dbiSaveCatalog(catalog);

// Chi: zachowujemy istniejące ID białej wersji; czarna to osobny przedmiot.
const DBI_CHI_ITEMS=[
 {id:'smith-chi-1',name:'Biała Chi',slot:'chi',icon:'⚪',image:'assets/items/biala-chi.png',quality:'Pospolity',requiredLevel:1,attack:0,attackMin:0,attackMax:0,techniqueAttack:0,techniqueAttackMin:0,techniqueAttackMax:0,defense:25,hp:25,maxHp:0,health:0,ki:0,description:'+25 obrony, +25 maksymalnego HP.'},
 {id:'czarna-chi',name:'Czarna Chi',slot:'chi',icon:'⚫',image:'assets/items/czarna-chi.png',quality:'Pospolity',requiredLevel:1,attack:0,attackMin:5,attackMax:5,techniqueAttack:0,techniqueAttackMin:5,techniqueAttackMax:5,defense:0,hp:0,maxHp:0,health:0,ki:0,description:'+5–5 do wartości ataku oraz +5–5 do wartości ataku technik.'}
];
for(const definition of DBI_CHI_ITEMS){
 const existing=catalog.find(item=>item.id===definition.id);
 if(existing)Object.assign(existing,definition);
 else catalog.push({...definition});
}
dbiSaveCatalog(catalog);
// Aktualizacja istniejącego Scoutera 1 — to samo ID, bez duplikowania przedmiotu.
const DBI_WHITE_SCOUTER={id:'smith-scouter-1',name:'Biały Scouter',slot:'scouter',icon:'🔍',image:'assets/items/bialy-scouter.png',quality:'Pospolity',requiredLevel:1,monsterDamageReductionPct:1,attack:0,defense:0,ki:0,description:'-1% do otrzymywanych obrażeń w walce z potworami'};
const dbiWhiteScouterExisting=catalog.find(item=>item.id===DBI_WHITE_SCOUTER.id);
if(dbiWhiteScouterExisting)Object.assign(dbiWhiteScouterExisting,DBI_WHITE_SCOUTER);
else catalog.push({...DBI_WHITE_SCOUTER});
dbiSaveCatalog(catalog);
window.DBIEquippedMonsterDamageReduction=()=>Math.max(0,dbiMainBonus('monsterDamageReductionPct'));
// Unikalny przedmiot kolekcjonerski George — bez statystyk i efektów.
const DBI_GEORGE_ITEM={id:'george',name:'George',slot:'materiał',icon:'🖼️',image:'assets/items/george.gif',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Ziomek zajebał Ci łup ze skrzyni. No i cały loot poszedł się jebać.'};
const DBI_FOREST_CHEST={id:'skrzynia-lesnego-wojownika',name:'Skrzynia Leśnego Wojownika',slot:'użytkowy',icon:'📦',image:'assets/items/skrzynia-lesnego-wojownika.png',quality:'Zwykły',requiredLevel:1,attack:0,defense:0,ki:0,description:'Skrzynia zdobyta po pokonaniu Leśnego Wojownika (Boss). Zawiera przedmiot George.'};
const dbiForestChestExisting=catalog.find(item=>item.id===DBI_FOREST_CHEST.id);
if(dbiForestChestExisting){dbiForestChestExisting.slot='użytkowy';dbiForestChestExisting.image=DBI_FOREST_CHEST.image;dbiForestChestExisting.description=DBI_FOREST_CHEST.description}
else catalog.push(DBI_FOREST_CHEST);
if(!catalog.some(item=>item.id==='high-tower-chest'))catalog.push({...DBI_FOREST_CHEST,id:'high-tower-chest',name:'Skrzynia Wysokiej Wieży',slot:'pozostałe',description:'Nagroda za ukończenie Wyzwania Wysokiej Wieży.'});
const dbiGeorgeExisting=catalog.find(item=>item.id===DBI_GEORGE_ITEM.id);
if(dbiGeorgeExisting){Object.assign(dbiGeorgeExisting,DBI_GEORGE_ITEM)}
else catalog.push(DBI_GEORGE_ITEM);
dbiSaveCatalog(catalog);
// Scalenie dwóch strojów: zachowujemy wszystkie statystyki i efekty stroj-001.
const DBI_TURTLE_OUTFIT_ID='stroj-001';
const DBI_OLD_TURTLE_OUTFIT_ID='quest-turtle-school-outfit';
const dbiTurtleOutfit=catalog.find(item=>item.id===DBI_TURTLE_OUTFIT_ID);
if(dbiTurtleOutfit){
 dbiTurtleOutfit.name='Strój treningowy szkoły żółwia';
 dbiTurtleOutfit.slot='stroj';
 dbiTurtleOutfit.image='assets/items/stroj-treningowy-szkoly-zolwia.png';
 dbiTurtleOutfit.attack=0;
 dbiTurtleOutfit.defense=0;
 dbiTurtleOutfit.trainingBaseBonusPercent=1;
 dbiTurtleOutfit.description='+1% do bazowej wartości treningu';
}else catalog.push({...DBI_DEFAULT_ITEMS.find(item=>item.id===DBI_TURTLE_OUTFIT_ID)});
catalog=catalog.filter(item=>item.id!==DBI_OLD_TURTLE_OUTFIT_ID);
dbiSaveCatalog(catalog);
const dbiMigrateTurtleOutfitRef=ref=>typeof ref==='string'&&
 (ref===DBI_OLD_TURTLE_OUTFIT_ID||ref.startsWith(DBI_OLD_TURTLE_OUTFIT_ID+'~'))
 ?DBI_TURTLE_OUTFIT_ID+ref.slice(DBI_OLD_TURTLE_OUTFIT_ID.length):ref;

// Przedmioty wbudowane: automatycznie widoczne w katalogu i GM, bez dodatkowych przycisków.
const DBI_ROYAL_500_CATALOG=[
{id:'royal-500-miecz-krola-saiyan',name:'Miecz Króla Saiyan',slot:'bron',icon:'⚔️',image:'assets/items/miecz-krola-saiyan.png',requiredLevel:500,quality:"Pospolity",attack:0,defense:0,ki:0,description:"Zestaw Króla Saiyan · 500 LVL. Statystyki do ustalenia."},
{id:'royal-500-pancerz-krola-saiyan',name:'Pancerz Króla Saiyan',slot:'zbroja',icon:'🛡️',image:'assets/items/pancerz-krola-saiyan.png',requiredLevel:500,quality:"Pospolity",attack:0,defense:0,ki:0,description:"Zestaw Króla Saiyan · 500 LVL. Statystyki do ustalenia."},
{id:'royal-500-pas-krola-saiyan',name:'Małpi Ogon Króla Saiyan',slot:'pas',icon:'〰️',image:'assets/items/pas-krola-saiyan.png',requiredLevel:500,quality:"Pospolity",attack:0,defense:0,ki:0,description:"Zestaw Króla Saiyan · 500 LVL. Statystyki do ustalenia."},
{id:'royal-500-buty-krola-saiyan',name:'Buty Króla Saiyan',slot:'buty',icon:'🥾',image:'assets/items/buty-krola-saiyan.png',requiredLevel:500,quality:"Pospolity",attack:0,defense:0,ki:0,description:"Zestaw Króla Saiyan · 500 LVL. Statystyki do ustalenia."},
{id:'royal-500-rekawice-krola-saiyan',name:'Rękawice Króla Saiyan',slot:'rekawice',icon:'🥊',image:'assets/items/rekawice-krola-saiyan.png',requiredLevel:500,quality:"Pospolity",attack:0,defense:0,ki:0,description:"Zestaw Króla Saiyan · 500 LVL. Statystyki do ustalenia."},
{id:'royal-500-opaska-krola-saiyan',name:'Opaska Króla Saiyan',slot:'opaska',icon:'🎗️',image:'assets/items/opaska-krola-saiyan.png',requiredLevel:500,quality:"Pospolity",attack:0,defense:0,ki:0,description:"Zestaw Króla Saiyan · 500 LVL. Statystyki do ustalenia."},
{id:'royal-500-naszyjnik-krola-saiyan',name:'Naszyjnik Króla Saiyan',slot:'naszyjnik',icon:'📿',image:'assets/items/naszyjnik-krola-saiyan.png',requiredLevel:500,quality:"Pospolity",attack:0,defense:0,ki:0,description:"Zestaw Króla Saiyan · 500 LVL. Statystyki do ustalenia."},
{id:'royal-500-kolczyki-krola-saiyan',name:'Kolczyki Króla Saiyan',slot:'kolczyki',icon:'💎',image:'assets/items/kolczyki-krola-saiyan.png',requiredLevel:500,quality:"Pospolity",attack:0,defense:0,ki:0,description:"Zestaw Króla Saiyan · 500 LVL. Statystyki do ustalenia."},
{id:'royal-500-pierscien-krola-saiyan',name:'Pierścień Króla Saiyan',slot:'pierscien',icon:'💍',image:'assets/items/pierscien-krola-saiyan.png',requiredLevel:500,quality:"Pospolity",attack:0,defense:0,ki:0,description:"Zestaw Króla Saiyan · 500 LVL. Statystyki do ustalenia."},
{id:'royal-500-chi-krola-saiyan',name:'Chi Króla Saiyan',slot:'chi',icon:'🔺',image:'assets/items/chi-krola-saiyan.png',requiredLevel:500,quality:"Pospolity",attack:0,defense:0,ki:0,description:"Zestaw Króla Saiyan · 500 LVL. Statystyki do ustalenia."},
{id:'royal-500-znak-krola-saiyan',name:'Znak Króla Saiyan',slot:'znak',icon:'王',image:'assets/items/znak-krola-saiyan.png',requiredLevel:500,quality:"Pospolity",attack:0,defense:0,ki:0,description:"Zestaw Króla Saiyan · 500 LVL. Statystyki do ustalenia."},
{id:'royal-500-stroj-krola-saiyan',name:'Strój Treningowy Króla Saiyan',slot:'stroj',icon:'🥋',image:'assets/items/stroj-krola-saiyan.png',requiredLevel:500,quality:"Pospolity",attack:0,defense:0,ki:0,description:"Zestaw Króla Saiyan · 500 LVL. Statystyki do ustalenia."},
{id:'royal-500-esencja-krola-saiyan',name:'Esencja Króla Saiyan',slot:'esencja',icon:'💠',image:'assets/items/esencja-krola-saiyan.png',requiredLevel:500,quality:"Pospolity",attack:0,defense:0,ki:0,description:"Zestaw Króla Saiyan · 500 LVL. Statystyki do ustalenia."},
{id:'royal-500-scouter-krola-saiyan',name:'Scouter Króla Saiyan',slot:'scouter',icon:'🔍',image:'assets/items/scouter-krola-saiyan.png',requiredLevel:500,quality:"Pospolity",attack:0,defense:0,ki:0,description:"Zestaw Króla Saiyan · 500 LVL. Statystyki do ustalenia."}
];
function dbiRegisterBuiltInItems(items){
 for(const item of items){
  const i=catalog.findIndex(x=>x.id===item.id);
  if(i===-1)catalog.push({...item});
  else catalog[i]={...item,...catalog[i],slot:item.slot,image:item.image,requiredLevel:item.requiredLevel,...(item.requiredRace?{requiredRace:item.requiredRace}:{})};
 }
}
dbiRegisterBuiltInItems(DBI_ROYAL_500_CATALOG);
// Skrzynki turniejowe — zawartość zostanie ustalona później, na razie nie można ich otwierać.
const DBI_TOURNAMENT_CHESTS=[
 {id:'turniej-skrzynka-mala',name:'Mała skrzynka turniejowa',slot:'uzytkowy',icon:'🎁',image:'assets/items/turniej-skrzynka-mala.png',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Nagroda za zwycięstwo w turnieju poziomów 1–20. Zawartość do ustalenia.'},
 {id:'turniej-skrzynka-srednia',name:'Średnia skrzynka turniejowa',slot:'uzytkowy',icon:'🎁',image:'assets/items/turniej-skrzynka-srednia.png',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Nagroda za zwycięstwo w turnieju poziomów 21–50. Zawartość do ustalenia.'},
 {id:'turniej-skrzynka-duza',name:'Duża skrzynka turniejowa',slot:'uzytkowy',icon:'🎁',image:'assets/items/turniej-skrzynka-duza.png',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Nagroda za zwycięstwo w turnieju poziomów 51–100. Zawartość do ustalenia.'}
];
dbiRegisterBuiltInItems(DBI_TOURNAMENT_CHESTS);

// Pięć Znaków — istniejący slot Symbol, bez tworzenia nowego systemu jakości.
const DBI_SIGNS_CATALOG=[
 {id:'znak-sily',name:'Znak Siły',slot:'symbol',icon:'力',image:'assets/items/znak-sily.png',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Znak ulepszany od +0 do +9. Bonusy odblokowują się na +0, +5 i +8.'},
 {id:'znak-walki',name:'Znak Walki',slot:'symbol',icon:'戦',image:'assets/items/znak-walki.png',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Znak ulepszany od +0 do +9. Bonusy odblokowują się na +0, +5 i +8.'},
 {id:'znak-bossa',name:'Znak Bossa',slot:'symbol',icon:'王',image:'assets/items/znak-bossa.png',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Znak ulepszany od +0 do +9. Bonusy odblokowują się na +0, +5 i +8.'},
 {id:'znak-wojownika',name:'Znak Wojownika',slot:'symbol',icon:'武',image:'assets/items/znak-wojownika.png',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Znak ulepszany od +0 do +9. Bonusy odblokowują się na +0, +5 i +8.'},
 {id:'znak-mistrza',name:'Znak Mistrza',slot:'symbol',icon:'師',image:'assets/items/znak-mistrza.png',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Znak ulepszany od +0 do +9. Bonusy odblokowują się na +0, +5 i +8.'},
];
dbiRegisterBuiltInItems(DBI_SIGNS_CATALOG);
dbiSaveCatalog(catalog);
// Przedmiot fabularny — bez statystyk, ulepszeń i możliwości założenia.
const DBI_CC_QUEST_CAPSULE={id:'special-cc-capsule',name:'Specjalna Kapsuła CC',slot:'quest',image:'assets/items/specjalna-kapsula-cc.png',icon:'💊',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Specjalna kapsuła Capsule Corporation. Przedmiot questowy.'};
const dbiCcCapsuleExisting=catalog.find(item=>item.id===DBI_CC_QUEST_CAPSULE.id);
if(dbiCcCapsuleExisting)Object.assign(dbiCcCapsuleExisting,DBI_CC_QUEST_CAPSULE);
else catalog.push({...DBI_CC_QUEST_CAPSULE});
// Torebka kupowana w sklepie; zawartość przyznawana dopiero po otwarciu.
const DBI_SENZU_BAG={id:'senzu-bean-bag',name:'Torebka Fasolek Senzu',slot:'użytkowy',image:'assets/items/torebka-fasolek-senzu.png',icon:'🎒',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Otwórz, aby otrzymać: 600 czerwonych, 100 niebieskich, 50 fioletowych i 50 zielonych Fasolek Zen.'};
const dbiBagExisting=catalog.find(x=>x.id===DBI_SENZU_BAG.id);
if(dbiBagExisting)Object.assign(dbiBagExisting,DBI_SENZU_BAG);else catalog.push({...DBI_SENZU_BAG});
// Fasolki Zen — przedmioty użytkowe, bez ulepszeń.
const DBI_ZEN_BEANS=[
 {id:'zen-bean-red',name:'Czerwona Fasolka Zen',image:'assets/items/fasolka-zen-red.png',description:'Odnawia 10% maksymalnego HP.'},
 {id:'zen-bean-blue',name:'Niebieska Fasolka Zen',image:'assets/items/fasolka-zen-blue.png',description:'Odnawia 100% brakującej energii KI.'},
 {id:'zen-bean-green',name:'Zielona Fasolka Zen',image:'assets/items/fasolka-zen-green.png',description:'Zwiększa szybkość ataku o 100% na 10 minut.'},
 {id:'zen-bean-purple',name:'Fioletowa Fasolka Zen',image:'assets/items/fasolka-zen-purple.png',description:'Zwiększa szybkość ruchu o 50% na godzinę.'}
];
for(const bean of DBI_ZEN_BEANS){
 const existing=catalog.find(item=>item.id===bean.id);
 if(existing)Object.assign(existing,bean,{slot:'użytkowy',quality:'Pospolity'});
 else catalog.push({...bean,slot:'użytkowy',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0});
}
// Zachowaj istniejący przedmiot Ruda Kowalstwa (również utworzony w GM).
// Jeśli go nie ma w katalogu, zarejestruj standardową definicję.
const dbiSmithOre=catalog.find(item=>item.name?.trim().toLocaleLowerCase('pl')==='ruda kowalstwa');
if(dbiSmithOre){dbiSmithOre.image='assets/items/ruda-kowalstwa.png';dbiSaveCatalog(catalog)}
else{catalog.push({id:'ruda-kowalstwa',name:'Ruda Kowalstwa',slot:'materiał',icon:'🪨',image:'assets/items/ruda-kowalstwa.png',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Czerwona ruda ukryta w skale. Materiał kowalski.'});dbiSaveCatalog(catalog)}
// Materiał do ulepszania — mechanika zużycia zostanie dodana osobno.
const DBI_FATHER_RING={id:'pierscien-ojca',name:'Pierścień Ojca',slot:'quest',icon:'💍',image:'assets/items/pierscien-ojca.png',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Obrączka zaginionego ojca. Przedmiot questowy, przeznaczony do oddania Zagubionej Kobiecie.'};
const existingFatherRing=catalog.find(item=>item.id===DBI_FATHER_RING.id);
if(existingFatherRing)Object.assign(existingFatherRing,DBI_FATHER_RING);else catalog.push(DBI_FATHER_RING);
const DBI_DRAGON_DUST={id:'dragon-ball-dust',name:'Pył smoczych kul',slot:'materiał',image:'assets/items/pyl-smoczych-kul.png',icon:'✨',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Magiczny pył wykorzystywany do ulepszania przedmiotów.'};
const existingDragonDust=catalog.find(item=>item.id===DBI_DRAGON_DUST.id);
if(existingDragonDust)Object.assign(existingDragonDust,DBI_DRAGON_DUST);
else catalog.push(DBI_DRAGON_DUST);
// Specjalny materiał +10: Przekuwacz.
const DBI_REFORGER={id:'upgrade-reforger',name:'Przekuwacz',slot:'materiał',image:'assets/items/przekuwacz.png',icon:'🔨',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Specjalny materiał potrzebny do ulepszenia wyposażenia na +10.'};
const existingReforger=catalog.find(item=>item.id===DBI_REFORGER.id);
if(existingReforger)Object.assign(existingReforger,DBI_REFORGER);
else catalog.push(DBI_REFORGER);
// Nowe materiały i zakładana zbroja. Wymagania i bonusy zbroi do ustalenia.
const DBI_NEW_ITEMS=[
 {id:'small-dragon-balls',name:'Małe Smocze Kule',slot:'materiał',image:'assets/items/male-smocze-kule.png',icon:'🟠',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Materiał do ulepszania wyposażenia.'},
 {id:'dragon-radar',name:'Radar Kul',slot:'materiał',image:'assets/items/radar-kul.png',icon:'📡',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Materiał do ulepszania wyposażenia.'},
 {id:'red-ribbon-badge',name:'Odznaka Armii Czerwonej Wstęgi',slot:'materiał',image:'assets/items/odznaka-czerwonej-wstegi.png',icon:'🎖️',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Materiał do ulepszania wyposażenia.'},
 {id:'saiyan-soldier-armor',name:'Zbroja Saiyańskiego Żołnierza',slot:'zbroja',image:'assets/items/zbroja-saiyanskiego-zolnierza.png',icon:'🛡️',quality:'Pospolity',requiredLevel:50,attack:0,defense:105,hp:50,ki:0,description:'Pancerz powstały z przekucia Białego Kimona +9. Obrona +105, maksymalne HP +50.'}
];
for(const builtIn of DBI_NEW_ITEMS){
 const existing=catalog.find(item=>item.id===builtIn.id);
 if(existing)Object.assign(existing,builtIn);
 else catalog.push({...builtIn});
}
// Podstawowe białe akcesoria — stałe definicje, dostępne również w Panelu GM.
const DBI_WHITE_ACCESSORIES=[
 {id:'white-gloves',name:'Białe rękawiczki',slot:'rekawice',image:'assets/items/biale-rekawiczki.png',icon:'🧤',quality:'Pospolity',requiredLevel:1,attack:0,defense:3,ki:0,description:'Proste rękawiczki bojowe. Obrona +3.'},
 {id:'white-headband',name:'Biała Opaska',slot:'opaska',image:'assets/items/biala-opaska.png',icon:'🎗️',quality:'Pospolity',requiredLevel:1,attack:0,defense:2,ki:0,description:'Biała opaska treningowa. Obrona +2.'},
 {id:'white-earrings',name:'Białe Kolczyki',slot:'kolczyki',image:'assets/items/biale-kolczyki.png',icon:'💎',quality:'Pospolity',requiredLevel:1,attack:2,attackMin:2,attackMax:2,defense:0,ki:0,description:'Proste białe kolczyki. Wartość ataku +2.'},
 {id:'white-ring',name:'Biały Pierścień',slot:'pierscien',image:'assets/items/bialy-pierscien.png',icon:'💍',quality:'Pospolity',requiredLevel:1,attack:2,attackMin:2,attackMax:2,defense:0,ki:0,description:'Srebrny pierścień z białym kamieniem. Wartość ataku +2.'},
 {id:'white-amulet',name:'Biały amulet',slot:'naszyjnik',image:'assets/items/bialy-amulet.png',icon:'📿',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,hp:50,ki:0,description:'Skromny amulet na rzemyku. Maksymalne HP +50.'}
];
for(const builtIn of DBI_WHITE_ACCESSORIES){
 const existing=catalog.find(x=>x.id===builtIn.id);
 if(existing)Object.assign(existing,builtIn);else catalog.push({...builtIn});
}
// Aktualizacja startowego zestawu: zachowujemy istniejące ID i zapisy graczy.
// Nazwy i bazowe statystyki są nadpisywane również dla starszych zapisów katalogu.
for(const item of catalog){
 if(item.id==='starter-blue-kimono'){
  item.name='Białe Kimono';item.image='assets/items/biale-kimono.png';
  item.defense=5;item.description='Białe kimono treningowe. Obrona +5.';
 }
 if(item.id==='starter-black-boots'){
  item.name='Białe Skórzane Buty';
  item.image='assets/items/biale-skorzane-buty.png';
 }
 if(item.id==='starter-red-staff'){
  item.attack=5;item.attackMin=5;item.attackMax=6;
  item.description='Podstawowa broń. Wartość ataku 5–6.';
 }
}
catalog=catalog.filter(x=>x.id!=='starter-white-belt-plus-one');
for(const x of catalog)if(x.id.startsWith('royal-500-'))x.quality='Pospolity';
dbiSaveCatalog(catalog);

const DBI_INV_KEY='dboidle_inventory_v1_'+String(dbiActive?.id||'test');
let inventory=[]; // Nowa postać zaczyna z pustym ekwipunkiem.
try{const stored=JSON.parse(localStorage.getItem(DBI_INV_KEY)||'null');if(Array.isArray(stored))inventory=stored.filter(id=>typeof id==='string'&&!dbiIsRemovedItemRef(id)).map(id=>id==='starter-white-belt-plus-one'?'starter-white-belt~1':id);}catch{}
// Migracja starych kul Bulmy do istniejącego przedmiotu z grafiką.
if(inventory.includes('quest-small-dragon-ball')){
 inventory=inventory.map(id=>id==='quest-small-dragon-ball'?'small-dragon-balls':id);
 localStorage.setItem(DBI_INV_KEY,JSON.stringify(inventory));
}
// Zachowaj kapsuły otrzymane wcześniej w zadaniu Bulmy.
if(inventory.includes('quest-capsule-special')){
 inventory=inventory.map(id=>id==='quest-capsule-special'?'special-cc-capsule':id);
 localStorage.setItem(DBI_INV_KEY,JSON.stringify(inventory));
}
// Konwersja starych nagród z zachowaniem poziomu ulepszenia i układu ekwipunku.
if(inventory.some(ref=>dbiMigrateTurtleOutfitRef(ref)!==ref)){
 inventory=inventory.map(dbiMigrateTurtleOutfitRef);
 localStorage.setItem(DBI_INV_KEY,JSON.stringify(inventory));
 const posKey='dboidle_inventory_positions_v1_'+String(dbiActive?.id||'test');
 try{
  const placement=JSON.parse(localStorage.getItem(posKey)||'null');
  if(placement&&Array.isArray(placement.items)){
   placement.items=placement.items.map(dbiMigrateTurtleOutfitRef);
   localStorage.setItem(posKey,JSON.stringify(placement));
  }
 }catch{}
}
// Utrwal oczyszczenie ekwipunku po usunięciu testowych przedmiotów.
localStorage.setItem(DBI_INV_KEY,JSON.stringify(inventory));
const DBI_INV_POS_KEY='dboidle_inventory_positions_v1_'+String(dbiActive?.id||'test');
let inventoryPlacement=inventory.map(()=>null);
try{
 const saved=JSON.parse(localStorage.getItem(DBI_INV_POS_KEY)||'null');
 // Nie stosuj pozycji do innego układu przedmiotów (np. po migracji zapisu).
 if(saved&&Array.isArray(saved.items)&&Array.isArray(saved.positions)&&
    saved.items.length===inventory.length&&saved.items.every((id,i)=>id===inventory[i])){
  inventoryPlacement=inventory.map((_,i)=>{
   const pos=saved.positions[i];
   return pos&&Number.isInteger(pos.page)&&pos.page>=0&&pos.page<100&&
     Number.isInteger(pos.cell)&&pos.cell>=0&&pos.cell<60?{page:pos.page,cell:pos.cell}:null;
  });
 }
}catch{}
let dbiLastPositionSave='';
function dbiSaveInventoryPositions(){
 try{
  const value=JSON.stringify({items:inventory,positions:inventoryPlacement});
  if(value!==dbiLastPositionSave){localStorage.setItem(DBI_INV_POS_KEY,value);dbiLastPositionSave=value}
 }catch{}
}
function dbiSaveInventory(){
 try{localStorage.setItem(DBI_INV_KEY,JSON.stringify(inventory))}catch{}
 dbiSaveInventoryPositions();
}
let inventoryTab=0,equipmentSet='Główny',selectedSlot=null;
const QUALITY=['Pospolity','Zwyczajny','Rzadki','Epicki','Legendarny'];
const DBI_QUALITY_MULTIPLIERS=[1,1.10,1.25,1.50,2];
let dragIndex=null;
let dragActive=false;
let dragOffset={x:0,y:0};
let tabHoverTimer=null,dragSourceElement=null,dragCompleted=false;
const DBI_EQUIP_KEY='dboidle_equipped_v1_'+String(dbiActive?.id||'test');
let equipped={'Główny':{},'PvP':{}};
try{const saved=JSON.parse(localStorage.getItem(DBI_EQUIP_KEY)||'null');if(saved&&typeof saved==='object')for(const set of ['Główny','PvP'])if(saved[set]&&typeof saved[set]==='object')equipped[set]=Object.fromEntries(Object.entries(saved[set]).map(([slot,id])=>[slot,id==='starter-white-belt-plus-one'?'starter-white-belt~1':id]));}catch{}
for(const set of Object.values(equipped))
 for(const slot of Object.keys(set)){
  if(dbiIsRemovedItemRef(set[slot]))delete set[slot];
  else set[slot]=dbiMigrateTurtleOutfitRef(set[slot]);
 }
for(const set of ['Główny','PvP']){
 if(equipped[set].skuter){
  if(!equipped[set].scouter)equipped[set].scouter=equipped[set].skuter;
  delete equipped[set].skuter;
 }
}
localStorage.setItem(DBI_EQUIP_KEY,JSON.stringify(equipped));
function dbiSaveEquipped(){try{localStorage.setItem(DBI_EQUIP_KEY,JSON.stringify(equipped))}catch{}}

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DBI_ENHANCEMENT_MAX=9;
const DBI_REINFORCEMENT_PLANS={id:'reinforcement-plans',name:'Plany wzmocnień',slot:'materiał',icon:'📜',image:'assets/items/plany-wzmocnien.png',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Dodaje dodatkowy bonus do ekwipunku'};
const DBI_CHANGE_SCROLL={...DBI_REINFORCEMENT_PLANS,id:'change-scroll',name:'Zwój Zmiany',image:'assets/items/zwoj-zmiany.png',description:'Losuje ponownie wszystkie dodane bonusy przedmiotu. Przeciągnij na wyposażenie w inwentarzu.'};
const DBI_ADDITION_CHIP={...DBI_REINFORCEMENT_PLANS,id:'addition-chip',name:'Czip dodania',icon:'💾',image:'assets/items/czip-dodania.png',description:'Dodaje bonusy do Chi, symboli, strojów treningowych, esencji i scouterów.'};
const DBI_UPDATING_CHIP={...DBI_ADDITION_CHIP,id:'updating-chip',name:'Czip aktualizujący',image:'assets/items/czip-aktualizujacy.png',description:'Losuje ponownie bonusy dodane Czipem dodania. Przeciągnij na zmodyfikowany przedmiot w inwentarzu.'};
const DBI_PLAN_RACES={
 earthling:{against:'Ziemianinowi',from:'Ziemianina'},
 namekian:{against:'Nameczaninowi',from:'Nameczanina'},
 frostDemon:{against:'Demonowi Mrozu',from:'Demona Mrozu'},
 majin:{against:'Majinowi',from:'Majina'}
};
const DBI_PLAN_ATTRIBUTES={strength:'Siła',speed:'Szybkość',endurance:'Wytrzymałość',intelligence:'Inteligencja',ki:'KI'};
const DBI_PLAN_STAT_DEFS={
 allStatsPct:['Wszystkie statystyki',1,10,'%'],
 bleedChance:['Szansa na krwawienie',1,10,'%'],stunResistance:['Odporność na omdlenia',90,90,''],
 doubleMobDropChance:['Szansa na podwójny łup z mobów',1,10,'%'],defense:['Obrona',50,500,''],
 hp:['Maksymalne HP',50,1000,''],critDamage:['Obrażenia krytyczne',1,10,'%'],
 maxHpPct:['Maksymalne HP',1,10,'%'],maxKiPct:['Maksymalne KI',1,10,'%'],
 hpRegenPct:['Regeneracja HP',1,10,'%'],kiRegenPct:['Regeneracja KI',1,10,'%'],maxKi:['Maksymalne KI',10,200,''],
 pvmAttackPct:['Wartość ataku PvM, bossowie i fabuła',1,10,'%'],attackValuePct:['Wartość ataku',1,10,'%'],
 techniqueValuePct:['Wartość ataku technik',1,10,'%'],critChance:['Szansa na trafienie krytyczne',1,10,'%'],
 armorPenetration:['Redukcja pancerza przeciwnika',1,10,'%'],defensePct:['Obrona',1,20,'%'],
 attackPair:['Wartość ataku (PvM–PvP)',1,100,''],criticalDamageReduction:['Redukcja otrzymanych obrażeń krytycznych',1,10,'%'],
 techniqueReductionPct:['Redukcja otrzymanych obrażeń technik',1,10,'%'],moveSpeedPct:['Szybkość ruchu',1,10,'%'],
 gloryBonus:['Punkty chwały z Pola Bitwy',1,10,''],spiritualPointChancePct:['Szansa na dodatkowy punkt duchowy',1,10,'%'],
 techniqueCritChance:['Szansa na trafienie krytyczne technik',1,10,'%'],techniqueCritDamage:['Obrażenia krytyczne technik',1,10,'%'],
 attackSpeedPct:['Szybkość ataku',1,20,'%'],mobExpPct:['EXP z mobów',1,20,'%'],
 doublePvmExpPct:['Szansa na podwójny EXP z PvM',1,5,'%'],trainingBaseBonusPercent:['Bazowa wartość treningu',1,5,'%'],
 bossRespawnMinutes:['Czas odrodzenia bossa',1,5,' min'],dropChancePct:['Szansa na drop przedmiotów',1,1,'%'],
 upgradeChancePct:['Szansa na ulepszenie przedmiotu',1,10,'%'],
 averageDamagePair:['Średnie obrażenia',-30,60,'%'],
 averageDamagePct:['średnich obrażeń',-30,60,'%'],
 averageTechniqueDamagePct:['średnich obrażeń technik',-30,60,'%'],
 chipDropChancePct:['Szansa na drop przedmiotów',.2,1,'%',10],
 combineChancePct:['Szansa na połączenie przedmiotu',1,10,'%'],
 qualityChancePct:['Szansa na podniesienie jakości przedmiotu',1,5,'%'],
 upgradeMaterialDiscount:['Materiał do ulepszenia',1,1,''],
 runeChancePct:['Szansa na osadzenie runy',1,10,'%'],
 merchantDiscountPct:['Ceny u handlarzy',1,10,'%'],
 chipDoublePvmExpPct:['Szansa na podwójne EXP z PvM',1,10,'%'],
 expBonusPct:['Premia do doświadczenia',1,20,'%'],
 battleGoldBonusPct:['Premia do złota z walk i mobów',1,10,'%'],
 doubleBossRewardsChance:['Szansa na podwójny łup z bossów',1,10,'%'],
 battlePointsBonus:['Dodatkowy punkt walki',1,1,''],
 chipTrainingBasePct:['Bazowa wartość treningu',1,10,'%'],
 trainingResultPct:['Premia do rezultatu treningu',1,10,'%'],
 spiritualEarnChancePct:['Szansa na punkt rozwoju duchowego',1,5,'%'],
 adventureChancePct:['Szansa na ukończenie przygody',1,10,'%'],
 dungeonEntries:['Dodatkowe wejście do dungeonu',1,1,''],
 essenceAttackPair:['Wartość ataku (PvM–PvP)',5,200,''],
 techniqueDamageBonusPct:['Obrażenia technik',1,10,'%'],
 enemyStatsReductionPct:['Statystyki przeciwnika',1,10,'%'],
 bossDamageReductionPct:['Redukcja obrażeń od bossów',1,10,'%'],
 monsterDamageReductionPct:['Redukcja obrażeń od mobów',1,10,'%'],
 mobGoldPct:['Premia do złota z mobów',1,10,'%'],
 smithDropChancePct:['Szansa na drop materiałów kowalskich',1,10,'%']
};
const dbiPlanAttributeKeys=Object.keys(DBI_PLAN_ATTRIBUTES).map(key=>{
 DBI_PLAN_STAT_DEFS[key+'Pct']=[DBI_PLAN_ATTRIBUTES[key],1,10,'%'];
 return key+'Pct';
});
const dbiPlanRaceKeys=(prefix,label)=>{
 return Object.entries(DBI_PLAN_RACES).map(([race,names])=>{
  const key=prefix+race;
  DBI_PLAN_STAT_DEFS[key]=[label(names),1,10,'%'];
  return key;
 });
};
const dbiPlanRaceDamage=dbiPlanRaceKeys('raceDamage_',names=>'obrażeń przeciwko '+names.against);
const dbiPlanRaceReduction=dbiPlanRaceKeys('raceReduction_',names=>'redukcji obrażeń od '+names.from);
const dbiPlanRingRaceDamage=dbiPlanRaceDamage.map(key=>{
 const fixedKey='fixed_'+key;
 DBI_PLAN_STAT_DEFS[fixedKey]=[DBI_PLAN_STAT_DEFS[key][0],1,1,'%'];
 return fixedKey;
});
const DBI_PLAN_POOLS={
 opaska:[...dbiPlanAttributeKeys,'bleedChance','stunResistance','doubleMobDropChance','defense','hp','critDamage',...dbiPlanRaceReduction],
 naszyjnik:['maxHpPct','maxKiPct','allStatsPct',...dbiPlanAttributeKeys,'defense','hpRegenPct','kiRegenPct','hp','maxKi'],
 kolczyki:['pvmAttackPct','techniqueValuePct','critChance','armorPenetration',...dbiPlanAttributeKeys],
 zbroja:['maxHpPct','defensePct','attackPair','criticalDamageReduction','techniqueReductionPct','moveSpeedPct','gloryBonus','spiritualPointChancePct',...dbiPlanRaceReduction],
 bron:['attackValuePct','attackPair','critChance','critDamage','techniqueCritChance','techniqueCritDamage','techniqueValuePct','allStatsPct','attackSpeedPct',...dbiPlanRaceDamage],
 pierscien:['mobExpPct','doublePvmExpPct','trainingBaseBonusPercent','bossRespawnMinutes','allStatsPct','dropChancePct',...dbiPlanRingRaceDamage],
 pas:['mobExpPct','doublePvmExpPct','trainingBaseBonusPercent','allStatsPct','dropChancePct',...dbiPlanRaceDamage,'defense',...dbiPlanRaceReduction],
 rekawice:['upgradeChancePct','hpRegenPct','kiRegenPct','defense',...dbiPlanRaceDamage,'attackValuePct','attackSpeedPct','mobExpPct','doublePvmExpPct'],
 buty:['mobExpPct','allStatsPct','critChance','techniqueCritChance','hp','maxKi','attackValuePct',...dbiPlanRaceReduction]
};
const DBI_CHIP_BONUS_POOLS={
 'smith-chi-1':['chipDropChancePct','upgradeChancePct','combineChancePct','qualityChancePct','upgradeMaterialDiscount','doubleMobDropChance','runeChancePct','merchantDiscountPct'],
 'czarna-chi':['attackPair','allStatsPct','techniqueValuePct','critChance','techniqueCritChance','critDamage','techniqueCritDamage',...dbiPlanRaceDamage],
 symbol:['expBonusPct','chipDoublePvmExpPct','battleGoldBonusPct','dropChancePct','doubleMobDropChance','doubleBossRewardsChance','battlePointsBonus','bossRespawnMinutes'],
 stroj:['chipTrainingBasePct','trainingResultPct','spiritualEarnChancePct','adventureChancePct','dungeonEntries'],
 esencja:['essenceAttackPair',...dbiPlanAttributeKeys,'techniqueDamageBonusPct','attackSpeedPct','techniqueCritDamage','critDamage','armorPenetration'],
 scouter:['enemyStatsReductionPct','bossRespawnMinutes','bossDamageReductionPct','monsterDamageReductionPct','dropChancePct','doubleBossRewardsChance','doubleMobDropChance','mobGoldPct','smithDropChancePct','battlePointsBonus']
};
function dbiChipPool(item){
 if(item?.slot==='chi')return DBI_CHIP_BONUS_POOLS[item.id]||[];
 return DBI_CHIP_BONUS_POOLS[item?.slot]||[];
}
function dbiPlanPvpValue(key,value){
 return key==='attackPair'?Math.ceil(value/2):key==='essenceAttackPair'?value:0;
}
function dbiValidAveragePair(normal,technique){
 if(![normal,technique].every(n=>Number.isInteger(n)&&n>=-30&&n<=60))return false;
 const lower=Math.min(normal,technique),upper=Math.max(normal,technique);
 return upper>=0&&upper<=5+Math.floor(55*Math.max(0,-lower)/30);
}
const DBI_AVERAGE_DAMAGE_PAIRS=[];
for(let normal=-30;normal<=60;normal++){
 for(let technique=-30;technique<=60;technique++){
  if(dbiValidAveragePair(normal,technique))DBI_AVERAGE_DAMAGE_PAIRS.push([normal,technique]);
 }
}
const DBI_AVERAGE_DAMAGE_KEYS=['averageDamagePct','averageTechniqueDamagePct'];
function dbiSignedPercent(value){return (value<0?'−':'+')+Math.abs(value)+'%'}
function dbiPlanInteger(min,max){return min+Math.floor(Math.random()*(max-min+1))}
function dbiPlanLabel([key,value,pvp]){
 const [label,,,unit]=DBI_PLAN_STAT_DEFS[key];
 if(key==='stunResistance')return label;
 if(DBI_AVERAGE_DAMAGE_KEYS.includes(key))return dbiSignedPercent(value)+' '+label;
 if(key==='averageDamagePair')return dbiSignedPercent(value)+' średnich obrażeń / '+dbiSignedPercent(pvp)+' średnich obrażeń technik';
 if(key==='attackPair'||key==='essenceAttackPair')return `+${value}–${pvp} ${label}`;
 return `${['bossRespawnMinutes','upgradeMaterialDiscount','merchantDiscountPct','enemyStatsReductionPct'].includes(key)?'−':'+'}${String(value).replace('.',',')}${unit} ${label}`;
}
function dbiPlanSum(items,key){
 return items.reduce((total,item)=>total+(Number(item[key])||0),0);
}
function dbiPlanRolledTotal(items,key){
 return items.reduce((n,item)=>n+(item.planBonuses?.find(([stat])=>stat===key)?.[1]||0),0);
}
function dbiPlanAttributeMultiplier(items,key){
 return 1+(dbiPlanSum(items,'allStatsPct')+dbiPlanSum(items,key+'Pct'))/100;
}
function dbiPlanCombatFields(character,items){
 return {race:character?.race??character?.stats?.race,
  averageDamagePct:dbiPlanSum(items,'averageDamagePct'),averageTechniqueDamagePct:dbiPlanSum(items,'averageTechniqueDamagePct'),
  techniqueReductionPct:dbiPlanSum(items,'techniqueReductionPct'),enemyStatsReductionPct:dbiPlanSum(items,'enemyStatsReductionPct'),
  raceDamage:Object.fromEntries(Object.keys(DBI_PLAN_RACES).map(key=>[key,dbiPlanSum(items,'raceDamage_'+key)])),
  raceReduction:Object.fromEntries(Object.keys(DBI_PLAN_RACES).map(key=>[key,dbiPlanSum(items,'raceReduction_'+key)]))};
}
const dbiDecodeItemRef=ref=>{
 const value=String(ref||'');
 const [saved,rolls='']=value.split('~b');
 const reinforced=saved.endsWith('~p');
 const raw=(reinforced?saved.slice(0,-2):saved).replace(/^starter-white-belt-plus-one$/,'starter-white-belt~1');
 const match=raw.match(/^(.*)~([0-9])(?:~q([0-4]))?$/);
 const bonuses=rolls?rolls.split(',').map(entry=>{const [key,value,pvp]=entry.split(':');return [key,Number(value),Number(pvp)]}):[];
 return {id:match?match[1]:raw,enhancement:match?Number(match[2]):0,quality:match?.[3]===undefined?null:Number(match[3]),reinforced,bonuses};
};
const dbiItemRef=(id,enhancement=0,quality=null,reinforced=false,bonuses=[])=>{
 const ref=quality!==null?`${id}~${enhancement}~q${quality}`:enhancement>0?`${id}~${enhancement}`:id;
 return ref+(reinforced?'~p':'')+(bonuses.length?'~b'+bonuses.map(entry=>entry.join(':')).join(','):'');
};
// Ulepszenia skalują wyłącznie bazowe bonusy zapisane w definicji przedmiotu.
// Nie modyfikujemy katalogu: statystyki są wyliczane z poziomu zapisanego w referencji.
const DBI_UPGRADE_FLAT_STATS=new Set([
 'attack','attackMin','attackMax','defense','hp','maxHp','health',
 'ki','maxKi','mana','damage','bonusDamage','physicalAttack',
 'physicalAttackPower','attackPower','techniqueAttack','techniqueAttackMin',
 'techniqueAttackMax','techniquePower','kiPoints','maxMp'
]);
const DBI_UPGRADE_PERCENT_STATS=new Set([
 'attackSpeedPct','moveSpeedPct','critChance','criticalChance',
 'critDamage','criticalDamage','techniqueCritChance','techCritChance',
 'techniqueCritDamage','techCritDamage','armorPenetration',
 'enemyArmorReduction','bleedChance','stunChance','dodgeChance',
 'criticalDamageReduction','stunResistance','faintResistance',
 'expBonusPct','experienceBonusPct','doubleMobDropChance',
 'doubleBossRewardsChance','goldBonusPct','battleGoldBonusPct','monsterDamageReductionPct'
]);
function dbiEnhancedFlatBonus(value,level){
 let result=Number(value);
 for(let i=0;i<level;i++)result=Math.ceil(result*1.5);
 return result;
}
function dbiEnhancedPercentBonus(value,level){
 const base=Number(value);
 // Bazowe bonusy 1–5% dochodzą do dokładnie 5% na +9.
 // Bonusy już większe od 5% nie są obniżane przez ulepszanie.
 if(base<=0||base>=5)return base;
 return Math.floor(base+(5-base)*level/9+1e-9);
}
// Wartości Znaków wyliczamy WYŁĄCZNIE istniejącymi przelicznikami.
// +0: pierwszy bonus, +5: drugi, +8: trzeci.
const DBI_SIGN_BONUSES={
 'znak-sily':[['allStats',5,'+{v} do wszystkich statystyk'],['attackRange',1,'+{v}–{v} do wartości ataku'],['critChance',1,'+{v}% szansy na trafienie krytyczne']],
 'znak-walki':[['expBonusPct',5,'+{v}% zdobywanego doświadczenia'],['dropChancePct',1,'+{v}% szansy na drop przedmiotów'],['battleGoldBonusPct',1,'+{v}% złota z potworów']],
 'znak-bossa':[['bossDamageReductionPct',1,'−{v}% otrzymywanych obrażeń od bossów'],['bossDamageBonusPct',1,'+{v}% zadawanych obrażeń bossom'],['doubleBossRewardsChance',1,'+{v}% szansy na podwójny łup z bossa']],
 'znak-wojownika':[['techniqueDamageBonusPct',1,'+{v}% obrażeń technik'],['pvpAttack',1,'+{v} do wartości ataku PvP'],['defense',5,'+{v} do obrony']],
 'znak-mistrza':[['trainingBaseBonusPercent',1,'+{v}% bazowej wartości treningu'],['upgradeChancePct',1,'+{v}% szansy na ulepszenie przedmiotu'],['spiritualPointChancePct',1,'+{v}% szansy na punkt rozwoju duchowego']],
};
function dbiSignBonuses(itemId,level){
 const definitions=DBI_SIGN_BONUSES[itemId];
 if(!definitions)return null;
 return definitions.map(([key,base,label],index)=>{
  const threshold=[0,5,8][index];
  if(level<threshold)return null;
  const value=key==='allStats'||key==='attackRange'||key==='pvpAttack'||key==='defense'
   ?dbiEnhancedFlatBonus(base,level-threshold):dbiEnhancedPercentBonus(base,level-threshold);
  return {key,value,label:label.replaceAll('{v}',String(value))};
 }).filter(Boolean);
}
const itemById=ref=>{
 const {id,enhancement,quality,reinforced,bonuses}=dbiDecodeItemRef(ref);
 const base=catalog.find(x=>x.id===id);
 if(!base)return undefined;
 const item={...base,enhancement,quality:QUALITY[quality]??(id.startsWith('royal-500-')?'Pospolity':base.quality)};
 const equippable=DBI_SLOTS.some(([,slot])=>slot===base.slot);
 const multiplier=DBI_QUALITY_MULTIPLIERS[QUALITY.indexOf(item.quality)]??1;
 if(equippable&&multiplier>1||enhancement>0&&base.slot!=='materiał'&&base.slot!=='uzytkowy'&&base.slot!=='quest'){
  const qualityMultiplier=equippable?multiplier:1;
  for(const key of DBI_UPGRADE_FLAT_STATS){
   if(!Number.isFinite(base[key])||base[key]<=0)continue;
   const value=qualityMultiplier===1?base[key]:Math.round(base[key]*qualityMultiplier*100)/100;
   item[key]=dbiEnhancedFlatBonus(value,enhancement);
  }
  for(const key of DBI_UPGRADE_PERCENT_STATS){
   if(!Number.isFinite(base[key])||base[key]<=0)continue;
   const value=enhancement>0?dbiEnhancedPercentBonus(base[key],enhancement):base[key];
   item[key]=qualityMultiplier===1?value:Math.round(value*qualityMultiplier*100)/100;
  }
 }
 const signBonuses=dbiSignBonuses(id,enhancement);
 if(signBonuses){item.signBonuses=signBonuses;for(const bonus of signBonuses)item[bonus.key]=bonus.value;}
 const pool=DBI_PLAN_POOLS[base.slot]||[];
 if(reinforced&&pool.length){item.reinforced=true;item.allStats=(Number(item.allStats)||0)+5}
 item.planBonuses=[];
 if(bonuses.length)item.beforePlanBonuses={...item};
 const seen=new Set();
 const averageValues=DBI_AVERAGE_DAMAGE_KEYS.map(key=>bonuses.slice(0,4).find(([stat])=>stat===key)?.[1]);
 const validSeparateAverages=base.slot==='esencja'&&dbiValidAveragePair(...averageValues);
 for(const entry of bonuses){
  const [key,value,pvp]=entry;
  if(item.planBonuses.length+(item.reinforced?1:0)>=4||!Object.hasOwn(DBI_PLAN_STAT_DEFS,key)||seen.has(key))continue;
  const [,min,max,,scale=1]=DBI_PLAN_STAT_DEFS[key];
  if(!Number.isInteger(value*scale)||value<min||value>max||key==='attackPair'&&(!Number.isInteger(pvp)||pvp<1||pvp>50)||key==='essenceAttackPair'&&pvp!==value)continue;
  if(DBI_AVERAGE_DAMAGE_KEYS.includes(key)&&!validSeparateAverages)continue;
  if(key==='averageDamagePair'&&(validSeparateAverages||base.slot!=='esencja'||!dbiValidAveragePair(value,pvp)))continue;
  seen.add(key);item.planBonuses.push(entry);
  if(key==='attackPair'||key==='essenceAttackPair'){
   item.planAttackPvm=value;item.planAttackPvp=pvp;
  }else if(key==='averageDamagePair'){
   item.averageDamagePct=value;item.averageTechniqueDamagePct=pvp;
  }else{
   const stat=key.replace(/^fixed_/,'');
   const aliases={
    hp:['hp','maxHp','health'],maxKi:['kiPoints','maxKi','maxMp','mana','ki'],
    stunResistance:['stunResistance','faintResistance'],critChance:['critChance','criticalChance'],
    critDamage:['critDamage','criticalDamage'],techniqueCritChance:['techniqueCritChance','techCritChance'],
    techniqueCritDamage:['techniqueCritDamage','techCritDamage'],armorPenetration:['armorPenetration','enemyArmorReduction'],
    moveSpeedPct:['moveSpeedPct','moveSpeed'],attackSpeedPct:['attackSpeedPct','attackSpeed'],
    battleGoldBonusPct:['goldBonusPct','battleGoldBonusPct'],
    attackValuePct:['attackValuePct','attackBonusPct','attackPct','attackPowerPct','physicalAttackPct','bonusAttackPct']
   }[stat]||[stat];
   item[aliases[0]]=(dbiStatNumber(item,aliases)||0)+value;
  }
 }
 return item;
};
// Bonusy Znaku Mistrza są pobierane bezpośrednio z aktualnego slotu Symbol.
window.DBIMasterSignBonus=dbiMainBonus;
// Bonusy bojowe Znaków: tylko aktywny Symbol z głównego zestawu ekwipunku.
window.DBIEquippedSignCombatBonus=(key)=>{
 const sign=itemById(equipped['Główny']?.symbol);
 if(!sign||!['znak-walki','znak-bossa'].includes(sign.id))return 0;
 const allowed=sign.id==='znak-walki'
  ? ['dropChancePct','battleGoldBonusPct']
  : ['bossDamageReductionPct','bossDamageBonusPct','doubleBossRewardsChance'];
 return allowed.includes(key)?Math.max(0,Number(sign[key])||0):0;
};

// Animowane efekty wizualne dla przedmiotów +8 (srebro) i +9 (złoto).
// Wspólny renderer obsługuje inwentarz, wyposażenie, GM oraz okno ulepszania.
const dbiItemArt=item=>{
 const art=item?.image&&/^assets\/items\/[a-z0-9-]+\.(?:png|gif)$/.test(item.image)
  ?`<img class="dbi-item-image${item.id==='starter-black-boots'?' dbi-white-boots-art':item.id==='starter-blue-kimono'?' dbi-white-kimono-art':''}" src="${item.image}" alt="" draggable="false">`:esc(item?.icon||'');
 const lvl=Number(item?.enhancement||0);
 if(lvl!==8&&lvl!==9)return art;
 return `<span class="dbi-enhance-glow dbi-enhance-${lvl}">${art}<i class="dbi-enhance-stars" aria-hidden="true"></i></span>`;
};
// Korekta skali wyłącznie w kratkach ekwipunku — bez zmian grafiki i innych przedmiotów.
if(!document.getElementById('dbi-white-set-inventory-size')){
 const style=document.createElement('style');style.id='dbi-white-set-inventory-size';
 style.textContent=`
 .inv-cell.has-item:has(.dbi-white-boots-art),.inv-cell.has-item:has(.dbi-white-kimono-art){overflow:hidden}
 .inv-cell.has-item .dbi-white-boots-art{transform:none!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;object-position:center}
 .inv-cell.has-item.inv-tall .dbi-white-kimono-art{transform:scale(1.28);transform-origin:center center;object-fit:contain}
 `;
 document.head.appendChild(style);
}
if(!document.getElementById('dbi-enhance-effects-style')){
 const style=document.createElement('style');style.id='dbi-enhance-effects-style';
 style.textContent=`
 .dbi-enhance-glow{--dbi-shine:#dfe9f5;--dbi-light:rgba(223,233,245,.9);display:flex;align-items:center;justify-content:center;position:relative;width:100%;height:100%;min-width:0;min-height:0;isolation:isolate;overflow:hidden;pointer-events:none}
 /* Efekt musi pokrywać cały obszar przydzielony przedmiotowi w siatce,
    niezależnie od rozmiaru samego obrazka PNG. Dotyczy 1x1 i 1x2. */
 .inv-cell.has-item:has(.dbi-enhance-glow){position:relative;overflow:hidden;isolation:isolate}
 .inv-cell.has-item:has(.dbi-enhance-glow)>span:first-child{
   position:absolute!important;inset:0!important;display:block!important;
   width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;
   max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;
   box-sizing:border-box!important;overflow:hidden!important;
 }
 /* Ten sam układ pełnego kafelka co przedmioty +8/+9,
    również dla zwykłych ikon 1x1. Bez efektu błysku. */
 .inv-cell.has-item:not(.inv-tall)>span.dbi-inventory-full-art{
   position:absolute!important;inset:0!important;display:flex!important;
   align-items:center!important;justify-content:center!important;
   width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;
   max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;
   box-sizing:border-box!important;overflow:hidden!important;
 }
 .inv-cell.has-item:not(.inv-tall)>span.dbi-inventory-full-art>.dbi-item-image{
   width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;
   object-fit:contain!important;object-position:center;
 }
 .inv-cell.has-item .dbi-enhance-glow{
   position:absolute!important;inset:0!important;display:flex!important;
   width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;
   max-width:none!important;max-height:none!important;box-sizing:border-box!important;
   align-items:center;justify-content:center;overflow:hidden;
 }
 .inv-cell.has-item .dbi-enhance-glow>.dbi-item-image{
   width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;
 }
 .dbi-enhance-9{--dbi-shine:#ffe08a;--dbi-light:rgba(255,200,49,.95)}
 .dbi-enhance-glow>.dbi-item-image{position:relative;z-index:1;max-width:100%;max-height:100%;object-fit:contain}
 .dbi-enhance-glow:before{content:"";position:absolute;z-index:2;left:-70%;top:0;width:65%;height:100%;background:linear-gradient(90deg,transparent 0%,var(--dbi-light) 40%,rgba(255,255,255,.85) 50%,var(--dbi-light) 60%,transparent 100%);transform:skewX(-17deg);animation:dbi-enhance-sweep 3.4s ease-in-out infinite;mix-blend-mode:screen;pointer-events:none}
 .dbi-enhance-glow:after,.dbi-enhance-stars:before,.dbi-enhance-stars:after{content:"✦";position:absolute;z-index:3;color:var(--dbi-shine);font-size:clamp(8px,1.1vw,16px);line-height:1;text-shadow:0 0 5px var(--dbi-shine),0 0 12px var(--dbi-shine);animation:dbi-enhance-twinkle 2.1s ease-in-out infinite alternate}
 .dbi-enhance-glow:after{left:10%;top:15%}
 .dbi-enhance-stars{position:absolute;inset:0;z-index:3;pointer-events:none}
 .dbi-enhance-stars:before{right:9%;top:30%;animation-delay:-.8s}
 .dbi-enhance-stars:after{left:28%;bottom:7%;animation-delay:-1.4s}
 @keyframes dbi-enhance-sweep{0%,25%{left:-70%;opacity:0}40%{opacity:.85}65%,100%{left:110%;opacity:0}}
 @keyframes dbi-enhance-twinkle{0%{opacity:.2;transform:scale(.55) rotate(-25deg)}100%{opacity:1;transform:scale(1.25) rotate(25deg)}}
 @media(prefers-reduced-motion:reduce){.dbi-enhance-glow:before,.dbi-enhance-glow:after,.dbi-enhance-stars:before,.dbi-enhance-stars:after{animation:none}.dbi-enhance-glow:before{display:none}}
 `;document.head.appendChild(style);
}

const slotOptions=DBI_SLOTS.map(s=>`<option value="${s[1]}">${s[0]}</option>`).join('');
const sums=items=>({attack:items.reduce((a,x)=>a+(Number(x.attack)||0),0),attackMin:items.reduce((a,x)=>a+(Number(x.attackMin)||0),0),attackMax:items.reduce((a,x)=>a+(Number(x.attackMax)||0),0),attackSpeedPct:items.reduce((a,x)=>a+(Number(x.attackSpeedPct)||0),0),moveSpeedPct:items.reduce((a,x)=>a+(Number(x.moveSpeedPct)||0),0),defense:items.reduce((a,x)=>a+(Number(x.defense)||0),0),hp:items.reduce((a,x)=>a+(Number(x.hp)||0),0),ki:items.reduce((a,x)=>a+(Number(x.ki)||0),0)});
// Każda zakładka ma 6 kolumn × 10 rzędów = 60 fizycznych kratek.
// Duże przedmioty rezerwują dwie kratki w tej samej kolumnie.
const TWO_CELL_TYPES=new Set(['bron','zbroja','stroj']);
function itemTall(id){return TWO_CELL_TYPES.has(itemById(id)?.slot)}
function fits(cell,tall,used){return cell>=0&&cell<60&&(!tall||Math.floor(cell/6)<9)&&!used.has(cell)&&(!tall||!used.has(cell+6))}
function inventoryPages(){
 const pages=[],used=[];
 // Stosy sa tylko sposobem wyswietlania: zapis i operacje na pojedynczej sztuce pozostaja bez zmian.
 const firstIndex=new Map(),stackCounts=new Map();
 inventory.forEach((ref,index)=>{
  if(!firstIndex.has(ref))firstIndex.set(ref,index);
  stackCounts.set(ref,(stackCounts.get(ref)||0)+1);
 });
 const reserve=(page,cell,tall)=>{used[page]??=new Set();used[page].add(cell);if(tall)used[page].add(cell+6)};
 // Najpierw zachowujemy pozycje przesuniętych ręcznie przedmiotów.
 inventory.forEach((id,index)=>{if(firstIndex.get(id)!==index)return;const pos=inventoryPlacement[index];if(!pos)return;const tall=itemTall(id);used[pos.page]??=new Set();if(fits(pos.cell,tall,used[pos.page]))reserve(pos.page,pos.cell,tall);else inventoryPlacement[index]=null});
 inventory.forEach((id,index)=>{
  if(firstIndex.get(id)!==index)return;
  const item=itemById(id),tall=itemTall(id);let pos=inventoryPlacement[index];
  if(!pos){let found=false;for(let page=0;!found;page++){used[page]??=new Set();for(let cell=0;cell<60;cell++)if(fits(cell,tall,used[page])){pos={page,cell};inventoryPlacement[index]=pos;reserve(page,cell,tall);found=true;break}}}
  pages[pos.page]??=[];pages[pos.page].push({index,id,item,cell:pos.cell,tall,count:stackCounts.get(id)||1});
 });dbiSaveInventoryPositions();return pages;
}
function renderInventoryGrid(){
 const entries=inventoryPages()[inventoryTab]||[];
 const cells=Array.from({length:60},(_,i)=>`<span class="inv-cell inv-empty" data-cell="${i}" style="grid-column:${i%6+1};grid-row:${Math.floor(i/6)+1}" aria-label="Puste miejsce"></span>`);
 for(const {index,item,cell,tall,count} of entries){
  const quality=QUALITY.includes(item?.quality)?item.quality:'Pospolity';
  cells[cell]=`<button type="button" draggable="true" class="inv-cell has-item ${item?.id==='senzu-bean-bag'?'dbi-senzu-inventory-cell':''} ${tall?'inv-tall':''} quality-${QUALITY.indexOf(quality)}" data-index="${index}" style="grid-column:${cell%6+1};grid-row:${Math.floor(cell/6)+1} / span ${tall?2:1}" aria-label="${esc(item?.name||'Nieznany przedmiot')}"><span class="${tall?'':'dbi-inventory-full-art'}">${dbiItemArt(item)}</span>${count>1?`<b class="dbi-stack-count">×${count}</b>`:""}</button>`;
  if(tall)cells[cell+6]='';
 }
 return cells.join('');
}
function moveItem(index,page,cell){
 const id=inventory[index];if(id===undefined)return false;
 const tall=itemTall(id),pages=inventoryPages();
 const occupied=new Set();for(const entry of pages[page]||[])if(entry.index!==index){occupied.add(entry.cell);if(entry.tall)occupied.add(entry.cell+6)}
 if(!fits(cell,tall,occupied))return false;
 inventoryPlacement[index]={page,cell};dbiSaveInventoryPositions();return true;
}
const DBI_USABLE_SLOTS=new Set(['uzytkowy','użytkowy']);
// Skrzynia bossa jest przedmiotem otwieranym niezależnie od zapisanego slotu.

function dbiIsUsableItem(item){return !!item&&!DBI_TOURNAMENT_CHESTS.some(chest=>chest.id===item.id)&&(item.id==='quest-starter-gift'||item.id==='skrzynia-lesnego-wojownika'||DBI_USABLE_SLOTS.has(item.slot))}
const DBI_STARTER_GIFT_CONTENTS=['starter-blue-kimono','starter-red-staff','starter-white-belt','starter-black-boots','senzu-bean-bag','senzu-bean-bag'];
const DBI_ZEN_KEY='dboidle_zen_effects_v1_'+String(dbiActive?.id||'test');
let dbiZenEffects={};
try{const saved=JSON.parse(localStorage.getItem(DBI_ZEN_KEY)||'{}');if(saved&&typeof saved==='object')dbiZenEffects=saved}catch{}
function dbiSaveZenEffects(){try{localStorage.setItem(DBI_ZEN_KEY,JSON.stringify(dbiZenEffects))}catch{}}
function dbiZenActive(type){return Number(dbiZenEffects[type]||0)>Date.now()}
window.DBIZen={active:dbiZenActive,expiry:type=>Number(dbiZenEffects[type]||0),consumeInBattle:type=>window.DBIWorld?.useZen?.(type,dbiActive?.id)};

function dbiOpenUsableItem(index){
 const item=itemById(inventory[index]);
 if(!dbiIsUsableItem(item))return false;
 if(item.id==='skrzynia-lesnego-wojownika'){
  if(!itemById('george')){renderEquipment('Nie znaleziono przedmiotu George w katalogu.');return false}
  // Zamiana jednej skrzyni na jednego George'a w tym samym miejscu ekwipunku.
  // Zachowuje pozycję i nie wymaga wolnego dodatkowego slotu.
  inventory[index]='george';
  dbiSaveInventory();hideItemPopups();
  renderEquipment('Otwarto Skrzynię Leśnego Wojownika: zdobyto George ×1.');
  return true;
 }
 if(item.id.startsWith('zen-bean-')){
  const kind=item.id.slice('zen-bean-'.length);
  let message='';
  if(kind==='red'||kind==='blue'){
   const result=window.DBIZen?.consumeInBattle?.(kind);
   if(result!==true){renderEquipment('Fasolkę odnawiającą HP lub KI można użyć podczas trwającej walki.');return false}
   message=kind==='red'?'Odzyskano 10% maksymalnego HP.':'Odnowiono całe brakujące KI.';
  }else if(kind==='green'||kind==='purple'){
   const duration=kind==='green'?10*60*1000:60*60*1000;
   dbiZenEffects[kind]=Date.now()+duration;
   dbiSaveZenEffects();
   message=kind==='green'?'Szybkość ataku +100% przez 10 minut.':'Szybkość ruchu +50% przez 1 godzinę.';
  }else return false;
  inventory.splice(index,1);inventoryPlacement.splice(index,1);
  dbiSaveInventory();hideItemPopups();renderEquipment(message);return true;
 }
 if(item.id==='senzu-bean-bag'){
  if(DBI_SENZU_BAG_ITEMS.some(([id])=>!itemById(id)))return renderEquipment('Nie znaleziono wszystkich fasolek w katalogu.'),false;
  const currentDistinct=new Set(inventory.map(ref=>dbiDecodeItemRef(ref).id));
  const newStacks=DBI_SENZU_BAG_ITEMS.filter(([id])=>!currentDistinct.has(id)).length;
  // Otwarcie zwalnia miejsce zajmowane przez ostatnią torebkę.
  if(currentDistinct.size+newStacks>400){renderEquipment('Brak miejsca w ekwipunku na fasolki.');return false}
  inventory.splice(index,1);inventoryPlacement.splice(index,1);
  for(const [id,count] of DBI_SENZU_BAG_ITEMS)for(let i=0;i<count;i++){inventory.push(id);inventoryPlacement.push(null)}
  dbiSaveInventory();hideItemPopups();renderEquipment('Otwarto Torebkę Fasolek Senzu: +600 czerwonych, +100 niebieskich, +50 fioletowych i +50 zielonych Fasolek Zen.');return true;
 }
 if(item.id!=='quest-starter-gift')return renderEquipment('Ten przedmiot nie ma jeszcze określonej zawartości.'),false;
 if(!DBI_STARTER_GIFT_CONTENTS.every(id=>!!itemById(id)))return renderEquipment('Nie znaleziono wszystkich przedmiotów upominku w katalogu.'),false;
 // Zmieniamy inwentarz jedną operacją: zużywamy tylko jedną sztukę stosu.
 inventory.splice(index,1);
 inventoryPlacement.splice(index,1);
 for(const id of DBI_STARTER_GIFT_CONTENTS){inventory.push(id);inventoryPlacement.push(null)}
 dbiSaveInventory();
 hideItemPopups();
 renderEquipment('Otwarto Upominek Startowy: Białe Kimono +0, Magiczny Czerwony Kij +0, Biały Pas +0, Białe Skórzane Buty +0 oraz 2 Torebki Fasolek Senzu.');
 return true;
}
function tooltipMarkup(item){
 const q=QUALITY.includes(item.quality)?item.quality:'Pospolity';
 const qi=QUALITY.indexOf(q);
 const stats=[];
 if(Number(item.attackMin)||Number(item.attackMax))stats.push('Wartość ataku '+Number(item.attackMin||0)+'–'+Number(item.attackMax||0)+' (PvM–PvP)');
 else if(Number(item.attack))stats.push('Atak +'+Number(item.attack));
 if(Number(item.techniqueAttackMin)||Number(item.techniqueAttackMax))stats.push('Wartość ataku technik '+Number(item.techniqueAttackMin||0)+'–'+Number(item.techniqueAttackMax||0));
 const baseStats=item.beforePlanBonuses||item;
 if(Number(baseStats.defense))stats.push('Obrona +'+Number(baseStats.defense));
 if(Number(baseStats.ki))stats.push('KI +'+Number(baseStats.ki));
 if(Number(baseStats.hp))stats.push('Maksymalne HP +'+Number(baseStats.hp));
 if(Number(baseStats.attackSpeedPct))stats.push('Szybkość ataku +'+Number(baseStats.attackSpeedPct)+'%');
 if(Number(baseStats.moveSpeedPct))stats.push('Szybkość ruchu +'+Number(baseStats.moveSpeedPct)+'%');
 if(Number(baseStats.trainingBaseBonusPercent))stats.push('+'+Number(baseStats.trainingBaseBonusPercent)+'% do bazowej wartości treningu');
 if(Number(baseStats.monsterDamageReductionPct))stats.push('−'+Number(baseStats.monsterDamageReductionPct)+'% otrzymywanych obrażeń w walce z potworami');
 const displayedBonuses=(item.planBonuses||[]).flatMap(entry=>{
  const [key,value,technique]=entry;
  return key==='averageDamagePair'
   ?[[DBI_AVERAGE_DAMAGE_KEYS[0],value,0],[DBI_AVERAGE_DAMAGE_KEYS[1],technique,0]]
   :[entry];
 });
 const planLines=displayedBonuses.map(entry=>{
  const [key,value,pvp]=entry;
  const maximum=value===DBI_PLAN_STAT_DEFS[key][2]&&(key!=='attackPair'&&key!=='essenceAttackPair'||pvp===dbiPlanPvpValue(key,value));
  return {text:dbiPlanLabel(entry),maximum,negativeAverage:DBI_AVERAGE_DAMAGE_KEYS.includes(key)&&value<0};
 });
 if(item.reinforced)planLines.unshift({text:'+5 do wszystkich statystyk · Plany wzmocnień',maximum:false});
 const statLines=(item.signBonuses?item.signBonuses.map(bonus=>bonus.label):stats).map(text=>`<div>${esc(text)}</div>`);
 for(const {text,maximum,negativeAverage} of planLines){
  statLines.push(`<div style="color:${negativeAverage?'#ff626c':maximum?'#598cff':'#a7ddff'} !important">${esc(text)}</div>`);
 }
 const isMaterial=item.slot==='materiał'||item.slot==='quest';
 const displayName=item.name+(dbiIsUsableItem(item)||isMaterial?'':' +'+Number(item.enhancement||0));
 const levelLocked=!dbiIsUsableItem(item)&&!isMaterial&&level<(Number(item.requiredLevel)||1);
 if(dbiIsUsableItem(item)||isMaterial){
  return `<div class="tip-name quality-text-${qi}">${esc(displayName)}</div>
  <div class="tip-icon">${dbiItemArt(item)}</div>
  <div class="tip-description">${esc(item.description||'Przedmiot użytkowy.')}</div>
  <div class="tip-bottom"><span>${esc(item.id==='pierscien-ojca'?'Przedmiot misji':item.slot)}</span><strong class="quality-text-${qi}">${esc(q).toUpperCase()}</strong></div>`;
 }
 return `<div class="tip-name quality-text-${qi}">${esc(displayName)}</div>
 <div class="tip-icon">${dbiItemArt(item)}</div>
 <div class="tip-level">${levelLocked?'Od Poziomu: ':'Poziom: '}${Number(item.requiredLevel)||1}</div>
 ${item.requiredRace==='saiyan'?'<div class="tip-level">Rasa: Saiyan</div>':''}
 <div class="tip-stats">${statLines.join('')||'Brak statystyk podstawowych'}</div>
 <div class="tip-bottom"><span>${esc(item.slot)}</span><strong class="quality-text-${qi}">${esc(q).toUpperCase()}</strong></div>`;
}
function showTooltip(event,index){
 showTooltipItem(event,itemById(inventory[index]));
}
function showTooltipItem(event,item){
 if(!item||dragActive)return;
 let tip=document.querySelector('#itemTooltip');if(!tip){tip=document.createElement('div');tip.id='itemTooltip';tip.className='item-tooltip';document.body.append(tip)}
 // Czerwony dymek dla wyposażenia, którego poziom postaci nie pozwala założyć.
 const locked=item.slot!=='materiał'&&!dbiIsUsableItem(item)&&level<(Number(item.requiredLevel)||1);
 tip.classList.toggle('dbi-level-locked',locked);
 if(!document.querySelector('#dbi-locked-tooltip-style')){
  const style=document.createElement('style');style.id='dbi-locked-tooltip-style';
  style.textContent='#itemTooltip.dbi-level-locked{border-color:#a52b2b!important;box-shadow:0 0 0 1px #5f1515,0 8px 22px rgba(0,0,0,.7)!important;color:#ed4949!important}#itemTooltip.dbi-level-locked .tip-name,#itemTooltip.dbi-level-locked .tip-level,#itemTooltip.dbi-level-locked .tip-stats,#itemTooltip.dbi-level-locked .tip-stats div,#itemTooltip.dbi-level-locked .tip-bottom,#itemTooltip.dbi-level-locked .tip-bottom *{color:#ed4949!important}#itemTooltip.dbi-level-locked .tip-name *,#itemTooltip.dbi-level-locked .tip-stats *,#itemTooltip.dbi-level-locked .tip-level *{color:#ed4949!important}#itemTooltip.dbi-level-locked .tip-stats,#itemTooltip.dbi-level-locked .tip-bottom{border-color:#8d2929!important}#itemTooltip.dbi-level-locked hr{border-color:#8d2929!important;background-color:#8d2929!important}';
  document.head.appendChild(style);
 }
 tip.innerHTML=tooltipMarkup(item);tip.hidden=false;positionPopup(tip,event.clientX,event.clientY);
}
function positionPopup(el,x,y){const w=el.offsetWidth||240,h=el.offsetHeight||110;el.style.left=Math.max(8,Math.min(x+14,innerWidth-w-8))+'px';el.style.top=Math.max(8,Math.min(y+14,innerHeight-h-8))+'px'}
function hideItemPopups(){document.querySelector('#itemTooltip')?.setAttribute('hidden','');document.querySelector('#itemActions')?.remove()}
function itemActions(event,index){
 event.preventDefault();hideItemPopups();
 const item=itemById(inventory[index]);if(!item)return;
 const menu=document.createElement('div');menu.id='itemActions';menu.className='item-actions';
 menu.innerHTML=`<div>${esc(item.name)}</div>${dbiIsUsableItem(item)?'<button type="button" data-action="open">'+(item.id==='senzu-bean-bag'?'Użyj':'Otwórz')+'</button>':''}<button type="button" data-action="destroy">Zniszcz</button>`;
 document.body.append(menu);positionPopup(menu,event.clientX,event.clientY);
 menu.querySelector('[data-action="open"]')?.addEventListener('click',()=>dbiOpenUsableItem(index));
 menu.querySelector('[data-action="destroy"]').onclick=()=>{
  inventory.splice(index,1);inventoryPlacement.splice(index,1);
  dbiSaveInventory();hideItemPopups();if(document.querySelector('.dbi-upgrade'))renderUpgradePanel();else renderEquipment('Zniszczono: '+item.name);
 };
}



// Trening zapisany osobno dla postaci; nagroda zamrażana przy rozpoczęciu.
const DBI_TRAINING_TYPES={
 body:{title:'Ciało',attributes:['Siła','Szybkość','Wytrzymałość']},
 soul:{title:'Dusza',attributes:['Inteligencja','KI']}
};
const DBI_TRAINING_KEY='dboidle_training_v1_'+String(dbiActive?.id||'test');
function dbiTrainingRead(){
 try{const v=JSON.parse(localStorage.getItem(DBI_TRAINING_KEY)||'{}');return v&&typeof v==='object'?v:{}}catch{return {}}
}
function dbiTrainingWrite(data){try{localStorage.setItem(DBI_TRAINING_KEY,JSON.stringify(data))}catch{}}
const DBI_TRAINING_ATTR_KEYS={'Siła':'strength','Szybkość':'speed','Wytrzymałość':'endurance','Inteligencja':'intelligence','KI':'ki'};
function dbiTrainingReward(attribute,hours,characterLevel){
 let value=Math.max(1,Number(characterLevel)||1)+(DBI_TRAINING_TYPES.body.attributes.includes(attribute)?2:0);
 const skills=dbiSkillBonuses();
 value*=1+(skills.trainingBase+dbiSmithCheckpointBonus('trainingBase'))/100;
 for(let i=1;i<Number(hours);i++)value=Math.ceil(value*1.5);
 const spiritualBonus=Number(window.DBISpiritual?.currentBonuses()?.training||0);
 const gearBonus=dbiMainBonus('trainingBaseBonusPercent');
 return Math.max(1,Math.floor(value*(1+.01*(spiritualBonus+gearBonus+dbiMainBonus('chipTrainingBasePct')))*(1+(skills.trainingResult+dbiSmithCheckpointBonus('trainingResult')+dbiMainBonus('trainingResultPct'))/100)));
}
function dbiTrainingGrant(session){
 const character=dbiCharacters[dbiCharacterIndex];
 const key=DBI_TRAINING_ATTR_KEYS[session.attribute];
 if(!character||!key)return false;
 const reward=Number(session.reward)||dbiTrainingReward(session.attribute,session.hours,session.levelAtStart||level);
 const current=Number(character.stats?.[key]??character[key]??0);
 if(!character.stats||typeof character.stats!=='object')character.stats={};
 character.stats[key]=current+reward;
 const storageKey='dboidle_characters_v1_'+dbiSession.name.toLowerCase();
 let saved=[];try{saved=JSON.parse(localStorage.getItem(storageKey)||'[]')}catch{}
 if(!Array.isArray(saved))return false;
 const i=saved.findIndex(c=>c.id===dbiActive.id);
 if(i<0)return false;
 saved[i]={...saved[i],stats:{...(saved[i].stats||{}),[key]:current+reward}};
 localStorage.setItem(storageKey,JSON.stringify(saved));
 return true;
}
let dbiTrainingTicker=null;
function dbiTrainingTime(ms){
 const sec=Math.max(0,Math.ceil(ms/1000)),h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;
 return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function dbiTrainingConfirm(onConfirm){
 document.querySelector('#dbi-training-confirm')?.remove();
 const overlay=document.createElement('div');
 overlay.id='dbi-training-confirm';
 overlay.className='dbi-training-confirm-backdrop';
 overlay.innerHTML=`<div class="dbi-training-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="dbi-training-confirm-title">
 <h3 id="dbi-training-confirm-title">Przerwać trening?</h3>
 <p>Jeżeli przerwiesz trening nie uzyskasz żadnych statystyk, a cały poświęcony czas na trening zostanie stracony</p>
 <div class="dbi-training-confirm-actions"><button type="button" data-action="cancel">Anuluj</button><button type="button" data-action="confirm">Potwierdź</button></div>
 </div>`;
 document.body.appendChild(overlay);
 const close=()=>{document.removeEventListener('keydown',escape);overlay.remove()};
 const escape=e=>{if(e.key==='Escape')close()};
 document.addEventListener('keydown',escape);
 overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
 overlay.querySelector('[data-action="cancel"]').onclick=close;
 overlay.querySelector('[data-action="confirm"]').onclick=()=>{close();onConfirm()};
 overlay.querySelector('[data-action="cancel"]').focus();
}
const dbiMobBattleBlocksTraining=()=>window.DBIWorld?.isMobBattleRunning?.(dbiActive?.id)===true;
function renderTraining(){
 if(dbiTrainingTicker!==null){clearInterval(dbiTrainingTicker);dbiTrainingTicker=null}
 hideItemPopups();
 document.querySelector('#breadcrumb').textContent='AKTYWNOŚCI / TRENING';
 const stored=dbiTrainingRead();
 const types=Object.values(DBI_TRAINING_TYPES);
 const firstSession=Object.values(stored).find(s=>s?.endsAt>Date.now())||Object.values(stored).find(s=>s?.attribute);
 let attributeChoice=firstSession?.attribute||types[0].attributes[0];
 let hoursChoice=firstSession?.hours||1;
 const group=()=>DBI_TRAINING_TYPES.body.attributes.includes(attributeChoice)?'body':'soul';
 const attributeNotes=['Rozwijaj siłę fizyczną wojownika.','Trenuj szybkość swojej postaci.','Zwiększaj wytrzymałość wojownika.','Rozwijaj inteligencję swojej postaci.','Trenuj energię KI.'];
 const attrs=types.flatMap(type=>type.attributes);
 const host=document.querySelector('#pageBody');
 host.innerHTML=`<link rel="stylesheet" href="css/trening-dojo.css?v=dojo4"><div class="dbi-training dojo-screen">
 <div class="dojo-art"><header><h2>Trening</h2><p>Rozwijaj atrybuty swojego wojownika i jego potencjał KI.</p></header></div>
 <section class="dojo-planner"><h2>Zaplanuj trening</h2><p class="dojo-instruction">Wybierz atrybut, czas trwania i rozpocznij trening.</p>
 <div class="dojo-attributes">${attrs.map((attr,i)=>`<button type="button" data-attr="${attr}" aria-pressed="false"><img src="assets/ui/attr-${i}.webp" alt=""><span><b>${attr}</b><small>${attributeNotes[i]}</small></span><i aria-hidden="true"></i></button>`).join('')}</div>
 <h3>Czas trwania treningu</h3><div class="dojo-hours">${[1,2,3,4,5,6].map(n=>`<button type="button" data-hours="${n}">${n} h</button>`).join('')}</div>
 <div class="dojo-result"><span>Oczekiwany bonus</span><strong></strong></div>
 <button class="dbi-training-action" type="button">Rozpocznij trening</button></section>
 <div class="dojo-footer"><strong></strong><b class="dojo-session-attr"></b><span class="dojo-status-message"></span><time></time><progress max="1" value="0" aria-label="Postęp treningu"></progress><small></small></div></div>`;
 const col=host.querySelector('.dojo-planner');
 const footer=host.querySelector('.dojo-footer');
 const update=()=>{
  const data=dbiTrainingRead(),session=data[group()],now=Date.now();
  const running=session&&session.endsAt>now;
  const active=Object.values(data).find(s=>s?.endsAt>now);
  const blocked=!session&&(!!active||dbiMobBattleBlocksTraining()||window.DBISpiritual.isActive());
  if(session){attributeChoice=session.attribute;hoursChoice=session.hours}
  col.querySelectorAll('[data-attr]').forEach(btn=>{
   const attr=btn.dataset.attr,key=DBI_TRAINING_TYPES.body.attributes.includes(attr)?'body':'soul';
   btn.disabled=!!data[key]&&attr!==data[key].attribute;
   btn.setAttribute('aria-pressed',String(attr===attributeChoice));
  });
  col.querySelectorAll('[data-hours]').forEach(btn=>{
   btn.disabled=!!session;btn.setAttribute('aria-pressed',String(+btn.dataset.hours===+hoursChoice));
  });
  col.querySelector('.dojo-result strong').textContent=attributeChoice+' +'+(session?.reward??dbiTrainingReward(attributeChoice,hoursChoice,level));
  const btn=col.querySelector('.dbi-training-action');
  btn.textContent=running?'Przerwij trening':session?'Odbierz wynik':'Rozpocznij trening';
  btn.disabled=!!blocked;
  const shown=active||session;
  footer.querySelector('strong').textContent=shown?(shown.endsAt>now?'Trening w toku':'Trening zakończony'):'Status treningu';
  footer.querySelector('.dojo-session-attr').textContent=shown?.attribute||'';
  footer.querySelector('time').textContent=shown?dbiTrainingTime(Math.max(0,shown.endsAt-now)):'';
  footer.querySelector('small').textContent=shown?'('+shown.hours+' h)':'';
  footer.querySelector('.dojo-status-message').textContent=shown?'Pozostały czas:':dbiMobBattleBlocksTraining()?'Najpierw zakończ walkę z potworami.':window.DBISpiritual.isActive()?'Trwa rozwój duchowy.':'Wybierz atrybut i czas treningu.';
  const progress=footer.querySelector('progress');
  progress.hidden=!shown;
  if(shown)progress.value=Math.max(0,Math.min(1,1-(shown.endsAt-now)/(shown.hours*3600000)));
 };
 col.querySelectorAll('[data-attr]').forEach(btn=>btn.onclick=()=>{attributeChoice=btn.dataset.attr;update()});
 col.querySelectorAll('[data-hours]').forEach(btn=>btn.onclick=()=>{hoursChoice=+btn.dataset.hours;update()});
  col.querySelector('.dbi-training-action').onclick=()=>{
   const key=group(), data=dbiTrainingRead(),session=data[key];
   if(session){
    if(session.endsAt>Date.now()){
     dbiTrainingConfirm(()=>{
      const fresh=dbiTrainingRead();
      if(!fresh[key])return renderTraining();
      // Jeśli czas dobiegł końca podczas potwierdzania, nie usuwamy nagrody.
      if(fresh[key].endsAt<=Date.now())return renderTraining();
      delete fresh[key];dbiTrainingWrite(fresh);renderTraining();
     });
     return;
    }
    if(!dbiTrainingGrant(session))return;
    delete data[key];
   }else{
    // Jeden aktywny trening na postać, niezależnie od zakładki.
    if(dbiMobBattleBlocksTraining()||window.DBISpiritual.isActive()||Object.values(data).some(active=>active?.endsAt>Date.now()))return renderTraining();
    const attribute=attributeChoice;
    const hours=hoursChoice;
    const now=Date.now();
    data[key]={attribute,hours,levelAtStart:level,reward:dbiTrainingReward(attribute,hours,level),startedAt:now,endsAt:now+hours*3600000};
   }
   dbiTrainingWrite(data);renderTraining();
  };

 update();
 dbiTrainingTicker=setInterval(()=>{
  if(!document.querySelector('.dbi-training')){clearInterval(dbiTrainingTicker);dbiTrainingTicker=null;return}
  update();
 },1000);
}
// Panel statystyk: tylko rzeczywiście dostępne dodatnie bonusy.
// Wartości bazowe są odczytywane z postaci; nie wymyślamy wzorów na ich obliczanie.
const DBI_STAT_GROUPS=[
 ['Podstawowe',[
  ['Siła',['strength','sila']],['Szybkość',['speed','szybkosc']],['Wytrzymałość',['endurance','wytrzymalosc']],
  ['Inteligencja',['intelligence','inteligencja']],['KI',['ki']],['Moc',['power','moc']]
 ]],
 ['Aktywne',[
  ['Wartość ataku',['attackMin','attackMax','attack','physicalAttack','physicalAttackPower','attackPower']],
  ['Wartość ataku technik',['techniqueAttackMin','techniqueAttackMax','techniqueAttack','techniquePower']],
  ['Szybkość ataku',['attackSpeedPct','attackSpeed'],'%'],
  ['Szybkość ruchu',['moveSpeedPct','moveSpeed'],'%'],
  ['Obrona',['defense']],['Punkty życia',['hp','maxHp','health']],
  ['Punkty KI',['kiPoints','maxKi','maxMp']],
  ['Szansa na trafienie krytyczne',['critChance','criticalChance'],'%'],
  ['Obrażenia trafienia krytycznego',['critDamage','criticalDamage'],'%'],
  ['Szansa na krytyczne obrażenia techniki',['techniqueCritChance','techCritChance'],'%'],
  ['Obrażenia krytycznego trafienia technik',['techniqueCritDamage','techCritDamage'],'%'],
  ['Redukcja pancerza wroga',['armorPenetration','enemyArmorReduction'],'%'],
  ['Szansa na wywołanie krwawienia',['bleedChance'],'%'],
  ['Szansa na ogłuszenie',['stunChance'],'%'],
  ['Średnie obrażenia ataku',['averageAttackDamage','averageDamage']],
  ['Średnie obrażenia technik',['averageTechniqueDamage']],
  ['Redukcja obrażeń krytycznych',['criticalDamageReduction'],'%'],
  ['Odporność na omdlenia',['stunResistance','faintResistance'],'%']
 ]],
 ['Pasywne',[
  ['% do zdobywanego doświadczenia',['expBonusPct','experienceBonusPct'],'%'],
  ['% na podwójny drop z mobów',['doubleMobDropChance'],'%'],
  ['% na podwójne nagrody bossów',['doubleBossRewardsChance'],'%'],
  ['% do zyskiwanego złota z walk',['goldBonusPct','battleGoldBonusPct'],'%'],
  ['Redukcja obrażeń od potworów',['monsterDamageReductionPct'],'%'],
  ['Bonus do bazowej wartości treningu',['trainingBaseBonusPercent'],'%'],
  ['Bonus do szansy ulepszenia przedmiotu',['upgradeChancePct'],'%'],
  ['Bonus do szansy na punkt Rozwoju Duchowego',['spiritualPointChancePct'],'%']
 ]]
];
function dbiMainBonus(...keys){
 return dbiCharacterBonus(dbiCharacters[dbiCharacterIndex],Object.values(equipped['Główny']||{}).map(itemById).filter(Boolean),keys);
}
function dbiCharacterBonus(character,worn,keys){
 const sources=[character?.bonuses,character?.activeStats,character?.passiveStats,character?.stats,character];
 const base=sources.map(source=>dbiStatNumber(source,keys)).find(n=>n!==null)??0;
 return base+worn.reduce((sum,item)=>sum+(dbiStatNumber(item,keys)??0),0);
}
function dbiCombatHitBonuses(character,worn,skills){
 const value=(...keys)=>dbiCharacterBonus(character,worn,keys);
 return {
  bleedChance:value('bleedChance'),
  stunChance:value('stunChance'),
  stunResistance:value('stunResistance','faintResistance'),
  criticalDamageReduction:value('criticalDamageReduction'),
  critChance:value('critChance','criticalChance'),
  critDamage:value('critDamage','criticalDamage')+skills.critDamage,
  techniqueCritChance:value('techniqueCritChance','techCritChance')+skills.techCritChance,
  techniqueCritDamage:value('techniqueCritDamage','techCritDamage')+skills.techCritDamage,
  armorPenetration:value('armorPenetration','enemyArmorReduction')
 };
}
function dbiStatNumber(obj,keys){
 if(!obj||typeof obj!=='object')return null;
 for(const key of keys){
  const value=obj[key];
  if(value!==undefined&&value!==null&&value!==''&&Number.isFinite(Number(value)))return Number(value);
 }
 return null;
}
// Wartość ataku: procent wzmacnia wyłącznie bazę z Siły, nigdy ekwipunek.
// Premia Rozwoju Duchowego dotyczy wartości bazowych, bez zmiany zapisanych statystyk.
function dbiSpiritStatPercent(){
 return Math.max(0,Number(window.DBISpiritual?.currentBonuses?.()?.stats)||0);
}
function dbiEquippedAllStats(loadout){
 return Object.values(loadout||{}).reduce((total,ref)=>total+(Number(itemById(ref)?.allStats)||0),0);
}
function dbiSpiritEffectiveStat(value,signStats=0){
 return (Number(value)||0)*(1+dbiSpiritStatPercent()/100)+signStats;
}
function dbiAttackRange(character,worn,signStats,skills=dbiSkillBonuses()){
 const sources=[character?.stats,character?.attributes,character?.baseStats,character];
 const bonusSources=[character?.bonuses,character?.activeStats,character?.passiveStats,character?.stats,character];
 const read=(keys,from)=>{for(const source of from){const n=dbiStatNumber(source,keys);if(n!==null)return n}return 0};
 const strength=dbiSpiritEffectiveStat(read(['strength','sila','siła','str'],sources)*dbiPlanAttributeMultiplier(worn,'strength'),signStats+skills.stats);
 const percentKeys=['attackValuePct','attackBonusPct','attackPct','attackPowerPct','physicalAttackPct','bonusAttackPct'];
 const spiritPercent=(Number(window.DBISpiritual?.currentBonuses?.()?.attack)||0)*0.5;
 const percent=read(percentKeys,bonusSources)+(worn||[]).reduce((sum,item)=>sum+(dbiStatNumber(item,percentKeys)||0),0)+spiritPercent+dbiPlanSum(worn,'pvmAttackPct');
 const base=Math.max(0,Math.ceil(strength*0.5*(1+percent/100)));
 const flatKeys=['attack','physicalAttack','physicalAttackPower','attackPower'];
 const fixed=read(flatKeys,bonusSources);
 const minExtra=read(['attackMin'],bonusSources);
 const maxExtra=read(['attackMax'],bonusSources);
 let gearMin=0,gearMax=0;
 for(const item of worn||[]){
  const min=dbiStatNumber(item,['attackMin']);
  const max=dbiStatNumber(item,['attackMax']);
  const flat=dbiStatNumber(item,flatKeys)||0;
  // Nie sumujemy pola attack z attackMin/Max tego samego przedmiotu.
  const rangeBonus=dbiStatNumber(item,['attackRange'])||0;
  gearMin+=(min??flat)+rangeBonus+(Number(item.planAttackPvm)||0);
  gearMax+=(max??min??flat)+rangeBonus+(Number(item.planAttackPvm)||0);
 }
 return {min:Math.max(0,base+fixed+minExtra+gearMin+skills.attack),max:Math.max(0,base+fixed+maxExtra+gearMax+skills.attack)};
}
function dbiAttributeTotal(character,signStats,worn=[]){
 const aliases=[['strength','sila'],['speed','szybkosc'],['endurance','wytrzymalosc'],['intelligence','inteligencja'],['ki','KI']];
 return Math.round(aliases.reduce((sum,keys)=>{
   for(const src of [character?.stats,character?.attributes,character?.baseStats,character]){
     const val=dbiStatNumber(src,keys);
     if(val!==null)return sum+val*dbiPlanAttributeMultiplier(worn,keys[0]);
   }
   return sum;
 },0)*(1+dbiSpiritStatPercent()/100)+aliases.length*signStats);
}
function renderCharacterStatistics(){
 hideItemPopups();
 document.querySelector('#breadcrumb').textContent='POSTAĆ / STATYSTYKI';
 const character=dbiCharacters[dbiCharacterIndex]||{};
 const worn=Object.values(equipped['Główny']||{}).map(itemById).filter(Boolean);
 const signStats=dbiEquippedAllStats(equipped['Główny']);
 const skills=dbiSkillBonuses();
 const baseSources=[character.stats,character.attributes,character.baseStats,character];
 const bonusSources=[character.bonuses,character.activeStats,character.passiveStats,character.stats,character];
 const getBase=(keys,sources)=>{
  for(const source of sources){const v=dbiStatNumber(source,keys);if(v!==null)return v}
  return 0;
 };
 const itemSum=(keys)=>worn.reduce((total,item)=>total+getBase(keys,[keys.includes('stunResistance')?item.beforePlanBonuses||item:item]),0);
 const format=(number)=>String(Math.trunc(Number(number)||0));
 const renderRow=(label,value,suffix='')=>`<div class="dbi-stat-row"><span>${esc(label)}</span><strong>${esc(value)}${suffix}</strong></div>`;
 const statRows=(group,definitions)=>{
  const rows=[];
  for(const [label,keys,suffix=''] of definitions){
   // Bonus Białego Scoutera: odczyt bezpośrednio z założonego przedmiotu,
   // zamiast z danych postaci. Wyświetlamy redukcję ze znakiem minus.
   if(group==='Pasywne'&&label==='Redukcja obrażeń od potworów'){
    const reduction=window.DBIEquippedMonsterDamageReduction();
    if(reduction>0)rows.push(renderRow('Otrzymywane obrażenia od potworów','−'+format(reduction),'%'));
    continue;
   }
   if(group==='Aktywne'&&(label==='Wartość ataku'||label==='Wartość ataku technik')){
    const isTechnique=label==='Wartość ataku technik';
    const minKey=isTechnique?'techniqueAttackMin':'attackMin';
    const maxKey=isTechnique?'techniqueAttackMax':'attackMax';
    const fixedKeys=isTechnique?['techniqueAttack','techniquePower']:['attack','physicalAttack','physicalAttackPower','attackPower'];
    if(!isTechnique){
     const range=dbiAttackRange(character,worn,signStats);
     rows.push(renderRow(label,format(range.min)+'–'+format(range.max)));
     continue;
    }
    const min=getBase([minKey],bonusSources)+itemSum([minKey]);
    const max=getBase([maxKey],bonusSources)+itemSum([maxKey]);
    const fixed=getBase(fixedKeys,bonusSources)+itemSum(fixedKeys)+skills.techniqueAttack;
    if(min||max)rows.push(renderRow(label,format(min+fixed)+'–'+format(max+fixed)));
    else if(fixed)rows.push(renderRow(label,format(fixed)));
    continue;
   }
   if(label==='Średnie obrażenia ataku'){
    const range=dbiAttackRange(character,worn,signStats);
    rows.push(renderRow(label,(range.min*(1+dbiPlanSum(worn,'averageDamagePct')/100)).toLocaleString('pl-PL',{maximumFractionDigits:2})));
    continue;
   }
   if(label==='Średnie obrażenia technik'){
    const techniques=DBI_TECHNIQUES.filter(dbiTechniqueUnlocked);
    if(techniques.length){
     const average=techniques.reduce((sum,tech)=>sum+dbiTechniquePower(tech.baseDamage),0)/techniques.length;
     rows.push(renderRow(label,average.toLocaleString('pl-PL',{maximumFractionDigits:2})));
    }
    continue;
   }
   const sources=group==='Podstawowe'?baseSources:bonusSources;
   const value=(group==='Podstawowe'&&label==='Moc')?dbiAttributeTotal(character,signStats+skills.stats,worn):(group==='Podstawowe'?dbiSpiritEffectiveStat(getBase(keys,sources)*dbiPlanAttributeMultiplier(worn,label==='KI'?'ki':keys[0]),signStats+skills.stats):getBase(keys,sources))+itemSum(keys)+(group==='Aktywne'&&label==='Obrona'?(Number(character.stats?.questDefenseBonus)||0):0);
   const skillBonus={
    Obrona:skills.defense,'Punkty życia':skills.hp+(Number(character.stats?.questMaxHp)||0),
    'Szybkość ataku':Number(character.stats?.questAttackSpeedPct)||0,
    'Obrażenia trafienia krytycznego':skills.critDamage,
    'Szansa na krytyczne obrażenia techniki':skills.techCritChance,
    'Obrażenia krytycznego trafienia technik':skills.techCritDamage,
    '% na podwójne nagrody bossów':skills.doubleBossDrop
   }[label]||0;
   if(value+skillBonus!==0)rows.push(renderRow(label,(value+skillBonus).toLocaleString('pl-PL',{maximumFractionDigits:2}),suffix));
  }
  return rows.join('')||'<p class="dbi-stat-empty">Brak statystyk w tej kategorii.</p>';
 };
 const spiritBonuses=window.DBISpiritual?.currentBonuses?.()||{};
 const spiritDefinitions=[
  ['stats','Wszystkie statystyki',1,'%'],['training','Bazowa wartość treningu',1,'%'],
  ['exp','Zdobywane doświadczenie',20,'%'],['upgrade','Szansa na ulepszenie przedmiotu',1,'%'],
  ['battlePoints','Punkty walki',1,''],['adventure','Pozytywne ukończenie przygody',5,'%'],
  ['drop','Szansa na drop przedmiotu',1,'%'],['progress','Punkty postępu Rozwoju Duchowego',0.5,' pkt'],
  ['gold','Złoto zdobywane z walk',20,'%'],['boss','Skrócenie czasu odrodzenia bossa',1,' min'],
  ['dungeon','Limit wejść do dungeonu',1,''],['attack','Wartość ataku',0.5,'%'],
  ['combine','Pozytywne połączenie przedmiotów',1,'%'],
  ['rune','Pomyślne umieszczenie runy',1,'%'],['merchant','Obniżenie cen u handlarzy',10,'%']
 ];
 const spiritRows=spiritDefinitions.filter(([key])=>Number(spiritBonuses[key])>0)
  .map(([key,label,perPoint,unit])=>{
   const level=Math.min(5,Math.max(0,Math.floor(Number(spiritBonuses[key])||0)));
   const amount=format(level*perPoint);
   return `<div class="dbi-stat-row"><span>${esc(label)}</span><strong>${key==='boss'||key==='merchant'?'−':'+'}${amount}${unit}</strong></div>`;
  }).join('');
 document.querySelector('#pageBody').innerHTML=`
 <section class="dbi-stat-panel">
  <header class="dbi-stat-header">Statystyki</header>
  ${DBI_STAT_GROUPS.map(([group,defs])=>`<section class="dbi-stat-group"><h2>${group}</h2>${statRows(group,defs)}${group==='Pasywne'?spiritRows:''}</section>`).join('')}
 </section>`;
}
// Profil korzysta bezpośrednio z tego samego obiektu equipped co ekwipunek.
// Nie tworzymy drugiej kopii wyposażenia.
function renderCharacterProfile(profileCharacter=null,profileHost=null,readOnly=false){
 hideItemPopups();
 if(!profileHost)document.querySelector('#breadcrumb').textContent='POSTAĆ / PROFIL POSTACI';
 const character=profileCharacter||dbiCharacters[dbiCharacterIndex]||{};
 const current=profileCharacter?(dbiRankRead('dboidle_equipped_v1_'+character.id,{})?.['Główny']||{}):equipped['Główny'];
 const signStats=dbiEquippedAllStats(current);
 const worn=Object.values(current).map(itemById).filter(Boolean);
 const profileLevel=profileCharacter?Math.max(1,Number(character.level)||1):level;
 const name=character.name||document.querySelector('#name')?.textContent||'Postać';
 const avatar=character.avatar||character.portrait||'';
 const safeAvatar=typeof avatar==='string'&&/^assets\/[a-z0-9/_-]+\.(png|webp|jpg)$/i.test(avatar)?avatar:'';
 const attributes=['Siła','Szybkość','Wytrzymałość','Inteligencja','KI','Moc'];
 const attrKeys=['strength','speed','endurance','intelligence','ki','power'];
 const slotHtml=DBI_SLOTS.map(([label,id,col,row,height])=>{
  const item=itemById(current[id]);
  return `<button type="button" class="eq-slot profile-eq-slot ${height===2?'eq-tall':''} ${item?'occupied':''}" data-slot="${esc(id)}" style="--col:${col};--row:${row};--span:${height}" aria-label="${esc(item?.name||label)}">
   <span class="slot-art">${dbiItemArt(item)}</span><span class="slot-name">${item?'':esc(label)}</span></button>`;
 }).join('');
 (profileHost||document.querySelector('#pageBody')).innerHTML=`
 <div class="character-profile-layout">
  <section class="character-profile-card profile-portrait">
   <h2>AWATAR</h2>
   <div class="character-portrait-frame">${safeAvatar?`<img src="${safeAvatar}" alt="Awatar postaci">`:`<div class="character-avatar-fallback">${esc(name.charAt(0).toUpperCase())}</div>`}</div>
   <p>${safeAvatar?'Portret postaci':'Brak wybranego awatara — wyświetlana jest pierwsza litera nicku.'}</p>
  </section>
  <section class="character-profile-card profile-details">
   <div class="profile-details-head"><h2>${esc(name)}</h2><span>Poziom ${profileLevel}</span></div>
   <div class="profile-attributes">${attributes.map((label,i)=>{
    const baseValue=dbiStatNumber(character.stats,[attrKeys[i]])??dbiStatNumber(character,[attrKeys[i]]);
    const val=label==='Moc'?dbiAttributeTotal(character,signStats,worn):(baseValue===null&&!signStats?'—':(baseValue??0)*dbiPlanAttributeMultiplier(worn,attrKeys[i])+signStats);
    return `<div class="profile-attribute"><span>${label}</span><strong>${esc(val)}</strong></div>`;
   }).join('')}</div>
   <div class="profile-skills"><h3>Umiejętności</h3><div class="profile-skill-slots">${Array.from({length:5},()=>'<div class="profile-skill-slot" title="Slot umiejętności"></div>').join('')}</div></div>
  </section>
  <section class="character-profile-card profile-worn">
   <h2>ZAŁOŻONY EKWIPUNEK</h2>
   <div class="eq-doll"><div class="eq-body-outline" aria-hidden="true">✦</div><div class="eq-slots">${slotHtml}</div></div>
   <button type="button" class="profile-equipment-link" id="profileOpenEquipment">Przejdź do ekwipunku</button>
  </section>
 </div>`;
 if(readOnly){profileHost.querySelector('#profileOpenEquipment')?.remove()}
 else document.querySelector('#profileOpenEquipment').onclick=()=>showPage('Ekwipunek','POSTAĆ');
 (profileHost||document).querySelectorAll('.profile-eq-slot.occupied').forEach(slot=>{
  const item=itemById(current[slot.dataset.slot]);
  if(!item)return;
  slot.addEventListener('mouseenter',e=>showTooltipItem(e,item));
  slot.addEventListener('mousemove',e=>{const tip=document.querySelector('#itemTooltip');if(tip&&!tip.hidden)positionPopup(tip,e.clientX,e.clientY)});
  slot.addEventListener('mouseleave',()=>document.querySelector('#itemTooltip')?.setAttribute('hidden',''));
 });
}

// Ulepszanie: wspólny magazyn i pozycje z ekwipunkiem; bez losowania/zużywania materiałów.
const DBI_UPGRADE_SLOT_KEY='dboidle_upgrade_slot_v1_'+String(dbiActive?.id||'test');
let dbiUpgradeSelected=null,dbiUpgradeTab=0,dbiUpgradeMessage='';
// Slot jest osobnym miejscem przechowywania; przedmiot nie może jednocześnie
// znajdować się w siatce inwentarza. Zachowujemy go również po odświeżeniu.
try{const saved=JSON.parse(localStorage.getItem(DBI_UPGRADE_SLOT_KEY)||'null');
 if(saved&&typeof saved.ref==='string'&&itemById(saved.ref))dbiUpgradeSelected=saved;
}catch{}
function dbiSaveUpgradeSlot(){
 try{if(dbiUpgradeSelected)localStorage.setItem(DBI_UPGRADE_SLOT_KEY,JSON.stringify(dbiUpgradeSelected));
 else localStorage.removeItem(DBI_UPGRADE_SLOT_KEY)}catch{}
}
function dbiUpgradeReturn(){
 if(!dbiUpgradeSelected)return;
 const {ref,position}=dbiUpgradeSelected;
 inventory.push(ref);inventoryPlacement.push(position||null);
 dbiUpgradeSelected=null;
 dbiSaveUpgradeSlot();dbiSaveInventory();
 dbiUpgradeMessage='Przedmiot wrócił do inwentarza.';
 renderUpgradePanel();
}
function dbiUpgradePick(index){
 const ref=inventory[index],item=itemById(ref);
 if(!item||!DBI_SLOTS.some(slot=>slot[1]===item.slot)){
  dbiUpgradeMessage='Do okienka ulepszania można włożyć wyłącznie wyposażenie.';
  renderUpgradePanel();return;
 }
 // Wymiana przedmiotu zwraca poprzedni do tego samego inwentarza.
 const old=dbiUpgradeSelected;
 const position=inventoryPlacement[index]||null;
 inventory.splice(index,1);inventoryPlacement.splice(index,1);
 if(old){inventory.push(old.ref);inventoryPlacement.push(old.position||null)}
 dbiUpgradeSelected={ref,position};
 dbiSaveUpgradeSlot();dbiSaveInventory();
 dbiUpgradeMessage='Przedmiot przeniesiono do okienka ulepszania.';
 renderUpgradePanel();
}
// Wymagania ulepszania dla wyposażenia; wyłączone kategorie nie zużywają tych materiałów.
const DBI_UPGRADE_CHANCES=[95,90,80,75,70,65,60,50,30,100];
const DBI_UPGRADE_EXCLUDED=['chi','symbol','stroj treningowy','esencja','scouter'];
function dbiUpgradeExcluded(item){
 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pl').trim();
 const slot=normalize(item?.slot),name=normalize(item?.name);
 return DBI_UPGRADE_EXCLUDED.some(x=>slot===x||name===x||name.startsWith(x+' '));
}
function dbiUpgradeRequirements(level,item){
 if(!Number.isInteger(level)||level<0||level>=10)return null;
 const skills=dbiSkillBonuses();
 const req={chance:Math.min(100,DBI_UPGRADE_CHANCES[level]+skills.upgrade+dbiSmithCheckpointBonus('upgrade')+dbiMainBonus('upgradeChancePct')+Math.max(0,Number(window.DBISpiritual?.currentBonuses?.()?.upgrade)||0)),dust:level===9?10:1,
  reforger:level===9?1:0,materials:[]};
 if(!dbiUpgradeExcluded(item)){
  const quantity=level-3;
  if(level>=4&&level<=6)req.materials=[{id:'quest-turtle-stone',count:quantity},{id:'small-dragon-balls',count:quantity}];
  if(level>=7&&level<=8)req.materials=[{id:'red-ribbon-badge',count:level-6},{id:'dragon-radar',count:level-6}];
 }
 req.materials=req.materials.map(m=>({...m,count:m.count-skills.materialDiscount-dbiMainBonus('upgradeMaterialDiscount')})).filter(m=>m.count>0);
 return req;
}
function dbiUpgradeMaterialCount(id){
 return inventory.reduce((n,ref)=>n+(dbiDecodeItemRef(ref).id===id?1:0),0);
}
function dbiUpgradeConsumeMaterial(id,count){
 let remaining=count;
 for(let i=inventory.length-1;i>=0&&remaining>0;i--){
  if(dbiDecodeItemRef(inventory[i]).id!==id)continue;
  inventory.splice(i,1);inventoryPlacement.splice(i,1);remaining--;
 }
 return remaining===0;
}
// Receptury przekucia: kolejne pary źródło → nowy przedmiot dodamy osobno.
const DBI_REFORGE_RECIPES={'starter-blue-kimono':'saiyan-soldier-armor'};
function dbiReforgeDestination(item){
 if(!item||Number(item.enhancement)!==9)return null;
 const id=DBI_REFORGE_RECIPES[item.id];
 return id&&catalog.some(entry=>entry.id===id)?id:null;
}
function dbiUpgradeAttempt(){
 if(!dbiSkillBonuses().upgrade)return;
 const selected=dbiUpgradeSelected;
 if(!selected)return;
 const item=itemById(selected.ref),level=Number(item?.enhancement||0);
 const req=dbiUpgradeRequirements(level,item);
 if(!req){dbiUpgradeMessage='Przedmiot osiągnął maksymalny poziom +10.';renderUpgradePanel();return}
 const destination=req.reforger?dbiReforgeDestination(item):null;
 if(req.reforger&&!destination){
  dbiUpgradeMessage='Dla tego przedmiotu nie ustalono jeszcze wyniku przekucia. Materiały nie zostały zużyte.';
  renderUpgradePanel();return;
 }
 const needed=[{id:'dragon-ball-dust',count:req.dust},...req.materials,...(req.reforger?[{id:'upgrade-reforger',count:1}]:[])];
 const missing=needed.filter(x=>dbiUpgradeMaterialCount(x.id)<x.count);
 if(missing.length){dbiUpgradeMessage='Brakuje materiałów: '+missing.map(x=>(catalog.find(y=>y.id===x.id)?.name||x.id)+' ('+dbiUpgradeMaterialCount(x.id)+'/'+x.count+')').join(', ')+'.';renderUpgradePanel();return}
 for(const material of needed)dbiUpgradeConsumeMaterial(material.id,material.count);
 const success=req.reforger||Math.random()*100<req.chance;
 if(success){
  const {id,quality,reinforced,bonuses}=dbiDecodeItemRef(selected.ref);
  // Przekucie podmienia ID przedmiotu i zeruje ulepszenie, bez duplikowania egzemplarza.
  dbiUpgradeSelected={...selected,ref:req.reforger?dbiItemRef(destination,0,null,reinforced,bonuses):dbiItemRef(id,level+1,quality,reinforced,bonuses)};
  dbiSaveUpgradeSlot();
 }
 dbiSaveInventory();
 dbiUpgradeMessage=req.reforger
  ?'Przekucie udane! Powstała Zbroja Saiyańskiego Żołnierza +0 (obrona +105, maksymalne HP +50).'
  :success?'Ulepszanie udane! Przedmiot osiągnął +'+(level+1)+'.':
  'Ulepszanie nieudane. Przedmiot pozostał na +'+level+', materiały zostały zużyte.';
 renderUpgradePanel();
}
function renderUpgradePanel(){
 hideItemPopups();
 document.querySelector('#breadcrumb').textContent='WZMOCNIENIA / ULEPSZANIE';
 // Nagłówek startowy znika po otwarciu pierwszej strony; nie można go wymagać przy nawigacji.
 const upgradeTitle=document.querySelector('#contentTitle');if(upgradeTitle)upgradeTitle.textContent='Ulepszanie';
 const upgradeDescription=document.querySelector('#contentDescription');if(upgradeDescription)upgradeDescription.textContent='Przygotowanie przedmiotów do ulepszania.';
 if(!document.querySelector('#dbi-upgrade-style')){
  const style=document.createElement('style');style.id='dbi-upgrade-style';
  style.textContent=`
   .dbi-upgrade{padding:18px 22px;min-height:700px;color:#e9dfcb}
   .dbi-upgrade h2{text-align:center;margin:0 0 12px;color:#e5bb75}
   .dbi-upgrade hr{border:0;border-top:1px solid #52606b;margin:0 0 28px}
   .dbi-upgrade-layout{display:grid;grid-template-columns:minmax(270px,1fr) minmax(360px,440px);gap:26px;align-items:start}
   .dbi-upgrade-work{display:flex;flex-direction:column;align-items:flex-start;gap:15px}
   .dbi-upgrade-main{display:flex;align-items:flex-start;gap:18px;flex-wrap:wrap}
   .dbi-upgrade-target{display:flex;flex-direction:column;align-items:center;gap:8px;width:210px;color:#d8c49f}
   .dbi-upgrade-target .dbi-upgrade-slot{box-sizing:border-box;width:190px;height:190px;min-width:190px;min-height:190px;border:1px solid #927346;background:#101e2b;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
   .dbi-upgrade-target .dbi-upgrade-slot.drop-target{outline:3px solid #e4b667;outline-offset:3px}
   .dbi-upgrade-target .dbi-upgrade-slot.occupied{cursor:pointer}
   .dbi-upgrade-target .dbi-upgrade-slot img.dbi-item-image{display:block;box-sizing:border-box;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;object-position:center;flex:0 1 auto;padding:5px}
   .dbi-upgrade-target strong{font-size:12px;text-align:center;line-height:1.3}
   .dbi-upgrade-target small{display:block;font-size:12px;line-height:1.5;text-align:center}
   .dbi-upgrade-dust{border:1px solid #586575;background:#14222e;border-radius:5px;min-width:84px;padding:9px;text-align:center}
   .dbi-upgrade-dust img{display:block;width:46px;height:46px;object-fit:contain;margin:0 auto 5px}
   .dbi-upgrade-dust span{display:block;font-size:12px}
   .dbi-upgrade-materials{display:flex;gap:10px;width:210px;justify-content:center;box-sizing:border-box}
   .dbi-upgrade-materials .dbi-material-slot{box-sizing:border-box;width:51px;height:51px;border:1px solid #69737b;background:#101e2b;border-radius:3px}
   .dbi-upgrade-action{width:190px;margin-left:10px;min-height:38px;background:#876a39;border:1px solid #b39357;color:#e9e1cf;border-radius:4px;cursor:pointer}.dbi-upgrade-action:disabled{cursor:not-allowed;opacity:.65}
   .dbi-upgrade-note{font-size:12px;color:#aab5c2;max-width:420px}
   .dbi-reforger-count{box-sizing:border-box;width:190px;margin-left:10px;text-align:center;margin-top:0;margin-bottom:0}
   .dbi-upgrade-inv{border:1px solid #38516a;background:#102434;border-radius:5px;padding:16px;width:100%;box-sizing:border-box}
   .dbi-upgrade-inv h3{margin:0 0 12px;color:#e5bb75;font-size:15px}
   .dbi-upgrade-inv .inv-tabs{display:flex;gap:4px;margin-bottom:12px}
   .dbi-upgrade-inv .inv-tab{flex:1;min-width:0;padding:8px 0}
   .dbi-upgrade-inv .inv-scroll{height:550px;overflow:auto}
   /* Stałe wymiary 6×10 także dla całkowicie pustej karty.
      Globalne .inv-grid ma width:max-content i max-width:100%,
      co przy kolumnach 1fr zapadało się do kilku pikseli. */
   .dbi-upgrade-inv .inv-grid{--dbi-cell:60px;--dbi-gap:4px;display:grid;grid-template-columns:repeat(6,var(--dbi-cell));grid-template-rows:repeat(10,var(--dbi-cell));grid-auto-rows:var(--dbi-cell);gap:var(--dbi-gap);width:max-content;max-width:none;min-width:0;align-content:start;justify-content:start;position:relative}
   .dbi-upgrade-inv .inv-grid>.inv-cell{box-sizing:border-box;width:100%;height:100%;min-width:0;min-height:0;aspect-ratio:auto;overflow:hidden}
   .dbi-upgrade-inv .inv-scroll{height:550px;min-height:0;overflow:auto;container-type:normal}
   .dbi-upgrade-inv .inv-drop-preview{position:absolute;z-index:5;box-sizing:border-box;pointer-events:none}
   .dbi-upgrade-inv .inv-cell{box-sizing:border-box}
   .dbi-upgrade-inv .inv-cell{min-width:0;min-height:0}
   .dbi-upgrade-inv .inv-cell.has-item{cursor:grab}
   .dbi-upgrade-inv .inv-cell.selected-upgrade{outline:2px solid #edc16c;outline-offset:-2px}
   .dbi-upgrade-inv .inv-actions{display:flex;gap:6px;margin-top:12px}
   .dbi-upgrade-inv .inv-actions button{flex:1}
   @media(max-width:950px){.dbi-upgrade-layout{grid-template-columns:1fr}.dbi-upgrade-inv{max-width:440px}}
  `;
  document.head.appendChild(style);
 }
 const chosen=dbiUpgradeSelected?itemById(dbiUpgradeSelected.ref):null;
 const eligible=chosen&&DBI_SLOTS.some(slot=>slot[1]===chosen.slot);
 const req=eligible?dbiUpgradeRequirements(Number(chosen.enhancement||0),chosen):null;
 const dustCount=dbiUpgradeMaterialCount('dragon-ball-dust');
 const reforgerCount=dbiUpgradeMaterialCount('upgrade-reforger');
 const unlocked=dbiSkillBonuses().upgrade>0;
 const ready=unlocked&&!!req&&(!req.reforger||!!dbiReforgeDestination(chosen))&&dustCount>=req.dust&&reforgerCount>=req.reforger&&req.materials.every(m=>dbiUpgradeMaterialCount(m.id)>=m.count);
 dbiUpgradeTab=inventoryTab;
 const gridHtml=renderInventoryGrid();
 document.querySelector('#pageBody').innerHTML=`<section class="dbi-upgrade"><h2>Ulepszanie</h2><hr><div class="dbi-upgrade-layout">
 <div class="dbi-upgrade-work"><div class="dbi-upgrade-main">
 <div class="dbi-upgrade-target"><div class="dbi-upgrade-slot" id="dbiUpgradeTarget" title="Przeciągnij przedmiot, użyj dwukliku lub kliknij włożony przedmiot, aby go wyjąć">${eligible?dbiItemArt(chosen):''}</div>${eligible?`<strong>${esc(chosen.name)}</strong>`:''}<small>Aktualne ulepszenie: ${eligible?'+'+Number(chosen.enhancement||0):'—'}</small><small>Szansa powodzenia: ${req?req.chance+'%':eligible?'MAX':'—'}</small></div>
 <div class="dbi-upgrade-dust"><img src="assets/items/pyl-smoczych-kul.png" alt=""><span>Smoczy pył</span><span>Posiadasz: ${dustCount}${req?' / '+req.dust:''}</span></div></div>
 ${req&&(req.reforger||req.materials.length)?`<div class="dbi-upgrade-materials">${req.reforger?`<div class="dbi-material-slot" title="Przekuwacz: ${reforgerCount}/1"><img src="assets/items/przekuwacz.png" alt="Przekuwacz" style="width:100%;height:100%;object-fit:contain"></div>`:req.materials.map(material=>{const info=catalog.find(x=>x.id===material.id),owned=dbiUpgradeMaterialCount(material.id);return `<div class="dbi-material-slot" title="${esc(info?.name||material.id)}: ${owned}/${material.count}" style="position:relative"><img src="${esc(info?.image||'')}" alt="${esc(info?.name||material.id)}" style="width:100%;height:100%;object-fit:contain"><span style="position:absolute;bottom:0;right:0;background:#101e2be6;color:${owned>=material.count?'#c5e5a8':'#ff9c9c'};font-size:11px;padding:0 2px">${owned}/${material.count}</span></div>`}).join('')}</div>`:''}
 ${req?.reforger?'<p class="dbi-upgrade-note dbi-reforger-count">Przekuwacz: '+reforgerCount+'/1</p>':''}

 <button class="dbi-upgrade-action" id="dbiUpgradeAction" ${ready?'':'disabled'} title="${!unlocked?'Wymaga Podstawowego Kowalstwa':req?.reforger?(dbiReforgeDestination(chosen)?'Przekuj przedmiot na nową zbroję +0':'Nie ustalono jeszcze przedmiotu wynikowego'):!ready?'Brakuje wymaganych materiałów':'Ulepsz przedmiot'}">${req?.reforger?'Przekuj':'Ulepsz'}</button>
 <p class="dbi-upgrade-note" role="status" id="dbiUpgradeStatus">${esc(dbiUpgradeMessage||'Wybierz wyposażenie dwuklikiem albo przeciągnij je do okienka.')}</p>
 </div><aside class="dbi-upgrade-inv"><h3>INWENTARZ</h3><div class="inv-tabs">${['I','II','III','IV','V','VI'].map((label,i)=>`<button type="button" class="inv-tab ${i===dbiUpgradeTab?'active':''}" data-tab="${i}">${label}</button>`).join('')}</div><div class="inv-scroll"><div class="inv-grid">${gridHtml}</div></div><div class="inv-actions"><button type="button" data-upgrade-action="Sortuj">Sortuj</button><button type="button" data-upgrade-action="Zaznacz">Zaznacz</button><button type="button" data-upgrade-action="Zablokuj">Zablokuj</button></div></aside>
 </div></section>`;
 document.querySelector('#dbiUpgradeAction')?.addEventListener('click',dbiUpgradeAttempt);
 const host=document.querySelector('.dbi-upgrade-inv');
 const target=document.querySelector('#dbiUpgradeTarget');
 if(eligible){target.classList.add('occupied');target.addEventListener('click',dbiUpgradeReturn);target.addEventListener('mouseenter',e=>showTooltipItem(e,chosen));target.addEventListener('mousemove',e=>{const tip=document.querySelector('#itemTooltip');if(tip&&!tip.hidden)positionPopup(tip,e.clientX,e.clientY)});target.addEventListener('mouseleave',()=>document.querySelector('#itemTooltip')?.setAttribute('hidden',''));}
 target.addEventListener('dragover',event=>{
  const candidate=dragIndex!==null?dragIndex:Number(event.dataTransfer?.getData('text/plain'));
  if(!Number.isInteger(candidate)||candidate<0||candidate>=inventory.length)return;
  event.preventDefault();event.dataTransfer.dropEffect='move';target.classList.add('drop-target');
 });
 target.addEventListener('dragleave',()=>target.classList.remove('drop-target'));
 target.addEventListener('drop',event=>{
  event.preventDefault();event.stopPropagation();target.classList.remove('drop-target');
  const nativeIndex=Number(event.dataTransfer?.getData('text/plain'));
  const index=dragIndex!==null?dragIndex:nativeIndex;
  if(!Number.isInteger(index)||index<0||index>=inventory.length)return;
  dragCompleted=true;dragIndex=null;dragActive=false;dragSourceElement=null;
  dbiUpgradePick(index);
 });
 dbiBindSharedInventory(host,{
  refresh:message=>{dbiUpgradeTab=inventoryTab;dbiUpgradeMessage=message||'';renderUpgradePanel()},
  onClick:index=>{const item=itemById(inventory[index]);if(item)dbiUpgradeMessage='Dwuklik lub przeciągnięcie wybiera przedmiot do ulepszenia.';const el=document.querySelector('#dbiUpgradeStatus');if(el)el.textContent=dbiUpgradeMessage},
  onDoubleClick:index=>{dbiUpgradePick(index)},
  setMessage:message=>{const el=document.querySelector('#dbiUpgradeStatus');if(el)el.textContent=message}
 });
}

// Kowalstwo: etap interfejsu. Wszystkie przedmioty pochodzą z tego samego inwentarza co Ekwipunek.
const DBI_SMITH_CHECKPOINTS=[
 {level:5,key:'trainingResult',value:5,label:'+5% do rezultatu treningu'},
 {level:10,key:'drop',value:1,label:'+1% do szansy na drop przedmiotów Kowalstwa'},
 {level:15,key:'exp',value:2,label:'+2 EXP Kowalstwa do nagród większych od 0'},
 {level:20,key:'upgrade',value:10,label:'+10% do szansy na pomyślne ulepszenie przedmiotu'},
 {level:25,key:'trainingBase',value:5,label:'+5% do bazowej wartości treningu'},
 {level:30,key:'quality',value:10,label:'+10% do szansy na podniesienie jakości przedmiotu'}
];
const DBI_SMITH_MAX_LEVEL=30;
function dbiSmithCheckpointBonus(key,level=dbiSmithProgress().level){
 const checkpoint=DBI_SMITH_CHECKPOINTS.find(entry=>entry.key===key);
 return checkpoint&&level>=checkpoint.level?checkpoint.value:0;
}
const DBI_SMITH_MAX_EXP=10*DBI_SMITH_MAX_LEVEL*(DBI_SMITH_MAX_LEVEL-1)/2;
const DBI_SMITH_CRAFT_EXP=[
 {1:[2,1],100:[3,1],250:[4,2],500:[6,3]},
 {1:[1,0],100:[2,1],250:[3,1],500:[5,2]},
 {1:[0,0],100:[1,0],250:[2,1],500:[4,2]}
];
const DBI_SMITH_QUALITY_EXP=[
 [[4,2],[6,4],[8,6],[10,8]],
 [[2,0],[4,2],[6,4],[10,8]],
 [[1,0],[2,0],[5,2],[10,8]]
];
const dbiSmithExpKey=()=> 'dboidle_smith_exp_v1_'+String(dbiActive?.id||'test');
function dbiSmithProgress(){
 const total=Math.max(0,Math.min(DBI_SMITH_MAX_EXP,Math.floor(Number(localStorage.getItem(dbiSmithExpKey()))||0)));
 let level=1,exp=total;
 while(level<DBI_SMITH_MAX_LEVEL&&exp>=level*10){
  exp-=level*10;
  level++;
 }
 return {total,level,exp,needed:level===DBI_SMITH_MAX_LEVEL?0:level*10};
}
function dbiSmithExpAward(table,key,success){
 const {total,level}=dbiSmithProgress();
 const band=level<10?0:level<20?1:2;
 const base=table[band][key]?.[success?0:1]??0;
 const amount=base>0?base+dbiSmithCheckpointBonus('exp',level):0;
 const gained=Math.min(DBI_SMITH_MAX_EXP-total,amount);
 return {gained,writes:gained?[[dbiSmithExpKey(),String(total+gained)]]:[]};
}
const dbiSmithExpMessage=amount=>amount?' +'+amount+' EXP Kowalstwa.':'';
const DBI_QUALITY_RECIPES=[
 [90,5,'common',1,10000],
 [70,15,'rare',1,30000],
 [40,30,'epic',2,100000],
 [10,100,'legendary',5,1000000]
];
let dbiSmithSelection=null;
function dbiSmithSelectedItem(){
 const ref=dbiSmithSelection?.ref;
 return ref&&inventory[dbiSmithSelection.index]===ref?itemById(ref):null;
}
function dbiSmithRecipe(item){
 if(!item)return null;
 const tier=Math.max(0,QUALITY.indexOf(item.quality));
 const recipe=DBI_QUALITY_RECIPES[tier];
 if(!recipe)return null;
 const [baseChance,units,module,moduleCount,gold]=recipe;
 return {
  tier:tier+1,gold,chance:Math.min(100,baseChance+dbiSkillBonuses().quality+dbiSmithCheckpointBonus('quality')+dbiMainBonus('qualityChancePct')),
  materials:[{id:'smith-upgrade-1',count:units},{id:'smith-upgrade-2',count:units},{id:'smith-quality-'+module,count:moduleCount}]
 };
}
function dbiSmithPick(index){
 const ref=inventory[index],item=itemById(ref);
 if(!item||!DBI_SLOTS.some(([,slot])=>slot===item.slot)){
  document.querySelector('#dbiSmithStatus').textContent='Wybierz przedmiot wyposażenia.';
  return;
 }
 dbiSmithSelection={index,ref};
 renderBlacksmith();
}
function dbiSmithAttempt(){
 const item=dbiSmithSelectedItem(),recipe=dbiSmithRecipe(item);
 if(!recipe)return;
 const goldKey='dboidle_gold_v1_'+String(dbiActive?.id||'test');
 const gold=Number(localStorage.getItem(goldKey))||0;
 if(gold<recipe.gold||recipe.materials.some(m=>dbiUpgradeMaterialCount(m.id)<m.count)){
  renderBlacksmith('Brakuje materiałów lub złota.');
  return;
 }
 const {index,ref}=dbiSmithSelection;
 const {id,enhancement,reinforced,bonuses}=dbiDecodeItemRef(ref);
 const success=Math.random()*100<recipe.chance;
 const result=success?dbiItemRef(id,enhancement,recipe.tier,reinforced,bonuses):ref;
 const needed=new Map(recipe.materials.map(m=>[m.id,m.count]));
 const items=[],positions=[];
 let newIndex=0;
 inventory.forEach((entry,i)=>{
  if(i===index){newIndex=items.length;items.push(result);}
  else {
   const material=dbiDecodeItemRef(entry).id;
   if(needed.get(material)>0){needed.set(material,needed.get(material)-1);return}
   items.push(entry);
  }
  positions.push(inventoryPlacement[i]);
 });
 const expAward=dbiSmithExpAward(DBI_SMITH_QUALITY_EXP,recipe.tier-1,success);
 if(!dbiSaveInventoryTransaction(items,positions,[[goldKey,String(gold-recipe.gold)],...expAward.writes])){
  renderBlacksmith('Nie udało się zapisać próby.');
  return;
 }
 dbiSmithSelection={index:newIndex,ref:result};
 dbiRefreshHeaderWallet();
 const message=success?'Nowa jakość: '+QUALITY[recipe.tier]+'.':'Próba nieudana. Zużyto materiały i złoto.';
 renderBlacksmith(message+dbiSmithExpMessage(expAward.gained));
}
function dbiSaveInventoryTransaction(items,positions,extraWrites){
 const positionSave=JSON.stringify({items,positions});
 const writes=[[DBI_INV_KEY,JSON.stringify(items)],[DBI_INV_POS_KEY,positionSave],...extraWrites];
 const before=writes.map(([key])=>[key,localStorage.getItem(key)]);
 let written=0;
 try{
  for(const [key,value] of writes){localStorage.setItem(key,value);written++}
 }catch(error){
  for(const [key,value] of before.slice(0,written).reverse()){
   try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value)}
   catch(rollbackError){console.error('Przywrócenie zapisu inwentarza:',rollbackError)}
  }
  return false;
 }
 inventory=items;inventoryPlacement=positions;dbiLastPositionSave=positionSave;
 return true;
}
const DBI_CRAFT_RECIPES={
 chi:{label:'Chi',material:'smith-chi',outputs:['smith-chi-1','czarna-chi']},
 symbol:{label:'Symbol',material:'smith-symbol',outputs:Object.keys(DBI_SIGN_BONUSES)},
 stroj:{label:'Strój treningowy',material:'smith-stroj',outputs:[DBI_TURTLE_OUTFIT_ID]},
 esencja:{label:'Esencja',material:'smith-esencja',outputs:['smith-esencja-1']},
 scouter:{label:'Scouter',material:'smith-scouter',outputs:['smith-scouter-1']}
};
const DBI_CRAFT_GOLD=10000;
const DBI_CRAFT_CHANCE=90;
const dbiCraftKey=()=> 'dboidle_craft_pending_v1_'+String(dbiActive?.id||'test');
const dbiSmithGoldKey=()=> 'dboidle_gold_v1_'+String(dbiActive?.id||'test');
const dbiCraftSelection={type:'',level:'',race:''};
function dbiCraftMaterials(recipe){
 return [recipe.material,'smith-ki',window.DBIWorldInventory.smithOreId()];
}
function dbiCraftAttempt(){
 const recipe=DBI_CRAFT_RECIPES[dbiCraftSelection.type];
 if(!recipe||dbiCraftSelection.level!=='1'||!dbiCraftSelection.race||localStorage.getItem(dbiCraftKey()))return;
 const goldKey=dbiSmithGoldKey(),gold=Number(localStorage.getItem(goldKey))||0;
 const materials=dbiCraftMaterials(recipe);
 if(gold<DBI_CRAFT_GOLD||materials.some(id=>dbiUpgradeMaterialCount(id)<1)||recipe.outputs.some(id=>!itemById(id)))return;
 const consumed=new Set(materials.map(id=>inventory.findIndex(ref=>dbiDecodeItemRef(ref).id===id)));
 const success=Math.random()*100<DBI_CRAFT_CHANCE;
 const result=success?dbiItemRef(recipe.outputs[Math.floor(Math.random()*recipe.outputs.length)],0,0):'';
 const items=inventory.filter((_,i)=>!consumed.has(i));
 const positions=inventoryPlacement.filter((_,i)=>!consumed.has(i));
 const expAward=dbiSmithExpAward(DBI_SMITH_CRAFT_EXP,dbiCraftSelection.level,success);
 const saved=dbiSaveInventoryTransaction(items,positions,[[goldKey,String(gold-DBI_CRAFT_GOLD)],[dbiCraftKey(),result],...expAward.writes]);
 if(saved){dbiSmithSelection=null;dbiRefreshHeaderWallet()}
 renderBlacksmith(undefined,saved?(success?'Wytworzono przedmiot. Odbierz go lub usuń.':'Próba nieudana. Zużyto składniki i złoto.')+dbiSmithExpMessage(expAward.gained):'Nie udało się zapisać próby.');
}
function dbiCraftResolve(accept){
 const ref=localStorage.getItem(dbiCraftKey());
 if(!ref)return;
 const item=itemById(ref);
 if(accept&&!item)return;
 const items=accept?[...inventory,ref]:inventory;
 const positions=accept?[...inventoryPlacement,null]:inventoryPlacement;
 if(!dbiSaveInventoryTransaction(items,positions,[[dbiCraftKey(),'']])){
  renderBlacksmith(undefined,'Nie udało się zapisać wyniku.');
  return;
 }
 renderBlacksmith(undefined,accept?'Przedmiot dodany do inwentarza.':'Usunięto wytworzony przedmiot.');
}
function renderBlacksmith(message='Kliknij przedmiot dwukrotnie lub przeciągnij go do okienka jakości.',craftMessage=''){
 hideItemPopups();
 document.querySelector('#breadcrumb').textContent='WZMOCNIENIA / KOWALSTWO';
 const heading=document.querySelector('#contentTitle');if(heading)heading.textContent='Kowalstwo';
 const desc=document.querySelector('#contentDescription');if(desc)desc.textContent='Tworzenie przedmiotów i ulepszanie jakości — przygotowanie warsztatu.';
 if(!document.querySelector('#dbi-smith-style')){
  const style=document.createElement('style');style.id='dbi-smith-style';style.textContent=`
  .dbi-smith{--smith-gold:#e6a941;--smith-line:#bc822c;--smith-ink:#dce8f1;color:var(--smith-ink);padding:10px 12px 24px;min-height:820px;background:linear-gradient(145deg,#071b2b,#091524 75%);border:1px solid #42617a;border-radius:12px}
  .dbi-smith *{box-sizing:border-box}
  .dbi-smith-header{display:flex;align-items:center;gap:15px;border-bottom:1px solid #294b61;margin:0 0 12px;padding:4px 8px 12px}
  .dbi-smith-header .dbi-smith-anvil{font-size:34px;color:#ffc66a;filter:drop-shadow(0 2px 3px #000)}
  .dbi-smith-header h2{font-size:29px;text-align:left;color:#ffcb72;text-shadow:0 2px 2px #000;margin:0}
  .dbi-smith-main{display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,30%);gap:16px;align-items:start}
  .dbi-smith-work{min-width:0;display:grid;gap:15px}
  .dbi-smith-panel{border:2px solid var(--smith-line);border-radius:10px;background:linear-gradient(135deg,#082d43,#061728 85%);box-shadow:inset 0 0 14px #0007,0 0 0 1px #162a3b;padding:15px}
  .dbi-smith-panel h3{margin:0 0 14px;padding-bottom:10px;border-bottom:1px solid #3a5a6c;color:#ffd078;font-size:19px;text-shadow:0 2px 2px #000}
  .dbi-smith-milestones{display:flex;justify-content:space-between;align-items:center;position:relative;gap:8px;flex:1;margin:0}
  .dbi-smith-milestones:before{content:'';position:absolute;left:3%;right:3%;top:50%;border-top:2px solid #c58c35}
  .dbi-smith-milestones button{font-family:inherit;cursor:help;position:relative;background:#061b2c;border:2px solid #d49a42;border-radius:5px;color:#ffcf7b;padding:5px 8px;font-weight:700;font-size:13px;min-width:34px;text-align:center}
  .dbi-smith-milestones button.is-earned{color:#211506;background:#ffcf7b;border-color:#ffe7ac;box-shadow:0 0 12px #ffbe5580}
  .dbi-smith-milestones button:focus-visible{outline:2px solid #fff;outline-offset:2px}
  .dbi-smith-level-line{display:flex;align-items:center;gap:18px;margin-bottom:18px}
  .dbi-smith-level{white-space:nowrap;background:#172419;border:1px solid #e2aa3d;border-radius:5px;padding:10px 12px;color:#ffdc89;font-weight:700}
  .dbi-smith-progress-line{display:flex;align-items:center;gap:12px;font-size:13px}
  .dbi-smith-progress{position:relative;flex:1;height:23px;border:1px solid #6d9ab2;border-radius:8px;background:#041524;overflow:hidden;text-align:center}
  .dbi-smith-progress>span{display:block;width:0;height:100%;background:linear-gradient(90deg,#a56c17,#ffcb62)}
  .dbi-smith-progress>small{position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-size:12px;text-shadow:0 1px 3px #000}
  .dbi-smith-create{display:grid;grid-template-columns:minmax(150px,1fr) minmax(200px,1.1fr) minmax(155px,.8fr);gap:16px;align-items:start}
  .dbi-smith-selects{display:grid;gap:14px}.dbi-smith-selects select{width:100%;min-height:42px;background:#071b2d;color:#e5d7ba;border:1px solid #a17c43;border-radius:5px;padding:8px}
  .dbi-smith-materials{display:flex;gap:12px;justify-content:center;margin:0 0 16px}
  .dbi-smith-slot{width:62px;height:62px;border:1px solid #e1a94b;border-radius:6px;background:#061b2b;display:flex;align-items:center;justify-content:center;flex:none}
  .dbi-smith-slot img{max-width:100%;max-height:100%;object-fit:contain}
  .dbi-smith-muted{font-size:12px;color:#c4d3df;line-height:1.75}
  .dbi-smith button.dbi-smith-disabled{background:linear-gradient(#c18b36,#79501e);color:#f9e2b8;border:1px solid #f0b958;border-radius:5px;opacity:.6;cursor:not-allowed;padding:10px 14px;font-weight:700}
  .dbi-smith-preview{min-height:145px;border:1px solid #8199aa;border-radius:6px;background:#061727;display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px;padding:10px}
  .dbi-smith-preview-buttons{display:flex;gap:8px;margin-top:10px}.dbi-smith-preview-buttons button{flex:1;min-width:0}
  .dbi-smith-quality{display:flex;flex-wrap:wrap;gap:18px;align-items:center}
  .dbi-smith-quality-target{width:155px;min-height:168px;border:1px solid #e1a94b;border-radius:6px;background:#061b2b;display:flex;align-items:center;justify-content:center;text-align:center;padding:12px;cursor:pointer}
  .dbi-smith-quality-target .dbi-item-image{max-width:100%;max-height:120px;object-fit:contain}
  .dbi-smith-quality-work{flex:1;min-width:195px}.dbi-smith-quality-work .dbi-smith-materials{justify-content:flex-start}
  .dbi-smith-status{font-size:12px;color:#b9c9d5;min-height:22px;margin:14px 0 0}
  .dbi-smith-inventory{position:relative;min-width:0;padding:13px 10px}
  .dbi-smith-inventory h3{margin-bottom:12px}
  .dbi-smith-inventory .inv-tabs{grid-template-columns:repeat(6,minmax(0,1fr));gap:3px;margin-bottom:9px}
  .dbi-smith-inventory .inv-tab{min-width:0;padding:9px 0;border-radius:4px}
  .dbi-smith-inventory .inv-scroll{max-height:none!important;height:auto!important;overflow:visible!important;min-height:0;width:100%;min-width:0}
  .dbi-smith-inventory .inv-grid{--dbi-gap:4px;--dbi-cell:calc((100cqw - 5 * var(--dbi-gap))/6);width:100%;max-width:100%;grid-template-columns:repeat(6,minmax(0,1fr));grid-template-rows:repeat(10,var(--dbi-cell));grid-auto-rows:var(--dbi-cell);gap:var(--dbi-gap)}
  .dbi-smith-inventory .inv-cell{min-width:0;min-height:0}
  .dbi-smith-inventory .inv-actions{margin-top:12px;gap:5px}
  .dbi-smith-inventory .inv-actions button{border:1px solid #b88737;background:linear-gradient(#102f42,#071a2a);color:#f1d39b}
  @media(max-width:1180px){.dbi-smith-main{grid-template-columns:1fr}.dbi-smith-inventory{width:min(100%,570px);justify-self:center}.dbi-smith-create{grid-template-columns:1fr 1fr}.dbi-smith-preview-area{grid-column:1/-1}}
  @media(max-width:620px){.dbi-smith-create{grid-template-columns:1fr}.dbi-smith-preview-area{grid-column:auto}.dbi-smith{padding:8px}.dbi-smith-header h2{font-size:23px}.dbi-smith-level-line{flex-wrap:wrap}.dbi-smith-milestones button{min-width:27px;padding:4px}}
  `;document.head.appendChild(style);
 }
 const selected=dbiSmithSelectedItem();
 const recipe=dbiSmithRecipe(selected);
 const gold=Number(localStorage.getItem('dboidle_gold_v1_'+String(dbiActive?.id||'test')))||0;
 const materials=recipe?.materials.map(m=>({...m,owned:dbiUpgradeMaterialCount(m.id),item:itemById(m.id)}))||[];
 const ready=recipe&&gold>=recipe.gold&&materials.every(m=>m.owned>=m.count);
 const qualityCost=recipe?recipe.gold.toLocaleString('pl-PL'):'—';
 const craft=DBI_CRAFT_RECIPES[dbiCraftSelection.type];
 const progress=dbiSmithProgress();
 const progressPercent=progress.needed?Math.floor(progress.exp/progress.needed*100):100;
 const pending=localStorage.getItem(dbiCraftKey());
 const crafted=itemById(pending);
 const craftMaterials=craft&&dbiCraftSelection.level==='1'?dbiCraftMaterials(craft):[];
 const craftReady=!pending&&dbiCraftSelection.race&&craftMaterials.length===3&&gold>=DBI_CRAFT_GOLD&&craftMaterials.every(id=>dbiUpgradeMaterialCount(id)>=1)&&craft.outputs.every(id=>itemById(id));
 const craftSelect=(key,label,entries)=>`<select data-craft-select="${key}" aria-label="${label}"><option value="">${label}</option>${entries.map(([value,name])=>`<option value="${value}" ${dbiCraftSelection[key]===String(value)?'selected':''}>${name}</option>`).join('')}</select>`;
 document.querySelector('#pageBody').innerHTML=`<section class="dbi-smith">
  <header class="dbi-smith-header"><span class="dbi-smith-anvil" aria-hidden="true">⚒️</span><h2>Kowalstwo</h2></header>
  <div class="dbi-smith-main"><div class="dbi-smith-work">
  <section class="dbi-smith-panel" aria-label="Poziom Kowalstwa"><div class="dbi-smith-level-line"><span class="dbi-smith-level">⚒️ Poziom Kowalstwa: ${progress.level}</span><div class="dbi-smith-milestones">${DBI_SMITH_CHECKPOINTS.map(({level,label})=>{
   const earned=progress.level>=level;
   return `<button type="button" data-smith-checkpoint="${level}" class="${earned?'is-earned':''}" aria-label="Poziom ${level}. ${esc(label)}. ${earned?'Zdobyty':'Do zdobycia'}" aria-describedby="dbiSmithCheckpointTip">${level}</button>`;
  }).join('')}</div></div><div class="dbi-smith-progress-line"><strong>Pasek postępu:</strong><div class="dbi-smith-progress" aria-label="Postęp Kowalstwa"><span style="width:${progressPercent}%"></span><small>${progress.needed?`${progress.exp} / ${progress.needed} (${progressPercent}%)`:'Maksymalny poziom'}</small></div></div></section>
  <section class="dbi-smith-panel"><h3>⚒️ Tworzenie przedmiotów</h3><div class="dbi-smith-create">
   <div class="dbi-smith-selects">${craftSelect('type','Rodzaj przedmiotu',Object.entries(DBI_CRAFT_RECIPES).map(([id,entry])=>[id,entry.label]))}${craftSelect('level','Poziom przedmiotu',[1,100,250,500].map(n=>[n,n]))}${craftSelect('race','Dla kogo',['Saiyan','Ziemianin','Demon Mrozu','Nameczanin','Majin'].map((name,i)=>[i+1,name]))}</div>
   <div><div class="dbi-smith-materials">${[0,1,2].map(i=>{const id=craftMaterials[i],item=id?itemById(id):null;return `<div><div class="dbi-smith-slot">${item?dbiItemArt(item):''}</div>${item?`<div class="dbi-smith-muted">${esc(item.name)}<br>${dbiUpgradeMaterialCount(id)} / 1</div>`:''}</div>`}).join('')}</div><p class="dbi-smith-muted">Szansa na pomyślne stworzenie przedmiotu: ${craftMaterials.length?DBI_CRAFT_CHANCE+'%':'—'}<br>Szansa na większą ilość bonusów: ${craftMaterials.length?'0%':'—'}<br><img class="dbi-gold-icon" src="assets/ui/gold.png" alt="" width="16" height="16">Koszt złota na jedną próbę: ${craftMaterials.length?DBI_CRAFT_GOLD.toLocaleString('pl-PL'):'—'}</p><button type="button" id="dbiCraftCreate" class="${craftReady?'gold-button':'dbi-smith-disabled'}" ${craftReady?'':'disabled'} style="width:100%;margin-top:12px">Stwórz</button><p class="dbi-smith-status" role="status">${esc(craftMessage||(dbiCraftSelection.level&&dbiCraftSelection.level!=='1'?'Brak receptury dla tego poziomu.':''))}</p></div>
   <div class="dbi-smith-preview-area"><div class="dbi-smith-preview" id="dbiCraftPreview">${crafted?`<div>${dbiItemArt(crafted)}<div>${esc(crafted.name)} +0</div></div>`:'Podgląd stworzonego przedmiotu'}</div><div class="dbi-smith-preview-buttons"><button type="button" id="dbiCraftAccept" class="${crafted?'gold-button':'dbi-smith-disabled'}" ${crafted?'':'disabled'}>Akceptuj</button><button type="button" id="dbiCraftDiscard" class="${pending?'ghost-button':'dbi-smith-disabled'}" ${pending?'':'disabled'}>Usuń</button></div></div>
  </div></section>
  <section class="dbi-smith-panel"><h3>⚒️ Ulepszanie jakości przedmiotów</h3><div class="dbi-smith-quality"><div class="dbi-smith-quality-target" id="dbiSmithTarget" aria-label="Okienko jakości">${selected?dbiItemArt(selected):'<span class="dbi-smith-muted">Miejsce na przedmiot do podniesienia jego jakości</span>'}</div><div class="dbi-smith-quality-work"><div class="dbi-smith-materials">${(recipe?materials:['Substancja Wynosząca','Części zamienne','Moduł Jakości'].map(name=>({item:{name}}))).map(m=>`<div><div class="dbi-smith-slot">${m.item?.image?dbiItemArt(m.item):''}</div><div class="dbi-smith-muted" style="text-align:center">${esc(m.item?.name||m.id)}${recipe?`<br>${m.owned} / ${m.count}`:''}</div></div>`).join('')}</div><p class="dbi-smith-muted">${selected?`${esc(selected.quality||QUALITY[0])}${recipe?' → '+QUALITY[recipe.tier]:' · maksymalna jakość'}<br>`:''}Szansa na powodzenie: ${recipe?recipe.chance+'%':'—'}<br><img class="dbi-gold-icon" src="assets/ui/gold.png" alt="" width="16" height="16">Koszt złota na jedną próbę: ${qualityCost}</p><button type="button" id="dbiSmithUpgrade" class="${ready?'gold-button':'dbi-smith-disabled'}" ${ready?'':'disabled'} style="width:min(100%,240px)">Podnieś jakość</button></div></div><p class="dbi-smith-status" id="dbiSmithStatus" role="status">${esc(message)}</p></section>
  </div><aside class="dbi-smith-inventory dbi-smith-panel"><h3>🧰 INWENTARZ</h3><div class="inv-tabs">${['I','II','III','IV','V','VI'].map((n,i)=>`<button type="button" class="inv-tab ${inventoryTab===i?'active':''}" data-tab="${i}">${n}</button>`).join('')}</div><div class="inv-scroll"><div class="inv-grid">${renderInventoryGrid()}</div></div><div class="inv-actions"><button type="button" data-smith-action="Sortuj">Sortuj</button><button type="button" data-smith-action="Zaznacz">Zaznacz</button><button type="button" data-smith-action="Zablokuj">Zablokuj</button></div></aside></div>
  </section>`;
 const host=document.querySelector('.dbi-smith-inventory');
 dbiBindSharedInventory(host,{
  refresh:msg=>renderBlacksmith(msg||'Inwentarz został odświeżony.'),
  onClick:()=>{},
  onDoubleClick:dbiSmithPick,
  setMessage:msg=>{const el=document.querySelector('#dbiSmithStatus');if(el)el.textContent=msg}
 });
 const target=document.querySelector('#dbiSmithTarget');
 target.addEventListener('click',()=>{if(dbiSmithSelection){dbiSmithSelection=null;renderBlacksmith()}});
 if(selected){
  target.addEventListener('mouseenter',e=>showTooltipItem(e,selected));
  target.addEventListener('mousemove',e=>{const tip=document.querySelector('#itemTooltip');if(tip&&!tip.hidden)positionPopup(tip,e.clientX,e.clientY)});
  target.addEventListener('mouseleave',()=>document.querySelector('#itemTooltip')?.setAttribute('hidden',''));
 }
 target.addEventListener('dragover',event=>{
  if(dragIndex===null)return;
  event.preventDefault();event.dataTransfer.dropEffect='move';target.classList.add('drop-target');
 });
 target.addEventListener('dragleave',()=>target.classList.remove('drop-target'));
 target.addEventListener('drop',event=>{
  if(dragIndex===null)return;
  event.preventDefault();event.stopPropagation();target.classList.remove('drop-target');
  const index=dragIndex;
  dragCompleted=true;dragIndex=null;dragActive=false;dragSourceElement=null;
  dbiSmithPick(index);
 });
 const panel=document.querySelector('.dbi-smith');
 const checkpointTip=document.createElement('div');
 checkpointTip.id='dbiSmithCheckpointTip';
 checkpointTip.className='item-tooltip';
 checkpointTip.setAttribute('role','tooltip');
 checkpointTip.style.maxWidth='calc(100vw - 16px)';
 checkpointTip.hidden=true;
 panel.append(checkpointTip);
 panel.querySelectorAll('[data-smith-checkpoint]').forEach(button=>{
  const entry=DBI_SMITH_CHECKPOINTS.find(({level})=>level===Number(button.dataset.smithCheckpoint));
  const show=()=>{
   const rect=button.getBoundingClientRect();
   checkpointTip.innerHTML=`<div class="tip-name">Poziom ${entry.level} · ${progress.level>=entry.level?'Zdobyty':'Do zdobycia'}</div><div class="tip-stats">${esc(entry.label)}</div>`;
   checkpointTip.hidden=false;
   positionPopup(checkpointTip,rect.left,rect.bottom);
  };
  const hide=()=>{checkpointTip.hidden=true};
  button.addEventListener('mouseenter',show);
  button.addEventListener('mouseleave',hide);
  button.addEventListener('focus',show);
  button.addEventListener('blur',hide);
  button.addEventListener('keydown',e=>{if(e.key==='Escape')hide()});
 });
 panel.querySelectorAll('[data-craft-select]').forEach(select=>select.addEventListener('change',()=>{
  dbiCraftSelection[select.dataset.craftSelect]=select.value;
  renderBlacksmith();
  document.querySelector(`[data-craft-select="${select.dataset.craftSelect}"]`)?.focus();
 }));
 panel.querySelector('#dbiCraftCreate').addEventListener('click',dbiCraftAttempt);
 panel.querySelector('#dbiCraftAccept').addEventListener('click',()=>dbiCraftResolve(true));
 panel.querySelector('#dbiCraftDiscard').addEventListener('click',()=>dbiCraftResolve(false));
 if(crafted){
  const preview=panel.querySelector('#dbiCraftPreview');
  preview.addEventListener('mouseenter',e=>showTooltipItem(e,crafted));
  preview.addEventListener('mousemove',e=>{const tip=document.querySelector('#itemTooltip');if(tip&&!tip.hidden)positionPopup(tip,e.clientX,e.clientY)});
  preview.addEventListener('mouseleave',()=>document.querySelector('#itemTooltip')?.setAttribute('hidden',''));
 }
 document.querySelector('#dbiSmithUpgrade').addEventListener('click',dbiSmithAttempt);
 host.querySelectorAll('[data-smith-action]').forEach(btn=>btn.addEventListener('click',()=>{const el=document.querySelector('#dbiSmithStatus');if(el)el.textContent='Funkcja '+btn.dataset.smithAction+' pozostaje dostępna w głównym Ekwipunku.'}));
}

const DBI_PLAN_SUCCESS_CHANCES=[100,80,70,50];
function dbiAvailablePlanBonuses(item,sourceId=DBI_REINFORCEMENT_PLANS.id){
 if(!item||item.planBonuses.length+(item.reinforced?1:0)>=4)return [];
 const pool=sourceId===DBI_ADDITION_CHIP.id?dbiChipPool(item):DBI_PLAN_POOLS[item.slot]||[];
 return pool.filter(key=>!item.planBonuses.some(([used])=>used===key));
}
function dbiCanReinforce(item,sourceId){return dbiAvailablePlanBonuses(item,sourceId).length>0}
function dbiApplyReinforcement(planIndex,targetIndex){
 const sourceId=dbiDecodeItemRef(inventory[planIndex]).id;
 const chip=sourceId===DBI_ADDITION_CHIP.id;
 if(planIndex===targetIndex||(!chip&&sourceId!==DBI_REINFORCEMENT_PLANS.id))return 'Wybierz przedmiot do dodawania bonusów.';
 const target=itemById(inventory[targetIndex]);
 const available=dbiAvailablePlanBonuses(target,sourceId);
 if(!available.length)return 'Brak dostępnego miejsca na bonus.';
 const chance=DBI_PLAN_SUCCESS_CHANCES[target.planBonuses.length+(target.reinforced?1:0)];
 const success=chance===100||Math.random()*100<chance;
 const items=inventory.slice(),positions=inventoryPlacement.slice();
 let message=chip?'Nie udało się dodać bonusu. Zużyto jeden Czip dodania.':'Nie udało się dodać bonusu. Zużyto jeden Plan wzmocnień.';
 if(success){
  const entry=dbiRollPlanBonus(available);
  const {id,enhancement,quality,reinforced}=dbiDecodeItemRef(inventory[targetIndex]);
  items[targetIndex]=dbiItemRef(id,enhancement,quality,reinforced,[...target.planBonuses,entry]);
  message='Dodano bonus: '+dbiPlanLabel(entry)+'.';
 }
 return dbiSaveAppliedScroll(items,positions,planIndex)?message:'Nie udało się zapisać wzmocnienia.';
}
function dbiRollPlanBonus(pool){
 return dbiRollPlanBonusValue(pool[dbiPlanInteger(0,pool.length-1)]);
}
function dbiRollPlanBonusValue(key){
 const [,min,max,,scale=1]=DBI_PLAN_STAT_DEFS[key];
 const value=dbiPlanInteger(min*scale,max*scale)/scale;
 return [key,value,dbiPlanPvpValue(key,value)];
}
function dbiSaveAppliedScroll(items,positions,index){
 const ref=items[index];
 const position=items.indexOf(ref)===index?positions[index]:null;
 items.splice(index,1);positions.splice(index,1);
 const next=position?items.indexOf(ref):-1;
 if(next!==-1)positions[next]=position;
 return dbiSaveInventoryTransaction(items,positions,[]);
}
function dbiRerollPool(item,sourceId){
 if(!item)return [];
 if(sourceId===DBI_CHANGE_SCROLL.id)return DBI_PLAN_POOLS[item.slot]||[];
 if(sourceId!==DBI_UPDATING_CHIP.id)return [];
 const pool=dbiChipPool(item);
 return pool.length&&item.slot==='esencja'?[...pool,...DBI_AVERAGE_DAMAGE_KEYS]:pool;
}
function dbiCanReroll(item,sourceId=DBI_CHANGE_SCROLL.id){
 if(!item)return false;
 const count=item.planBonuses.length+Number(!!item.reinforced);
 return count>0&&dbiRerollPool(item,sourceId).length>=count;
}
function dbiRollReplacementBonuses(pool,count){
 let remaining=[...pool];
 const bonuses=[];
 while(bonuses.length<count){
  if(count-bonuses.length===1)remaining=remaining.filter(key=>!DBI_AVERAGE_DAMAGE_KEYS.includes(key));
  const key=remaining[dbiPlanInteger(0,remaining.length-1)];
  if(DBI_AVERAGE_DAMAGE_KEYS.includes(key)){
   const values=DBI_AVERAGE_DAMAGE_PAIRS[dbiPlanInteger(0,DBI_AVERAGE_DAMAGE_PAIRS.length-1)];
   const other=DBI_AVERAGE_DAMAGE_KEYS.find(candidate=>candidate!==key);
   bonuses.push([key,values[DBI_AVERAGE_DAMAGE_KEYS.indexOf(key)],0],[other,values[DBI_AVERAGE_DAMAGE_KEYS.indexOf(other)],0]);
   remaining=remaining.filter(candidate=>!DBI_AVERAGE_DAMAGE_KEYS.includes(candidate));
  }else{
   bonuses.push(dbiRollPlanBonusValue(key));
   remaining.splice(remaining.indexOf(key),1);
  }
 }
 return bonuses;
}
function dbiApplyChangeScroll(sourceIndex,targetIndex){
 const target=itemById(inventory[targetIndex]);
 const sourceId=dbiDecodeItemRef(inventory[sourceIndex]).id;
 if(!dbiCanReroll(target,sourceId))return 'Ten przedmiot nie ma bonusów do zmiany.';
 const pool=[...dbiRerollPool(target,sourceId)];
 const count=target.planBonuses.length+Number(!!target.reinforced);
 const bonuses=dbiRollReplacementBonuses(pool,count);
 const {id,enhancement,quality}=dbiDecodeItemRef(inventory[targetIndex]);
 const items=inventory.slice(),positions=inventoryPlacement.slice();
 items[targetIndex]=dbiItemRef(id,enhancement,quality,false,bonuses);
 return dbiSaveAppliedScroll(items,positions,sourceIndex)
  ?'Przelosowano bonusy: '+bonuses.map(dbiPlanLabel).join(' · ')+'.'
  :'Nie udało się zapisać zmiany bonusów.';
}
function dbiBindSharedInventory(host,{refresh,onClick,onDoubleClick,onContextMenu=itemActions,onDragStart=()=>{},onDragEnd=()=>{},setMessage=()=>{}}){
 const tabs=host.querySelector('.inv-tabs');
 let highlightedCell=null;
 function clearReinforcementHighlight(){
  if(highlightedCell)delete highlightedCell.dataset.reinforcementTarget;
  highlightedCell=null;
 }
 if(!document.getElementById('dbi-reinforcement-highlight')){
  const style=document.createElement('style');
  style.id='dbi-reinforcement-highlight';
  style.textContent=`
   .inv-grid .inv-cell[data-reinforcement-target="valid"]{--dbi-plan-glow:#5dff8b}
   .inv-grid .inv-cell[data-reinforcement-target="invalid"]{--dbi-plan-glow:#ff626c}
   .inv-grid .inv-cell[data-reinforcement-target]{
    outline:2px solid var(--dbi-plan-glow);outline-offset:-2px;
    box-shadow:inset 0 0 12px var(--dbi-plan-glow),0 0 8px var(--dbi-plan-glow);
    animation:dbi-plan-glow 700ms ease-in-out infinite alternate;
   }
   @keyframes dbi-plan-glow{
    to{box-shadow:inset 0 0 20px var(--dbi-plan-glow),0 0 12px var(--dbi-plan-glow)}
   }
   @media(prefers-reduced-motion:reduce){.inv-grid .inv-cell[data-reinforcement-target]{animation:none}}
  `;
  document.head.appendChild(style);
 }
 function clearTabHover(){clearTimeout(tabHoverTimer);tabHoverTimer=null;tabs.querySelectorAll('.inv-tab').forEach(b=>b.classList.remove('tab-loading'))}
 function switchTabDuringDrag(next){
  if(dragIndex===null||inventoryTab===next)return;
  clearReinforcementHighlight();
  inventoryTab=next;
  tabs.querySelectorAll('.inv-tab').forEach(b=>b.classList.toggle('active',Number(b.dataset.tab)===next));
  [...grid.children].forEach(el=>{if(el!==preview&&el!==dragSourceElement)el.remove()});
  if(dragSourceElement){dragSourceElement.dataset.parked='1';dragSourceElement.style.cssText+=';position:absolute;left:-9999px;top:-9999px;opacity:0;pointer-events:none';}
  grid.insertAdjacentHTML('afterbegin',renderInventoryGrid());
  bindInventoryItems();
  preview.hidden=true;proposedCell=null;
  setMessage('Karta '+(next+1)+' — wybierz wolne miejsce i upuść przedmiot.');
 }
 tabs.querySelectorAll('.inv-tab').forEach(b=>{
  const target=Number(b.dataset.tab);
  b.addEventListener('click',()=>{if(dragIndex!==null)return;inventoryTab=target;refresh()});
  b.addEventListener('dragenter',e=>{if(dragIndex===null||inventoryTab===target)return;e.preventDefault();clearTabHover();b.classList.add('tab-loading');tabHoverTimer=setTimeout(()=>{clearTabHover();switchTabDuringDrag(target)},650)});
  b.addEventListener('dragover',e=>{if(dragIndex===null)return;e.preventDefault();e.dataTransfer.dropEffect='move'});
  b.addEventListener('dragleave',e=>{if(!b.contains(e.relatedTarget))clearTabHover()});
  b.addEventListener('drop',e=>{if(dragIndex!==null){e.preventDefault();clearTabHover()}});
 });
 const grid=host.querySelector('.inv-grid');
 function bindInventoryItems(){
  grid.querySelectorAll('.inv-cell[data-index]:not([data-bound])').forEach(b=>{
   b.dataset.bound='1';const index=Number(b.dataset.index);
   b.addEventListener('click',()=>{if(!dragActive)onClick(index)});
   b.addEventListener('mouseenter',e=>showTooltip(e,index));
   b.addEventListener('mousemove',e=>{const tip=document.querySelector('#itemTooltip');if(tip&&!tip.hidden)positionPopup(tip,e.clientX,e.clientY)});
   b.addEventListener('mouseleave',()=>document.querySelector('#itemTooltip')?.setAttribute('hidden',''));
   b.addEventListener('dblclick',e=>{e.preventDefault();if(!dragActive)onDoubleClick(index)});
   b.addEventListener('contextmenu',e=>{e.preventDefault();onContextMenu(e,index)});
   b.addEventListener('dragstart',e=>{dragIndex=index;dragActive=true;dragCompleted=false;dragSourceElement=b;const r=b.getBoundingClientRect();dragOffset={x:e.clientX-r.left,y:e.clientY-r.top};hideItemPopups();e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(index));onDragStart(index)});
   b.addEventListener('dragend',()=>{
    onDragEnd();const wasActive=dragActive,switched=dragSourceElement?.dataset.parked==='1';
    clearReinforcementHighlight();
    clearTabHover();dragIndex=null;dragActive=false;dragSourceElement=null;
    document.querySelectorAll('.drop-target').forEach(x=>x.classList.remove('drop-target'));
    if(preview.isConnected){preview.hidden=true;preview.classList.remove('invalid')}
    if(switched&&wasActive&&!dragCompleted)refresh('Przeciąganie anulowane — przedmiot pozostał na swoim miejscu.');
   });
  });
 }
 bindInventoryItems();
 // Jedna nakładka podglądu obejmuje dokładnie 1 lub 2 kratki.
 // Pozycję wyznaczamy z geometrii siatki, a nie z elementu pod kursorem.
 const preview=document.createElement('div');preview.className='inv-drop-preview';preview.hidden=true;grid.append(preview);
 let proposedCell=null;
 function geometry(){
  const r=grid.getBoundingClientRect(),style=getComputedStyle(grid);
  const gap=parseFloat(style.columnGap)||4;
  const width=(r.width-gap*5)/6;
  const rowGap=parseFloat(style.rowGap)||4;
  const rowHeight=(r.height-rowGap*9)/10;
  return {r,gap,width,rowGap,rowHeight,stepX:width+gap,stepY:rowHeight+rowGap};
 }
 function destination(e){
  const g=geometry();
  const x=e.clientX-g.r.left-dragOffset.x;
  const y=e.clientY-g.r.top-dragOffset.y;
  const col=Math.max(0,Math.min(5,Math.round(x/g.stepX)));
  const tall=itemTall(inventory[dragIndex]);
  const row=Math.max(0,Math.min(tall?8:9,Math.round(y/g.stepY)));
  return {cell:row*6+col,col,row,tall,g};
 }
 function validTarget(cell){
  const occupied=new Set();
  for(const entry of inventoryPages()[inventoryTab]||[]){
   if(entry.index===dragIndex)continue;
   occupied.add(entry.cell);if(entry.tall)occupied.add(entry.cell+6);
  }
  return fits(cell,itemTall(inventory[dragIndex]),occupied);
 }
 function updatePreview(e){
  if(dragIndex===null)return;
  const {cell,col,row,tall,g}=destination(e);
  const valid=validTarget(cell);
  proposedCell=cell;
  preview.hidden=false;
  preview.classList.toggle('invalid',!valid);
  preview.style.left=(col*g.stepX)+'px';
  preview.style.top=(row*g.stepY)+'px';
  preview.style.width=g.width+'px';
  preview.style.height=(g.rowHeight*(tall?2:1)+g.rowGap*(tall?1:0))+'px';
  preview.setAttribute('aria-label',valid?'Wolne miejsce':'Miejsce zajęte');
 }
 const draggedBonusItemId=()=>dbiDecodeItemRef(inventory[dragIndex]).id;
 const isChangeScroll=()=>[DBI_CHANGE_SCROLL.id,DBI_UPDATING_CHIP.id].includes(draggedBonusItemId());
 const canApplyDraggedScroll=index=>(isChangeScroll()?dbiCanReroll:dbiCanReinforce)(itemById(inventory[index]),draggedBonusItemId());
 function reinforcementTarget(e){
  if(![DBI_CHANGE_SCROLL.id,DBI_REINFORCEMENT_PLANS.id,DBI_ADDITION_CHIP.id,DBI_UPDATING_CHIP.id].includes(draggedBonusItemId()))return null;
  const cell=e.target.closest('.inv-cell[data-index]');
  if(!cell||Number(cell.dataset.index)===dragIndex)return null;
  return cell;
 }
 grid.addEventListener('dragover',e=>{
  if(dragIndex===null)return;
  e.preventDefault();e.dataTransfer.dropEffect='move';
  const target=reinforcementTarget(e);
  if(target!==highlightedCell){
   clearReinforcementHighlight();
   if(target){
    target.dataset.reinforcementTarget=canApplyDraggedScroll(Number(target.dataset.index))?'valid':'invalid';
    highlightedCell=target;
   }
  }
  if(target){preview.hidden=true;proposedCell=null;return}
  updatePreview(e);
 });
 grid.addEventListener('dragleave',e=>{
  const r=grid.getBoundingClientRect();
  if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){clearReinforcementHighlight();preview.hidden=true;proposedCell=null}
 });
 grid.addEventListener('drop',e=>{
  if(dragIndex===null)return;
  e.preventDefault();e.stopPropagation();
  const target=reinforcementTarget(e);
  clearReinforcementHighlight();
  if(target){
   const targetIndex=Number(target.dataset.index);
   if(!canApplyDraggedScroll(targetIndex)){
    return;
   }
   const message=(isChangeScroll()?dbiApplyChangeScroll:dbiApplyReinforcement)(dragIndex,targetIndex);
   dragCompleted=true;clearTabHover();dragIndex=null;dragActive=false;preview.hidden=true;proposedCell=null;
   refresh(message);return;
  }
  updatePreview(e);
  const cell=proposedCell,idx=dragIndex;
  dragCompleted=true;clearTabHover();dragIndex=null;dragActive=false;preview.hidden=true;proposedCell=null;
  if(cell!==null&&moveItem(idx,inventoryTab,cell))refresh('Przesunięto przedmiot na kartę '+(inventoryTab+1)+'.');
  else setMessage('Nie można umieścić przedmiotu tutaj. Wymagane są wolne kratki.');
 });
 host.querySelectorAll('.inv-actions button').forEach(b=>b.onclick=()=>{setMessage(b.dataset.action+' — opcja do późniejszego wdrożenia.');});
}
function dbiEquipmentRequirement(item){
 if(level<(Number(item.requiredLevel)||1))return 'Wymagany poziom: '+item.requiredLevel;
 const race=String(dbiCharacters[dbiCharacterIndex]?.race||'').toLowerCase();
 if(item.requiredRace==='saiyan'&&!['saiyan','saiyanin','sayan'].includes(race))return 'Wymagana rasa: Saiyan.';
 return '';
}
function renderEquipment(message='Kliknij przedmiot w inwentarzu, aby go założyć.'){
 hideItemPopups();
 dbiSaveInventory();dbiSaveEquipped();
 document.querySelector('#breadcrumb').textContent='POSTAĆ / EKWIPUNEK';
 const current=equipped[equipmentSet], worn=Object.values(current).map(itemById).filter(Boolean),stats=sums(worn);
 document.querySelector('#pageBody').innerHTML=`<div class="equipment-layout astral-equipment">
 <section class="eq-panel eq-left"><div class="astral-eq-heading"><h2>Wyposażenie</h2><p class="eq-caption">${worn.length} / ${DBI_SLOTS.length} założonych przedmiotów · ${equipmentSet}</p></div>
 <div class="eq-doll"><div class="eq-body-outline" aria-hidden="true">✦</div><div class="eq-slots">${DBI_SLOTS.map(([label,id,col,row,height],index)=>{
 const item=itemById(current[id]);return `<button class="eq-slot ${item?'occupied':''} ${selectedSlot===id?'active':''}" data-slot="${id}" style="--eq-index:${index}" title="${item?'':esc(label)}" aria-label="${esc(label)}"><span class="slot-art">${dbiItemArt(item)}</span><span class="slot-name">${item?'':esc(label)}</span></button>`}).join('')}</div></div>
 <div class="eq-sets"><button class="eq-set ${equipmentSet==='Główny'?'active':''}" data-set="Główny">Zestaw główny</button><button class="eq-set ${equipmentSet==='PvP'?'active':''}" data-set="PvP">Zestaw PvP</button></div><p class="eq-selection" id="eqSelection" role="status">${esc(message)}</p></section>
 <section class="eq-panel eq-right"><div class="astral-eq-heading"><h2>Ekwipunek</h2></div><div class="inv-tabs">${['I','II','III','IV','V','VI'].map((x,i)=>`<button class="inv-tab ${inventoryTab===i?'active':''}" data-tab="${i}">${x}</button>`).join('')}</div><div class="inv-scroll"><div class="inv-grid">${renderInventoryGrid()}</div></div><div class="inv-actions"><button data-action="Sortuj">Sortuj</button><button data-action="Zaznacz">Zaznacz</button><button data-action="Zablokuj">Zablokuj</button></div></section></div>`;
 // Ten sam dymek co w inwentarzu również na założonych przedmiotach.
 document.querySelectorAll('.eq-slot.occupied').forEach(slot=>{
  const item=itemById(current[slot.dataset.slot]);
  if(!item)return;
  slot.addEventListener('mouseenter',e=>showTooltipItem(e,item));
  slot.addEventListener('mousemove',e=>{const tip=document.querySelector('#itemTooltip');if(tip&&!tip.hidden)positionPopup(tip,e.clientX,e.clientY)});
  slot.addEventListener('mouseleave',()=>document.querySelector('#itemTooltip')?.setAttribute('hidden',''));
 });
 document.querySelectorAll('.eq-slot').forEach(b=>b.onclick=()=>{const id=b.dataset.slot;selectedSlot=id;if(current[id]){const item=itemById(current[id]);inventory.push(current[id]);inventoryPlacement.push(null);delete current[id];renderEquipment('Zdjęto: '+(item?.name||id))}else renderEquipment('Pusty slot: '+DBI_SLOTS.find(x=>x[1]===id)[0]);});
 // Drop na slot postaci: przedmiot zostaje założony, nie trzeba go klikać.
 document.querySelectorAll('.eq-slot').forEach(slot=>{
  slot.addEventListener('dragover',e=>{if(dragIndex===null)return;const item=itemById(inventory[dragIndex]);if(item?.slot!==slot.dataset.slot||current[slot.dataset.slot])return;e.preventDefault();e.dataTransfer.dropEffect='move';slot.classList.add('drop-target')});
  slot.addEventListener('dragleave',()=>slot.classList.remove('drop-target'));
  slot.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();slot.classList.remove('drop-target');const idx=dragIndex;dragIndex=null;dragActive=false;if(idx===null)return;const item=itemById(inventory[idx]);if(!item||item.slot!==slot.dataset.slot){document.querySelector('#eqSelection').textContent='Ten przedmiot nie pasuje do wybranego slotu.';return}const requirement=dbiEquipmentRequirement(item);if(requirement){document.querySelector('#eqSelection').textContent=requirement;return}if(current[item.slot]){document.querySelector('#eqSelection').textContent='Slot jest zajęty.';return}current[item.slot]=inventory[idx];inventory.splice(idx,1);inventoryPlacement.splice(idx,1);renderEquipment('Założono: '+item.name)});
 });
 document.querySelectorAll('.eq-set').forEach(b=>b.onclick=()=>{equipmentSet=b.dataset.set;renderEquipment('Zestaw: '+equipmentSet)});
 // Podczas przeciągania NIE przebudowujemy całej karty: usunięcie źródła kończy natywny drag.
 dbiBindSharedInventory(document.querySelector('.eq-right'),{
  refresh:message=>renderEquipment(message),
  onClick:index=>{const id=inventory[index],item=itemById(id);if(!item)return;if(item.id===DBI_REINFORCEMENT_PLANS.id||item.id===DBI_CHANGE_SCROLL.id||item.id===DBI_ADDITION_CHIP.id||item.id===DBI_UPDATING_CHIP.id)return renderEquipment(item.description);if(dbiIsUsableItem(item))return;if(!DBI_SLOTS.some(slot=>slot[1]===item.slot))return renderEquipment('Ten przedmiot jest nagrodą z zadania i nie można go założyć.');const requirement=dbiEquipmentRequirement(item);if(requirement)return renderEquipment(requirement);if(current[item.slot])return renderEquipment('Ten slot jest zajęty. Zdejmij poprzedni przedmiot.');current[item.slot]=id;inventory.splice(index,1);inventoryPlacement.splice(index,1);renderEquipment('Założono: '+item.name)},
  onDoubleClick:index=>dbiOpenUsableItem(index),
  setMessage:message=>{const el=document.querySelector('#eqSelection');if(el)el.textContent=message}
 });
}
const DBI_TEST_SAVE_PREFIXES = [
 "dboidle_arena_v1_",
 "dboidle_battle_v1_",
 "dboidle_central_fisherman_v1_",
 "dboidle_central_lost_father_v1_",
 "dboidle_central_woodcutter_v1_",
 "dboidle_combat_layout_v1_",
 "dboidle_craft_pending_v1_",
 "dboidle_daily_v1_",
 "dboidle_dashboard_v1_",
 "dboidle_dragon_wallet_v1_",
 "dboidle_equipped_v1_",
 "dboidle_forest_boss_victory_v1_",
 "dboidle_forest_boss_wins_daily_v1_",
 "dboidle_forest_bulma_v1_",
 "dboidle_forest_roshi_v1_",
 "dboidle_gold_v1_",
 "dboidle_high_tower_journey_v1_",
 "dboidle_inventory_positions_v1_",
 "dboidle_inventory_v1_",
 "dboidle_mountain_roshi_v1_",
 "dboidle_mountain_wanderer_v1_",
 "dboidle_premium_v1_",
 "dboidle_pve_settings_v1_",
 "dboidle_quest_extra_",
 "dboidle_quest_island_krillin_v1_",
 "dboidle_quest_island_students_v1_",
 "dboidle_quest_laguna_belt_v1_",
 "dboidle_quest_laguna_v1_",
 "dboidle_quest_master_camp_v1_",
 "dboidle_quest_master_krillin_v1_",
 "dboidle_quest_turtle_island_v1_",
 "dboidle_skills_v1_",
 "dboidle_smith_exp_v1_",
 "dboidle_spiritual_v1_",
 "dboidle_stadium_tournament_v1_",
 "dboidle_technique_quest_unlock_v1_",
 "dboidle_techniques_v1_",
 "dboidle_training_v1_",
 "dboidle_turtle_first_drop_v1_",
 "dboidle_upgrade_slot_v1_",
 "dboidle_world_v1_",
 "dboidle_zen_effects_v1_"
];
function dbiBuildTestExport(){
 const accounts=[],seen=new Set();
 for(let i=0;i<localStorage.length;i++){
  const key=localStorage.key(i);
  const prefix='dboidle_characters_v1_';
  if(!key?.startsWith(prefix))continue;
  const login=key.slice(prefix.length),list=dbiRankRead(key,[]);
  if(!login||!Array.isArray(list))continue;
  const characters=list.filter(c=>c&&typeof c.id==='string'&&c.id&&typeof c.name==='string').map(character=>{
   if(seen.has(character.id))throw new Error('Powtarzający się identyfikator postaci: '+character.id);
   seen.add(character.id);
   const save={};
   for(const field of DBI_TEST_SAVE_PREFIXES){
    const raw=localStorage.getItem(field+character.id);
    if(raw!==null)save[field]=raw;
   }
   return {character,save};
  });
  if(characters.length)accounts.push({login,characters});
 }
 return {format:'dboidle-test-export-v1',exportedAt:new Date().toISOString(),accounts,catalog};
}
function dbiDownloadTestExport(){
 const status=document.querySelector('#gmMessage');
 try{
  const bundle=dbiBuildTestExport();
  if(!bundle.accounts.length){status.textContent='Brak lokalnych postaci do eksportu.';return}
  const url=URL.createObjectURL(new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}));
  const link=document.createElement('a');
  link.href=url;link.download='DBOidle_Postacie_Testowe.json';
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  const count=bundle.accounts.reduce((sum,account)=>sum+account.characters.length,0);
  status.textContent='Wyeksportowano postacie testowe: '+count+'.';
 }catch(error){status.textContent='Eksport nieudany. '+error.message}
}
const DBI_GM_MAX_GRANT_COUNT=4000;
function dbiGmGrantQuantityField(id=''){
 return `<label class="dbi-gm-enhancement-label">Ilość <input type="number" class="dbi-gm-grant-quantity"${id?' id="'+id+'"':''} min="1" max="${DBI_GM_MAX_GRANT_COUNT}" step="1" value="1" style="width:5.5ch"></label>`;
}
function dbiGmGrantItems(id,enhancement,quantity){
 const item=itemById(id);
 if(!item)return 'Najpierw wybierz zapisany przedmiot.';
 const count=Number(quantity);
 if(!Number.isInteger(count)||count<1||count>DBI_GM_MAX_GRANT_COUNT)return 'Podaj liczbę całkowitą od 1 do '+DBI_GM_MAX_GRANT_COUNT+'.';
 const ref=dbiItemRef(item.id,enhancement);
 const items=inventory.concat(Array(count).fill(ref));
 const positions=inventoryPlacement.concat(Array(count).fill(null));
 if(!dbiSaveInventoryTransaction(items,positions,[]))return 'Nie udało się zapisać przedmiotów w inwentarzu.';
 return 'Dodano do inwentarza: '+item.name+' +'+enhancement+' ×'+count+'.';
}
function renderGM(message='Edytujesz lokalny katalog. Zmiany zapisują się w tej przeglądarce.'){
 if(!dbiIsGameMaster())return;
 dbiRegisterBuiltInItems(DBI_ROYAL_500_CATALOG);
 document.querySelector('#breadcrumb').textContent='PANEL GM / KATALOG';
 document.querySelector('#pageBody').innerHTML=`<div class="gm-layout"><section class="eq-panel"><h2>PANEL GM · PRZEDMIOTY</h2><p><a href="gm.html">Poczta i zarządzanie innymi postaciami</a></p><p class="eq-caption">${catalog.length} definicji w katalogu · lokalny tryb developerski</p><div class="gm-actions"><button id="gmNew">+ Nowy przedmiot</button><button id="gmExport">Eksport JSON</button><button type="button" id="gmExportTestCharacters">Eksport postaci testowych</button><label class="gm-import">Import JSON<input id="gmImport" type="file" accept=".json,application/json" hidden></label></div><div class="dbi-gm-filters"><input id="gmSearch" type="search" placeholder="Szukaj przedmiotu po nazwie lub ID" aria-label="Szukaj przedmiotu"><select id="gmSlotFilter"><option value="">Wszystkie kategorie</option>${DBI_SLOTS.map(([label,id])=>`<option value="${esc(id)}">${esc(label)}</option>`).join('')}</select></div><div class="gm-list" id="gmCatalogList">${catalog.map(x=>`<div class="dbi-gm-catalog-row" data-gm-slot="${esc(x.slot)}" data-gm-query="${esc((x.name+' '+x.id).toLocaleLowerCase('pl'))}"><button type="button" class="gm-item" data-edit="${esc(x.id)}"><span>${dbiItemArt(x)} ${esc(x.name)}</span><small>${esc(x.id)} · ${esc(x.slot)} · ${Number(x.requiredLevel)||1} LVL${itemTall(x.id)?' · 2 kratki':''}</small></button><label class="dbi-gm-enhancement-label">+<select class="dbi-gm-enhancement" aria-label="Poziom ulepszenia">${Array.from({length:DBI_ENHANCEMENT_MAX+1},(_,i)=>`<option value="${i}">${i}</option>`).join("")}</select></label>${dbiGmGrantQuantityField()}<button type="button" class="dbi-gm-quickgrant" data-grant-id="${esc(x.id)}" title="Dodaj do inwentarza">+ Dodaj</button></div>`).join('')}</div><p id="gmMessage" role="status">${esc(message)}</p></section><section class="eq-panel"><h2>EDYTOR PRZEDMIOTU</h2><form id="gmForm" class="gm-form"><label>ID (unikalne)<input name="id" required maxlength="60" pattern="[a-zA-Z0-9_-]+" placeholder="np. bron-002"></label><label>Nazwa<input name="name" required maxlength="80"></label><label>Slot<select name="slot">${slotOptions}</select></label><label>Jakość<select name="quality">${QUALITY.map(q=>`<option value="${q}">${q}</option>`).join('')}</select></label><label>Ikona / emoji<input name="icon" maxlength="12" value="⚔️"></label><label>Atak<input name="attack" type="number" min="0" max="999999" value="0"></label><label>Obrona<input name="defense" type="number" min="0" max="999999" value="0"></label><label>Ki<input name="ki" type="number" min="0" max="999999" value="0"></label><label class="gm-wide">Opis<textarea name="description" rows="3" maxlength="500"></textarea></label><div class="gm-actions gm-wide"><button type="submit">Zapisz przedmiot</button><label class="dbi-gm-enhancement-label">Ulepszenie +<select id="gmEditorEnhancement">${Array.from({length:DBI_ENHANCEMENT_MAX+1},(_,i)=>`<option value="${i}">${i}</option>`).join("")}</select></label>${dbiGmGrantQuantityField('gmEditorQuantity')}<button type="button" id="gmGrant">Dodaj do inwentarza</button><button type="button" id="gmDelete" class="gm-danger">Usuń z katalogu</button></div></form></section></div>`;

 document.querySelector('#gmExportTestCharacters').onclick=dbiDownloadTestExport;
 // GM: dokładne wartości walut i bazowych statystyk aktywnej postaci.
 const gmChar=dbiCharacters[dbiCharacterIndex]||{},gmId=String(dbiActive?.id||'test');
 const gmKeys={gold:'dboidle_gold_v1_'+gmId,dragon:'dboidle_dragon_wallet_v1_'+gmId,premium:'dboidle_premium_v1_'+gmId};
 const gmWallet=()=>{try{return JSON.parse(localStorage.getItem(gmKeys.dragon)||'{}')||{}}catch{return {}}};
 const gmStatVal=keys=>{for(const obj of [gmChar.stats,gmChar.activeStats,gmChar.passiveStats,gmChar.attributes,gmChar]){const v=dbiStatNumber(obj,keys);if(v!==null)return v}return 0};
 const gmExtra=document.createElement('div');gmExtra.className='dbi-gm-extra';
 gmExtra.innerHTML=`<section class="eq-panel"><h2>GM · WALUTY</h2><p class="eq-caption">Postać: ${esc(gmChar.name||'—')}</p><form id="gmMoneyForm" class="dbi-gm-form">
 <label>Złoto<input type="number" name="gold" min="0" max="999999999999" step="1" required value="${Math.max(0,Number(localStorage.getItem(gmKeys.gold))||0)}"></label>
 <label>Smocze Monety<input type="number" name="dragon" min="0" max="999999999999" step="1" required value="${Math.max(0,Number(gmWallet().coins)||0)}"></label>
 <label>Waluta premium<input type="number" name="premium" min="0" max="999999999999" step="1" required value="${Math.max(0,Number(localStorage.getItem(gmKeys.premium))||0)}"></label>
 <button type="submit">Ustaw waluty</button><p id="gmMoneyInfo" role="status"></p></form></section>
 <section class="eq-panel"><h2>GM · STATYSTYKI</h2><p class="eq-caption">Ustawiasz wartości bazowe. Bonusy z ekwipunku są doliczane osobno.</p><form id="gmStatForm" class="dbi-gm-form">
 ${DBI_STAT_GROUPS.map(([group,defs])=>`<fieldset><legend>${esc(group)}</legend><div class="dbi-gm-stat-grid">${defs.map(([label,keys,suffix])=>`<label>${esc(label)}${suffix?' ('+suffix+')':''}<input type="number" step="any" data-gm-stat="${esc(keys[0])}" value="${gmStatVal(keys)}" required></label>`).join('')}</div></fieldset>`).join('')}
 <button type="submit">Zapisz statystyki</button><p id="gmStatInfo" role="status"></p></form></section>
 <section class="eq-panel"><h2>GM · HP I KI</h2><p class="eq-caption">Ustaw maksymalne HP i KI aktywnej postaci. Wartości zostaną użyte podczas kolejnych walk.</p>
 <form id="gmVitalsForm" class="dbi-gm-form">
 <label>Maksymalne HP<input type="number" name="hp" min="0.01" max="999999999999" step="any" required value="${gmChar.stats?.gmMaxHp??Math.max(.01,50+gmStatVal(['endurance','wytrzymalosc'])*.01)}"></label>
 <label>Maksymalne KI<input type="number" name="ki" min="0" max="999999999999" step="any" required value="${gmChar.stats?.gmMaxKi??Math.max(0,100+gmStatVal(['intelligence','inteligencja'])*.01)}"></label>
 <button type="submit">Zapisz HP i KI</button><p id="gmVitalsInfo" role="status"></p></form></section>`;
 const dungeonSection=document.createElement('section');
 dungeonSection.className='eq-panel';
 dungeonSection.innerHTML=`<h2>GM · DUNGEON</h2><p class="eq-caption">Postać: ${esc(gmChar.name||'—')}. Limit jest wspólny dla minigry i automatu. Wpisz 0, aby zablokować wejścia.</p>
 <form class="dbi-gm-form"><label>Dzienny limit wejść<input type="number" name="limit" min="0" max="9007199254740991" step="1" required value="${window.DBIWorld?.dungeonLimit?.(gmId)??1}"></label>
 <button type="submit">Zapisz limit</button><p role="status"></p></form>`;
 dungeonSection.querySelector('form').onsubmit=e=>{
  e.preventDefault();
  const field=e.currentTarget.elements.limit,limit=field.valueAsNumber;
  const info=e.currentTarget.querySelector('[role="status"]');
  if(!dbiIsGameMaster()||!dbiActive?.id||!Number.isSafeInteger(limit)||limit<0){
   info.textContent='Podaj nieujemną liczbę całkowitą dla aktywnej postaci.';
   return;
  }
  info.textContent=window.DBIWorld?.gmSetDungeonLimit?.(dbiActive.id,limit)
   ?'Zapisano limit: '+limit+' dziennie.'
   :'Nie udało się zapisać limitu.';
 };
 gmExtra.append(dungeonSection);
 // Teleport GM: wybór z rejestru map; zapis pozycji dla aktywnej postaci.
 const gmLocations=window.DBIWorld?.locations||[];
 const gmTeleportSection=document.createElement('section');
 gmTeleportSection.className='eq-panel';
 gmTeleportSection.innerHTML=`<h2>GM · TELEPORTACJA</h2><p class="eq-caption">Przenieś aktywną postać do wybranej lokacji. Teleport GM nie zalicza misji ani nie odblokowuje fabularnych podróży.</p><form id="gmTeleportForm" class="dbi-gm-form"><label>Lokacja<select name="location" required>${gmLocations.map(loc=>`<option value="${esc(loc.id)}">${esc(loc.name)}</option>`).join('')}</select></label><button type="submit">Teleportuj i otwórz mapę</button><p id="gmTeleportInfo" role="status"></p></form>`;
 gmExtra.append(gmTeleportSection);
 document.querySelector('#pageBody').append(gmExtra);
 document.querySelector('#gmTeleportForm').onsubmit=e=>{
  e.preventDefault();
  const destination=e.currentTarget.elements.location.value;
  const result=window.DBIWorld?.gmTeleport?.(dbiActive?.id,destination);
  if(!result?.ok){document.querySelector('#gmTeleportInfo').textContent=result?.message||'Teleportacja niedostępna.';return}
  showPage('Mapa świata','Świat');
 };

 document.querySelector('#gmMoneyForm').onsubmit=e=>{
  e.preventDefault();const f=new FormData(e.currentTarget),values=['gold','dragon','premium'].map(k=>Number(f.get(k)));
  if(values.some(n=>!Number.isSafeInteger(n)||n<0||n>999999999999)){document.querySelector('#gmMoneyInfo').textContent='Podaj poprawne liczby całkowite.';return}
  localStorage.setItem(gmKeys.gold,String(values[0]));const w=gmWallet();w.coins=values[1];localStorage.setItem(gmKeys.dragon,JSON.stringify(w));localStorage.setItem(gmKeys.premium,String(values[2]));
  dbiRefreshHeaderWallet();document.querySelector('#gmMoneyInfo').textContent='Zapisano trzy waluty.';
 };
 document.querySelector('#gmVitalsForm').onsubmit=e=>{
  e.preventDefault();
  const hp=Number(e.currentTarget.elements.hp.value),ki=Number(e.currentTarget.elements.ki.value);
  const info=document.querySelector('#gmVitalsInfo');
  if(!Number.isFinite(hp)||hp<.01||hp>999999999999||!Number.isFinite(ki)||ki<0||ki>999999999999){info.textContent='Podaj poprawne wartości HP i KI.';return}
  const key='dboidle_characters_v1_'+dbiSession.name.toLowerCase();
  let saved=[];try{saved=JSON.parse(localStorage.getItem(key)||'[]')}catch{}
  const i=Array.isArray(saved)?saved.findIndex(c=>c.id===dbiActive.id):-1;
  if(i<0){info.textContent='Nie znaleziono postaci.';return}
  saved[i].stats={...(saved[i].stats||{}),gmMaxHp:hp,gmMaxKi:ki};
  localStorage.setItem(key,JSON.stringify(saved));
  // Aktualizuj również dane postaci w pamięci: walki odczytują je bez ponownego logowania.
  dbiCharacters[i].stats=saved[i].stats;
  gmChar.stats=saved[i].stats;
  info.textContent='Zapisano maksymalne HP i KI.';
 };
 document.querySelector('#gmStatForm').onsubmit=e=>{
  e.preventDefault();const entries=[...e.currentTarget.querySelectorAll('[data-gm-stat]')].map(x=>[x.dataset.gmStat,Number(x.value)]);
  if(entries.some(([k,v])=>!k||!Number.isFinite(v)||v<0||v>999999999999)){document.querySelector('#gmStatInfo').textContent='Nieprawidłowe wartości.';return}
  const key='dboidle_characters_v1_'+dbiSession.name.toLowerCase();let saved=[];try{saved=JSON.parse(localStorage.getItem(key)||'[]')}catch{}
  const i=Array.isArray(saved)?saved.findIndex(c=>c.id===dbiActive.id):-1;
  if(i<0){document.querySelector('#gmStatInfo').textContent='Nie znaleziono postaci.';return}
  const stats={...(saved[i].stats||{})};for(const [k,v] of entries)stats[k]=v;
  saved[i]={...saved[i],stats};localStorage.setItem(key,JSON.stringify(saved));gmChar.stats=stats;
  document.querySelector('#gmStatInfo').textContent='Zapisano statystyki.';
 };
 const gmSearch=document.querySelector('#gmSearch'),gmSlotFilter=document.querySelector('#gmSlotFilter');
 const gmFilter=()=>{const q=gmSearch.value.trim().toLocaleLowerCase('pl'),slot=gmSlotFilter.value;for(const row of document.querySelectorAll('.dbi-gm-catalog-row'))row.hidden=!!((q&&!row.dataset.gmQuery.includes(q))||(slot&&row.dataset.gmSlot!==slot))};
 gmSearch.addEventListener('input',gmFilter);gmSlotFilter.addEventListener('change',gmFilter);
 document.querySelectorAll('[data-grant-id]').forEach(button=>button.onclick=()=>{
  const row=button.closest('.dbi-gm-catalog-row');
  const enhancement=Number(row.querySelector('.dbi-gm-enhancement').value)||0;
  const quantity=row.querySelector('.dbi-gm-grant-quantity').value;
  document.querySelector('#gmMessage').textContent=dbiGmGrantItems(button.dataset.grantId,enhancement,quantity);
 });
 const form=document.querySelector('#gmForm');let editing=null;
 function load(id){const x=itemById(id);if(!x)return;editing=id;for(const key of ['id','name','slot','icon','attack','defense','ki','description','quality'])form.elements[key].value=x[key]??'';form.elements.id.readOnly=true;}
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>load(b.dataset.edit));
 document.querySelector('#gmNew').onclick=()=>{form.reset();editing=null;form.elements.id.readOnly=false;};
 form.onsubmit=e=>{e.preventDefault();const f=new FormData(form);const x={id:String(f.get('id')).trim(),name:String(f.get('name')).trim(),slot:String(f.get('slot')),icon:String(f.get('icon')),attack:Number(f.get('attack')),defense:Number(f.get('defense')),ki:Number(f.get('ki')),description:String(f.get('description')),quality:String(f.get('id')).startsWith('royal-500-')?'Pospolity':String(f.get('quality'))};if(!/^[a-zA-Z0-9_-]+$/.test(x.id)||!x.name||!DBI_SLOTS.some(s=>s[1]===x.slot)||['attack','defense','ki'].some(k=>!Number.isFinite(x[k])||x[k]<0||x[k]>999999))return (document.querySelector('#gmMessage').textContent='Sprawdź dane przedmiotu.');if(DBI_REMOVED_ITEM_IDS.has(x.id))return (document.querySelector('#gmMessage').textContent='Ten przedmiot został usunięty z gry.');if(!editing&&itemById(x.id))return (document.querySelector('#gmMessage').textContent='ID już istnieje.');if(editing){catalog[catalog.findIndex(i=>i.id===editing)]={...catalog[catalog.findIndex(i=>i.id===editing)],...x}}else catalog.push(x);dbiSaveCatalog(catalog);renderGM('Zapisano: '+x.name);load(x.id)};
 document.querySelector('#gmGrant').onclick=()=>{
  const enhancement=Number(document.querySelector('#gmEditorEnhancement').value)||0;
  const quantity=document.querySelector('#gmEditorQuantity').value;
  document.querySelector('#gmMessage').textContent=dbiGmGrantItems(editing||form.elements.id.value,enhancement,quantity);
 };
 document.querySelector('#gmDelete').onclick=()=>{if(!editing)return;const id=editing;catalog=catalog.filter(x=>x.id!==id);inventoryPlacement=inventoryPlacement.filter((_,i)=>dbiDecodeItemRef(inventory[i]).id!==id);inventory=inventory.filter(x=>dbiDecodeItemRef(x).id!==id);Object.values(equipped).forEach(set=>Object.keys(set).forEach(slot=>{if(dbiDecodeItemRef(set[slot]).id===id)delete set[slot]}));dbiSaveCatalog(catalog);renderGM('Usunięto: '+id)};
 document.querySelector('#gmExport').onclick=()=>{const blob=new Blob([JSON.stringify(catalog,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='dragonball-items.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 document.querySelector('#gmImport').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data)||data.some(x=>!x||typeof x.id!=='string'||!/^[\w-]+$/.test(x.id)||typeof x.name!=='string'||!DBI_SLOTS.some(s=>s[1]===x.slot))||new Set(data.map(x=>x.id)).size!==data.length)throw Error('Niepoprawny katalog');catalog=data.filter(x=>x.id!=='starter-white-belt-plus-one'&&!DBI_REMOVED_ITEM_IDS.has(x.id)).map(x=>({id:x.id,name:x.name,slot:x.slot,icon:String(x.icon||''),attack:Number(x.attack)||0,defense:Number(x.defense)||0,ki:Number(x.ki)||0,description:String(x.description||''),quality:QUALITY.includes(x.quality)?x.quality:'Pospolity',image:typeof x.image==='string'?x.image:undefined,requiredLevel:Math.max(1,Number(x.requiredLevel)||1)}));for(const x of catalog)if(x.id.startsWith('royal-500-'))x.quality='Pospolity';dbiRegisterBuiltInItems([...DBI_SAYAN_50_ITEMS,...DBI_ROYAL_500_CATALOG,DBI_REINFORCEMENT_PLANS,DBI_CHANGE_SCROLL,DBI_ADDITION_CHIP,DBI_UPDATING_CHIP]);dbiSaveCatalog(catalog);renderGM('Zaimportowano '+catalog.length+' przedmiotów.')}catch(err){document.querySelector('#gmMessage').textContent='Błąd importu: '+err.message}};
}

// Zamknij menu akcji po kliknięciu poza nim.
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#itemActions')&&!e.target.closest('.inv-cell.has-item'))document.querySelector('#itemActions')?.remove()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')hideItemPopups()});

// Dziennik misji korzysta z tych samych kluczy localStorage co NPC na mapie.
// Nie tworzymy osobnej kopii postępu: w trakcie walki odczytujemy bieżący stan.
let dbiMissionsTimer=null;
function dbiQuestStored(key){
 try{const data=JSON.parse(localStorage.getItem(key)||'null');return data&&typeof data==='object'?data:null}catch{return null}
}
function dbiActiveMissions(){
 const id=String(dbiActive?.id||'test');
 const q1=dbiQuestStored('dboidle_quest_laguna_v1_'+id);
 const q2=dbiQuestStored('dboidle_quest_laguna_belt_v1_'+id);
 const result=[];
 if(q1?.state==='accepted'){
  const count=Math.max(0,Math.min(10,Math.floor(Number(q1.kills)||0)));
  result.push({id:'laguna-saibaman',name:'Oczyść Błękitną Lagunę',location:'Błękitna Laguna · Opiekun Laguny',count,total:10,
   description:'Pokonaj 10 Kukieł Treningowych na EXPowisku.',ready:'Wróć do Opiekuna Laguny i odbierz Upominek Startowy.'});
 }
 if(q2?.state==='accepted'){
  const belt=!!window.DBIWorldInventory?.hasWhiteBelt?.();
  result.push({id:'laguna-belt',name:'Próba Białego Pasa',location:'Błękitna Laguna · Opiekun Laguny',count:belt?1:0,total:1,
   description:'Przynieś Opiekunowi Laguny zwykły Biały Pas z inwentarza. Założony pas nie zalicza zadania.',ready:'Wróć do Opiekuna Laguny i wymień pas na Biały Pas +1.'});
 }
 // Pozostałe questy zapisuje silnik mapy pod osobnymi kluczami.
 // Odczytujemy ich stan bez zmieniania logiki NPC ani zapisu postaci.
 const readState=(prefix)=>dbiQuestStored(prefix+id);
 // Pierwszy etap zadania istnieje u NPC także przed pierwszym zapisem localStorage.
 // Lokalizacja postaci pozwala rozpoznać odblokowane etapy fabuły bez tworzenia
 // fikcyjnych wpisów ani modyfikowania zapisu questa.
 const worldState=dbiQuestStored('dboidle_world_v1_'+id);
 const location=String(worldState?.location||'laguna');
 const mapOrder=['laguna','island','forest','mountain','stadium'];
 const reached=(map)=>mapOrder.includes(location)&&mapOrder.indexOf(location)>=mapOrder.indexOf(map);
 const stage=(prefix)=>Math.max(0,Math.floor(Number(readState(prefix)?.stage)||0));
 const progress=(n,max)=>Math.max(0,Math.min(max,Math.floor(Number(n)||0)));
 const add=(key,name,location,count,total,description,ready)=>result.push({id:key,name,location,count:progress(count,total),total,description,ready});
 const level=Math.max(1,Math.floor(Number(window.DBIWorldInventory?.character?.()?.level)||1));
 const itemCount=(itemId)=>Number(window.DBIWorldInventory?.countQuestItem?.(itemId))||0;
 const island=readState('dboidle_quest_island_students_v1_');
 if(island?.state==='accepted')add('island-students','Trening u Wielkiego Mistrza','Wyspa Genialnego Żółwia · Wielki Mistrz',island.kills,20,'Pokonaj 20 uczniów mistrza.','Wróć do Wielkiego Mistrza.');
 const krillin=readState('dboidle_quest_island_krillin_v1_');
 const masterKrillin=localStorage.getItem('dboidle_quest_master_krillin_v1_'+id);
 if(masterKrillin==='accepted')add('master-krillin','Próba z Krillinem','Wyspa Genialnego Żółwia · Wielki Mistrz',krillin?.state==='won'||krillin?.state==='completed'?1:0,1,'Pokonaj Krillina w pojedynku.','Wróć do Wielkiego Mistrza po nagrodę.');
 if(localStorage.getItem('dboidle_quest_master_camp_v1_'+id)==='accepted')
  add('master-camp','Wyprawa na obóz treningowy','Wyspa Genialnego Żółwia · Wielki Mistrz',level,5,'Osiągnij poziom 5.','Wróć do Wielkiego Mistrza, aby wyruszyć.');
 const forestRoshi=readState('dboidle_forest_roshi_v1_');
 if(forestRoshi||location==='forest'){
  const st=stage('dboidle_forest_roshi_v1_');
  if(st===0)add('forest-stone','Kamień Żółwia','Dziki Las · Genialny Żółw',itemCount('quest-turtle-stone'),1,'Zdobądź i oddaj Kamień Żółwia.','Oddaj kamień Genialnemu Żółwiowi.');
  if(st===1){
   const spirit=window.DBISpiritual?.hasEarnedPoint?.()===true;
   add('forest-spirit','Trening ducha','Dziki Las · Genialny Żółw',spirit?1:0,1,'Zdobądź jeden punkt rozwoju ducha.','Wróć do Genialnego Żółwia.');
  }
  if(st===2)add('forest-animals','Dzikie zwierzęta','Dziki Las · Genialny Żółw',forestRoshi.kills,30,'Pokonaj 30 dzikich zwierząt.','Wróć po Magiczny Czerwony Kij +4.');
  if(st===3)add('forest-mountain','Ratunek Góry Króla','Dziki Las · Genialny Żółw',level,10,'Osiągnij poziom 10.','Wróć do Genialnego Żółwia.');
 }
 const bulma=readState('dboidle_forest_bulma_v1_');
 if(bulma){
  const st=stage('dboidle_forest_bulma_v1_');
  if(st===1)add('bulma-balls','Smocze kule dla Bulmy','Dziki Las · Bulma',itemCount('small-dragon-balls'),7,'Zbierz 7 Małych Smoczych Kul.','Oddaj kule Bulmie.');
  if(st===2)add('bulma-reward','Nagroda od Bulmy','Dziki Las · Bulma',1,1,'Porozmawiaj z Bulmą, aby otrzymać kapsułę.','Odbierz specjalną kapsułę.');
 }
 // Wędrowiec ma osobny zapis zadania i musi być widoczny również poza mapą.
 const wanderer=readState('dboidle_mountain_wanderer_v1_');
 if(wanderer?.state==='accepted')add('mountain-wanderer','Nauczka dla zamachowców','Góra Króla Lasu · Wędrowiec',wanderer.kills,50,'Pokonaj 50 Zamachowców Góry (każdy wariant).','Wróć do Wędrowca i odbierz +50 do wszystkich statystyk.');
 if(wanderer?.state==='bean-available'||wanderer?.state==='bean-accepted')add('mountain-wanderer-bean','Fasolka dla żony Wędrowca','Góra Króla Lasu · Wędrowiec',Math.min(1,itemCount('zen-bean-red')),1,'Oddaj Czerwoną Fasolkę Zen ×1.','Wróć do Wędrowca, aby otrzymać +50 do obrony.');
 const mountain=readState('dboidle_mountain_roshi_v1_');
 if(mountain||location==='mountain'){
  const st=stage('dboidle_mountain_roshi_v1_');
  if(st===0)add('mountain-fire','Płonąca Góra Króla','Góra Króla Lasu · Genialny Żółw',level,20,'Osiągnij poziom 20.','Porozmawiaj z Genialnym Żółwiem.');
  if(st===1)add('mountain-ki','Kamehameha mistrza','Góra Króla Lasu · Genialny Żółw',1,1,'Obejrzyj technikę mistrza i odbierz +50 KI.','Wróć do Genialnego Żółwia.');
  if(st===2)add('mountain-technique','Podstawy Fali Uderzeniowej','Góra Króla Lasu · Genialny Żółw',1,1,'Poproś mistrza o naukę techniki.','Odbierz technikę Fala Uderzeniowa.');
  if(st===3)add('mountain-stadium','Światowy turniej sztuk walk','Góra Króla Lasu · Genialny Żółw',level,25,'Osiągnij poziom 25 i wyrusz na Stadion 1.','Porozmawiaj z Genialnym Żółwiem, aby wyruszyć.');
 }
 const tournament=readState('dboidle_stadium_tournament_v1_');
 if(tournament||location==='stadium'){
  const st=Math.max(0,Math.floor(Number(tournament.stage)||0));
  const wins=tournament.wins||{};
  if(st===0)add('stadium-outfit','Kimono szkoły żółwia','Stadion 1 · Genialny Żółw',0,1,'Odbierz strój treningowy szkoły żółwia.','Porozmawiaj z Genialnym Żółwiem.');
  if(st>=1&&st<=3){const names=['Giran','Nam','Jackie Chun'];const n=names[st-1];add('stadium-'+n,'Turniej: '+n,'Stadion 1 · Turniej',wins[n]?1:0,1,'Pokonaj '+n+' w walce turniejowej.','Potwierdź zwycięstwo w centrum stadionu.');}
  if(st===4)add('stadium-farewell','Pożegnanie mistrza','Stadion 1 · Genialny Żółw',1,1,'Porozmawiaj z mistrzem po finale.','Wróć na środek stadionu.');
  if(st===5)add('stadium-journey','Samotna podróż','Stadion 1 · Wrota',itemCount('quest-glory-belt'),1,'Posiadaj Pas Chwały i wyrusz w podróż.','Podejdź do wrót stadionu.');
 }
 // Dołącz zadania zarejestrowane przez silnik świata (m.in. Las Centralny).
 // Rejestr korzysta z tych samych zapisów NPC i bieżącego ekwipunku.
 try{
  const worldMissions=window.DBIQuestRegistry?.getMissions?.(id,window.DBIWorldInventory);
  if(Array.isArray(worldMissions)){
   const existing=new Set(result.map(m=>m.id));
   for(const mission of worldMissions){if(mission&&typeof mission.id==='string'&&!existing.has(mission.id)){result.push(mission);existing.add(mission.id)}}
  }
 }catch(error){console.error('Błąd odczytu misji świata:',error)}
 // Awaryjny odczyt zapisanych questów Lasu Centralnego: dziennik działa również
 // gdy rejestr silnika mapy nie został jeszcze zainicjalizowany.
 // Nie duplikujemy misji już dostarczonych przez rejestr.
 const addCentral=(questId,name,npc,state,count,total,description,ready)=>{
  if(!state||result.some(m=>m.id===questId))return;
  result.push({id:questId,name,location:'Las Centralny · '+npc,count:progress(count,total),total,description,ready});
 };
 const wood=readState('dboidle_central_woodcutter_v1_');
 const ws=Number(wood?.stage)||0;
 if(ws>=1&&ws<=3)addCentral('central-forest-woodcutter','Pierwsza podróż','Drwal',wood,ws===1?(wood.won?1:0):1,1,ws===1?'Pokonaj Żołnierza Czerwonej Wstęgi.':'Porozmawiaj z Drwalem.','Kontynuuj zadanie u Drwala.');
 const fish=readState('dboidle_central_fisherman_v1_');
 const fs=Number(fish?.stage)||0;
 if(fs>=1&&fs<=3){
  const count=fs===1?fish.kills:fs===2?fish.bossKills:itemCount('stara-pamiatka-rodzinna');
  const total=fs===1?100:1;
  const description=fs===1?'Pokonaj 100 Leśnych Wojowników.':fs===2?'Pokonaj Leśnego Wojownika (Boss).':'Oddaj Starą Pamiątkę Rodzinną.';
  addCentral('central-forest-fisherman','Zagubiona pamiątka rodzinna','Rybak',fish,count,total,description,'Wróć do Rybaka.');
 }
 const father=readState('dboidle_central_lost_father_v1_');
 if(Number(father?.stage)===1)addCentral('central-forest-lost-father','Zaginiony Ojciec','Zagubiona Kobieta',father,itemCount('pierscien-ojca'),1,'Oddaj Pierścień Ojca.','Wróć do Zagubionej Kobiety z pierścieniem.');
 return result;
}
function dbiMissionsMarkup(missions){
 if(!missions.length)return '<p class="dbi-missions-empty">Brak aktywnych questów</p>';
 return missions.map(m=>{
  const pct=Math.round(m.count/m.total*100);
  const complete=m.count>=m.total;
  return `<article class="dbi-mission-entry">
   <div class="dbi-mission-top"><div><h3>${esc(m.name)}</h3><span>${esc(m.location)}</span></div><strong>${m.count}/${m.total}</strong></div>
   <div class="dbi-mission-track" role="progressbar" aria-label="Postęp: ${esc(m.name)}" aria-valuemin="0" aria-valuemax="${m.total}" aria-valuenow="${m.count}"><div class="dbi-mission-fill" style="width:${pct}%"></div></div>
   <p class="dbi-mission-description">${esc(m.description)}</p>
   ${complete?`<p class="dbi-mission-ready">✓ ${esc(m.ready)}</p>`:''}
  </article>`;
 }).join('');
}
function renderMissions(){
 hideItemPopups();
 document.querySelector('#breadcrumb').textContent='POSTAĆ / MISJE';
 document.querySelector('#pageBody').innerHTML='<section class="dbi-missions"><h2>Misje</h2><div id="dbiMissionsList" aria-live="polite"></div></section>';
 const list=document.querySelector('#dbiMissionsList');
 let previous='';
 const refresh=()=>{
  if(!list.isConnected){clearInterval(dbiMissionsTimer);dbiMissionsTimer=null;return}
  let missions;
  try{missions=dbiActiveMissions()}catch(error){console.error('Błąd odczytu aktywnych misji:',error);return}
  const snapshot=JSON.stringify(missions);
  if(snapshot===previous)return;
  previous=snapshot;
  list.innerHTML=dbiMissionsMarkup(missions);
 };
 if(dbiMissionsTimer!==null)clearInterval(dbiMissionsTimer);
 refresh();
 dbiMissionsTimer=setInterval(refresh,600);
}
// Quest: przedmiot nagrody jest unikatowym wpisem w katalogu, bez automatycznego przyznawania.
const DBI_QUEST_GIFT={id:'quest-starter-gift',name:'Upominek Startowy',slot:'quest',icon:'🎁',image:'assets/items/upominek-startowy.png',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Srebrna skrzynia otrzymana od Opiekuna Laguny. Zawiera podstawowy zestaw wyposażenia i 2 Torebki Fasolek Senzu.'};
const dbiStarterGift=catalog.find(item=>item.id===DBI_QUEST_GIFT.id);
if(dbiStarterGift)dbiStarterGift.description=DBI_QUEST_GIFT.description;
else catalog.push(DBI_QUEST_GIFT);
dbiRegisterBuiltInItems([DBI_REINFORCEMENT_PLANS,DBI_CHANGE_SCROLL,DBI_ADDITION_CHIP,DBI_UPDATING_CHIP]);
Object.assign(catalog.find(item=>item.id===DBI_REINFORCEMENT_PLANS.id),{description:DBI_REINFORCEMENT_PLANS.description});
const DBI_QUEST_RED_STAFF={id:'quest-red-staff',name:'Czerwony Kij',slot:'quest',icon:'杖',image:'assets/items/quest-czerwony-kij.png',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Przedmiot fabularny zdobyty po pokonaniu Kryminatora.'};
const dbiQuestRedStaff=catalog.find(item=>item.id===DBI_QUEST_RED_STAFF.id);
if(dbiQuestRedStaff)Object.assign(dbiQuestRedStaff,DBI_QUEST_RED_STAFF);else catalog.push(DBI_QUEST_RED_STAFF);
// Jednorazowa nagroda za fabularny pojedynek z Krillinem.
const DBI_KRILLIN_REWARD={id:'quest-white-headband',name:'Biała Opaska',slot:'opaska',icon:'🎗️',image:'assets/items/biala-opaska.png',quality:'Pospolity',requiredLevel:1,attack:0,defense:2,ki:0,description:'Biała opaska podarowana przez Krillina. Obrona +2.'};
const dbiKrillinExisting=catalog.find(item=>item.id===DBI_KRILLIN_REWARD.id);
if(dbiKrillinExisting)Object.assign(dbiKrillinExisting,DBI_KRILLIN_REWARD);else catalog.push(DBI_KRILLIN_REWARD);
dbiSaveCatalog(catalog);
// Przedmioty fabularne z Dzikiego Lasu; niezdefiniowane statystyki pozostają zerowe.
const DBI_FOREST_QUEST_ITEMS=[
 {id:'quest-turtle-stone',name:'Kamień Żółwia',slot:'quest',icon:'🪨',image:'assets/items/kamien-zolwia.png',description:'Kamień oznaczony symbolem szkoły Genialnego Żółwia. Przedmiot zadania.'},
];
for(const q of DBI_FOREST_QUEST_ITEMS){if(!catalog.some(item=>item.id===q.id)){catalog.push({...q,quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Przedmiot fabularny.'});dbiSaveCatalog(catalog)}}
// Stary, zdublowany przedmiot Bulmy nie jest już dostępny w katalogu ani GM.
catalog=catalog.filter(item=>item.id!=='quest-small-dragon-ball'&&item.id!=='quest-capsule-special');dbiSaveCatalog(catalog);
// Aktualizacja definicji w istniejących zapisach, bez resetowania ekwipunku.
const dbiTurtleCatalogItem=catalog.find(x=>x.id==='quest-turtle-stone');
if(dbiTurtleCatalogItem){dbiTurtleCatalogItem.image='assets/items/kamien-zolwia.png';dbiTurtleCatalogItem.description='Kamień oznaczony symbolem szkoły Genialnego Żółwia. Przedmiot zadania.';dbiSaveCatalog(catalog)}
// Nagrody turnieju: zarejestruj tylko, jeśli nie istnieją w katalogu.
for(const item of [
 
 {id:'quest-glory-belt',name:'Pas Chwały',slot:'pas',icon:'🏆',image:'assets/items/pas-chwaly.png',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Nagroda za zwycięstwo w światowym turnieju sztuk walk.'}
]){if(!catalog.some(x=>x.id===item.id)){catalog.push(item);dbiSaveCatalog(catalog)}}
// Uaktualnij również katalog zapisany wcześniej w przeglądarce.
const dbiGloryBelt=catalog.find(item=>item.id==='quest-glory-belt');
if(dbiGloryBelt){dbiGloryBelt.image='assets/items/pas-chwaly.png';dbiSaveCatalog(catalog)}
// Most dla panelu ŚWIAT — korzysta z istniejącego katalogu i ekwipunku.
// Jeden wspólny sposób identyfikacji zwykłego Białego Pasa, niezależnie od slotu.
function dbiIsQuestWhiteBelt(id){
 if(typeof id!=='string')return false;
 if(id==='starter-white-belt')return true;
 const item=itemById(id);
 return !!item && item.slot==='pas' && String(item.name||'').trim().toLowerCase()==='biały pas' && Number(item.enhancement||0)===0;
}
// Quest uwzględnia WYŁĄCZNIE przedmioty znajdujące się w inwentarzu.
// Przedmioty założone (w zestawie głównym lub PvP) są chronione.
function dbiFindQuestWhiteBelt(){
 const invIndex=inventory.findIndex(dbiIsQuestWhiteBelt);
 return invIndex===-1?null:{kind:'inventory',index:invIndex};
}
// Jednorazowa nagroda mistrza, zapisywana dla konkretnej postaci.
function dbiGrantMasterStats(rewardId){
 if(rewardId!=='master-krillin-v1'||!dbiActive?.id||dbiCharacterIndex<0)return false;
 const key='dboidle_characters_v1_'+dbiSession.name.toLowerCase();
 try{
  const list=JSON.parse(localStorage.getItem(key)||'[]');
  const index=Array.isArray(list)?list.findIndex(c=>c.id===dbiActive.id):-1;
  if(index<0)return false;
  const c=list[index],flags={...(c.questRewards||{})};
  if(flags[rewardId])return true;
  const keys=['strength','speed','endurance','intelligence','ki'];
  c.stats={...(c.stats||{})};
  for(const stat of keys){
   const current=dbiStatNumber(c.stats,[stat]);
   const fallback=dbiStatNumber(c,[stat]);
   c.stats[stat]=(current??fallback??0)+20;
  }
  flags[rewardId]=true;c.questRewards=flags;
  localStorage.setItem(key,JSON.stringify(list));dbiCharacters[index]=c;
  return true;
 }catch{return false}
}
// Jednorazowa nagroda Wędrowca: +50 do pięciu statystyk.
function dbiGrantWandererStats(){
 if(!dbiActive?.id||dbiCharacterIndex<0)return false;
 const key='dboidle_characters_v1_'+dbiSession.name.toLowerCase();
 try{
  const list=JSON.parse(localStorage.getItem(key)||'[]');
  const index=Array.isArray(list)?list.findIndex(c=>c.id===dbiActive.id):-1;
  if(index<0)return false;
  const c=list[index],flags={...(c.questRewards||{})};
  if(flags['mountain-wanderer-stats-v1'])return true;
  c.stats={...(c.stats||{})};
  for(const stat of ['strength','speed','endurance','intelligence','ki']){
   const current=dbiStatNumber(c.stats,[stat]);
   const fallback=dbiStatNumber(c,[stat]);
   c.stats[stat]=(current??fallback??0)+50;
  }
  flags['mountain-wanderer-stats-v1']=true;c.questRewards=flags;
  localStorage.setItem(key,JSON.stringify(list));dbiCharacters[index]=c;
  return true;
 }catch{return false}
}
const DBI_NORTH_QUEST_REWARDS={
 'north-pickup-ball':{give:['quest-three-star-ball']},
 'north-return-ball':{take:'quest-three-star-ball'},
 'north-village-bag':{give:['senzu-bean-bag']},
 'north-lord-stats':{stats:100},
 'north-rescue':{give:['quest-chief-daughter'],defense:100},
 'north-village-ball':{take:'quest-chief-daughter',give:['quest-three-star-ball']},
 'north-village-materials':{materials:true},
 'north-hunt-first':{stats:100},
 'north-hunt-second':{stats:100},
 'north-hunt-third':{defense:100}
};
for(const item of [
 {id:'quest-three-star-ball',name:'Smocza kula',image:'assets/items/quest-three-star-ball.png',icon:'🟠',description:'Trójgwiazdkowa Smocza kula.'},
 {id:'quest-chief-daughter',name:'Córka wodza',image:'assets/items/quest-corka-wodza.png',icon:'👤',description:'Odprowadź córkę wodza do wioski.'}
]){
 const existing=catalog.find(entry=>entry.id===item.id);
 if(existing)existing.image=item.image;
 else catalog.push({...item,slot:'quest',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0});
}
function dbiGrantHighTowerReward(reward){
 const north=Object.hasOwn(DBI_NORTH_QUEST_REWARDS,reward)?DBI_NORTH_QUEST_REWARDS[reward]:null;
 if((!north&&!['general','injury','stats-first','attack-speed','stats-last','bag','heal','quest-red-staff'].includes(reward))||!dbiActive?.id||dbiCharacterIndex<0)return false;
 const flag='high-tower-journey-'+reward;
 const key='dboidle_characters_v1_'+dbiSession.name.toLowerCase();
 try{
  const list=JSON.parse(localStorage.getItem(key)||'[]');
  const index=Array.isArray(list)?list.findIndex(c=>c.id===dbiActive.id):-1;
  if(index<0)return false;
  const current=list[index];
  if(current.questRewards?.[flag])return true;
  const updated={...current,stats:{...current.stats},questRewards:{...current.questRewards,[flag]:true}};
  const items=inventory.slice(),positions=inventoryPlacement.slice();
  let nextExp=exp;
  if(north){
   if(north.take){
    const at=items.findIndex(ref=>dbiDecodeItemRef(ref).id===north.take);
    if(at<0)return false;
    items.splice(at,1);positions.splice(at,1);
   }
   const give=north.materials?['smith-scouter','smith-ki',catalog.find(item=>item.name?.trim().toLocaleLowerCase('pl')==='ruda kowalstwa')?.id||'ruda-kowalstwa']:north.give||[];
   if(give.some(id=>!itemById(id)))return false;
   items.push(...give);positions.push(...give.map(()=>null));
   if(north.defense)updated.stats.questDefenseBonus=(Number(current.stats?.questDefenseBonus)||0)+north.defense;
  }
  switch(north?.stats?'stats-first':reward){
   case 'general':
    if(!itemById('smith-upgrade-2'))return false;
    items.push('smith-upgrade-2','smith-upgrade-2');positions.push(null,null);
    nextExp+=Math.floor(Math.max(0,dbiRequiredExp(level)-exp)*.1);
    updated.exp=nextExp;
    break;
   case 'bag':
    if(!itemById('senzu-bean-bag'))return false;
    items.push('senzu-bean-bag');positions.push(null);
    break;
   case 'quest-red-staff':
    if(!itemById('quest-red-staff'))return false;
    items.push('quest-red-staff');positions.push(null);
    break;
   case 'stats-first':
   case 'stats-last':
    for(const keys of [['strength','sila','siła','str'],['speed','szybkosc','szybkość'],['endurance','wytrzymalosc','wytrzymałość','stamina'],['intelligence','inteligencja','int'],['kiStat','kiPower','ki','KI']]){
     const value=[current.stats,current.attributes,current.baseStats,current].map(source=>dbiStatNumber(source,keys)).find(value=>value!==null)??0;
     const stat=keys[0]==='kiStat'?'ki':keys[0];
     updated.stats[stat]=value+(north?.stats||50);
     if(stat==='ki'){
      for(const alias of ['kiStat','kiPower'])if(dbiStatNumber(current.stats,[alias])!==null)updated.stats[alias]=value+(north?.stats||50);
     }
    }
    break;
   case 'attack-speed':
    updated.stats.questAttackSpeedPct=(Number(current.stats?.questAttackSpeedPct)||0)+10;
    break;
   case 'heal':{
    const bean=items.findIndex(ref=>dbiDecodeItemRef(ref).id==='zen-bean-red');
    if(bean<0)return false;
    items.splice(bean,1);positions.splice(bean,1);
    updated.stats.questMaxHp=(Number(current.stats?.questMaxHp)||0)+50;
    break;
   }
   case 'injury':
    updated.stats.questMaxHp=(Number(current.stats?.questMaxHp)||0)-20;
    break;
  }
  list[index]=updated;
  if(!dbiSaveInventoryTransaction(items,positions,[[key,JSON.stringify(list)]]))return false;
  dbiCharacters[index]=updated;
  if(exp!==nextExp){exp=nextExp;renderExp()}
  return true;
 }catch(error){console.error('Zapis nagrody Pierwszej Podróży:',error);return false}
}

// Drugi etap Wędrowca: oddanie jednej czerwonej fasolki i trwałe +50 obrony.
function dbiGrantWandererDefense(){
 if(!dbiActive?.id||dbiCharacterIndex<0)return false;
 const flag='mountain-wanderer-defense-v1';
 const key='dboidle_characters_v1_'+dbiSession.name.toLowerCase();
 try{
  const list=JSON.parse(localStorage.getItem(key)||'[]');
  const index=Array.isArray(list)?list.findIndex(c=>c.id===dbiActive.id):-1;
  if(index<0)return false;
  const c=list[index];
  if(c.questRewards?.[flag])return true;
  const beanIndex=inventory.findIndex(ref=>dbiDecodeItemRef(ref).id==='zen-bean-red');
  if(beanIndex<0)return false;
  const updated={...c,stats:{...(c.stats||{}),questDefenseBonus:(Number(c.stats?.questDefenseBonus)||0)+50},questRewards:{...(c.questRewards||{}),[flag]:true}};
  list[index]=updated;
  localStorage.setItem(key,JSON.stringify(list));
  dbiCharacters[index]=updated;
  inventory.splice(beanIndex,1);inventoryPlacement.splice(beanIndex,1);
  dbiSaveInventory();
  return true;
 }catch{return false}
}
// Jednorazowe +50 KI z zadania na Górze Króla Lasu; bez dublowania nagrody.
function dbiGrantMountainKi(){
 if(!dbiActive?.id||dbiCharacterIndex<0)return false;
 const key='dboidle_characters_v1_'+dbiSession.name.toLowerCase();
 try{
  const list=JSON.parse(localStorage.getItem(key)||'[]');
  const index=Array.isArray(list)?list.findIndex(c=>c.id===dbiActive.id):-1;
  if(index<0)return false;
  const c=list[index],flags={...(c.questRewards||{})};
  if(flags['mountain-roshi-ki-v1'])return true;
  c.stats={...(c.stats||{})};
  c.stats.ki=Number(c.stats.ki??c.ki??0)+50;
  flags['mountain-roshi-ki-v1']=true;c.questRewards=flags;
  localStorage.setItem(key,JSON.stringify(list));dbiCharacters[index]=c;
  return true;
 }catch{return false}
}
// Nagroda za 10 kukieł: przedmiot + 10 do pięciu atrybutów, jednorazowo.
function dbiGrantTrainingDummyQuestReward(){
 if(!dbiActive?.id||dbiCharacterIndex<0||!itemById('quest-starter-gift'))return false;
 const key='dboidle_characters_v1_'+dbiSession.name.toLowerCase();
 try{
  const saved=JSON.parse(localStorage.getItem(key)||'[]');
  if(!Array.isArray(saved))return false;
  const index=saved.findIndex(c=>c.id===dbiActive.id);
  if(index<0)return false;
  const character=saved[index];
  const flags={...(character.questRewards||{})};
  const rewardId='lagoon-training-dummies-10-v1';
  if(flags[rewardId])return true;
  const stats={...(character.stats||{})};
  for(const attr of ['strength','speed','endurance','intelligence','ki']){
   const old=dbiStatNumber(stats,[attr])??dbiStatNumber(character,[attr])??0;
   stats[attr]=old+10;
  }
  const updated={...character,stats,questRewards:{...flags,[rewardId]:true}};
  // Najpierw zapisz statystyki; w razie błędu nie przyznawaj przedmiotu.
  saved[index]=updated;
  localStorage.setItem(key,JSON.stringify(saved));
  dbiCharacters[index]=updated;
  inventory.push('quest-starter-gift');inventoryPlacement.push(null);
  dbiSaveInventory();
  return true;
 }catch{return false}
}
// Publiczny interfejs dla panelu fasolek podczas farmienia.
function dbiZenCounts(){
 return Object.fromEntries(['red','blue','green','purple'].map(kind=>[kind,inventory.filter(ref=>dbiDecodeItemRef(ref).id==='zen-bean-'+kind).length]));
}
function dbiAutoUseRedZen(){
 const index=inventory.findIndex(ref=>dbiDecodeItemRef(ref).id==='zen-bean-red');
 if(index<0)return false;
 inventory.splice(index,1);inventoryPlacement.splice(index,1);
 dbiSaveInventory();return true;
}
window.DBIWorldTechniques=()=>DBI_TECHNIQUES.filter(d=>dbiTechniqueUnlocked(d)).map(d=>({id:d.id,name:d.name,image:d.images[Math.max(0,Math.min(4,Number(dbiTechniqueState()[d.id]||1)-1))],mana:d.useMana,damage:dbiTechniquePower(d.baseDamage,'pvm'),damagePvp:dbiTechniquePower(d.baseDamage,'pvp'),baseDamage:d.baseDamage}));
window.DBIWorldInventory={
  bonus:dbiMainBonus,
  skillBonuses:dbiSkillBonuses,
  smithDropBonus:()=>dbiSmithCheckpointBonus('drop')+dbiMainBonus('smithDropChancePct'),
  smithOreId:()=>catalog.find(item=>item.name?.trim().toLocaleLowerCase('pl')==='ruda kowalstwa')?.id||'ruda-kowalstwa',
  zenCounts:dbiZenCounts,
  autoUseRedZen:dbiAutoUseRedZen,
  autoUseGreenZen:()=>{
   if(dbiZenActive('green'))return false;
   const index=inventory.findIndex(ref=>dbiDecodeItemRef(ref).id==='zen-bean-green');
   if(index<0)return false;
   inventory.splice(index,1);inventoryPlacement.splice(index,1);
   dbiZenEffects.green=Date.now()+10*60*1000;
   dbiSaveZenEffects();dbiSaveInventory();return true;
  },
  grantTrainingDummyQuestReward:dbiGrantTrainingDummyQuestReward,
  countQuestItem:(itemId)=>inventory.filter(ref=>dbiDecodeItemRef(ref).id===itemId).length,
  consumeQuestItem:(itemId,count=1)=>{
   const indexes=[];for(let i=0;i<inventory.length;i++)if(dbiDecodeItemRef(inventory[i]).id===itemId)indexes.push(i);
   if(indexes.length<count)return false;
   for(const i of indexes.slice(0,count).reverse()){inventory.splice(i,1);inventoryPlacement.splice(i,1)}
   dbiSaveInventory();return true;
  },
  grantHighTowerReward:dbiGrantHighTowerReward,
  grantMasterStats:dbiGrantMasterStats,
  grantMountainKi:dbiGrantMountainKi,
  hasWandererStatsReward:()=>!!dbiCharacters[dbiCharacterIndex]?.questRewards?.['mountain-wanderer-stats-v1'],
  hasWandererDefenseReward:()=>!!dbiCharacters[dbiCharacterIndex]?.questRewards?.['mountain-wanderer-defense-v1'],
  grantWandererStats:dbiGrantWandererStats,
  grantWandererDefense:dbiGrantWandererDefense,
  hasWhiteBelt:()=>!!dbiFindQuestWhiteBelt(),
  exchangeWhiteBelt:()=>{
   if(!itemById('starter-white-belt'))return false;
   const found=dbiFindQuestWhiteBelt();
   if(!found)return false;
   inventory.splice(found.index,1);
   inventoryPlacement.splice(found.index,1);
   inventory.push('starter-white-belt~1');
   inventoryPlacement.push(null);
   dbiSaveInventory();
   return true;
  },
  choices:()=>catalog.filter(x=>x&&x.id&&x.name).slice(0,24).map(x=>({id:x.id,name:x.name,icon:x.icon||'✦'})),
  grant:(ids)=>{
   if(!Array.isArray(ids))return 0;
   const missing=ids.filter(id=>!itemById(id));
   if(missing.length){console.error('Nieznane przedmioty dropu:',missing);return 0}
   if(!ids.length)return 0;
   const before=inventory.length;
   inventory.push(...ids);
   inventoryPlacement.push(...ids.map(()=>null));
   try{
    const serialized=JSON.stringify(inventory);
    localStorage.setItem(DBI_INV_KEY,serialized);
    if(localStorage.getItem(DBI_INV_KEY)!==serialized)throw Error('Nie udało się potwierdzić zapisu ekwipunku');
    dbiSaveInventoryPositions();
    return ids.length;
   }catch(error){
    inventory.splice(before);
    inventoryPlacement.splice(before);
    console.error('Błąd zapisu łupów:',error);
    return 0;
   }
  },
  grantExp:dbiGainExp,
  grantMobKills:dbiGrantMobKills,
  character:()=>{
    const signStats=dbiEquippedAllStats(equipped['Główny']);
    const skills=dbiSkillBonuses();
    const character=dbiCharacters[dbiCharacterIndex]||{};
    const worn=Object.values(equipped['Główny']||{}).map(itemById).filter(Boolean);
    const stat=(...keys)=>{
      for(const source of [character.stats,character.attributes,character.baseStats,character]){
        const value=dbiStatNumber(source,keys);
        if(value!==null)return value;
      }
      return 0;
    };
    const bonus=(...keys)=>worn.reduce((total,item)=>total+(dbiStatNumber(item,keys)||0),0);
    const techniqueSources=[character.bonuses,character.activeStats,character.passiveStats,character.stats,character];
    const techniqueBase=(...keys)=>{for(const source of techniqueSources){const value=dbiStatNumber(source,keys);if(value!==null)return value}return 0};
    const techniqueFixed=techniqueBase('techniqueAttack','techniquePower')+bonus('techniqueAttack','techniquePower')+skills.techniqueAttack;
    const techniqueAttackPvm=techniqueBase('techniqueAttackMin')+bonus('techniqueAttackMin')+techniqueFixed;
    const techniqueAttackPvp=techniqueBase('techniqueAttackMax')+bonus('techniqueAttackMax')+techniqueFixed;
    const techniqueDamageBonusPct=techniqueBase('techniqueDamageBonusPct')+bonus('techniqueDamageBonusPct');
    const strength=dbiSpiritEffectiveStat(stat('strength','sila','siła','str')*dbiPlanAttributeMultiplier(worn,'strength'),signStats+skills.stats);
    const speed=dbiSpiritEffectiveStat(stat('speed','szybkosc','szybkość')*dbiPlanAttributeMultiplier(worn,'speed'),signStats+skills.stats);
    const endurance=dbiSpiritEffectiveStat(stat('endurance','wytrzymalosc','wytrzymałość','stamina')*dbiPlanAttributeMultiplier(worn,'endurance'),signStats+skills.stats);
    const intelligence=dbiSpiritEffectiveStat(stat('intelligence','inteligencja','int')*dbiPlanAttributeMultiplier(worn,'intelligence'),signStats+skills.stats);
    const techniqueKi=dbiSpiritEffectiveStat(stat('kiStat','kiPower','ki','KI')*dbiPlanAttributeMultiplier(worn,'ki'),signStats+skills.stats);
    return {...dbiCombatHitBonuses(character,worn,skills),...dbiPlanCombatFields(character,worn),id:dbiActive?.id,level,strength,speed,endurance,intelligence,techniqueKi,
      attack:dbiAttackRange(character,worn,signStats,skills).min,
      techniqueAttackMin:techniqueAttackPvm,
      techniqueAttackMax:techniqueAttackPvp,
      techniqueAttackPvm,techniqueAttackPvp,techniqueDamageBonusPct,techniqueValuePct:bonus('techniqueValuePct'),
      defense:Math.max(0,(endurance*.1+skills.defense+bonus('defense')+(Number(character.stats?.questDefenseBonus)||0))*(1+bonus('defensePct')/100)),
      maxHp:Math.max(.01,(Number(character.stats?.gmMaxHp??(50+endurance*.01+bonus('hp','maxHp','health')))+(character.stats?.gmMaxHp!=null?dbiPlanRolledTotal(worn,'hp'):0)+skills.hp+(Number(character.stats?.questMaxHp)||0))*(1+bonus('maxHpPct')/100)),
      maxKi:Math.max(0,(Number(character.stats?.gmMaxKi??(100+intelligence*.01+bonus('kiPoints','maxKi','maxMp','mana','ki')))+(character.stats?.gmMaxKi!=null?dbiPlanRolledTotal(worn,'maxKi'):0))*(1+bonus('maxKiPct')/100)),
      moveSpeedPct:dbiCharacterBonus(character,worn,['moveSpeedPct','moveSpeed'])+(dbiZenActive('purple')?50:0),
      attackSpeedPct:dbiCharacterBonus(character,worn,['attackSpeedPct','attackSpeed'])+(Number(character.stats?.questAttackSpeedPct)||0)};
  }
};


// Aktywności dzienne — stan osobny dla każdej postaci, reset o północy czasu lokalnego.
const DBI_DAILY_KEY='dboidle_daily_v1_'+String(dbiActive?.id||'test');
const DBI_WALLET_KEY='dboidle_dragon_wallet_v1_'+String(dbiActive?.id||'test');
const DBI_DAILY_REWARD_ITEM='smith-symbol';
const DBI_DRAGON_COIN_ICON='<img class="dbi-dragon-coin-icon" src="assets/ui/dragon-coin.png" alt="" width="16" height="16">';
function dbiToday(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function dbiDailyRead(){
 const day=dbiToday();
 let data=null;try{data=JSON.parse(localStorage.getItem(DBI_DAILY_KEY)||'null')}catch{}
 if(!data||data.day!==day)data={day,kills:0,bosses:0,quests:0,claimed:[false,false,false],points:0};
 return data;
}
function dbiDailyBossWins(data){
 const characterId=String(dbiActive?.id||'test');
 const day=data.day.split('-').map(Number).join('-');
 let saved=null;
 try{saved=JSON.parse(localStorage.getItem('dboidle_forest_boss_wins_daily_v1_'+characterId)||'null')}catch{}
 let wins=0;
 if(saved?.day===day)wins=Math.max(0,Math.min(3,Math.floor(Number(saved.used)||0)));
 else if(!saved){
  const lastWin=Number(localStorage.getItem('dboidle_forest_boss_victory_v1_'+characterId))||0;
  const date=new Date(lastWin);
  if(lastWin>0&&[date.getFullYear(),date.getMonth()+1,date.getDate()].join('-')===day)wins=1;
 }
 return Math.max(Number(data.bosses)||0,wins);
}
function dbiDailySave(data){localStorage.setItem(DBI_DAILY_KEY,JSON.stringify(data))}
function dbiWalletRead(){try{const v=JSON.parse(localStorage.getItem(DBI_WALLET_KEY)||'null');return v&&typeof v==='object'?v:{coins:0,signs:[]}}catch{return {coins:0,signs:[]}}}
function dbiDailyRecord(type,amount=1){
 const data=dbiDailyRead();if(!['kills','bosses','quests'].includes(type))return;
 data[type]=Math.max(0,Number(data[type]||0)+Math.max(0,Math.floor(Number(amount)||0)));
 dbiDailySave(data);
}
window.DBIDaily={record:dbiDailyRecord,refresh:()=>{if(document.querySelector('.dbi-daily'))renderDailyActivities()}};
function dbiDailyObjectives(data){return [
 {title:'Pokonaj 10 mobów',conditions:[['Pokonane potwory',data.kills,10]]},
 {title:'Wykonaj zadanie',conditions:[['Wykonane questy',data.quests,1]]},
 {title:'Wyzwanie wojownika',conditions:[['Pokonani bossowie',dbiDailyBossWins(data),3],['Pokonane potwory',data.kills,15]]}
]}
function dbiDailyClaim(index){
 const data=dbiDailyRead(),tasks=dbiDailyObjectives(data),task=tasks[index];
 if(!task||data.claimed[index]||task.conditions.some(([,value,goal])=>value<goal))return;
 const fragment=itemById(DBI_DAILY_REWARD_ITEM);
 if(!fragment){renderDailyActivities('Nie znaleziono Fragmentu Symbolu w katalogu.');return}
 data.claimed[index]=true;
 const count=data.claimed.filter(Boolean).length;
 data.points=Math.floor(count/3);
 const wallet=dbiWalletRead();
 wallet.coins=Math.max(0,Number(wallet.coins)||0)+1;
 if(count===3)wallet.activityPoints=Math.max(0,Number(wallet.activityPoints)||0)+1;
 if(!dbiSaveInventoryTransaction([...inventory,fragment.id],[...inventoryPlacement,null],[
  [DBI_DAILY_KEY,JSON.stringify(data)],[DBI_WALLET_KEY,JSON.stringify(wallet)]
 ])){
  renderDailyActivities('Nie udało się zapisać nagrody. Spróbuj ponownie.');
  return;
 }
 dbiRefreshHeaderWallet();
 renderDailyActivities();
}
// Torebka fasolek: bez limitu zakupów, 1 Smocza Moneta za sztukę.
const DBI_SENZU_BAG_ITEMS=[['zen-bean-red',600],['zen-bean-blue',100],['zen-bean-purple',50],['zen-bean-green',50]];
function dbiBuySenzuBag(event){
 const button=event?.currentTarget;
 if(button?.dataset.buying==='1')return;
 const wallet=dbiWalletRead();if(Number(wallet.coins||0)<1)return;
 if(!itemById('senzu-bean-bag'))return;
 const currentDistinct=new Set(inventory.map(ref=>dbiDecodeItemRef(ref).id));
 if(currentDistinct.size>=400&&!currentDistinct.has('senzu-bean-bag')){alert('Brak miejsca w ekwipunku.');return}
 if(button){button.dataset.buying='1';button.disabled=true;button.classList.add('dbi-senzu-purchase-success');button.textContent='Kupiono ✓';}
 // Krótki efekt potwierdzenia przed odświeżeniem kafelka sklepu.
 window.setTimeout(()=>{
  inventory.push('senzu-bean-bag');inventoryPlacement.push(null);
  dbiSaveInventory();wallet.coins=Number(wallet.coins)-1;
  localStorage.setItem(DBI_WALLET_KEY,JSON.stringify(wallet));
  dbiRefreshHeaderWallet();
  if(document.querySelector('[data-buy-senzu]')===button)renderDailyActivities();
 },360);
}
function dbiSenzuBagOffer(wallet){
 const canBuy=Number(wallet.coins||0)>=1;
 const rows=DBI_SENZU_BAG_ITEMS.map(([id,count])=>{const item=itemById(id);return `<div class="dbi-senzu-bag-row"><img src="${item?.image||''}" alt=""><span>${item?.name||id} ×${count}</span></div>`}).join('');
 return `<div class="dbi-daily-shop-item dbi-senzu-bag-offer"><img class="dbi-senzu-bag-main" src="assets/items/torebka-fasolek-senzu.png" alt="Torebka Fasolek Senzu"><strong>Torebka Fasolek Senzu</strong><div class="dbi-senzu-bag-description">Przedmiot użytkowy. Otwórz torebkę w ekwipunku, aby otrzymać fasolki.</div><div class="dbi-senzu-bag-meta"><span>Koszt: <b>${DBI_DRAGON_COIN_ICON}1 Smocza Moneta</b></span><span>Limit: <b>Bez limitu</b></span></div><div class="dbi-senzu-bag-contents"><b>Torebka zawiera:</b>${rows}</div><button type="button" data-buy-senzu ${canBuy?'':'disabled'}>Zapłać</button></div>`;
}
let dbiDailyTimer=null;
function renderDailyActivities(message=''){
 if(dbiDailyTimer!==null){clearInterval(dbiDailyTimer);dbiDailyTimer=null}
 document.querySelector('#breadcrumb').textContent='POSTAĆ / AKTYWNOŚCI';
 const data=dbiDailyRead(),wallet=dbiWalletRead(),tasks=dbiDailyObjectives(data),claimed=data.claimed.filter(Boolean).length;
 document.querySelector('#pageBody').innerHTML=`<div class="dbi-daily">
 <header class="dbi-daily-header"><h2>Aktywności</h2><div class="dbi-daily-track"><div class="dbi-daily-progress" style="width:${Math.min(100,(wallet.activityPoints||0)/30*100)}%"></div>${[7,14,21,30].map(n=>`<span class="dbi-daily-milestone" style="left:${n/30*100}%">${n}</span>`).join('')}</div><p>Postęp: ${wallet.activityPoints||0}/30 pkt · 1 punkt za 3 odebrane aktywności</p></header>
 <div class="dbi-daily-count">Licznik dziennych aktywności: <strong>${claimed}/3</strong> · Reset o 00:00</div>
 ${message?`<p class="dbi-daily-count" role="status">${esc(message)}</p>`: ''}
 <div class="dbi-daily-cards">${tasks.map((task,i)=>{
 const complete=task.conditions.every(([,value,goal])=>value>=goal);
 return `<section class="dbi-daily-card"><div class="dbi-daily-card-head"><h3>${task.title}</h3><button type="button" data-claim="${i}" ${!complete||data.claimed[i]?'disabled':''}>${data.claimed[i]?'Odebrano':'Odbierz'}</button></div>
 <div class="dbi-daily-conditions"><strong>Wymogi aktywności</strong>${task.conditions.map(([name,value,goal])=>`<div class="dbi-daily-condition"><div class="dbi-daily-line"><span>${name}</span><b>${Math.min(goal,value)}/${goal}</b></div><div class="dbi-daily-bar"><div style="width:${Math.min(100,value/goal*100)}%"></div></div></div>`).join('')}</div>
 <div class="dbi-daily-reward"><span>Nagroda: ${DBI_DRAGON_COIN_ICON}1 Smocza Moneta + <img src="assets/items/smith-symbol.png" alt=""> 1 Fragment Symbolu</span></div></section>`;
 }).join('')}</div>
 <section class="dbi-daily-shop"><h2>Sklep Smoczych Monet</h2><p>Saldo: <strong>${DBI_DRAGON_COIN_ICON}${wallet.coins||0}</strong> Smoczych Monet${wallet.signs?.length?` · Zdobyte znaki: ${wallet.signs.map(x=>`<span class="dbi-daily-glyph">${esc(x)}</span>`).join(' ')}`:''}</p>
 <div class="dbi-daily-shop-grid">${dbiSenzuBagOffer(wallet)+Array.from({length:5},()=>'<div class="dbi-daily-shop-item"><span>Oferta w przygotowaniu</span><small>Koszt: —</small><button disabled>Zapłać</button></div>').join('')}</div></section></div>`;
 document.querySelectorAll('[data-claim]').forEach(button=>button.onclick=()=>dbiDailyClaim(Number(button.dataset.claim)));
 document.querySelector('[data-buy-senzu]')?.addEventListener('click',dbiBuySenzuBag);
 // Odczyt na żywo z localStorage: walki mogą trwać poza tym ekranem.
 const snapshot=JSON.stringify([data,tasks]);
 dbiDailyTimer=setInterval(()=>{
  if(!document.querySelector('.dbi-daily')){clearInterval(dbiDailyTimer);dbiDailyTimer=null;return}
  const current=dbiDailyRead();
  if(JSON.stringify([current,dbiDailyObjectives(current)])!==snapshot)renderDailyActivities();
 },900);
}
// Przywróć ostatnio otwartą zakładkę po F5 (osobno dla każdej postaci).
if(dbiActive?.id){
  let lastPage=null;
  try{lastPage=JSON.parse(sessionStorage.getItem('dboidle_last_page_'+dbiActive.id)||'null')}catch{}
  if(lastPage?.title)showPage(lastPage.title,lastPage.section);
}


// DBO Idle: tylko prezentacja liczb całkowitych. Wartości w stanie gry
// i obliczeniach (w tym szanse i regeneracja) zachowują pełną precyzję.
// Dotyczy tekstu interfejsu tworzonego również przez inne moduły gry.
(function dbiWholeNumberDisplay(){
 'use strict';
 const ignoreTags=new Set(['SCRIPT','STYLE','TEXTAREA','OPTION','CODE','PRE']);
 const decimal=/(^|[^\w\d./:-])(\-?\d{1,12})[.,](\d+)(?=$|[^\w\d./:-])/g;
 function clean(node){
  if(!node||node.nodeType!==3||!node.parentElement)return;
  const parent=node.parentElement;
  if(ignoreTags.has(parent.tagName)||parent.closest('[contenteditable="true"], [data-dbi-keep-decimals]'))return;
  const before=node.nodeValue;
  if(!before||!/[\d][.,]\d/.test(before))return;
  // Wersje, identyfikatory, adresy i daty nie są wartościami statystyk.
  if(/(?:wersja|version|beta|v\d|https?:\/\/|\.png|\.js|\.css|\.gif|\.webp|\.json|\d{4}-\d\d-\d\d)/i.test(before))return;
  const after=before.replace(decimal,(match,prefix,whole)=>prefix+whole);
  if(after!==before)node.nodeValue=after;
 }
 function visit(root){
  if(!root)return;
  if(root.nodeType===3){clean(root);return}
  if(root.nodeType!==1&&root.nodeType!==11)return;
  if(root.nodeType===1&&ignoreTags.has(root.tagName))return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode()))clean(node);
 }
 function start(){
  if(!document.body)return;
  visit(document.body);
  const observer=new MutationObserver(records=>{
   for(const record of records){
    if(record.type==='characterData')clean(record.target);
    else for(const node of record.addedNodes)visit(node);
   }
  });
  observer.observe(document.body,{childList:true,characterData:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();

function refreshAtlasVitals(){
 if(document.hidden)return;
 const combat=document.querySelector('.world-battle-top')?.parentElement;
 const labels=combat?.querySelectorAll('.world-hero-grid .world-vital-label span:last-child');
 const stats=window.DBIWorldInventory?.character();
 if(!stats)return;
 for(const [index,id,max] of [[0,'Hp',stats.maxHp],[1,'Ki',stats.maxKi]]){
  const values=labels?.[index]?.textContent?.replace(/[^0-9.,/]/g,'').replace(/,/g,'.').split('/').map(Number);
  const live=values?.length===2&&values.every(Number.isFinite);
  const current=live?values[0]:max,limit=live?values[1]:max;
  document.getElementById('atlas'+id+'Value').textContent=Math.round(current).toLocaleString('pl-PL')+'/'+Math.round(limit).toLocaleString('pl-PL');
  document.getElementById('atlas'+id).value=limit?current/limit:0;
 }
}
refreshAtlasVitals();
setInterval(refreshAtlasVitals,1500);
