/* DBOidle v2.36 — lokalny prototyp gildii, wspólny dla postaci w tej przeglądarce. */
(()=>{
'use strict';
const KEY='dboidle_guilds_v1';
const TABS=['Główna','Członkowie','Planeta','Wojny','Zaproszenia','Depozyt','Grupowa','Notatki','Ekonomia','Ustawienia'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=()=>{try{const d=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(d)?d:[]}catch{return []}};
const write=d=>localStorage.setItem(KEY,JSON.stringify(d));
const current=()=>({id:String(dbiActive?.id||''),name:String(dbiCharacters?.[dbiCharacterIndex]?.name||'Postać'),account:String(dbiSession?.name||'').toLowerCase()});
const goldKey=id=>'dboidle_gold_v1_'+id;
const zeniIcon='<img class="dbi-zeni-icon" src="assets/ui/zeni.png" alt="">';
const premiumKey=id=>'dboidle_premium_v1_'+id;
const wallet=(id,key)=>Math.max(0,Number(localStorage.getItem(key(id)))||0);
const findMine=(guilds,id)=>guilds.find(g=>g.members.some(m=>m.id===id));
const stamp=()=>new Date().toLocaleString('pl-PL');
const log=(g,msg)=>{g.log.unshift({time:stamp(),text:msg});g.log=g.log.slice(0,35)};
let tab='Główna',notice='',error='',confirmLeave=false;
function allCharacters(){
 const found=[];
 for(let i=0;i<localStorage.length;i++){
  const key=localStorage.key(i);
  if(!key?.startsWith('dboidle_characters_v1_'))continue;
  try{const arr=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(arr))for(const c of arr)if(c?.id&&c?.name)found.push({...c,id:String(c.id),name:String(c.name),account:key.slice('dboidle_characters_v1_'.length)})}catch{}
 }
 return found;
}
const rights={
 grant:'Nadawanie uprawnień',notes:'Edytowanie notatki',upgrade:'Ulepszanie',
 group:'Wysyłanie wiadomości grupowej',war:'Wypowiadanie wojen',
 recruit:'Rekrutacja graczy',manage:'Zarządzanie i wypraszanie graczy'
};
function allowed(g,id,right){
 return g.leaderId===id || g.members.some(m=>m.id===id && m.permissions?.includes(right));
}
const presenceKey=id=>'dboidle_guild_seen_v1_'+id;
function status(id,banned){
 if(banned)return ['ban','Zbanowany'];
 const last=Number(localStorage.getItem(presenceKey(id)));
 if(last && Date.now()-last<=90000)return ['online','Aktywny'];
 if(last && Date.now()-last>7*86400000)return ['away','Nieaktywny dłużej niż 7 dni'];
 return ['offline','Nieaktywny'];
}
function heartbeat(){
 if(typeof dbiActive==='undefined'||!dbiActive?.id)return;
 if(document.visibilityState==='visible')localStorage.setItem(presenceKey(dbiActive.id),String(Date.now()));
 document.querySelectorAll('[data-member-status]').forEach(dot=>{
  const [state,label]=status(dot.dataset.memberStatus,dot.dataset.ban==='true');
  dot.dataset.state=state;dot.title=label;dot.setAttribute('aria-label',label);
 });
}
window.addEventListener('DOMContentLoaded',heartbeat);
document.addEventListener('visibilitychange',heartbeat);
setInterval(heartbeat,30000);
function memberPanel(g,people,actor){
 const grant=allowed(g,actor,'grant'),manage=allowed(g,actor,'manage');
 return '<h3>Członkowie ('+g.members.length+')</h3><p class="guild-member-count">Liczba członków '+g.members.length+'/'+capacity(g)+'</p><div class="guild-member-scroll"><table class="guild-member-table"><thead><tr>'+
 ['Postać','Poziom','Ranga w gildii','Wkład w złocie','Wkład w Zeni','Uprawnienia','Status',''].map(label=>'<th>'+label+'</th>').join('')+
 '</tr></thead><tbody>'+g.members.map(m=>{
  const character=people.find(c=>c.id===m.id)||m;
  const portrait=character.avatar||character.portrait||'';
  const picture=/^assets\/[a-z0-9/_-]+\.(png|webp|jpg)$/i.test(portrait)?'<img alt="" src="'+esc(portrait)+'">':esc(Array.from(character.name)[0]);
  const leader=g.leaderId===m.id;
  const editable=actor!==m.id && !leader && (grant||manage);
  const count=Object.keys(rights).filter(key=>allowed(g,m.id,key)).length;
  const banned=character.banned===true||m.banned===true;
  const [state,label]=status(m.id,banned);
  const id=esc(m.id);
  const amount=v=>(Number(v)||0).toLocaleString('pl-PL');
  const controls=Object.entries(rights).map(([key,title])=>`<label><input type="checkbox" name="permission" value="${key}" ${allowed(g,m.id,key)?'checked':''} ${grant&&allowed(g,actor,key)?'':'disabled'}> ${title}</label>`).join('');
  return `<tr><td><span class="guild-member-name"><b class="guild-member-avatar">${picture}</b>${esc(character.name)}</span></td><td>${esc(character.level??'—')}</td><td>${leader?'Przywódca':'Członek'}</td><td>${amount(m.contributions?.gold)}</td><td>${zeniIcon}${amount(m.contributions?.premium)}</td><td><span class="guild-right-count" title="${count} z 7" aria-label="Uprawnienia: ${count} z 7">${'<i></i>'.repeat(count)}<small>${count}/7</small></span></td><td><span class="guild-status-dot" role="img" aria-label="${label}" title="${label}" data-member-status="${id}" data-state="${state}" data-ban="${banned}"></span></td><td>${editable?`<button type="button" data-edit-member aria-haspopup="dialog">Edytuj</button>`:''}`+
  (editable?`<dialog class="guild-member-dialog" aria-label="Uprawnienia · ${esc(character.name)}"><button type="button" class="guild-dialog-close" aria-label="Zamknij okno">×</button><form class="guild-right-form" data-member="${id}"><fieldset><legend>Uprawnienia · ${esc(character.name)}</legend>${controls}</fieldset><div>${grant?'<button>Zapisz uprawnienia</button>':''} ${manage?`<button type="button" class="guild-kick" data-kick="${id}">Wyrzuć</button>`:''} ${actor===g.leaderId?`<button type="button" data-promote="${id}">Przekaż przywództwo</button>`:''}</div></form></dialog>`:'')+'</td></tr>';
 }).join('')+'</tbody></table></div>';
}

function flash(message,isError=false){notice=isError?'':message;error=isError?message:'';render()}
function create(form){
 const me=current(),guilds=read();
 if(findMine(guilds,me.id))return flash('Ta postać już należy do gildii.',true);
 const name=form.elements.guildName.value.trim(),tag=form.elements.guildTag.value.trim().toUpperCase();
 if(name.length<3||name.length>30)return flash('Nazwa gildii musi mieć od 3 do 30 znaków.',true);
 if(!/^[\p{L}0-9]{1,5}$/u.test(tag))return flash('Skrót musi mieć 1–5 liter lub cyfr, bez spacji.',true);
 if(guilds.some(g=>g.name.toLocaleLowerCase('pl')===name.toLocaleLowerCase('pl')||g.tag===tag))return flash('Nazwa lub skrót gildii jest już zajęty.',true);
 const pay=form.elements.guildPayment.value;
 const key=pay==='premium'?premiumKey:goldKey,cost=pay==='premium'?30:10000000;
 if(wallet(me.id,key)<cost)return flash('Nie masz wystarczającej ilości waluty.',true);
 localStorage.setItem(key(me.id),String(wallet(me.id,key)-cost));
 const g={id:'guild_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),name,tag,leaderId:me.id,members:[me],invites:[],message:'Witajcie w naszej gildii!',notes:'',log:[]};
 log(g,me.name+' założył(a) gildię.');guilds.push(g);write(guilds);tab='Główna';notice='Gildia została utworzona.';error='';window.DBIRefreshWallet?.();render();
}
function invite(form){
 const id=form.elements.invitee.value,me=current(),guilds=read(),g=findMine(guilds,me.id);
 if(!g||!allowed(g,me.id,'recruit'))return flash('Brak uprawnienia do rekrutacji.',true);
 const target=allCharacters().find(c=>c.id===id);
 if(!target||target.id===me.id)return flash('Wybierz inną postać.',true);
 if(findMine(guilds,id))return flash('Ta postać już należy do gildii.',true);
 if(g.invites.includes(id))return flash('Zaproszenie już oczekuje.',true);
 g.invites.push(id);log(g,'Wysłano zaproszenie do '+target.name+'.');write(guilds);flash('Zaproszenie wysłane do '+target.name+'.');
}
function accept(guildId,yes){
 const me=current(),guilds=read(),g=guilds.find(g=>g.id===guildId&&g.invites.includes(me.id));
 if(!g)return flash('Zaproszenie nie jest już dostępne.',true);
 g.invites=g.invites.filter(id=>id!==me.id);
 if(yes){
  if(g.members.length>=capacity(g))return flash('Gildia osiągnęła limit członków.',true);
  if(findMine(guilds,me.id))return flash('Postać już należy do gildii.',true);
  g.members.push(me);log(g,me.name+' dołączył(a) do gildii.');tab='Główna';
 }
 write(guilds);flash(yes?'Dołączono do gildii.':'Odrzucono zaproszenie.');
}
function leave(){
 const me=current(),guilds=read(),g=findMine(guilds,me.id);if(!g)return;
 if(g.leaderId===me.id&&g.members.length>1)return flash('Przywódca musi najpierw przekazać przywództwo lub usunąć pozostałych członków.',true);
 if(g.leaderId===me.id){write(guilds.filter(x=>x.id!==g.id))}
 else{g.members=g.members.filter(m=>m.id!==me.id);log(g,me.name+' opuścił(a) gildię.');write(guilds)}
 confirmLeave=false;tab='Główna';flash('Opuszczono gildię.');
}
const buildings=[
 ['hq','Kwatera główna',50,2,'miejsc w gildii'],
 ['command','Centrum Dowodzenia',50,1,'% do przekazanego EXP'],
 ['wars','Kwatera wojenna',5,1,'do limitu wojen'],
 ['training','Sala Treningowa',50,1,'% do rezultatu treningu'],
 ['education','Centrum edukacji',50,10,'% zdobywanego EXP'],
 ['smith','Kowal',50,1,'% do szansy ulepszenia'],
 ['pantry','Spiżarnia',50,0.1,'% maks. HP'],
 ['spirit','Sala ducha',50,0.1,'% maks. KI'],
 ['beds','Sypialnie',50,1,'HP na cykl regeneracji'],
 ['arena','Arena walki',50,0.1,'% do wszystkich statystyk']
];
const balance=g=>Number(g.premiumBalance)||0;
const buildingLevel=(g,key)=>Math.max(0,Math.min(buildings.find(b=>b[0]===key)[2],Math.trunc(g.buildings?.[key])||0));
const capacity=g=>50+2*buildingLevel(g,'hq');
function treasury(g){
 // Wyłącznie układ Depozytu. Saldo i obsługa obu wpłat pozostają w bindEconomy().
 const me=current(),member=g.members.find(m=>String(m.id)===me.id);
 const premiumPaid=Math.max(0,Number(member?.contributions?.premium)||0);
 // Starsze zapisy nie zawierają osobnej historii wpłat EXP każdego członka.
 // Nie sumujemy wpłat całej gildii jako indywidualnego wkładu.
 const expKnown=member?.contributions!=null && Object.prototype.hasOwnProperty.call(member.contributions,'exp');
 const expPaid=expKnown?Math.max(0,Number(member.contributions.exp)||0):null;
 const fmt=n=>Math.max(0,Number(n)||0).toLocaleString('pl-PL');

 const badge='<img src="assets/ui/guild/deposit/exp-badge.svg" alt="" aria-hidden="true">';
 return `<div class="dbi-guild-deposit">
  <aside class="dbi-guild-deposit-sidebar" aria-label="Sekcja bankowa gildii">
   <div class="dbi-guild-deposit-side-title"><img src="assets/ui/guild/deposit/icon-bank.svg" alt="" aria-hidden="true">Bank klanu</div>
   <div class="dbi-guild-deposit-side-current" aria-current="page"><img src="assets/ui/guild/deposit/icon-deposit.svg" alt="" aria-hidden="true">Depozyt gildii</div>
  </aside>
  <section class="dbi-guild-deposit-main" aria-labelledby="dbiGuildDepositHeading">
   <h3 id="dbiGuildDepositHeading" class="dbi-guild-deposit-title"><img src="assets/ui/guild/deposit/icon-deposit.svg" alt="" aria-hidden="true">Aktualny Depozyt Gildii</h3>
   <div class="dbi-guild-deposit-scene">
    <div class="dbi-guild-deposit-ledger" aria-label="Stan depozytu gildii">
     <div class="dbi-guild-deposit-ledger-row">
      <span class="dbi-guild-deposit-ledger-label">Saldo:</span>
      <strong class="dbi-guild-deposit-amount">${zeniIcon}<span>${fmt(balance(g))}</span></strong>
      <small>(Zeni)</small>
     </div>
     <div class="dbi-guild-deposit-ledger-row">
      <span class="dbi-guild-deposit-ledger-label">Punkty Doświadczenia Planety:</span>
      <strong class="dbi-guild-deposit-amount">${badge}<span>${fmt(g.depositedExp)}</span></strong>
     </div>
    </div>
   </div>
   <section class="dbi-guild-deposit-personal" aria-label="Twoje wpłaty do gildii">
    <h4>Twoje wpłaty (łącznie)</h4>
    <div class="dbi-guild-deposit-personal-rows">
     <div><span>${zeniIcon} Zeni</span><strong>${fmt(premiumPaid)}</strong></div>
     <div><span>${badge} Punkty doświadczenia</span><strong>${expKnown?fmt(expPaid):'—'}</strong></div>
    </div>
    ${expKnown?'':'<small>Historia indywidualnych wpłat EXP nie jest zapisywana w obecnym systemie.</small>'}
   </section>
   <div class="dbi-guild-deposit-contributions" aria-label="Przekazywanie zasobów do depozytu">
    <form data-deposit="premium" class="dbi-guild-deposit-form">
     <label for="dbiGuildDepositPremium" class="dbi-guild-deposit-form-label">Przekaż ${zeniIcon}<span>Zeni</span></label>
     <input id="dbiGuildDepositPremium" name="amount" type="number" step="1" min="1" placeholder="Ilość do wpisania" aria-label="Ilość Zeni do wpłaty" required>
     <button type="submit"><img src="assets/ui/guild/deposit/icon-deposit.svg" alt="" aria-hidden="true">Wpłać</button>
    </form>
    <form data-deposit="exp" class="dbi-guild-deposit-form">
     <label for="dbiGuildDepositExp" class="dbi-guild-deposit-form-label">Przekaż doświadczenie ${badge}</label>
     <input id="dbiGuildDepositExp" name="amount" type="number" step="1" min="1" placeholder="Ilość do wpisania" aria-label="Ilość EXP do przekazania" required>
     <button type="submit"><img src="assets/ui/guild/deposit/icon-deposit.svg" alt="" aria-hidden="true">Wpłać</button>
    </form>
   </div>
  </section>
 </div>`;
}
function bindEconomy(root,shown){
 if(!shown)return;
 function transact(action){
  const run=()=>{
   try{
    const all=read(),id=current().id,g=findMine(all,id);
    if(!g||g.id!==shown.id)return flash('Zmieniło się członkostwo gildii.',true);
    const msg=action(g,id,()=>write(all));
    window.DBIRefreshWallet?.();flash(msg);
   }catch(err){flash(err.message,true)}
  };
  if(navigator.locks)navigator.locks.request('dboidle-guild-economy',run);else run();
 }
 root.querySelectorAll('[data-deposit]').forEach(form=>form.onsubmit=e=>{
  e.preventDefault();
  const amount=Number(form.elements.amount.value);
  if(!Number.isSafeInteger(amount)||amount<=0)return flash('Podaj dodatnią, całkowitą kwotę.',true);
  transact((g,id,save)=>{
   if(form.dataset.deposit==='exp'){
    const credit=amount+Math.floor(amount*buildingLevel(g,'command')/100);
    g.depositedExp=(g.depositedExp||0)+credit;
    window.DBIGuildDonateExp(amount,save);
    return 'Przekazano '+credit+' EXP do depozytu.';
   }
   const key=premiumKey(id),before=wallet(id,premiumKey);
   if(amount>before)throw Error('Za mało Zeni na postaci.');
   if(!Number.isSafeInteger(balance(g)+amount))throw Error('Przekroczono limit salda.');
   const member=g.members.find(m=>m.id===id);
   member.contributions={...member.contributions,premium:(member.contributions?.premium||0)+amount};
   g.premiumBalance=balance(g)+amount;
   localStorage.setItem(key,String(before-amount));
   try{save()}catch(err){localStorage.setItem(key,String(before));throw err}
   return 'Wpłacono '+amount+' Zeni.';
  });
 });
 root.querySelectorAll('[data-build]').forEach(button=>button.onclick=()=>transact((g,id,save)=>{
  const key=button.dataset.build,def=buildings.find(b=>b[0]===key);
  if(!def||!g.planetKey||!allowed(g,id,'upgrade'))throw Error('Brak możliwości ulepszenia.');
  const lvl=buildingLevel(g,key);
  if(lvl>=def[2]||lvl!==Number(button.dataset.level))throw Error('Poziom obiektu uległ zmianie.');
  if(balance(g)<20)throw Error('Potrzeba 20 Zeni w depozycie.');
  g.premiumBalance=balance(g)-20;g.buildings={...g.buildings,[key]:lvl+1};
  save();return def[1]+' · poziom '+(lvl+1);
 }));
 const buy=root.querySelector('[data-gp-preview]');
 if(buy)buy.onclick=()=>{
  const selected=planetTypes[Number(root.querySelector('[data-gp-choice]').value)];
  transact((g,id,save)=>{
   if(g.planetKey||!selected||!allowed(g,id,'upgrade'))throw Error('Brak możliwości zakupu planety.');
   if(balance(g)<200)throw Error('Potrzeba 200 Zeni w depozycie.');
   g.premiumBalance=balance(g)-200;g.planetKey=selected[0];save();return 'Zakupiono planetę '+selected[1]+'.';
  });
 };
}

function guildBonuses(level){
 const n=Math.max(0,Math.min(50,Math.trunc(Number(level)||0)));
 const percent=n>=40;
 const extra=Math.max(0,n-40);
 return {
  hp:!percent&&n?10+20*(n-1):0,
  stats:percent?0:10*Math.max(0,n-10),
  attack:percent?0:Math.max(0,n-20),
  ki:!percent&&n>=31?100+50*(n-31):0,
  hpPct:percent?1+extra:0,kiPct:percent?1+extra:0,
  statsPct:percent?1+extra*.5:0,damagePct:percent?1+extra*.5:0,
  defensePct:percent?1+extra*.5:0,mobLevel:n===50?120:0,training:0,education:0,smith:0,regen:0,warLimitBonus:0,depositExpPct:0
 };
}
const clanLevel=g=>g?Math.max(1,Math.min(50,Math.trunc(Number(g.level)||1))):0;
let savedGuilds,memberBonuses=new Map();
function bonusesFor(id){
 const raw=localStorage.getItem(KEY);
 if(raw!==savedGuilds){
  memberBonuses=new Map();
  for(const g of read()){
   const bonuses=guildBonuses(clanLevel(g));
   bonuses.hpPct+=buildingLevel(g,'pantry')/10;
   bonuses.kiPct+=buildingLevel(g,'spirit')/10;
   bonuses.statsPct+=buildingLevel(g,'arena')/10;
   bonuses.training=buildingLevel(g,'training');
   bonuses.education=10*buildingLevel(g,'education');
   bonuses.smith=buildingLevel(g,'smith');
   bonuses.regen=buildingLevel(g,'beds');
   bonuses.warLimitBonus=buildingLevel(g,'wars');
   bonuses.depositExpPct=buildingLevel(g,'command');
   for(const member of g.members)memberBonuses.set(String(member.id),bonuses);
  }
  savedGuilds=raw;
 }
 return memberBonuses.get(String(id))||guildBonuses(0);
}
const planetTypes=[
 ['ziemia','Ziemia'],['vegeta','Vegeta'],['namek','Namek'],
 ['mrozny-przyladek','Mroźny Przylądek'],['demoniczny-krag','Demoniczny Krąg']
];
function planetView(g){
 const owned=planetTypes.findIndex(([key])=>key===g.planetKey);
 const index=Math.max(0,owned),preview=owned>=0,level=clanLevel(g);
 const [key,name]=planetTypes[index];
 const picture=`<img class="gp-orb" src="assets/ui/planets/${key}.webp" alt="${name}">`;
 if(!preview)return `<section class="gp gp-shop"><div class="gp-card gp-picker">${picture}
 <label>Planety możliwe do zakupu<select data-gp-choice>${planetTypes.map(([,label],i)=>`<option value="${i}" ${i===index?'selected':''}>${label}</option>`).join('')}</select></label></div>
 <div class="gp-offer"><strong>Gildia aktualnie nie posiada żadnej planety</strong>
 <div>Koszt planety: <b>${zeniIcon}200 Zeni</b> <button type="button" data-gp-preview>Kup</button></div></div></section>`;
 const bonuses=next=>{
  const tier=Math.min(50,level+Number(next)),b=guildBonuses(tier);
  const rows=[['Maksymalne HP',b.hp||b.hpPct],['Wszystkie statystyki',b.stats||b.statsPct],
   [tier>=40?'Średnie obrażenia':'Wartość ataku',b.attack||b.damagePct],
   ['Maksymalne KI',b.ki||b.kiPct],['Obrona',b.defensePct],['Poziomy potworów na mapie',b.mobLevel]];
  const list=rows.filter(([,v])=>v).map(([label,v])=>{
   const value=label==='Wartość ataku'?v+'–'+v:v.toLocaleString('pl-PL')+(tier>=40&&label!=='Poziomy potworów na mapie'?'%':'');
   return `<li>${label} <strong>+${value}</strong></li>`;
  }).join('');
  return `<section class="gp-card gp-bonus"><header>${next?(level===50?'Poziom maksymalny':'Następny poziom · '+tier):'Aktualne bonusy · '+tier}</header><ul>${next&&level===50?'':list}</ul></section>`;
 };
 const objects=(label,defs)=>`<section class="gp-objects gp-card"><header>${label}</header><div><table><thead><tr><th>Nazwa obiektu</th><th>Poziom obiektu</th><th></th><th>Koszt Zeni</th><th>Aktualny bonus</th></tr></thead><tbody>${defs.map(([key,name,max,rate,unit])=>{
  const lvl=buildingLevel(g,key);
  return `<tr><td>${name}</td><td>${lvl}/${max}</td><td><button data-build="${key}" data-level="${lvl}" ${lvl>=max||!allowed(g,current().id,'upgrade')?'disabled':''}>${lvl===max?'Maks.':lvl?'Ulepsz':'Kup'}</button></td><td>${zeniIcon}20 Zeni</td><td>+${(lvl*rate).toLocaleString('pl-PL')} ${unit}</td></tr>`;
 }).join('') }</tbody></table></div></section>`;
 return `<section class="gp"><div class="gp-overview"><div class="gp-card gp-picture">${picture}</div><div class="gp-detail">
 <div class="gp-level"><b>Poziom ${level}</b><div>Rozwój planety<div class="gp-track"></div></div></div>
 <p>Planeta Gildyjna – Zaplecze badawcze każdej gildii. Rozwijaj i zdobywaj coraz to lepsze i silniejsze wzmocnienia dla gildii jak i jej wszystkich członków.</p>
 <div class="gp-bonuses">${bonuses(false)}${bonuses(true)}</div></div></div>
 ${objects('Obiekty Gildyjne',buildings.slice(0,3))}${objects('Obiekty Członkowskie',buildings.slice(3))}
 </section>`;
}
function bindPlanet(root,index=0){
 const choice=root.querySelector('[data-gp-choice]');
 if(choice)choice.onchange=()=>{
  const [key,name]=planetTypes[Number(choice.value)];
  const image=choice.closest('.gp').querySelector('.gp-orb');
  image.src='assets/ui/planets/'+key+'.webp';image.alt=name;
 };

}

function panelMain(g){
 const me=current(),leader=g.leaderId===me.id,people=allCharacters();
 const memberName=id=>people.find(p=>p.id===id)?.name||g.members.find(m=>m.id===id)?.name||'Nieznana postać';
 const content={
 'Główna':`<div class="dbi-guild-home">
  <section class="dbi-guild-feature" aria-label="Centrum gildii">
   <h3><span aria-hidden="true">✦</span> Centrum gildii</h3>
   <div class="dbi-guild-feature-body">
    <div class="dbi-guild-world-image" role="img" aria-label="Kosmiczna baza gildii wśród gór i wodospadów"></div>
    <div class="dbi-guild-feature-info">
     <small>WSPÓLNA BAZA</small>
     <h4>${esc(g.name)}</h4>
     <p>Twoje miejsce wśród wojowników. Organizuj członków, zarządzaj zaproszeniami i korzystaj z dostępnych funkcji gildii.</p>
     <div class="dbi-guild-feature-facts">
      <span><b>${g.members.length}</b> członków</span>
      <span><b>${esc(g.tag)}</b> skrót gildii</span>
      <span><b>${esc(memberName(g.leaderId))}</b> przywódca</span>
     </div>
    </div>
   </div>
  </section>
  <div class="dbi-guild-home-aside">
   <section class="dbi-guild-message"><h3><span aria-hidden="true">✉</span> Ogłoszenie gildii</h3><p>${esc(g.message)}</p></section>
   <aside class="dbi-guild-journal"><h3><span aria-hidden="true">◷</span> Dziennik aktywności</h3><div class="dbi-guild-journal-entries">${g.log.length?g.log.map(e=>`<p><small>${esc(e.time)}</small><span>${esc(e.text)}</span></p>`).join(''):'<p>Brak wpisów.</p>'}</div></aside>
  </div>
  <section class="dbi-guild-roster"><h3><span aria-hidden="true">♟</span> Członkowie gildii <strong>(${g.members.length})</strong></h3><div class="dbi-guild-roster-items">${g.members.map(m=>`<div class="dbi-guild-roster-person"><span class="dbi-guild-roster-avatar" aria-hidden="true">${esc(m.name.slice(0,1).toUpperCase())}</span><span><b>${esc(m.name)}</b><small>${m.id===g.leaderId?'Przywódca':'Członek'}</small></span></div>`).join('')}</div></section>
 </div>`,
 'Członkowie':memberPanel(g,people,me.id),
 'Zaproszenia':`<h3>Zaproszenia</h3>${allowed(g,me.id,'recruit')?`<form id="dbiGuildInvite" class="dbi-guild-invite"><label>Wybierz postać do zaproszenia<select name="invitee" required>${people.filter(p=>p.id!==me.id&&!findMine(read(),p.id)).map(p=>`<option value="${esc(p.id)}">${esc(p.name)} (${esc(p.account)})</option>`).join('')}</select></label><button type="submit">Wyślij zaproszenie</button></form>`:'<p>Do wysyłania zaproszeń potrzebujesz uprawnienia do rekrutacji.</p>'}<h4>Oczekujące zaproszenia</h4>${g.invites.length?g.invites.map(id=>`<p>${esc(memberName(id))}</p>`).join(''):'<p>Brak oczekujących zaproszeń.</p>'}`,
 'Notatki':`<h3>Notatki gildii</h3><form id="dbiGuildNotes"><textarea name="notes" rows="6" maxlength="2000" ${allowed(g,me.id,'notes')?'':'readonly'}>${esc(g.notes || g.message || '')}</textarea>${allowed(g,me.id,'notes')?'<button type="submit">Zapisz notatki</button>':''}</form>`,
 'Ustawienia':`<h3>Ustawienia</h3><p>Tag: [${esc(g.tag)}] · Przywódca: ${esc(memberName(g.leaderId))}</p>${allowed(g,me.id,'notes')?`<form id="dbiGuildMessage"><label>Wiadomość wewnętrzna<textarea name="message" rows="4" maxlength="2000">${esc(g.message)}</textarea></label><button type="submit">Zapisz wiadomość</button></form>`:'<p>Do edycji potrzebujesz uprawnienia do notatek.</p>'}`,
 'Planeta':planetView(g),
 'Wojny':'<h3>Wojny</h3><p>System wojen gildii dodamy w kolejnym etapie.</p>',
 'Depozyt':treasury(g),
 'Grupowa':'<h3>Grupowa</h3><p>Aktywności grupowe dodamy później.</p>',
 'Ekonomia':'<h3>Ekonomia</h3><p>Ekonomia gildii będzie dostępna w przyszłości.</p>'
 };
 return `<div class="dbi-guild-top">
  <div class="dbi-guild-hero-identity">
   <div class="dbi-guild-emblem" aria-hidden="true"><span>${esc(g.tag.slice(0,2))}</span></div>
   <div class="dbi-guild-hero-text"><small>GILDIA</small><h2>${esc(g.name)} <span>[${esc(g.tag)}]</span></h2>
    <div class="dbi-guild-hero-facts"><span>♟ Członkowie: <b>${g.members.length}</b></span><span>Poziom gildii: <b>${clanLevel(g)}</b></span><span>✦ Przywódca: <b>${esc(memberName(g.leaderId))}</b></span></div>
   </div>
  </div>
  <button id="dbiGuildLeave">Opuść klan</button>
 </div><nav class="dbi-guild-tabs" aria-label="Zakładki gildii">${TABS.map(t=>`<button type="button" aria-pressed="${t===tab}" data-guild-tab="${esc(t)}" class="${t===tab?'active':''}">${esc(t)}</button>`).join('')}</nav><div class="dbi-guild-tabcontent">${content[tab]||content['Główna']}</div>`;
}
function render(){
 const root=document.querySelector('#pageBody');if(!root)return;
 document.querySelector('#breadcrumb').textContent='GILDIA';
 const me=current(),guilds=read(),g=findMine(guilds,me.id);
 const pending=guilds.filter(g=>g.invites.includes(me.id));
 root.innerHTML=`<section class="dbi-guild"><header class="dbi-guild-title">Gildia</header>${notice?`<p class="dbi-guild-alert">${esc(notice)}</p>`:''}${error?`<p class="dbi-guild-alert error">${esc(error)}</p>`:''}${g?panelMain(g):`<div class="dbi-guild-create-area"><form id="dbiGuildCreate" class="dbi-guild-create"><h2>Załóż gildię</h2><label>Nazwa gildii<input name="guildName" minlength="3" maxlength="30" placeholder="Nazwa gildii" required></label><label>Skrót gildii (maks. 5 znaków)<input name="guildTag" maxlength="5" placeholder="TAG" required></label><label>${zeniIcon}Waluta założenia<select name="guildPayment"><option value="gold">10 000 000 złota (masz: ${wallet(me.id,goldKey).toLocaleString('pl-PL')})</option><option value="premium">30 Zeni (masz: ${wallet(me.id,premiumKey)})</option></select></label><button type="submit">Stwórz</button></form>${pending.length?`<div class="dbi-guild-pending"><h3>Zaproszenia do gildii</h3>${pending.map(x=>`<div><strong>${esc(x.name)} [${esc(x.tag)}]</strong><button data-accept="${esc(x.id)}">Akceptuj</button><button data-decline="${esc(x.id)}">Odrzuć</button></div>`).join('')}</div>`:''}</div>`}${confirmLeave?`<div class="dbi-guild-dialog"><div><h3>Opuścić gildię?</h3><p>${g?.leaderId===me.id?'Gildia zostanie rozwiązana, jeśli jesteś jej jedynym członkiem.':'Utracisz członkostwo w gildii.'}</p><button id="dbiGuildLeaveYes">Potwierdź</button><button id="dbiGuildLeaveNo">Anuluj</button></div></div>`:''}</section>`;
 bindPlanet(root);
 bindEconomy(root,g);
 root.querySelector('#dbiGuildCreate')?.addEventListener('submit',e=>{e.preventDefault();create(e.currentTarget)});
 root.querySelector('#dbiGuildInvite')?.addEventListener('submit',e=>{e.preventDefault();invite(e.currentTarget)});
 root.querySelectorAll('[data-guild-tab]').forEach(b=>b.onclick=()=>{
  const offset=b.parentElement.scrollLeft;
  tab=b.dataset.guildTab;notice='';error='';render();
  const selected=root.querySelector('.dbi-guild-tabs .active');
  selected.parentElement.scrollLeft=offset;
  selected.focus({preventScroll:true});
 });
 root.querySelectorAll('[data-accept]').forEach(b=>b.onclick=()=>accept(b.dataset.accept,true));
 root.querySelectorAll('[data-decline]').forEach(b=>b.onclick=()=>accept(b.dataset.decline,false));
 root.querySelector('#dbiGuildLeave')?.addEventListener('click',()=>{confirmLeave=true;render()});
 root.querySelector('#dbiGuildLeaveYes')?.addEventListener('click',leave);
 root.querySelector('#dbiGuildLeaveNo')?.addEventListener('click',()=>{confirmLeave=false;render()});
 root.querySelectorAll('[data-edit-member]').forEach(button=>button.onclick=()=>{
  button.nextElementSibling.showModal();
 });
 root.querySelectorAll('.guild-dialog-close').forEach(button=>button.onclick=()=>{
  button.closest('dialog').close();
 });
 root.querySelectorAll('.guild-member-dialog').forEach(dialog=>dialog.onclose=()=>{
  dialog.querySelector('form').reset();
 });
 root.querySelectorAll('.guild-right-form').forEach(form=>form.onsubmit=e=>{
  e.preventDefault();
  const all=read(),guild=findMine(all,me.id),id=form.dataset.member;
  if(!guild || !allowed(guild,me.id,'grant') || id===me.id || id===guild.leaderId)return;
  const member=guild.members.find(m=>m.id===id);
  if(!member)return;
  const selected=new FormData(form).getAll('permission');
  member.permissions=Object.keys(rights).filter(key=>allowed(guild,me.id,key)?selected.includes(key):allowed(guild,id,key));
  write(all);flash('Zapisano uprawnienia członka.');
 });
 root.querySelectorAll('[data-promote]').forEach(b=>b.onclick=()=>{const all=read(),mine=findMine(all,me.id);if(mine?.leaderId!==me.id)return;mine.leaderId=b.dataset.promote;log(mine,'Przekazano przywództwo postaci '+(mine.members.find(m=>m.id===mine.leaderId)?.name||'')+'.');write(all);flash('Przekazano przywództwo.')});
 root.querySelectorAll('[data-kick]').forEach(b=>b.onclick=()=>{const all=read(),mine=findMine(all,me.id);if(!mine||!allowed(mine,me.id,'manage')||[me.id,mine.leaderId].includes(b.dataset.kick))return;const kicked=mine.members.find(m=>m.id===b.dataset.kick);mine.members=mine.members.filter(m=>m.id!==b.dataset.kick);log(mine,'Usunięto członka '+(kicked?.name||'')+'.');write(all);flash('Usunięto członka.')});
 for(const [selector,field] of [['#dbiGuildNotes','notes'],['#dbiGuildMessage','message']]){
  root.querySelector(selector)?.addEventListener('submit',e=>{
   e.preventDefault();
   const guilds=read(),guild=findMine(guilds,me.id);
   if(!guild || !allowed(guild,me.id,'notes'))return;
   const text=e.currentTarget.elements[field].value;
   guild.notes=text;
   guild.message=text;
   write(guilds);
   flash(text?'Zapisano ogłoszenie gildii.':'Wyczyszczono ogłoszenie gildii.');
  });
 }
}
const sheet=document.createElement('link');
sheet.rel='stylesheet';sheet.href='css/guild-members.css';
document.head.append(sheet);
const planetSheet=document.createElement('link');
planetSheet.rel='stylesheet';planetSheet.href='css/guild-planet.css';document.head.append(planetSheet);
window.DBIGuild={render,bonusesFor};
})();
