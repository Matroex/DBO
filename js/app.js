const menus=[
 {name:'ŚWIAT',page:'Mapa świata'},
 {name:'POSTAĆ',options:['Pulpit','Statystyki','Profil Postaci','Ekwipunek','Misje','Aktywności']},
 {name:'AKTYWNOŚCI',options:['Turniej','Event','Pole bitwy','Trening','Szybka podróż']},
 {name:'WZMOCNIENIA',options:['Techniki','Umiejętności','Smocze kule']},
 {name:'SPOŁECZNOŚĆ',options:['Ranking']},
 {name:'GILDIA',page:'Gildia'},
 {name:'POCZTA',page:'Poczta'},
 {name:'BAZA WIEDZY',disabled:true},
 {name:'GM',page:'Panel GM'}
];
const nav=document.querySelector('#nav');
const defaultPage=document.querySelector('#pageBody').innerHTML;
const dropdown=document.querySelector('#dropdown');
let opened=null,exp=0,level=1;
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
    level=Math.max(1,Number(character.level)||1);
    exp=Math.max(0,Math.min(99,Number(character.exp)||0));
    document.querySelector('#name').textContent=character.name;
    const raceField=document.querySelector('.mini-stats strong');
    if(raceField)raceField.textContent=character.race||'Nie wybrano';
  }
}
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
function dbiRefreshHeaderWallet(){
 const id=String(dbiActive?.id||'test');
 const gold=Number(localStorage.getItem('dboidle_gold_v1_'+id))||0;
 let dragon=0;
 try{dragon=Math.max(0,Number(JSON.parse(localStorage.getItem('dboidle_dragon_wallet_v1_'+id)||'{}').coins)||0)}catch{}
 const premium=Number(localStorage.getItem('dboidle_premium_v1_'+id))||0;
 const fmt=n=>Math.max(0,Math.floor(n)).toLocaleString('pl-PL');
 const values=[['dbiHeaderGold',gold],['dbiHeaderDragon',dragon],['dbiHeaderPremium',premium]];
 for(const [name,value] of values){const el=document.getElementById(name);if(el)el.textContent=fmt(value)}
}
window.DBIRefreshWallet=dbiRefreshHeaderWallet;
window.addEventListener('storage',dbiRefreshHeaderWallet);
dbiRefreshHeaderWallet();
const setLog=t=>document.querySelector('#log').textContent=t;
function showPage(title,section){
  if(dbiActive?.id)sessionStorage.setItem('dboidle_last_page_'+dbiActive.id,JSON.stringify({title,section}));
  window.DBIWorld?.stop();
  document.querySelector('.game').classList.toggle('world-view',title==='Mapa świata');
  if(title==='Mapa świata'){
    document.querySelector('.game').classList.remove('equipment-view');
    document.querySelector('#breadcrumb').textContent='ŚWIAT / BŁĘKITNA LAGUNA';
    window.DBIWorld.start(document.querySelector('#pageBody'),dbiActive?.id);
    opened=null;renderNav();return;
  }
 document.querySelector('.game').classList.toggle('equipment-view',title==='Ekwipunek'||title==='Panel GM');
 if(title==='Panel GM'){renderGM();opened=null;renderNav();return;}
 if(title==='Ekwipunek'){renderEquipment();opened=null;renderNav();return;}
 if(title==='Profil Postaci'){renderCharacterProfile();opened=null;renderNav();return;}
 if(title==='Statystyki'){renderCharacterStatistics();opened=null;renderNav();return;}
 if(title==='Trening'){renderTraining();opened=null;renderNav();return;}
 if(title==='Misje'){renderMissions();opened=null;renderNav();return;}
 if(title==='Aktywności'){renderDailyActivities();opened=null;renderNav();return;}
 if(title==='Ranking'){renderCommunityRanking();opened=null;renderNav();return;}
 document.querySelector('#pageBody').innerHTML=defaultPage;

 document.querySelector('#breadcrumb').textContent=section?section+' / '+title:title;
 document.querySelector('#contentTitle').textContent=title;
 document.querySelector('#contentDescription').textContent='Widok „'+title+'” — miejsce na docelową zawartość. Funkcje dodamy w kolejnych etapach.';
 setLog('Otworzono: '+(section?section+' → ':'')+title);
 opened=null;renderNav();
}
// Widok rankingu jest na razie szkieletem; nie pokazuje fikcyjnych graczy.
function renderCommunityRanking(){
 hideItemPopups();
 document.querySelector('#breadcrumb').textContent='SPOŁECZNOŚĆ / RANKING';
 document.querySelector('#pageBody').innerHTML=`<section class="dbi-community-ranking"><h2>🏆 Ranking graczy</h2><p>Ranking będzie dostępny w kolejnym etapie.</p></section>`;
}
function renderNav(){
 nav.replaceChildren();
 menus.forEach((menu,index)=>{
  const item=document.createElement('div');item.className='nav-item';
  const button=document.createElement('button');
  button.className='nav-button'+(opened===index?' active':'');
  button.disabled=!!menu.disabled;
  button.textContent=menu.name;
  if(menu.options){
   const arrow=document.createElement('span');arrow.className='chevron';arrow.textContent=opened===index?'▲':'▼';button.append(' ',arrow);
   button.setAttribute('aria-expanded',String(opened===index));
   button.setAttribute('aria-haspopup','true');
  }
  button.addEventListener('click',event=>{
   event.stopPropagation();
   if(menu.disabled)return;
   if(menu.page){showPage(menu.page);return;}
   opened=opened===index?null:index;renderNav();
  });
  item.append(button);
  if(menu.options&&opened===index){
   const list=document.createElement('div');list.className='nav-dropdown';
   menu.options.forEach(label=>{
    const option=document.createElement('button');option.className='sub-button';option.textContent=label;
    option.addEventListener('click',event=>{event.stopPropagation();showPage(label,menu.name)});
    list.append(option);
   });item.append(list);
  }
  nav.append(item);
 });
}
document.addEventListener('click',event=>{if(opened!==null&&!nav.contains(event.target)){opened=null;renderNav()}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&opened!==null){opened=null;renderNav()}});
function renderExp(){
 document.querySelector('#level').textContent=level;
 document.querySelector('#expText').textContent=exp+' / 100 EXP';
 const balls=document.querySelector('#balls');balls.replaceChildren();
 for(let i=0;i<4;i++){
  const ball=document.createElement('div');ball.className='ball'+(exp>=(i+1)*25?' active':'');ball.textContent='★';
  ball.title='Smocza kula '+(i+1)+' — '+((i+1)*25)+'% EXP';balls.append(ball);
 }
}
document.querySelector('#expButton').addEventListener('click',()=>{
 exp+=25;if(exp>=100){exp-=100;level++;setLog('Awans! Osiągnięto poziom '+level+'. Smocze kule zresetowane.')}
 else setLog('Zdobyto 25 EXP. Postęp: '+exp+'%.');renderExp();dbiSaveProgress();
});
document.querySelector('#switchCharacter').addEventListener('click',()=>{window.DBIWorld?.stop();dbiSaveProgress();sessionStorage.removeItem(DBI_ACTIVE_KEY);location.href='characters.html';});
renderNav();if(dropdown){dropdown.hidden=true;dropdown.replaceChildren()}renderExp();



// v0.8 — wspólny katalog, dwukratkowe wyposażenie, lokalny panel GM
let catalog=dbiLoadCatalog();
const DBI_INV_KEY='dboidle_inventory_v1_'+String(dbiActive?.id||'test');
let inventory=DBI_DEFAULT_ITEMS.map(x=>x.id);
try{const stored=JSON.parse(localStorage.getItem(DBI_INV_KEY)||'null');if(Array.isArray(stored))inventory=stored.filter(id=>typeof id==='string');}catch{}
function dbiSaveInventory(){try{localStorage.setItem(DBI_INV_KEY,JSON.stringify(inventory))}catch{}}
let inventoryTab=0,equipmentSet='Główny',selectedSlot=null;
let inventoryPlacement=inventory.map(()=>null);
const QUALITY=['Pospolity','Zwyczajny','Rzadki','Epicki','Legendarny'];
let dragIndex=null;
let dragActive=false;
let dragOffset={x:0,y:0};
let tabHoverTimer=null,dragSourceElement=null,dragCompleted=false;
const DBI_EQUIP_KEY='dboidle_equipped_v1_'+String(dbiActive?.id||'test');
let equipped={'Główny':{},'PvP':{}};
try{const saved=JSON.parse(localStorage.getItem(DBI_EQUIP_KEY)||'null');if(saved&&typeof saved==='object')for(const set of ['Główny','PvP'])if(saved[set]&&typeof saved[set]==='object')equipped[set]=saved[set];}catch{}
function dbiSaveEquipped(){try{localStorage.setItem(DBI_EQUIP_KEY,JSON.stringify(equipped))}catch{}}

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const itemById=id=>catalog.find(x=>x.id===id);
const dbiItemArt=(item)=>item?.image&&/^assets\/items\/[a-z0-9-]+\.png$/.test(item.image)?`<img class="dbi-item-image" src="${item.image}" alt="" draggable="false">`:esc(item?.icon||'');
const slotOptions=DBI_SLOTS.map(s=>`<option value="${s[1]}">${s[0]}</option>`).join('');
const sums=items=>({attack:items.reduce((a,x)=>a+(Number(x.attack)||0),0),attackMin:items.reduce((a,x)=>a+(Number(x.attackMin)||0),0),attackMax:items.reduce((a,x)=>a+(Number(x.attackMax)||0),0),attackSpeedPct:items.reduce((a,x)=>a+(Number(x.attackSpeedPct)||0),0),moveSpeedPct:items.reduce((a,x)=>a+(Number(x.moveSpeedPct)||0),0),defense:items.reduce((a,x)=>a+(Number(x.defense)||0),0),ki:items.reduce((a,x)=>a+(Number(x.ki)||0),0)});
// Każda zakładka ma 6 kolumn × 10 rzędów = 60 fizycznych kratek.
// Duże przedmioty rezerwują dwie kratki w tej samej kolumnie.
const TWO_CELL_TYPES=new Set(['bron','zbroja','stroj']);
function itemTall(id){return TWO_CELL_TYPES.has(itemById(id)?.slot)}
function fits(cell,tall,used){return cell>=0&&cell<60&&(!tall||Math.floor(cell/6)<9)&&!used.has(cell)&&(!tall||!used.has(cell+6))}
function inventoryPages(){
 const pages=[],used=[];
 const reserve=(page,cell,tall)=>{used[page]??=new Set();used[page].add(cell);if(tall)used[page].add(cell+6)};
 // Najpierw zachowujemy pozycje przesuniętych ręcznie przedmiotów.
 inventory.forEach((id,index)=>{const pos=inventoryPlacement[index];if(!pos)return;const tall=itemTall(id);used[pos.page]??=new Set();if(fits(pos.cell,tall,used[pos.page]))reserve(pos.page,pos.cell,tall);else inventoryPlacement[index]=null});
 inventory.forEach((id,index)=>{
  const item=itemById(id),tall=itemTall(id);let pos=inventoryPlacement[index];
  if(!pos){let found=false;for(let page=0;!found;page++){used[page]??=new Set();for(let cell=0;cell<60;cell++)if(fits(cell,tall,used[page])){pos={page,cell};inventoryPlacement[index]=pos;reserve(page,cell,tall);found=true;break}}}
  pages[pos.page]??=[];pages[pos.page].push({index,id,item,cell:pos.cell,tall});
 });return pages;
}
function renderInventoryGrid(){
 const entries=inventoryPages()[inventoryTab]||[];
 const cells=Array.from({length:60},(_,i)=>`<span class="inv-cell inv-empty" data-cell="${i}" style="grid-column:${i%6+1};grid-row:${Math.floor(i/6)+1}" aria-label="Puste miejsce"></span>`);
 for(const {index,item,cell,tall} of entries){
  const quality=QUALITY.includes(item?.quality)?item.quality:'Pospolity';
  cells[cell]=`<button type="button" draggable="true" class="inv-cell has-item ${tall?'inv-tall':''} quality-${QUALITY.indexOf(quality)}" data-index="${index}" style="grid-column:${cell%6+1};grid-row:${Math.floor(cell/6)+1} / span ${tall?2:1}" aria-label="${esc(item?.name||'Nieznany przedmiot')}"><span>${dbiItemArt(item)}</span></button>`;
  if(tall)cells[cell+6]='';
 }
 return cells.join('');
}
function moveItem(index,page,cell){
 const id=inventory[index];if(id===undefined)return false;
 const tall=itemTall(id),pages=inventoryPages();
 const occupied=new Set();for(const entry of pages[page]||[])if(entry.index!==index){occupied.add(entry.cell);if(entry.tall)occupied.add(entry.cell+6)}
 if(!fits(cell,tall,occupied))return false;
 inventoryPlacement[index]={page,cell};return true;
}
function tooltipMarkup(item){
 const q=QUALITY.includes(item.quality)?item.quality:'Pospolity';
 const qi=QUALITY.indexOf(q);
 const stats=[];
 if(Number(item.attackMin)||Number(item.attackMax))stats.push('Wartość ataku '+Number(item.attackMin||0)+'–'+Number(item.attackMax||0));
 else if(Number(item.attack))stats.push('Atak +'+Number(item.attack));
 if(Number(item.defense))stats.push('Obrona +'+Number(item.defense));
 if(Number(item.ki))stats.push('KI +'+Number(item.ki));
 if(Number(item.attackSpeedPct))stats.push('Szybkość ataku +'+Number(item.attackSpeedPct)+'%');
 if(Number(item.moveSpeedPct))stats.push('Szybkość ruchu +'+Number(item.moveSpeedPct)+'%');
 const displayName=item.name+(item.enhancement!==undefined?' +'+item.enhancement:'');
 return `<div class="tip-name quality-text-${qi}">${esc(displayName)}</div>
 <div class="tip-icon">${dbiItemArt(item)}</div>
 <div class="tip-level">Poziom: ${Number(item.requiredLevel)||1}</div>
 <div class="tip-stats">${stats.length?stats.map(line=>`<div>${esc(line)}</div>`).join(''):'Brak statystyk podstawowych'}</div>
 ${item.description?`<div class="tip-description">${esc(item.description)}</div>`:''}
 <div class="tip-bottom"><span>${esc(item.slot)}</span><strong class="quality-text-${qi}">${esc(q).toUpperCase()}</strong></div>`;
}
function showTooltip(event,index){
 showTooltipItem(event,itemById(inventory[index]));
}
function showTooltipItem(event,item){
 if(!item||dragActive)return;
 let tip=document.querySelector('#itemTooltip');if(!tip){tip=document.createElement('div');tip.id='itemTooltip';tip.className='item-tooltip';document.body.append(tip)}
 tip.innerHTML=tooltipMarkup(item);tip.hidden=false;positionPopup(tip,event.clientX,event.clientY);
}
function positionPopup(el,x,y){const w=el.offsetWidth||240,h=el.offsetHeight||110;el.style.left=Math.max(8,Math.min(x+14,innerWidth-w-8))+'px';el.style.top=Math.max(8,Math.min(y+14,innerHeight-h-8))+'px'}
function hideItemPopups(){document.querySelector('#itemTooltip')?.setAttribute('hidden','');document.querySelector('#itemActions')?.remove()}
function itemActions(event,index){event.preventDefault();hideItemPopups();const item=itemById(inventory[index]);if(!item)return;const menu=document.createElement('div');menu.id='itemActions';menu.className='item-actions';menu.innerHTML=`<div>${esc(item.name)}</div><button type="button">Zniszcz</button>`;document.body.append(menu);positionPopup(menu,event.clientX,event.clientY);menu.querySelector('button').onclick=()=>{inventory.splice(index,1);inventoryPlacement.splice(index,1);hideItemPopups();renderEquipment('Zniszczono: '+item.name)};}



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
 for(let i=1;i<Number(hours);i++)value=Math.ceil(value*1.5);
 return value;
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
function renderTraining(){
 if(dbiTrainingTicker!==null){clearInterval(dbiTrainingTicker);dbiTrainingTicker=null}
 hideItemPopups();
 document.querySelector('#breadcrumb').textContent='AKTYWNOŚCI / TRENING';
 const stored=dbiTrainingRead();
 document.querySelector('#pageBody').innerHTML=`
 <div class="dbi-training"><h2 class="dbi-training-title">Trening</h2><div class="dbi-training-columns">
 ${Object.entries(DBI_TRAINING_TYPES).map(([key,type])=>{
 const session=stored[key],running=!!session&&session.endsAt>Date.now(),finished=!!session&&session.endsAt<=Date.now();
 const blocked=!session&&Object.entries(stored).some(([other,active])=>other!==key&&active?.endsAt>Date.now());
 return `<section class="dbi-training-column" data-training="${key}">
 <h3>${type.title}</h3>
 <div class="dbi-training-fields">
 <label><span>Atrybut</span><select class="dbi-training-attribute" ${session?'disabled':''}>${type.attributes.map(attr=>`<option value="${attr}" ${session?.attribute===attr?'selected':''}>${attr}</option>`).join('')}</select></label>
 <label><span>Czas</span><select class="dbi-training-duration" ${session?'disabled':''}>${[1,2,3,4,5,6].map(n=>`<option value="${n}" ${session?.hours===n?'selected':''}>${n} ${n===1?'godzina':n<5?'godziny':'godzin'}</option>`).join('')}</select></label>
 </div>
 <div class="dbi-training-result"><strong>Rezultat</strong>
 <p class="dbi-training-reward">+${session?.reward??dbiTrainingReward(session?.attribute||type.attributes[0],session?.hours||1,level)}</p>
 <p class="dbi-training-status">${running?'Trening trwa':finished?'Trening zakończony':'Nie rozpoczęto treningu'}</p>
 <p class="dbi-training-clock">${running?dbiTrainingTime(session.endsAt-Date.now()):finished?'00:00:00':'—'}</p>
 <p class="dbi-training-note">${session?'Wybrano: '+esc(session.attribute):'Wybierz atrybut i czas treningu.'}</p>
 </div>
 <button class="dbi-training-action" type="button" ${blocked?'disabled title="Najpierw zakończ aktywny trening"':''}>${running?'Przerwij':finished?'Odbierz wynik':'Trenuj'}</button>
 </section>`;
 }).join('')}
 </div></div>`;
 const update=()=>{
  const data=dbiTrainingRead();
  for(const [key] of Object.entries(DBI_TRAINING_TYPES)){
   const col=document.querySelector(`.dbi-training-column[data-training="${key}"]`);
   if(!col)continue;
   const session=data[key],running=session&&session.endsAt>Date.now();
   col.querySelector('.dbi-training-status').textContent=running?'Trening trwa':session?'Trening zakończony':'Nie rozpoczęto treningu';
   col.querySelector('.dbi-training-clock').textContent=running?dbiTrainingTime(session.endsAt-Date.now()):session?'00:00:00':'—';
   const action=col.querySelector('.dbi-training-action');
   action.textContent=running?'Przerwij':session?'Odbierz wynik':'Trenuj';
   action.disabled=!session&&Object.entries(data).some(([other,active])=>other!==key&&active?.endsAt>Date.now());
  }
 };
 document.querySelectorAll('.dbi-training-column').forEach(col=>{
  const key=col.dataset.training;
  const refreshPreview=()=>{
   const data=dbiTrainingRead(),session=data[key];
   const attr=session?.attribute||col.querySelector('.dbi-training-attribute').value;
   const hours=session?.hours||Number(col.querySelector('.dbi-training-duration').value);
   col.querySelector('.dbi-training-reward').textContent='+'+(session?.reward??dbiTrainingReward(attr,hours,level));
  };
  col.querySelector('.dbi-training-attribute').addEventListener('change',refreshPreview);
  col.querySelector('.dbi-training-duration').addEventListener('change',refreshPreview);
  col.querySelector('.dbi-training-action').onclick=()=>{
   const data=dbiTrainingRead(),session=data[key];
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
    if(Object.values(data).some(active=>active?.endsAt>Date.now()))return renderTraining();
    const attribute=col.querySelector('.dbi-training-attribute').value;
    const hours=Number(col.querySelector('.dbi-training-duration').value);
    const now=Date.now();
    data[key]={attribute,hours,levelAtStart:level,reward:dbiTrainingReward(attribute,hours,level),startedAt:now,endsAt:now+hours*3600000};
   }
   dbiTrainingWrite(data);renderTraining();
  };
 });
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
  ['Obrażenia',['damage','bonusDamage']],
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
  ['Szansa na Unik',['dodgeChance'],'%'],
  ['Średnie obrażenia ataku',['averageAttackDamage','averageDamage']],
  ['Średnie obrażenia technik',['averageTechniqueDamage']],
  ['Redukcja obrażeń krytycznych',['criticalDamageReduction'],'%'],
  ['Odporność na omdlenia',['stunResistance','faintResistance'],'%']
 ]],
 ['Pasywne',[
  ['% do zdobywanego doświadczenia',['expBonusPct','experienceBonusPct'],'%'],
  ['% na podwójny drop z mobów',['doubleMobDropChance'],'%'],
  ['% na podwójne nagrody bossów',['doubleBossRewardsChance'],'%'],
  ['% do zyskiwanego złota z walk',['goldBonusPct','battleGoldBonusPct'],'%']
 ]]
];
function dbiStatNumber(obj,keys){
 if(!obj||typeof obj!=='object')return null;
 for(const key of keys){
  const value=obj[key];
  if(value!==undefined&&value!==null&&value!==''&&Number.isFinite(Number(value)))return Number(value);
 }
 return null;
}
function renderCharacterStatistics(){
 hideItemPopups();
 document.querySelector('#breadcrumb').textContent='POSTAĆ / STATYSTYKI';
 const character=dbiCharacters[dbiCharacterIndex]||{};
 const worn=Object.values(equipped['Główny']||{}).map(itemById).filter(Boolean);
 const baseSources=[character.stats,character.attributes,character.baseStats,character];
 const bonusSources=[character.bonuses,character.activeStats,character.passiveStats,character.stats,character];
 const getBase=(keys,sources)=>{
  for(const source of sources){const v=dbiStatNumber(source,keys);if(v!==null)return v}
  return 0;
 };
 const itemSum=(keys)=>worn.reduce((total,item)=>total+getBase(keys,[item]),0);
 const format=(number)=>Number.isInteger(number)?String(number):String(Math.round(number*100)/100);
 const renderRow=(label,value,suffix='')=>`<div class="dbi-stat-row"><span>${esc(label)}</span><strong>${esc(value)}${suffix}</strong></div>`;
 const statRows=(group,definitions)=>{
  const rows=[];
  for(const [label,keys,suffix=''] of definitions){
   if(group==='Aktywne'&&(label==='Wartość ataku'||label==='Wartość ataku technik')){
    const isTechnique=label==='Wartość ataku technik';
    const minKey=isTechnique?'techniqueAttackMin':'attackMin';
    const maxKey=isTechnique?'techniqueAttackMax':'attackMax';
    const fixedKeys=isTechnique?['techniqueAttack','techniquePower']:['attack','physicalAttack','physicalAttackPower','attackPower'];
    const min=getBase([minKey],bonusSources)+itemSum([minKey]);
    const max=getBase([maxKey],bonusSources)+itemSum([maxKey]);
    const fixed=getBase(fixedKeys,bonusSources)+itemSum(fixedKeys);
    if(min||max)rows.push(renderRow(label,format(min+fixed)+'–'+format(max+fixed)));
    else if(fixed)rows.push(renderRow(label,format(fixed)));
    continue;
   }
   const sources=group==='Podstawowe'?baseSources:bonusSources;
   const value=getBase(keys,sources)+itemSum(keys);
   if(value!==0)rows.push(renderRow(label,format(value),suffix));
  }
  return rows.join('')||'<p class="dbi-stat-empty">Brak statystyk w tej kategorii.</p>';
 };
 document.querySelector('#pageBody').innerHTML=`
 <section class="dbi-stat-panel">
  <header class="dbi-stat-header">Statystyki</header>
  ${DBI_STAT_GROUPS.map(([group,defs])=>`<section class="dbi-stat-group"><h2>${group}</h2>${statRows(group,defs)}</section>`).join('')}
 </section>`;
}
// Profil korzysta bezpośrednio z tego samego obiektu equipped co ekwipunek.
// Nie tworzymy drugiej kopii wyposażenia.
function renderCharacterProfile(){
 hideItemPopups();
 document.querySelector('#breadcrumb').textContent='POSTAĆ / PROFIL POSTACI';
 const current=equipped['Główny'];
 const character=dbiCharacters[dbiCharacterIndex]||{};
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
 document.querySelector('#pageBody').innerHTML=`
 <div class="character-profile-layout">
  <section class="character-profile-card profile-portrait">
   <h2>AWATAR</h2>
   <div class="character-portrait-frame">${safeAvatar?`<img src="${safeAvatar}" alt="Awatar postaci">`:`<div class="character-avatar-fallback">${esc(name.charAt(0).toUpperCase())}</div>`}</div>
   <p>${safeAvatar?'Portret postaci':'Brak wybranego awatara — wyświetlana jest pierwsza litera nicku.'}</p>
  </section>
  <section class="character-profile-card profile-details">
   <div class="profile-details-head"><h2>${esc(name)}</h2><span>Poziom ${level}</span></div>
   <div class="profile-attributes">${attributes.map((label,i)=>{
    const val=character[attrKeys[i]]??character.stats?.[attrKeys[i]]??'—';
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
 document.querySelector('#profileOpenEquipment').onclick=()=>showPage('Ekwipunek','POSTAĆ');
 document.querySelectorAll('.profile-eq-slot.occupied').forEach(slot=>{
  const item=itemById(current[slot.dataset.slot]);
  if(!item)return;
  slot.addEventListener('mouseenter',e=>showTooltipItem(e,item));
  slot.addEventListener('mousemove',e=>{const tip=document.querySelector('#itemTooltip');if(tip&&!tip.hidden)positionPopup(tip,e.clientX,e.clientY)});
  slot.addEventListener('mouseleave',()=>document.querySelector('#itemTooltip')?.setAttribute('hidden',''));
 });
}
function renderEquipment(message='Kliknij przedmiot w inwentarzu, aby go założyć.'){
 hideItemPopups();
 dbiSaveInventory();dbiSaveEquipped();
 document.querySelector('#breadcrumb').textContent='POSTAĆ / EKWIPUNEK';
 const current=equipped[equipmentSet], worn=Object.values(current).map(itemById).filter(Boolean),stats=sums(worn);
 document.querySelector('#pageBody').innerHTML=`<div class="equipment-layout">
 <section class="eq-panel eq-left"><h2>EKWIPUNEK</h2><p class="eq-caption">${worn.length} / ${DBI_SLOTS.length} slotów wyposażonych · ${equipmentSet}</p>
 <div class="eq-doll"><div class="eq-body-outline" aria-hidden="true">✦</div><div class="eq-slots">${DBI_SLOTS.map(([label,id,col,row,height])=>{
 const item=itemById(current[id]);return `<button class="eq-slot ${height===2?'eq-tall':''} ${item?'occupied':''} ${selectedSlot===id?'active':''}" data-slot="${id}" style="--col:${col};--row:${row};--span:${height}" title="${item?'':esc(label)}"><span class="slot-art">${dbiItemArt(item)}</span><span class="slot-name">${item?'':esc(label)}</span></button>`}).join('')}</div></div>
 <div class="eq-sets"><button class="eq-set ${equipmentSet==='Główny'?'active':''}" data-set="Główny">Zestaw główny</button><button class="eq-set ${equipmentSet==='PvP'?'active':''}" data-set="PvP">Zestaw PvP</button></div><p class="eq-selection" id="eqSelection" role="status">${esc(message)}</p></section>
 <section class="eq-panel eq-middle"><h2>STATYSTYKI EKWIPUNKU</h2><p class="eq-caption">Suma bonusów założonych przedmiotów</p>${[['OBRAŻENIA I OBRONA',[['Obrażenia',stats.attack],['Wartość ataku',stats.attackMin+'–'+stats.attackMax],['Szybkość ataku',stats.attackSpeedPct+'%'],['Obrona',stats.defense],['Szybkość ruchu',stats.moveSpeedPct+'%']]],['ENERGIA',[['Ki',stats.ki]]],['WYPOSAŻENIE',[['Założone przedmioty',worn.length]]],['ATRYBUTY POSTACI',[['Siła','—'],['Inteligencja','—'],['Szybkość','—'],['Wytrzymałość','—']]]].map(([group,rows])=>`<div class="eq-stat-group"><h3>${group}</h3>${rows.map(([name,val])=>`<div class="eq-stat"><span>${name}</span><strong>${val}</strong></div>`).join('')}</div>`).join('')}</section>
 <section class="eq-panel eq-right"><h2>INWENTARZ</h2><div class="inv-tabs">${['I','II','III','IV','V','VI'].map((x,i)=>`<button class="inv-tab ${inventoryTab===i?'active':''}" data-tab="${i}">${x}</button>`).join('')}</div><div class="inv-scroll"><div class="inv-grid">${renderInventoryGrid()}</div></div><div class="inv-actions"><button data-action="Sortuj">Sortuj</button><button data-action="Zaznacz">Zaznacz</button><button data-action="Zablokuj">Zablokuj</button></div></section></div>`;
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
  slot.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();slot.classList.remove('drop-target');const idx=dragIndex;dragIndex=null;dragActive=false;if(idx===null)return;const item=itemById(inventory[idx]);if(!item||item.slot!==slot.dataset.slot){document.querySelector('#eqSelection').textContent='Ten przedmiot nie pasuje do wybranego slotu.';return}if(level<(Number(item.requiredLevel)||1)){document.querySelector('#eqSelection').textContent='Wymagany poziom: '+item.requiredLevel;return}if(current[item.slot]){document.querySelector('#eqSelection').textContent='Slot jest zajęty.';return}current[item.slot]=inventory[idx];inventory.splice(idx,1);inventoryPlacement.splice(idx,1);renderEquipment('Założono: '+item.name)});
 });
 document.querySelectorAll('.eq-set').forEach(b=>b.onclick=()=>{equipmentSet=b.dataset.set;renderEquipment('Zestaw: '+equipmentSet)});
 // Podczas przeciągania NIE przebudowujemy całej karty: usunięcie źródła kończy natywny drag.
 const tabs=document.querySelector('.inv-tabs');
 function clearTabHover(){clearTimeout(tabHoverTimer);tabHoverTimer=null;tabs.querySelectorAll('.inv-tab').forEach(b=>b.classList.remove('tab-loading'))}
 function switchTabDuringDrag(next){
  if(dragIndex===null||inventoryTab===next)return;
  inventoryTab=next;
  tabs.querySelectorAll('.inv-tab').forEach(b=>b.classList.toggle('active',Number(b.dataset.tab)===next));
  [...grid.children].forEach(el=>{if(el!==preview&&el!==dragSourceElement)el.remove()});
  if(dragSourceElement){dragSourceElement.dataset.parked='1';dragSourceElement.style.cssText+=';position:absolute;left:-9999px;top:-9999px;opacity:0;pointer-events:none';}
  grid.insertAdjacentHTML('afterbegin',renderInventoryGrid());
  bindInventoryItems();
  preview.hidden=true;proposedCell=null;
  document.querySelector('#eqSelection').textContent='Karta '+(next+1)+' — wybierz wolne miejsce i upuść przedmiot.';
 }
 tabs.querySelectorAll('.inv-tab').forEach(b=>{
  const target=Number(b.dataset.tab);
  b.addEventListener('click',()=>{if(dragIndex!==null)return;inventoryTab=target;renderEquipment()});
  b.addEventListener('dragenter',e=>{if(dragIndex===null||inventoryTab===target)return;e.preventDefault();clearTabHover();b.classList.add('tab-loading');tabHoverTimer=setTimeout(()=>{clearTabHover();switchTabDuringDrag(target)},650)});
  b.addEventListener('dragover',e=>{if(dragIndex===null)return;e.preventDefault();e.dataTransfer.dropEffect='move'});
  b.addEventListener('dragleave',e=>{if(!b.contains(e.relatedTarget))clearTabHover()});
  b.addEventListener('drop',e=>{if(dragIndex!==null){e.preventDefault();clearTabHover()}});
 });
 const grid=document.querySelector('.inv-grid');
 function bindInventoryItems(){
  grid.querySelectorAll('.inv-cell[data-index]:not([data-bound])').forEach(b=>{
   b.dataset.bound='1';const index=Number(b.dataset.index);
   b.addEventListener('click',()=>{if(dragActive)return;const id=inventory[index],item=itemById(id);if(!item)return; if(!DBI_SLOTS.some(slot=>slot[1]===item.slot))return renderEquipment('Ten przedmiot jest nagrodą z zadania i nie można go założyć.'); if(level<(Number(item.requiredLevel)||1))return renderEquipment('Wymagany poziom: '+item.requiredLevel); if(current[item.slot])return renderEquipment('Ten slot jest zajęty. Zdejmij poprzedni przedmiot.');current[item.slot]=id;inventory.splice(index,1);inventoryPlacement.splice(index,1);renderEquipment('Założono: '+item.name)});
   b.addEventListener('mouseenter',e=>showTooltip(e,index));
   b.addEventListener('mousemove',e=>{const tip=document.querySelector('#itemTooltip');if(tip&&!tip.hidden)positionPopup(tip,e.clientX,e.clientY)});
   b.addEventListener('mouseleave',()=>document.querySelector('#itemTooltip')?.setAttribute('hidden',''));
   b.addEventListener('contextmenu',e=>itemActions(e,index));
   b.addEventListener('dragstart',e=>{dragIndex=index;dragActive=true;dragCompleted=false;dragSourceElement=b;const r=b.getBoundingClientRect();dragOffset={x:e.clientX-r.left,y:e.clientY-r.top};hideItemPopups();e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(index))});
   b.addEventListener('dragend',()=>{
    const wasActive=dragActive,switched=dragSourceElement?.dataset.parked==='1';
    clearTabHover();dragIndex=null;dragActive=false;dragSourceElement=null;
    document.querySelectorAll('.drop-target').forEach(x=>x.classList.remove('drop-target'));
    if(preview.isConnected){preview.hidden=true;preview.classList.remove('invalid')}
    if(switched&&wasActive&&!dragCompleted)renderEquipment('Przeciąganie anulowane — przedmiot pozostał na swoim miejscu.');
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
  return {r,gap,width,rowGap,stepX:width+gap,stepY:width+rowGap};
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
  preview.style.height=(g.width*(tall?2:1)+g.rowGap*(tall?1:0))+'px';
  preview.setAttribute('aria-label',valid?'Wolne miejsce':'Miejsce zajęte');
 }
 grid.addEventListener('dragover',e=>{
  if(dragIndex===null)return;
  e.preventDefault();e.dataTransfer.dropEffect='move';updatePreview(e);
 });
 grid.addEventListener('dragleave',e=>{
  const r=grid.getBoundingClientRect();
  if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){preview.hidden=true;proposedCell=null}
 });
 grid.addEventListener('drop',e=>{
  if(dragIndex===null)return;
  e.preventDefault();e.stopPropagation();updatePreview(e);
  const cell=proposedCell,idx=dragIndex;
  dragCompleted=true;clearTabHover();dragIndex=null;dragActive=false;preview.hidden=true;proposedCell=null;
  if(cell!==null&&moveItem(idx,inventoryTab,cell))renderEquipment('Przesunięto przedmiot na kartę '+(inventoryTab+1)+'.');
  else document.querySelector('#eqSelection').textContent='Nie można umieścić przedmiotu tutaj. Wymagane są wolne kratki.';
 });
 document.querySelectorAll('.inv-actions button').forEach(b=>b.onclick=()=>{document.querySelector('#eqSelection').textContent=b.dataset.action+' — opcja do późniejszego wdrożenia.'});
}
function renderGM(message='Edytujesz lokalny katalog. Zmiany zapisują się w tej przeglądarce.'){
 document.querySelector('#breadcrumb').textContent='PANEL GM / KATALOG';
 document.querySelector('#pageBody').innerHTML=`<div class="gm-layout"><section class="eq-panel"><h2>PANEL GM · PRZEDMIOTY</h2><p class="eq-caption">${catalog.length} definicji w katalogu · lokalny tryb developerski</p><div class="gm-actions"><button id="gmNew">+ Nowy przedmiot</button><button id="gmExport">Eksport JSON</button><label class="gm-import">Import JSON<input id="gmImport" type="file" accept=".json,application/json" hidden></label></div><div class="gm-list">${catalog.map(x=>`<button class="gm-item" data-edit="${esc(x.id)}"><span>${esc(x.icon)} ${esc(x.name)}</span><small>${esc(x.id)} · ${esc(x.slot)}</small></button>`).join('')}</div><p id="gmMessage" role="status">${esc(message)}</p></section><section class="eq-panel"><h2>EDYTOR PRZEDMIOTU</h2><form id="gmForm" class="gm-form"><label>ID (unikalne)<input name="id" required maxlength="60" pattern="[a-zA-Z0-9_-]+" placeholder="np. bron-002"></label><label>Nazwa<input name="name" required maxlength="80"></label><label>Slot<select name="slot">${slotOptions}</select></label><label>Jakość<select name="quality">${QUALITY.map(q=>`<option value="${q}">${q}</option>`).join('')}</select></label><label>Ikona / emoji<input name="icon" maxlength="12" value="⚔️"></label><label>Atak<input name="attack" type="number" min="0" max="999999" value="0"></label><label>Obrona<input name="defense" type="number" min="0" max="999999" value="0"></label><label>Ki<input name="ki" type="number" min="0" max="999999" value="0"></label><label class="gm-wide">Opis<textarea name="description" rows="3" maxlength="500"></textarea></label><div class="gm-actions gm-wide"><button type="submit">Zapisz przedmiot</button><button type="button" id="gmGrant">Dodaj do inwentarza</button><button type="button" id="gmDelete" class="gm-danger">Usuń z katalogu</button></div></form></section></div>`;
 const form=document.querySelector('#gmForm');let editing=null;
 function load(id){const x=itemById(id);if(!x)return;editing=id;for(const key of ['id','name','slot','icon','attack','defense','ki','description','quality'])form.elements[key].value=x[key]??'';form.elements.id.readOnly=true;}
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>load(b.dataset.edit));
 document.querySelector('#gmNew').onclick=()=>{form.reset();editing=null;form.elements.id.readOnly=false;};
 form.onsubmit=e=>{e.preventDefault();const f=new FormData(form);const x={id:String(f.get('id')).trim(),name:String(f.get('name')).trim(),slot:String(f.get('slot')),icon:String(f.get('icon')),attack:Number(f.get('attack')),defense:Number(f.get('defense')),ki:Number(f.get('ki')),description:String(f.get('description')),quality:String(f.get('quality'))};if(!/^[a-zA-Z0-9_-]+$/.test(x.id)||!x.name||!DBI_SLOTS.some(s=>s[1]===x.slot)||['attack','defense','ki'].some(k=>!Number.isFinite(x[k])||x[k]<0||x[k]>999999))return (document.querySelector('#gmMessage').textContent='Sprawdź dane przedmiotu.');if(!editing&&itemById(x.id))return (document.querySelector('#gmMessage').textContent='ID już istnieje.');if(editing){catalog[catalog.findIndex(i=>i.id===editing)]=x}else catalog.push(x);dbiSaveCatalog(catalog);renderGM('Zapisano: '+x.name);load(x.id)};
 document.querySelector('#gmGrant').onclick=()=>{const id=editing||form.elements.id.value;if(!itemById(id))return (document.querySelector('#gmMessage').textContent='Najpierw zapisz przedmiot.');inventory.push(id);inventoryPlacement.push(null);document.querySelector('#gmMessage').textContent='Dodano do inwentarza: '+itemById(id).name;};
 document.querySelector('#gmDelete').onclick=()=>{if(!editing)return;const id=editing;catalog=catalog.filter(x=>x.id!==id);inventoryPlacement=inventoryPlacement.filter((_,i)=>inventory[i]!==id);inventory=inventory.filter(x=>x!==id);Object.values(equipped).forEach(set=>Object.keys(set).forEach(slot=>{if(set[slot]===id)delete set[slot]}));dbiSaveCatalog(catalog);renderGM('Usunięto: '+id)};
 document.querySelector('#gmExport').onclick=()=>{const blob=new Blob([JSON.stringify(catalog,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='dragonball-items.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 document.querySelector('#gmImport').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data)||data.some(x=>!x||typeof x.id!=='string'||!/^[\w-]+$/.test(x.id)||typeof x.name!=='string'||!DBI_SLOTS.some(s=>s[1]===x.slot))||new Set(data.map(x=>x.id)).size!==data.length)throw Error('Niepoprawny katalog');catalog=data.map(x=>({id:x.id,name:x.name,slot:x.slot,icon:String(x.icon||''),attack:Number(x.attack)||0,defense:Number(x.defense)||0,ki:Number(x.ki)||0,description:String(x.description||''),quality:QUALITY.includes(x.quality)?x.quality:'Pospolity'}));dbiSaveCatalog(catalog);renderGM('Zaimportowano '+catalog.length+' przedmiotów.')}catch(err){document.querySelector('#gmMessage').textContent='Błąd importu: '+err.message}};
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
   description:'Pokonaj 10 Dzikich Saibamanów na EXPowisku.',ready:'Wróć do Opiekuna Laguny i odbierz Upominek Startowy.'});
 }
 if(q2?.state==='accepted'){
  const belt=!!window.DBIWorldInventory?.hasWhiteBelt?.();
  result.push({id:'laguna-belt',name:'Próba Białego Pasa',location:'Błękitna Laguna · Opiekun Laguny',count:belt?1:0,total:1,
   description:'Przynieś Opiekunowi Laguny zwykły Biały Pas z inwentarza. Założony pas nie zalicza zadania.',ready:'Wróć do Opiekuna Laguny i wymień pas na Biały Pas +1.'});
 }
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
  const missions=dbiActiveMissions();
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
const DBI_QUEST_GIFT={id:'quest-starter-gift',name:'Upominek Startowy',slot:'quest',icon:'🎁',image:'assets/items/upominek-startowy.png',quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description:'Srebrna skrzynia otrzymana od Opiekuna Laguny. Zawartość ustalimy później.'};
if(!catalog.some(item=>item.id===DBI_QUEST_GIFT.id)){catalog.push(DBI_QUEST_GIFT);dbiSaveCatalog(catalog)}
const DBI_BELT_PLUS_ONE={id:'starter-white-belt-plus-one',name:'Biały Pas',enhancement:1,requiredLevel:1,slot:'pas',icon:'🥋',image:'assets/items/bialy-pas.png',quality:'Pospolity',attack:0,defense:1,ki:0,description:'Biały pas +1 otrzymany za zadanie Opiekuna Laguny.'};
if(!catalog.some(item=>item.id===DBI_BELT_PLUS_ONE.id)){catalog.push(DBI_BELT_PLUS_ONE);dbiSaveCatalog(catalog)}
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
window.DBIWorldInventory={
  hasWhiteBelt:()=>!!dbiFindQuestWhiteBelt(),
  exchangeWhiteBelt:()=>{
   if(!itemById('starter-white-belt-plus-one'))return false;
   const found=dbiFindQuestWhiteBelt();
   if(!found)return false;
   inventory.splice(found.index,1);
   inventoryPlacement.splice(found.index,1);
   inventory.push('starter-white-belt-plus-one');
   inventoryPlacement.push(null);
   dbiSaveInventory();
   return true;
  },
  choices:()=>catalog.filter(x=>x&&x.id&&x.name).slice(0,24).map(x=>({id:x.id,name:x.name,icon:x.icon||'✦'})),
  grant:(ids)=>{let added=0;ids.forEach(id=>{if(itemById(id)){inventory.push(id);inventoryPlacement.push(null);added++}});dbiSaveInventory();return added},
  grantExp:(amount)=>{const gained=Math.max(0,Math.floor(Number(amount)||0));exp+=gained;while(exp>=100){exp-=100;level++}renderExp();dbiSaveProgress();return gained},
  character:()=>({id:dbiActive?.id,level,moveSpeedPct:sums(Object.values(equipped['Główny']).map(itemById).filter(Boolean)).moveSpeedPct})
};


// Aktywności dzienne — stan osobny dla każdej postaci, reset o północy czasu lokalnego.
const DBI_DAILY_KEY='dboidle_daily_v1_'+String(dbiActive?.id||'test');
const DBI_WALLET_KEY='dboidle_dragon_wallet_v1_'+String(dbiActive?.id||'test');
const DBI_SIGNS=['福','龍','勇','力','光','心'];
function dbiToday(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function dbiDailyRead(){
 let data=null;try{data=JSON.parse(localStorage.getItem(DBI_DAILY_KEY)||'null')}catch{}
 if(!data||data.day!==dbiToday())data={day:dbiToday(),kills:0,bosses:0,quests:0,claimed:[false,false,false],points:0};
 return data;
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
 {title:'Wyzwanie wojownika',conditions:[['Pokonani bossowie',data.bosses,3],['Pokonane potwory',data.kills,15]]}
]}
function dbiDailyClaim(index){
 const data=dbiDailyRead(),tasks=dbiDailyObjectives(data),task=tasks[index];
 if(!task||data.claimed[index]||task.conditions.some(([,value,goal])=>value<goal))return;
 data.claimed[index]=true;
 const count=data.claimed.filter(Boolean).length;
 data.points=Math.floor(count/3);dbiDailySave(data);
 const wallet=dbiWalletRead(),sign=DBI_SIGNS[Math.floor(Math.random()*DBI_SIGNS.length)];
 wallet.coins=Math.max(0,Number(wallet.coins)||0)+1;
 if(count===3)wallet.activityPoints=Math.max(0,Number(wallet.activityPoints)||0)+1;
 if(!Array.isArray(wallet.signs))wallet.signs=[];
 wallet.signs.push(sign);localStorage.setItem(DBI_WALLET_KEY,JSON.stringify(wallet));
 dbiRefreshHeaderWallet();
 renderDailyActivities();
}
let dbiDailyTimer=null;
function renderDailyActivities(){
 if(dbiDailyTimer!==null){clearInterval(dbiDailyTimer);dbiDailyTimer=null}
 document.querySelector('#breadcrumb').textContent='POSTAĆ / AKTYWNOŚCI';
 const data=dbiDailyRead(),wallet=dbiWalletRead(),tasks=dbiDailyObjectives(data),claimed=data.claimed.filter(Boolean).length;
 document.querySelector('#pageBody').innerHTML=`<div class="dbi-daily">
 <header class="dbi-daily-header"><h2>Aktywności</h2><div class="dbi-daily-track"><div class="dbi-daily-progress" style="width:${Math.min(100,(wallet.activityPoints||0)/30*100)}%"></div>${[7,14,21,30].map(n=>`<span class="dbi-daily-milestone" style="left:${n/30*100}%">${n}</span>`).join('')}</div><p>Postęp: ${wallet.activityPoints||0}/30 pkt · 1 punkt za 3 odebrane aktywności</p></header>
 <div class="dbi-daily-count">Licznik dziennych aktywności: <strong>${claimed}/3</strong> · Reset o 00:00</div>
 <div class="dbi-daily-cards">${tasks.map((task,i)=>{
 const complete=task.conditions.every(([,value,goal])=>value>=goal);
 return `<section class="dbi-daily-card"><div class="dbi-daily-card-head"><h3>${task.title}</h3><button type="button" data-claim="${i}" ${!complete||data.claimed[i]?'disabled':''}>${data.claimed[i]?'Odebrano':'Odbierz'}</button></div>
 <div class="dbi-daily-conditions"><strong>Wymogi aktywności</strong>${task.conditions.map(([name,value,goal])=>`<div class="dbi-daily-condition"><div class="dbi-daily-line"><span>${name}</span><b>${Math.min(goal,value)}/${goal}</b></div><div class="dbi-daily-bar"><div style="width:${Math.min(100,value/goal*100)}%"></div></div></div>`).join('')}</div>
 <div class="dbi-daily-reward"><span>Nagroda: 🪙 1 Smocza Moneta + <img src="assets/items/smoczy-znak.png" alt="Smoczy znak"> losowy znak</span></div></section>`;
 }).join('')}</div>
 <section class="dbi-daily-shop"><h2>Sklep Smoczych Monet</h2><p>Saldo: <strong>${wallet.coins||0} 🪙</strong> Smoczych Monet · Zdobyte znaki: ${(wallet.signs||[]).map(x=>`<span class="dbi-daily-glyph">${x}</span>`).join(' ')||'brak'}</p>
 <div class="dbi-daily-shop-grid">${Array.from({length:6},()=>'<div class="dbi-daily-shop-item"><span>Oferta w przygotowaniu</span><small>Koszt: —</small><button disabled>Zapłać</button></div>').join('')}</div></section></div>`;
 document.querySelectorAll('[data-claim]').forEach(button=>button.onclick=()=>dbiDailyClaim(Number(button.dataset.claim)));
 // Odczyt na żywo z localStorage: walki mogą trwać poza tym ekranem.
 const snapshot=JSON.stringify(data);
 dbiDailyTimer=setInterval(()=>{
  if(!document.querySelector('.dbi-daily')){clearInterval(dbiDailyTimer);dbiDailyTimer=null;return}
  if(JSON.stringify(dbiDailyRead())!==snapshot)renderDailyActivities();
 },900);
}
// Przywróć ostatnio otwartą zakładkę po F5 (osobno dla każdej postaci).
if(dbiActive?.id){
  let lastPage=null;
  try{lastPage=JSON.parse(sessionStorage.getItem('dboidle_last_page_'+dbiActive.id)||'null')}catch{}
  if(lastPage?.title)showPage(lastPage.title,lastPage.section);
}
