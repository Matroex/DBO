/* DBOidle v2.36 — lokalny prototyp gildii, wspólny dla postaci w tej przeglądarce. */
(()=>{
'use strict';
const KEY='dboidle_guilds_v1';
const TABS=['Główna','Członkowie','Wojny','Zaproszenia','Depozyt','Grupowa','Notatki','Ekonomia','Ustawienia'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=()=>{try{const d=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(d)?d:[]}catch{return []}};
const write=d=>localStorage.setItem(KEY,JSON.stringify(d));
const current=()=>({id:String(dbiActive?.id||''),name:String(dbiCharacters?.[dbiCharacterIndex]?.name||'Postać'),account:String(dbiSession?.name||'').toLowerCase()});
const goldKey=id=>'dboidle_gold_v1_'+id;
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
  try{const arr=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(arr))for(const c of arr)if(c?.id&&c?.name)found.push({id:String(c.id),name:String(c.name),account:key.slice('dboidle_characters_v1_'.length)})}catch{}
 }
 return found;
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
 if(!g||g.leaderId!==me.id)return flash('Tylko przywódca może wysyłać zaproszenia.',true);
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
function panelMain(g){
 const me=current(),leader=g.leaderId===me.id,people=allCharacters();
 const memberName=id=>people.find(p=>p.id===id)?.name||g.members.find(m=>m.id===id)?.name||'Nieznana postać';
 const content={
 'Główna':`<div class="dbi-guild-home"><aside class="dbi-guild-journal"><h3>Dziennik aktywności</h3>${g.log.length?g.log.map(e=>`<p><small>${esc(e.time)}</small> ${esc(e.text)}</p>`).join(''):'<p>Brak wpisów.</p>'}</aside><div class="dbi-guild-main"><div class="dbi-guild-avatar" title="Awatar gildii">${esc(g.name.slice(0,1).toUpperCase())}</div><div class="dbi-guild-message"><h3>Wiadomość wewnętrzna</h3><p>${esc(g.message)}</p></div></div></div>`,
 'Członkowie':`<h3>Członkowie (${g.members.length})</h3><div class="dbi-guild-list">${g.members.map(m=>`<div><strong>${esc(m.name)}</strong><span>${m.id===g.leaderId?'Przywódca':'Członek'}</span>${leader&&m.id!==me.id?`<button data-promote="${esc(m.id)}">Przekaż przywództwo</button><button data-kick="${esc(m.id)}">Usuń</button>`:''}</div>`).join('')}</div>`,
 'Zaproszenia':`<h3>Zaproszenia</h3>${leader?`<form id="dbiGuildInvite" class="dbi-guild-invite"><label>Wybierz postać do zaproszenia<select name="invitee" required>${people.filter(p=>p.id!==me.id&&!findMine(read(),p.id)).map(p=>`<option value="${esc(p.id)}">${esc(p.name)} (${esc(p.account)})</option>`).join('')}</select></label><button type="submit">Wyślij zaproszenie</button></form>`:'<p>Zaproszenia może wysyłać przywódca.</p>'}<h4>Oczekujące zaproszenia</h4>${g.invites.length?g.invites.map(id=>`<p>${esc(memberName(id))}</p>`).join(''):'<p>Brak oczekujących zaproszeń.</p>'}`,
 'Notatki':`<h3>Notatki gildii</h3><form id="dbiGuildNotes"><textarea name="notes" rows="6" maxlength="2000" ${leader?'':'readonly'}>${esc(g.notes||'')}</textarea>${leader?'<button type="submit">Zapisz notatki</button>':''}</form>`,
 'Ustawienia':`<h3>Ustawienia</h3><p>Tag: [${esc(g.tag)}] · Przywódca: ${esc(memberName(g.leaderId))}</p>${leader?`<form id="dbiGuildMessage"><label>Wiadomość wewnętrzna<textarea name="message" rows="4" maxlength="600">${esc(g.message)}</textarea></label><button type="submit">Zapisz wiadomość</button></form>`:'<p>Tylko przywódca może edytować wiadomość.</p>'}`,
 'Wojny':'<h3>Wojny</h3><p>System wojen gildii dodamy w kolejnym etapie.</p>',
 'Depozyt':'<h3>Depozyt</h3><p>Depozyt gildii będzie dostępny w przyszłości.</p>',
 'Grupowa':'<h3>Grupowa</h3><p>Aktywności grupowe dodamy później.</p>',
 'Ekonomia':'<h3>Ekonomia</h3><p>Ekonomia gildii będzie dostępna w przyszłości.</p>'
 };
 return `<div class="dbi-guild-top"><div><small>Nazwa gildii</small><h2>${esc(g.name)} <span>[${esc(g.tag)}]</span></h2></div><button id="dbiGuildLeave">Opuść klan</button></div><nav class="dbi-guild-tabs">${TABS.map(t=>`<button data-guild-tab="${esc(t)}" class="${t===tab?'active':''}">${esc(t)}</button>`).join('')}</nav><div class="dbi-guild-tabcontent">${content[tab]||content['Główna']}</div>`;
}
function render(){
 const root=document.querySelector('#pageBody');if(!root)return;
 document.querySelector('#breadcrumb').textContent='GILDIA';
 const me=current(),guilds=read(),g=findMine(guilds,me.id);
 const pending=guilds.filter(g=>g.invites.includes(me.id));
 root.innerHTML=`<section class="dbi-guild"><header class="dbi-guild-title">Gildia</header>${notice?`<p class="dbi-guild-alert">${esc(notice)}</p>`:''}${error?`<p class="dbi-guild-alert error">${esc(error)}</p>`:''}${g?panelMain(g):`<div class="dbi-guild-create-area"><form id="dbiGuildCreate" class="dbi-guild-create"><h2>Załóż gildię</h2><label>Nazwa gildii<input name="guildName" minlength="3" maxlength="30" placeholder="Nazwa gildii" required></label><label>Skrót gildii (maks. 5 znaków)<input name="guildTag" maxlength="5" placeholder="TAG" required></label><label>Waluta założenia<select name="guildPayment"><option value="gold">10 000 000 złota (masz: ${wallet(me.id,goldKey).toLocaleString('pl-PL')})</option><option value="premium">30 Klejnotów (masz: ${wallet(me.id,premiumKey)})</option></select></label><button type="submit">Stwórz</button></form>${pending.length?`<div class="dbi-guild-pending"><h3>Zaproszenia do gildii</h3>${pending.map(x=>`<div><strong>${esc(x.name)} [${esc(x.tag)}]</strong><button data-accept="${esc(x.id)}">Akceptuj</button><button data-decline="${esc(x.id)}">Odrzuć</button></div>`).join('')}</div>`:''}</div>`}${confirmLeave?`<div class="dbi-guild-dialog"><div><h3>Opuścić gildię?</h3><p>${g?.leaderId===me.id?'Gildia zostanie rozwiązana, jeśli jesteś jej jedynym członkiem.':'Utracisz członkostwo w gildii.'}</p><button id="dbiGuildLeaveYes">Potwierdź</button><button id="dbiGuildLeaveNo">Anuluj</button></div></div>`:''}</section>`;
 root.querySelector('#dbiGuildCreate')?.addEventListener('submit',e=>{e.preventDefault();create(e.currentTarget)});
 root.querySelector('#dbiGuildInvite')?.addEventListener('submit',e=>{e.preventDefault();invite(e.currentTarget)});
 root.querySelectorAll('[data-guild-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.guildTab;notice='';error='';render()});
 root.querySelectorAll('[data-accept]').forEach(b=>b.onclick=()=>accept(b.dataset.accept,true));
 root.querySelectorAll('[data-decline]').forEach(b=>b.onclick=()=>accept(b.dataset.decline,false));
 root.querySelector('#dbiGuildLeave')?.addEventListener('click',()=>{confirmLeave=true;render()});
 root.querySelector('#dbiGuildLeaveYes')?.addEventListener('click',leave);
 root.querySelector('#dbiGuildLeaveNo')?.addEventListener('click',()=>{confirmLeave=false;render()});
 root.querySelectorAll('[data-promote]').forEach(b=>b.onclick=()=>{const all=read(),mine=findMine(all,me.id);if(mine?.leaderId!==me.id)return;mine.leaderId=b.dataset.promote;log(mine,'Przekazano przywództwo postaci '+(mine.members.find(m=>m.id===mine.leaderId)?.name||'')+'.');write(all);flash('Przekazano przywództwo.')});
 root.querySelectorAll('[data-kick]').forEach(b=>b.onclick=()=>{const all=read(),mine=findMine(all,me.id);if(mine?.leaderId!==me.id||b.dataset.kick===me.id)return;const kicked=mine.members.find(m=>m.id===b.dataset.kick);mine.members=mine.members.filter(m=>m.id!==b.dataset.kick);log(mine,'Usunięto członka '+(kicked?.name||'')+'.');write(all);flash('Usunięto członka.')});
 for(const [selector,field] of [['#dbiGuildNotes','notes'],['#dbiGuildMessage','message']])root.querySelector(selector)?.addEventListener('submit',e=>{e.preventDefault();const all=read(),mine=findMine(all,me.id);if(mine?.leaderId!==me.id)return;mine[field]=e.currentTarget.elements[field].value;write(all);flash('Zapisano zmiany.')});
}
window.DBIGuild={render};
})();
