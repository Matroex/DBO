(()=>{'use strict';const sessionKey='dboidle_demo_session_v1',$=id=>document.getElementById(id);let session;try{session=JSON.parse(sessionStorage.getItem(sessionKey)||'null')}catch{}if(!session?.name){location.replace('login.html');return}const account=session.name.toLowerCase(),slots=window.DBICharacterSlots,key=slots.charactersKey(account);let characters;function save(){localStorage.setItem(key,JSON.stringify(characters))}function el(tag,cls,content){const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=content;return n}function render(){characters=slots.characters(account);const limit=slots.limit(account);const cards=$('cards');cards.replaceChildren();$('counter').textContent=`Liczba aktywnych postaci ${characters.length}/${limit}`;for(const c of characters){const card=el('article','character-card');const avatar=el('div','portrait','✦');avatar.setAttribute('aria-label','Awatar postaci');card.append(avatar,el('strong','',c.name),el('span','meta',c.race),el('span','meta',`Poziom ${c.level||1}`));const btn=el('button','enter','Wejdź do gry');btn.onclick=()=>{sessionStorage.setItem('dboidle_active_character_v1',JSON.stringify({account,name:c.name,id:c.id}));location.href='index.html'};card.append(btn);const del=el('button','delete-character','Usuń postać');del.type='button';del.setAttribute('aria-label','Usuń postać '+c.name);del.onclick=()=>{const answer=prompt('Usunięcie postaci „'+c.name+'” jest nieodwracalne. Aby potwierdzić, wpisz dokładnie nazwę postaci:');if(answer!==c.name)return;characters=slots.characters(account);const index=characters.findIndex(entry=>entry.id===c.id);if(index<0)return;characters.splice(index,1);save();const prefixes=['dboidle_inventory_v1_','dboidle_equipped_v1_','dboidle_training_v1_','dboidle_gold_v1_','dboidle_dragon_wallet_v1_','dboidle_premium_v1_','dboidle_dashboard_v1_','dboidle_arena_v1_','dboidle_daily_v1_','dboidle_spiritual_v1_','dboidle_techniques_v1_','dboidle_technique_quest_unlock_v1_','dboidle_quest_laguna_v1_','dboidle_quest_laguna_belt_v1_','dboidle_battle_v1_','dboidle_world_v1_','dboidle_quest_extra_','dboidle_quest_island_krillin_v1_','dboidle_quest_island_students_v1_','dboidle_quest_master_camp_v1_','dboidle_quest_master_krillin_v1_','dboidle_quest_turtle_island_v1_','dboidle_forest_bulma_v1_','dboidle_forest_roshi_v1_','dboidle_last_page_'];for(const prefix of prefixes)localStorage.removeItem(prefix+c.id);try{const active=JSON.parse(sessionStorage.getItem('dboidle_active_character_v1')||'null');if(active?.id===c.id)sessionStorage.removeItem('dboidle_active_character_v1')}catch{}render();renderPurchase()};card.append(del);cards.append(card)}if(characters.length<limit){const add=el('button','add-card');add.append(el('span','plus','+'),el('strong','','Nowa postać'));add.onclick=()=>{location.href='creator.html'};cards.append(add)}}$('logout').onclick=()=>{sessionStorage.removeItem(sessionKey);sessionStorage.removeItem('dboidle_active_character_v1');location.replace('login.html')};$('help').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();const purchase=$('slotPurchase'),payer=$('slotPayer'),buy=$('buySlot'),status=$('slotStatus');
let shownLimit,purchasing=false;
function renderPurchase(){
 const previous=payer.value;
 shownLimit=slots.limit(account);
 purchase.hidden=shownLimit>=slots.maxLimit||!characters.length;
 payer.replaceChildren(...characters.map(character=>new Option(
  character.name+' ('+slots.balance(character.id).toLocaleString('pl-PL')+' Zeni)',character.id)));
 if(characters.some(character=>String(character.id)===previous))payer.value=previous;
 else {
  const funded=characters.find(character=>slots.balance(character.id)>=slots.cost);
  if(funded)payer.value=funded.id;
 }
 updatePurchase();
}
function updatePurchase(){
 const affordable=payer.value&&slots.balance(payer.value)>=slots.cost;
 buy.disabled=purchasing||!affordable;
 $('slotHint').textContent=payer.value&&!affordable?'Wybrana postać potrzebuje co najmniej 50 Zeni.':'';
}
payer.onchange=updatePurchase;
purchase.onsubmit=async event=>{
 event.preventDefault();
 if(buy.disabled)return;
 purchasing=true;updatePurchase();
 try{
  await slots.buy(account,payer.value,shownLimit);
  status.textContent='Odblokowano miejsce na postać. Nowy limit to '+slots.limit(account)+'.';
 }catch(error){status.textContent=error.message}
 finally{purchasing=false;render();renderPurchase()}
};
window.addEventListener('storage',event=>{
 if(event.key===null||event.key===key||event.key===slots.limitKey(account)||characters.some(c=>event.key===slots.zeniKey(c.id))){
  render();renderPurchase();
 }
});
render();renderPurchase();
})();