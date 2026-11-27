/* Astralni Wojownicy — kreator map i questów GM v1.
 * Edytor projektów zapisuje wyłącznie swoje klucze localStorage.
 * Nie zmienia definicji istniejących lokacji, questów i zasad walki. */
(()=>{'use strict';
 const DRAFT_KEY='dboidle_gm_world_drafts_v1';
 const PUBLISHED_KEY='dboidle_gm_world_published_v1';
 const charKey='dboidle_active_character_v1';
 const terrain=window.DBITerrain; // Wspólna biblioteka terenu dla edytora i świata.
 const validId=/^[a-z][a-z0-9_-]{2,49}$/;
 const validAsset=/^assets\/[a-zA-Z0-9_\/-]+\.(?:webp|png|jpg|jpeg)$/;
 const $=(root,selector)=>root.querySelector(selector);
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 // Dialog templates are stored unchanged; resolve the active character on every render.
 function dialogPlayerName(characterId){
  const character=window.DBIWorldInventory?.character?.();
  if(character&&String(character.id)===String(characterId)&&String(character.name||'').trim())return String(character.name).trim();
  return document.querySelector('#name')?.textContent?.trim()||'Wojownik';
 }
 const dialogText=(text,characterId)=>String(text??'').replace(/\{gracz\}/gi,()=>dialogPlayerName(characterId));
 function dialogMarkup(text,characterId){
  const lines=String(text||'...').replace(/\r\n?/g,'\n').split('\n');
  const speaker=/^\[([^\]\n]+)\][ \t]*(.*)$/;
  if(!lines.some(line=>speaker.test(line)))return '<p>'+esc(dialogText(lines.join('\n'),characterId)).replace(/\n/g,'<br>')+'</p>';
  const paragraphs=[];let current='';
  for(const line of lines){
   const m=line.match(speaker);
   if(m){if(current)paragraphs.push(current);current='<strong>'+esc(dialogText(m[1],characterId))+':</strong> '+esc(dialogText(m[2],characterId));}
   else if(line.trim()===''){if(current){paragraphs.push(current);current='';}}
   else current+=(current?'<br>':'')+esc(dialogText(line,characterId));
  }
  if(current)paragraphs.push(current);
  return paragraphs.map(p=>'<p>'+p+'</p>').join('');
 }
 const clone=x=>JSON.parse(JSON.stringify(x));
 const number=(v,min,max,defaultValue=min)=>Math.min(max,Math.max(min,Number.isFinite(Number(v))?Number(v):defaultValue));
 function read(key){try{const x=JSON.parse(localStorage.getItem(key)||'null');return x&&x.version===1?x:null}catch{return null}}
 const empty=()=>({version:1,maps:[],quests:[]});
 const palaceMapId='palac-wszechmogacego-szkic';
 function adoptPalace(pack,published){
  const installed=published.maps.find(map=>map.id===palaceMapId)||window.DBI_GM_WORLD_DATA?.maps?.find(map=>map.id===palaceMapId);
  if(!installed)return pack;
  const local=pack.maps.find(map=>map.id===palaceMapId),previousEntry=local?.entryPortal;
  if(!pack.palaceTeleportOnly&&previousEntry?.from==='highTowerForest'&&previousEntry.x===435&&previousEntry.y===333){
   delete local.entryPortal;
  }
  pack.palaceTeleportOnly=true;
  if(!local)pack.maps.unshift(installed);
  else if(!pack.adoptedPalace&&!local.entryPortal&&!local.portals?.length){
   local.portals=installed.portals;
  }
  pack.adoptedPalace=true;
  return pack;
 }
 function draft(){
  const published=currentPublished(),saved=read(DRAFT_KEY);
  if(!saved)return clone(adoptPalace({...published,includesPublished:true},published));
  if(saved.includesPublished)return clone(adoptPalace(saved,published));
  // Migrate old drafts without discarding unpublished work or installed assets.
  const merged={...saved,includesPublished:true};
  for(const key of ['maps','quests','customArt','pickups']){
   const id=key==='customArt'?'key':'id',entries=new Map();
   for(const v of [...(published[key]||[]),...(saved[key]||[])])entries.set(v[id],v);
   merged[key]=[...entries.values()];
  }
  return clone(adoptPalace(merged,published));
 }
 const currentPublished=()=>{
  const maps=new Map(),quests=new Map(),art=new Map(),pickups=new Map();
  for(const p of (window.DBIWorldProjectPacks?.()||[window.DBI_GM_WORLD_DATA,read(PUBLISHED_KEY)])){
   if(!p||p.version!==1)continue;
   if(p.includesPublished){maps.clear();quests.clear();art.clear();pickups.clear()}
   for(const item of Array.isArray(p.pickups)?p.pickups:[])if(item?.id)pickups.set(item.id,item);
   for(const a of p.customArt||[])if(a?.key)art.set(a.key,a);
   for(const m of Array.isArray(p.maps)?p.maps:[])if(m?.id)maps.set(m.id,m);
   for(const q of Array.isArray(p.quests)?p.quests:[])if(q?.id)quests.set(q.id,q);
  }
  return {version:1,maps:[...maps.values()],quests:[...quests.values()],customArt:[...art.values()],pickups:[...pickups.values()]};
 };
 let runtimeQuests,runtimePickups;
 const quests=()=>runtimeQuests??=currentPublished().quests;
 const JOURNEY_ID='pierwsza-podroz-kontynuacja';
 const originalJourneyDone=id=>window.DBIWorld?.originalJourneyDone?.(id)===true;
 const questUnlocked=(q,id)=>q.id!==JOURNEY_ID||originalJourneyDone(id);
 const stepMap=(q,step)=>step.mapId||q.mapId;
 function activePoints(charId,mapId){
  return quests().flatMap(q=>{
   if(!questUnlocked(q,charId))return [];
   const progress=getQuestProgress(charId,q.id),step=q.steps?.[progress.stage],point=step?.point;
   if(!point||stepMap(q,step)!==mapId)return [];
   return [{questId:q.id,label:point.label||q.name,x:point.x,y:point.y,targetKind:point.targetKind,stage:progress.stage}];
  });
 }
 function newStep(mapId){return {mapId,dialog:'',button:'Dalej',requirement:'none',target:'',count:1,rewards:[]};}
 const storyFields={level:'Poziom',strength:'Siła',speed:'Szybkość',endurance:'Wytrzymałość',intelligence:'Inteligencja',ki:'KI',attack:'Atak',defense:'Obrona',hp:'HP',maxKi:'Pula KI'};
 function newStoryEnemy(){return {name:'Nowy przeciwnik fabularny',race:'Człowiek',art:'',level:1,strength:10,speed:10,endurance:10,intelligence:10,ki:10,attack:10,defense:10,hp:100,maxKi:10};}
 function validStoryEnemy(e){return e&&typeof e.name==='string'&&e.name.trim()&&typeof e.race==='string'&&(!e.art||validAsset.test(e.art))&&Object.keys(storyFields).every(k=>Number.isSafeInteger(e[k])&&e[k]>=(k==='hp'||k==='level'?1:0)&&e[k]<=999999999);}
 // Ground items are definitions shared by the world; claims are character-specific.
 const pickupKey=(id,pickupId)=>'dboidle_gm_pickup_v1_'+String(id)+'_'+String(pickupId);
 let pickupItems;
 const pickupCatalog=()=>{if(pickupItems?.length)return pickupItems;return pickupItems=window.DBIWorldInventory?.editorItems?.()||[];};
 // Rewards use the same item catalogue as inventory and ground items.
 const rewardCatalog=()=>window.DBIWorldInventory?.editorItems?.()||[];
 const rewardDef=id=>rewardCatalog().find(i=>i.id===id);
 // One catalogue renderer for item rewards and hand-in requirements.
 function questItemMarkup(id,{amount=1,have=null,enhancement=null,note=''}={}){
  const item=rewardDef(id),name=item?.name||'Nieznany przedmiot ('+String(id||'brak ID')+')';
  const image=item?.image&&window.DBIGmContentEditor?.imagePath(item.image)?item.image:'';
  const level=enhancement===null?'':' +'+number(enhancement,0,9,0),label=name+level;
  const icon=esc(item?.icon||'📦'),need=Math.max(1,Math.floor(Number(amount)||1));
  const count=have===null?'×'+need:Math.max(0,Math.floor(Number(have)||0))+'/'+need;
  const color=have===null?'':Number(have)>=need?'color:#71df91!important;':'color:#ff7979!important;';
  const attrs=' data-gme-item-tip="'+esc(id)+'" data-gme-item-level="'+esc(enhancement??'')+'" tabindex="0" aria-label="'+esc(label)+'"';
  // Legacy hand-in layout: icon, action/name, and actual inventory count in parentheses.
  // Keep the existing goal box and its pending/done styling; rewards stay in their own row.
  if(have!==null)return '<span style="display:inline">'+
   '<span'+attrs+' style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;vertical-align:middle;margin:0 5px 0 3px;cursor:help">'+
   (image?'<img class="world-quest-chest" data-gme-reward-image src="'+esc(image)+'" alt="" style="width:26px;height:26px;object-fit:contain;margin:0;vertical-align:middle"><span aria-hidden="true" hidden>'+icon+'</span>':'<span aria-hidden="true">'+icon+'</span>')+'</span> '+
   'Oddaj '+esc(label)+' <strong style="white-space:nowrap">('+esc(count)+')</strong></span>';
  return '<span style="display:flex;align-items:center;gap:8px;width:100%;min-width:0;text-align:left">'+
   '<span'+attrs+' style="display:inline-flex;align-items:center;justify-content:center;width:35px;height:35px;flex:0 0 35px;cursor:help">'+
   (image?'<img class="world-quest-chest" data-gme-reward-image src="'+esc(image)+'" alt="" style="width:35px;height:35px;object-fit:contain"><span aria-hidden="true" hidden>'+icon+'</span>':'<span aria-hidden="true">'+icon+'</span>')+'</span>'+
   '<span style="flex:1;min-width:0;overflow-wrap:anywhere">'+esc(label)+(note?' <small>('+esc(note)+')</small>':'')+'</span><strong style="flex:none;white-space:nowrap;margin-left:auto;'+color+'">'+esc(count)+'</strong></span>';
 }
 function rewardItemMarkup(id,amount){return questItemMarkup(id,{amount:number(amount,1,4000,1)});}
 function itemRequirementMarkup(step,have,chosen=null){
  if(step.requirement==='upgrade'&&upgradeDynamic(step)){if(chosen)return questItemMarkup(chosen.item,{amount:1,have,enhancement:chosen.from});return '<span>'+esc(upgradeGoal(step))+' <strong style="color:'+(have?'#71df91':'#ff7979')+'">'+(have?'1/1':'0/1')+'</strong></span>';}
  return questItemMarkup(step.target,{amount:requiredAmount(step),have,enhancement:step.requirement==='upgrade'?step.upgradeFrom??0:null});
 }
 function wireRewardImages(root){
  for(const img of root.querySelectorAll('[data-gme-reward-image]')){
   const fallback=()=>{img.hidden=true;img.style.display='none';if(img.nextElementSibling)img.nextElementSibling.hidden=false;};
   img.addEventListener('error',fallback,{once:true});if(img.complete&&!img.naturalWidth)fallback();
  }
  for(const node of root.querySelectorAll('[data-gme-item-tip]')){
   const id=node.dataset.gmeItemTip,raw=node.dataset.gmeItemLevel;
   if(!window.DBIWorldInventory?.bindEditorItemTooltip?.(node,id,raw===''?0:Number(raw)))node.title=node.getAttribute('aria-label')||'';
  }
 }
 // New list is authoritative, including an empty list; old one-reward quests remain readable.
 function stepRewards(st){
  if(Array.isArray(st.rewards))return st.rewards;
  return st.rewardType&&st.rewardType!=='none'?[{type:st.rewardType,item:st.rewardItem||'',amount:st.rewardAmount??1}]:[];
 }
 function editableRewards(st){
  if(!Array.isArray(st.rewards))st.rewards=stepRewards(st).map(r=>({...r}));
  delete st.rewardType;delete st.rewardItem;delete st.rewardAmount;return st.rewards;
 }
 const rewardTypes=()=>[['item','Przedmiot'],['gold','Złoto'],['premium','Zeni'],['exp','Doświadczenie postaci'],...Object.entries(statNames).map(([id,label])=>['stat-'+id,label]),['stat-all','Wszystkie pięć statystyk']];
 const rewardMax=type=>type==='item'?4000:type==='exp'?999999999:999999;
 function validReward(r){return !!r&&rewardTypes().some(([id])=>id===r.type)&&Number.isSafeInteger(Number(r.amount))&&Number(r.amount)>=1&&Number(r.amount)<=rewardMax(r.type)&&(r.type!=='item'||typeof r.item==='string'&&r.item&&(!window.DBIWorldInventory?.editorItems||!!rewardDef(r.item)));}
 function rewardMarkup(r){
  if(!r)return '';
  if(r.type==='item')return rewardItemMarkup(r.item,r.amount);
  const amount=number(r.amount,1,rewardMax(r.type),1),label=rewardTypes().find(([id])=>id===r.type)?.[1]||'Nieznana nagroda';
  if(r.type==='premium')return '<img class="dbi-zeni-icon" src="assets/ui/zeni.png" alt="">'+amount+' Zeni';
  return esc(String(r.type||'').startsWith('stat-')?'+'+amount+' · '+label:amount+' '+(r.type==='exp'?'EXP':label));
 }
 function rewardsView(st,i){
  const rows=stepRewards(st),items=rewardCatalog().slice().sort((a,b)=>String(a.name).localeCompare(String(b.name),'pl'));
  return '<section style="grid-column:1/-1;border:1px solid #466986;border-radius:7px;padding:10px"><div class="dbi-gme-inline"><strong>Nagrody ('+rows.length+')</strong><button type="button" data-gme-add-reward="'+i+'" '+(rows.length>=20?'disabled':'')+'>+ Dodaj nagrodę</button></div>'+(rows.length?'':'<p>Bez nagrody. Dodaj dowolne połączenie przedmiotów, walut, EXP i statystyk.</p>')+rows.map((r,j)=>{
   const key='step.'+i+'.rewards.'+j+'.',id=r.item||'',options=[['','Wybierz przedmiot'],...items.map(x=>[x.id,x.name+' ('+x.id+')'])];
   if(id&&!items.some(x=>x.id===id))options.push([id,'Brak w katalogu: '+id]);
   return '<div style="border-top:1px solid #466986;margin-top:8px;padding-top:8px"><div class="dbi-gme-inline"><b>Nagroda '+(j+1)+'</b><button type="button" class="danger" data-gme-remove-reward="'+i+':'+j+'">Usuń nagrodę</button></div><div class="dbi-gme-fields">'+field('Typ nagrody',key+'type',r.type,{options:rewardTypes()})+(r.type==='item'?field('Przedmiot nagrody',key+'item',id,{options,searchable:true}):'')+field('Ilość nagrody',key+'amount',r.amount,{type:'number',min:1,max:rewardMax(r.type)})+'</div><div class="dbi-quest-reward-item" style="display:flex;align-items:center;gap:8px">'+rewardMarkup(r)+'</div></div>';
  }).join('')+'</section>';
 }
 const pickupDef=p=>pickupCatalog().find(i=>i.id===p.itemId);
 const pickupName=p=>pickupDef(p)?.name||p.itemId;
 const pickups=()=>runtimePickups??=currentPublished().pickups;
 function pickupAvailable(p,id){
  if(!p||!id||!validId.test(p.id)||!pickupDef(p)||!Number.isSafeInteger(p.amount)||p.amount<1||p.amount>100)return false;
  try{if(localStorage.getItem(pickupKey(id,p.id)))return false}catch{return false}
  if(p.when==='always')return true;
  const q=questById(p.questId);if(!q||!questUnlocked(q,id))return false;
  const progress=getQuestProgress(id,q.id);
  if(p.when==='complete')return progress.stage>=q.steps.length;
  if(p.when==='after')return progress.stage>p.stage;
  if(p.when==='accepted')return progress.stage===p.stage&&progress.accepted===true;
  return false;
 }
 function activePickups(id,mapId){return pickups().filter(p=>p.mapId===mapId&&pickupAvailable(p,id)).map(p=>({...p,name:pickupName(p),image:pickupDef(p)?.image,icon:pickupDef(p)?.icon||'📦'}))}
 function collectPickup(id,mapId,pickupId,x,y){
  const p=pickups().find(p=>p.id===pickupId&&p.mapId===mapId);
  if(!p||!Number.isFinite(x)||!Number.isFinite(y)||Math.hypot(p.x-x,p.y-y)>42||!pickupAvailable(p,id))return {ok:false,message:'Przedmiot nie jest już dostępny.'};
  const inv=window.DBIWorldInventory;
  if(String(inv?.character?.()?.id)!==String(id))return {ok:false,message:'Nieprawidłowa postać.'};
  // Reserve first, release the reservation if the inventory write fails.
  const key=pickupKey(id,p.id);try{localStorage.setItem(key,'1')}catch{return {ok:false,message:'Nie udało się zapisać podniesienia.'}}
  let granted=0;try{granted=inv?.grant?.(Array(p.amount).fill(p.itemId))||0}catch{}
  if(granted!==p.amount){try{localStorage.removeItem(key)}catch{}return {ok:false,message:'Nie udało się dodać przedmiotu do ekwipunku.'}}
  return {ok:true,message:'Podniesiono: '+pickupName(p)+' ×'+p.amount};
 }
 function needsAcceptance(q,stage){return pickups().some(p=>p.when==='accepted'&&p.questId===q.id&&p.stage===stage)}
 // A map has a single farming roster: index 0/1/2 = normal/strong/super.
 // Older quests without killVariants intentionally retain exact-name matching.
 const killRankNames=['Zwykły','Silny','Super'];
 function farmingRoster(mapId,pack=null){
  if(mapId==='laguna')return ['Kukła Treningowa'];
  if(mapId==='island')return ['Uczeń Mistrza'];
  const custom=(pack||currentPublished()).maps.find(m=>m.id===mapId);
  const map=custom||(pack?legacyMapData(mapId,pack):legacyCatalog().maps.find(m=>m.id===mapId));
  if(!map?.mobs)return [];
  const mobs=custom?window.DBIWorld.editorMobVariants(custom):map.mobNames||[];
  return mobs.slice(0,3).map(m=>typeof m?.name==='string'?m.name:'');
 }
 function selectedKillNames(q,step,pack=null){
  if(!Array.isArray(step.killVariants))return [step.target||''].filter(Boolean);
  const roster=farmingRoster(stepMap(q,step),pack);
  return [...new Set(step.killVariants.map(i=>Number.isInteger(i)?roster[i]:null).filter(Boolean))];
 }
 function killGoal(q,step,pack=null){
  const names=selectedKillNames(q,step,pack);
  if(!Array.isArray(step.killVariants))return step.target||'—';
  const roster=farmingRoster(stepMap(q,step),pack),base=roster[0];
  if(!names.length)return '—';
  // Variants are a matching rule, not player-facing requirement text.
  // Collapse conventional names only; keep different custom mob names visible.
  const labels=names.map(name=>base&&[base,base+' (Silny)',base+' (Super)'].includes(name)?base:name);
  return [...new Set(labels)].join(' / ');
 }
 const upgradeMax=()=>window.DBIWorldInventory?.editorUpgradeMax??9;
 const upgradeSlots=()=>window.DBIWorldInventory?.editorUpgradeSlots?.()||[];
 const upgradePolicy=st=>st.upgradePolicy??null;
 const upgradeDynamic=st=>!!upgradePolicy(st)&&upgradePolicy(st).mode!=='exact';
 const upgradeValid=st=>window.DBIWorldInventory?.editorUpgradeValid?.(st.target,st.upgradeFrom,st.upgradeTo,upgradePolicy(st))===true;
 const upgradeCandidates=(st,id)=>window.DBIWorldInventory?.editorUpgradeCandidates?.(id,st.target,st.upgradeFrom,st.upgradeTo,upgradePolicy(st))||[];
 const upgradeName=st=>upgradePolicy(st)?.selection==='any'?'wybrane wyposażenie':rewardDef(st.target)?.name||st.target||'Wybierz przedmiot';
 function upgradeGoal(st){const p=upgradePolicy(st);return 'Oddaj do ulepszenia: '+upgradeName(st)+(p?.mode==='relative'?' (o '+p.value+' poziomów, maks. +'+upgradeMax()+')':p?.mode==='absolute'?' (do +'+p.value+')':' +'+(st.upgradeFrom??0)+' → +'+(st.upgradeTo??1));}
 function upgradeRewardMarkup(st,chosen=null){
  if(chosen)return questItemMarkup(chosen.item,{amount:1,enhancement:chosen.to,note:'zwrot tego samego przedmiotu'});
  if(upgradeDynamic(st))return '<span>Ulepszenie wybranego przedmiotu '+esc(upgradePolicy(st).mode==='relative'?'o '+upgradePolicy(st).value+' poziomów (maks. +'+upgradeMax()+')':'do +'+upgradePolicy(st).value)+'</span>';
  return questItemMarkup(st.target,{amount:1,enhancement:st.upgradeTo??1,note:'zwrot tego samego przedmiotu'});
 }
 function upgradeConfig(st,i){
  const prefix='step.'+i+'.',items=rewardCatalog().filter(x=>x.upgradeable).sort((a,b)=>a.name.localeCompare(b.name,'pl'));
  const from=st.upgradeFrom??0,to=st.upgradeTo??1,max=upgradeMax(),p=upgradePolicy(st)||{selection:'specific',mode:'exact',value:1,slots:upgradeSlots().map(x=>x.id)},any=p.selection==='any';
  const slots=upgradeSlots();
  return field('Wybór przedmiotu',prefix+'upgradeSelection',p.selection,{options:[['specific','Konkretny przedmiot'],['any','Dowolne wyposażenie wybrane przez gracza']]})+
   (any?'<div style="grid-column:1/-1"><span>Dozwolone elementy wyposażenia</span><div class="dbi-gme-inline"><button type="button" data-gme-upgrade-all="'+i+'">Zaznacz wszystkie</button></div><div style="display:flex;flex-wrap:wrap;gap:10px">'+slots.map(x=>'<label><input type="checkbox" data-gme-upgrade-slot="'+i+'" value="'+esc(x.id)+'" '+(p.slots?.includes(x.id)?'checked':'')+'> '+esc(x.label)+'</label>').join('')+'</div></div>':field('Przedmiot do ulepszenia',prefix+'target',st.target||'',{options:[['','Wybierz wyposażenie'],...items.map(x=>[x.id,x.name+' ('+x.id+')'])],searchable:true}))+
   field('Sposób ulepszenia',prefix+'upgradeMode',p.mode,{options:[...(!any?[['exact','Z konkretnego poziomu na wyższy']]:[]),['relative','Zwiększ o określoną liczbę poziomów'],['absolute','Ulepsz do konkretnego poziomu']]})+
   (p.mode==='exact'?field('Wymagany poziom przedmiotu',prefix+'upgradeFrom',from,{options:Array.from({length:max},(_,n)=>[n,'+'+n])})+
   field('Docelowy poziom ulepszenia',prefix+'upgradeTo',to,{options:Array.from({length:Math.max(0,max-from)},(_,n)=>[from+n+1,'+'+(from+n+1)])}):field(p.mode==='relative'?'Liczba dodatkowych poziomów':'Docelowy poziom ulepszenia',prefix+'upgradeValue',p.value,{options:Array.from({length:max},(_,n)=>[n+1,'+'+(n+1)])}))+
   '<div style="grid-column:1/-1"><p>NPC zwraca ten sam egzemplarz z zachowaną jakością i bonusami. Bez kosztów kowalstwa i ryzyka niepowodzenia. Maksymalny poziom +'+max+'. Przedmioty, których nie da się ulepszyć, są niedostępne. Dodatkowe nagrody ustaw poniżej.</p>'+(upgradeValid(st)?'<div class="dbi-quest-reward-item" style="display:flex;align-items:center;gap:8px">'+upgradeRewardMarkup(st)+'</div>':'')+'</div>';
 }
 function requirementName(step,q){return step.requirement==='upgrade'?upgradeGoal(step):step.requirement==='quest'?'Ukończ „'+(step.requiredQuestId==='legacy-town-journey'?'Pierwsza Podróż (dotychczasowa fabuła)':questById(step.requiredQuestId)?.name||'Brak zadania')+'”':step.requirement==='item'?'Oddaj '+(pickupCatalog().find(i=>i.id===step.target)?.name||step.target):step.requirement==='level'?'Osiągnij poziom '+requiredAmount(step):step.requirement==='kill'?'Pokonaj '+killGoal(q,step):step.requirement==='story'?'Pokonaj '+(step.enemy?.name||'przeciwnika fabularnego'):'';}

 const questProgressKey=(id,questId)=>'dboidle_gm_quest_v1_'+String(id)+'_'+String(questId);
 function getQuestProgress(charId,questId){
  try{const state=JSON.parse(localStorage.getItem(questProgressKey(charId,questId))||'null');return state&&Number.isInteger(state.stage)&&state.stage>=0?state:{stage:0,kills:0}}catch{return {stage:0,kills:0}}
 }
 function questById(questId){return quests().find(q=>q.id===questId)}
 function requiredAmount(step){return ['none','quest','story','upgrade'].includes(step.requirement)?1:Math.max(1,Number(step.count)||1)}
 // Display the actual level and inventory quantity; only bounded objectives are capped.
 function displayedRequirementCount(step,count,total){
  return Math.max(0,['item','level'].includes(step.requirement)?Math.floor(count):Math.min(total,count));
 }
 function requirementProgress(step,progress,charId){
  const inv=window.DBIWorldInventory;
  switch(step.requirement){
   case 'story':return progress.won===true?1:0;
   case 'quest':{
    if(step.requiredQuestId==='legacy-town-journey')return originalJourneyDone(charId)?1:0;
    const required=questById(step.requiredQuestId);
    return required?.steps?.length>0&&questUnlocked(required,charId)&&getQuestProgress(charId,required.id).stage>=required.steps.length?1:0;
   }
   case 'upgrade':return upgradeCandidates(step,charId).length?1:0;
   case 'item':return Number(inv?.countQuestItem?.(step.target))||0;
   case 'level':return Math.floor(Number(inv?.character?.()?.level)||1);
   case 'kill':return Number(progress.kills)||0;
   default:return 1;
  }
 }
 function renderNpcQuest({side,npc,characterId,mapId,pointInRange=true,onChange,onClose,canFight=()=>true,prepareTeleport,onTeleport}){
  const quest=questById(npc.questId);if(!quest)return false;
  let state=getQuestProgress(characterId,quest.id);
  const steps=Array.isArray(quest.steps)?quest.steps:[];
  if(state.stage>=steps.length){
   side.innerHTML='<div class="dbi-quest-panel"><header class="dbi-quest-title">'+esc(quest.name)+'</header><section class="dbi-quest-story">Zakończono wszystkie etapy tego zadania.</section><button class="world-action secondary" data-gme-close>Zamknij</button></div>';
   $(side,'[data-gme-close]').onclick=onClose;return true;
  }
  const step=steps[state.stage],need=requiredAmount(step);
  if(!questUnlocked(quest,characterId)||mapId&&stepMap(quest,step)!==mapId||step.point&&!pointInRange){
   const destination=stepMap(quest,step),label=step.point?.label;
   const locationName=currentPublished().maps.find(m=>m.id===destination)?.name||builtins().find(m=>m.id===destination)?.name||destination;
   const message=!questUnlocked(quest,characterId)?'Najpierw ukończ dotychczasową Pierwszą Podróż.':'Kontynuuj zadanie '+(destination!==mapId?'na mapie: '+locationName+(label?' — '+label:''):'w miejscu: '+(label||'oznaczonym wykrzyknikiem'))+'.';
   side.innerHTML='<div class="dbi-quest-panel"><header class="dbi-quest-title">'+esc(quest.name)+'</header><section class="dbi-quest-story"><p>'+esc(message)+'</p></section><div class="dbi-quest-buttons"><button class="world-action secondary" data-gme-close>Zamknij</button></div></div>';
   $(side,'[data-gme-close]').onclick=onClose;return true;
  }
  if(needsAcceptance(quest,state.stage)&&state.accepted!==true){
   side.innerHTML='<div class="dbi-quest-panel"><header class="dbi-quest-title">'+esc(quest.name)+'</header><section class="dbi-quest-story">'+dialogMarkup(step.dialog,characterId)+'</section><div class="dbi-quest-buttons"><button type="button" class="world-action" data-gme-accept>Zaakceptuj zadanie</button><button type="button" class="world-action secondary" data-gme-close>Zamknij</button></div><p role="status" data-gme-error class="world-quest-error" hidden></p></div>';
   $(side,'[data-gme-close]').onclick=onClose;
   $(side,'[data-gme-accept]').onclick=()=>{const latest=getQuestProgress(characterId,quest.id);if(latest.stage!==state.stage)return onChange();try{localStorage.setItem(questProgressKey(characterId,quest.id),JSON.stringify({...latest,accepted:true}));onChange()}catch{const node=$(side,'[data-gme-error]');if(node){node.hidden=false;node.textContent='Nie udało się zaakceptować zadania.'}}};return true;
  }
  const inventory=window.DBIWorldInventory;
  const quantity=requirementProgress(step,state,characterId);
  const satisfied=step.requirement==='none'||quantity>=need;
  const condition=esc(requirementName(step,quest));
  const enemy=step.requirement==='story'&&validStoryEnemy(step.enemy)?step.enemy:null;
  const enemyDetails=enemy?window.DBIWorld.questOpponentMarkup(enemy):'';
  const heading=esc(quest.name)+(quest.id===JOURNEY_ID||enemy?' <small>Fabularna</small>':'');
  const rewards=stepRewards(step);
  const upgrade=step.requirement==='upgrade',candidates=upgrade?upgradeCandidates(step,characterId):[];
  const selectedUpgrade=upgrade&&candidates.length===1?candidates[0]:null;
  const reward=(upgrade&&upgradeValid(step)?'<div class="dbi-quest-reward-item" data-gme-upgrade-reward>'+upgradeRewardMarkup(step,selectedUpgrade)+'</div>':'')+rewards.map(r=>'<div class="dbi-quest-reward-item">'+rewardMarkup(r)+'</div>').join('');
  const picker=upgrade&&candidates.length?'<label class="dbi-gme-field"><span>Wybierz egzemplarz z inwentarza</span><select data-gme-upgrade-choice>'+(candidates.length>1?'<option value="">Wybierz egzemplarz…</option>':'')+candidates.map((entry,i)=>'<option value="'+i+'">'+esc(entry.label)+'</option>').join('')+'</select></label>':upgrade?'<p>Brak przedmiotów spełniających warunki. Włóż odpowiednie wyposażenie do inwentarza (zdejmij je, jeśli jest założone).</p>':'';
  side.innerHTML='<div class="dbi-quest-panel">'+(enemy?window.DBIWorld.questOpponentStyles():'')+'<header class="dbi-quest-title">'+heading+'</header><section class="dbi-quest-story">'+dialogMarkup(step.dialog,characterId)+'</section>'+enemyDetails+
   (condition?'<div class="dbi-quest-goal '+(satisfied?'done':'pending')+'">Wymagania: '+(['item','upgrade'].includes(step.requirement)?'<span data-gme-upgrade-requirement>'+itemRequirementMarkup(step,quantity,selectedUpgrade)+'</span>':condition+' ('+displayedRequirementCount(step,quantity,need)+'/'+need+')')+'</div>':'')+
   picker+(reward?'<div class="dbi-quest-rewards"><strong>'+(rewards.length+(upgrade?1:0)===1?'Nagroda':'Nagrody')+'</strong><div class="dbi-quest-reward-lines">'+reward+'</div></div>':'')+
   '<p role="status" data-gme-error class="world-quest-error" hidden></p><div class="dbi-quest-buttons"><button type="button" class="world-action" data-gme-next '+(satisfied||enemy?'':'disabled')+'>'+esc(dialogText(enemy&&!satisfied?'Walcz':step.button||'Dalej',characterId))+'</button><button type="button" class="world-action secondary" data-gme-close>Zamknij</button></div></div>';
  $(side,'[data-gme-close]').onclick=onClose;
  wireRewardImages(side);
  const upgradeSelect=$(side,'[data-gme-upgrade-choice]');
  if(upgradeSelect){const updateChoice=()=>{const chosen=upgradeSelect.value===''?null:candidates[Number(upgradeSelect.value)];const next=$(side,'[data-gme-next]');if(next)next.disabled=!chosen;const req=$(side,'[data-gme-upgrade-requirement]'),rewardRow=$(side,'[data-gme-upgrade-reward]');document.querySelector('#itemTooltip')?.setAttribute('hidden','');if(req&&upgradeDynamic(step)){req.innerHTML=itemRequirementMarkup(step,quantity,chosen);wireRewardImages(req);}if(rewardRow){rewardRow.innerHTML=upgradeRewardMarkup(step,chosen);wireRewardImages(rewardRow);}};upgradeSelect.addEventListener('change',updateChoice);updateChoice();}
  $(side,'[data-gme-next]').onclick=()=>{
   // Recheck aktualnego etapu i zasobów bezpośrednio przed nadaniem nagrody.
   const latest=getQuestProgress(characterId,quest.id);
   if(latest.stage!==state.stage)return onChange();
   const have=requirementProgress(step,latest,characterId);
   if(step.requirement==='story'&&have<need&&enemy){
    if(!canFight()||window.DBIStoryCombat?.isRunning?.())return;
    window.DBIStoryCombat?.open({characterId,playerName:document.querySelector('#name')?.textContent||'Wojownik',opponentName:enemy.name,opponentStats:{...enemy,maxHp:enemy.hp,maxKi:enemy.maxKi},opponentArt:enemy.art,onFinish:result=>{
     const current=getQuestProgress(characterId,quest.id);
     if(result==='win'&&current.stage===state.stage){try{localStorage.setItem(questProgressKey(characterId,quest.id),JSON.stringify({...current,won:true}))}catch{}}
     onChange();
    }});return;
   }
   if(step.requirement!=='none'&&have<need)return onChange();
   const error=message=>{const node=$(side,'[data-gme-error]');node.hidden=false;node.textContent=message};
   const destination=step.teleport?prepareTeleport?.(step.teleport):null;
   if(step.teleport&&!destination)return error('Nie można przenieść postaci: sprawdź mapę i punkt docelowy w kreatorze.');
   const finishStage=()=>{
    if(destination&&getQuestProgress(characterId,quest.id).stage>latest.stage){
     if(onTeleport?.(destination,quest.id)===true)return;
     onChange();const notice=document.createElement('p');notice.className='world-quest-error';notice.textContent='Etap zaliczony, ale nie udało się zapisać przeniesienia. Udaj się na mapę docelową.';side.prepend(notice);return;
    }
    onChange();
   };
   if(!rewards.every(validReward)||rewards.length>20)return error('Sprawdź konfigurację nagród w kreatorze.');
   if(!inventory?.claimEditorQuestRewards)return error('Brakuje aktualizacji pliku app.js.');
   let upgradeRequest=null;
   if(upgrade){
    if(!upgradeValid(step))return error('Sprawdź konfigurację ulepszenia w kreatorze.');
    const value=$(side,'[data-gme-upgrade-choice]')?.value;
    const chosen=value!==undefined&&value!==''?candidates[Number(value)]:null;
    if(!chosen)return error('Wybierz egzemplarz do ulepszenia.');
    upgradeRequest={item:chosen.item,from:chosen.from,to:chosen.to,index:chosen.index,ref:chosen.ref,policy:upgradePolicy(step),target:step.target,requiredFrom:step.upgradeFrom,requiredTo:step.upgradeTo};
   }
   const result=inventory.claimEditorQuestRewards(characterId,quest.id,latest.stage,rewards,step.requirement==='item'?step.target:null,need,upgradeRequest);
   if(!result?.ok)return error(result?.message||'Nie udało się rozliczyć nagród.');
   finishStage();
  };
  return true;
 }
 function recordKill(charId,mobName,mapId){
  for(const q of quests()){
   if(!questUnlocked(q,charId))continue;
   const state=getQuestProgress(charId,q.id),step=q.steps?.[state.stage];
   if(step?.requirement!=='kill'||stepMap(q,step)!==mapId||!selectedKillNames(q,step).includes(mobName))continue;
   state.kills=Math.min(requiredAmount(step),Math.max(0,Number(state.kills)||0)+1);
   try{localStorage.setItem(questProgressKey(charId,q.id),JSON.stringify(state))}catch{}
  }
 }
 // Rejestr misji: korzysta z tych samych stanów co NPC.
 function missionPoint(q,step){
  if(step.point)return step.point;
  const mapId=stepMap(q,step),map=currentPublished().maps.find(m=>m.id===mapId)||legacyCatalog().maps.find(m=>m.id===mapId);
  return map?questSources(map).find(n=>n.questId===q.id):null;
 }
 function registerMissions(){
  window.DBIQuestRegistry?.register?.({id:'gm-editor-quests',getMissions(charId){
   const list=[];
   for(const q of quests()){
    const state=getQuestProgress(charId,q.id),step=q.steps?.[state.stage];
    if(!step||!questUnlocked(q,charId)||needsAcceptance(q,state.stage)&&state.accepted!==true)continue;
    const point=missionPoint(q,step);
    if(state.stage===0&&!point&&q.id!==JOURNEY_ID)continue;
    const count=requirementProgress(step,state,charId),total=requiredAmount(step),mapId=stepMap(q,step);
    const mapName=builtins().find(m=>m.id===mapId)?.name||currentPublished().maps.find(m=>m.id===mapId)?.name||mapId;
    list.push({id:q.id===JOURNEY_ID?'mountain-town-journey':'gm-'+q.id,name:q.name,location:mapName+(point?.label?' · '+point.label:'')+' · Etap '+(state.stage+1)+'/'+q.steps.length,count:displayedRequirementCount(step,count,total),total,description:requirementName(step,q)||'Porozmawiaj w punkcie zadania.',ready:'Wróć do punktu zadania i porozmawiaj.'});
   }
   return list;
  }});
 }
 registerMissions();

 let state=null,lastStatus='';
 // Portal identities are per map and survive moving / renaming a portal.
 const portalKey=p=>p?.portalId||('xy:'+p?.x+':'+p?.y);
 function ensurePortalIds(pack){
  for(const m of pack.maps||[]){const used=new Set((m.portals||[]).map(p=>p.portalId).filter(Boolean));
   for(const p of m.portals||[])if(!p.portalId){let id;do{id='p-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)}while(used.has(id));p.portalId=id;used.add(id);}
  }
  return pack;
 }
 function portalMap(pack,id){return pack.maps.find(m=>m.id===id)||legacyMapData(id,pack)}
 function portalTarget(pack,p){return (portalMap(pack,p.to)?.portals||[]).find(t=>portalKey(t)===p.targetPortalId)}
 function portalMode(p){return p.arrivalMode||'custom'}
 function isPortalPair(a,map,b,targetMap){return portalMode(a)==='portal'&&portalMode(b)==='portal'&&a.to===targetMap.id&&b.to===map.id&&a.targetPortalId===portalKey(b)&&b.targetPortalId===portalKey(a)}
 function unlinkPortalReturn(map,p){
  const otherMap=state.pack.maps.find(m=>m.id===p.to),other=portalTarget(state.pack,p);
  if(otherMap&&other&&isPortalPair(p,map,other,otherMap)){delete other.targetPortalId;delete other.portalReturn;other.to='';other.arrivalMode='portal';}
  delete p.portalReturn;
 }
 function portalConnectionsView(map,p){
  const dest=p.to&&portalMap(state.pack,p.to),target=portalTarget(state.pack,p),mode=portalMode(p);
  const options=(dest?.portals||[]).map((t,i)=>[portalKey(t),(t.label||'Portal '+(i+1))+' · X: '+Math.round(t.x)+', Y: '+Math.round(t.y)+(t.to?' → '+(allLocations().find(m=>m.id===t.to)?.name||t.to):'')]);
  if(p.targetPortalId&&!target)options.push([p.targetPortalId,'⚠ Brak wybranego portalu — wybierz ponownie']);
  const otherMap=state.pack.maps.find(m=>m.id===p.to),paired=target&&(otherMap?isPortalPair(p,map,target,otherMap):p.portalReturn===true);
  return field('Nazwa na mapie gry','item.label',p.label||'')+field('Mapa docelowa','item.to',p.to||'',{options:[['','Wybierz lokację'],...allLocations().filter(l=>l.id!==map.id&&!['laguna','island'].includes(l.id)).map(l=>[l.id,l.name])]})+
   field('Miejsce pojawienia się','item.arrivalMode',mode,{options:[['portal','Konkretny portal docelowy'],['spawn','Domyślny punkt startowy'],['custom','Własne współrzędne (px)']]})+
   (mode==='portal'?field('Portal docelowy','item.targetPortalId',p.targetPortalId||'',{options:[['','Wybierz portal'],...options]})+'<div class="dbi-gme-entry"><p>'+(target?'✓ Wybrano: '+esc(target.label||'Portal')+' ('+Math.round(target.x)+', '+Math.round(target.y)+'). Postać pojawi się przy nim na przechodnim terenie.':options.length?'Wybierz punkt docelowy z listy.':'Najpierw postaw portal na mapie docelowej.')+'</p><button type="button" data-gme-command="portal-pair" '+(!target||paired?'disabled':'')+'>Połącz również w drugą stronę</button> <button type="button" data-gme-command="portal-unpair" '+(!paired?'disabled':'')+'>Pozostaw tylko przejście w jedną stronę</button>'+(paired?'<p>✓ Połączenie dwustronne</p>':'')+(!otherMap&&target?'<p>Powrót na oryginalnej mapie zostanie ustawiony w danych publikacji, bez edycji jej kodu.</p>':'')+'</div>':mode==='custom'?field('Miejsce pojawienia X','item.destinationArrival.x',p.destinationArrival?.x??0,{type:'number',min:0})+field('Miejsce pojawienia Y','item.destinationArrival.y',p.destinationArrival?.y??0,{type:'number',min:0}):'');
 }
 function saveDraft(){
  if(!state)return false;
  try{ensurePortalIds(state.pack);localStorage.setItem(DRAFT_KEY,JSON.stringify(state.pack));setStatus('Projekt zapisany lokalnie.');return true}
  catch(e){setStatus('Nie udało się zapisać. Sprawdź limit pamięci przeglądarki.');return false}
 }
 function setStatus(text){lastStatus=text;const node=state?.root?.querySelector('[data-gme-status]');if(node)node.textContent=text}
 function download(name,text,mime){
  const url=URL.createObjectURL(new Blob([text],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2500);
 }
 function builtins(){return Array.isArray(window.DBIWorld?.locations)?window.DBIWorld.locations:[]}
 function legacyCatalog(){return window.DBIWorld?.legacyEditorData?.()||{maps:[],quests:[]}}
 function legacyMap(){return legacyMapData(state?.mapId)}
 function legacyMapData(id,pack=state?.pack){
  const base=legacyCatalog().maps.find(m=>m.id===id);if(!base)return null;
  try{const value=pack?.nativeEdits?.['map:'+id]?.value;if(!value)return base;const edited=window.DBINativeEditor?.readMap?.(id,pack)||JSON.parse(value);return {...base,...edited,portals:edited.portals||(edited.portal?[edited.portal]:base.portals),blocked:[...(edited.blocked||base.blocked||[]),...(edited.extraBlocked||[])]};}catch{return base}
 }
 function projectMapData(id){return state.pack.maps.find(m=>m.id===id)||legacyMapData(id)}
 function legacyQuest(){return legacyCatalog().quests.find(q=>q.id===state?.legacyQuestId)||null}
 function legacyMapQuests(mapId){return legacyCatalog().quests.filter(q=>q.mapIds?.includes(mapId))}

 function allLocations(){const list=builtins().map(l=>({id:l.id,name:l.name}));for(const m of state.pack.maps)if(!list.some(l=>l.id===m.id))list.push({id:m.id,name:m.name});return list}
 function currentMap(){return state.pack.maps.find(m=>m.id===state.mapId)||null}
 function currentQuest(){return state.pack.quests.find(q=>q.id===state.questId)||null}
 function currentObject(){const m=currentMap();if(!m)return null;if(state.selection?.type==='spawn')return m.spawn;if(state.selection?.type==='mobs')return m.mobs;if(state.selection?.type==='boss')return m.boss;if(state.selection?.type==='blocked')return m.blocked[state.selection.index];return m[state.selection?.type]?.[state.selection.index]||null}
 function validate(pack){
  const problems=[];
  if(pack.customArt!==undefined&&(!Array.isArray(pack.customArt)||pack.customArt.length>200||JSON.stringify(pack.customArt).length>1500000||pack.customArt.some(p=>!p||!/^user-[a-f0-9-]{36}$/.test(p.key)||p.art!==p.key||typeof p.src!=='string'||!/^data:image\/(?:png|webp);base64,[A-Za-z0-9+/]+=*$/.test(p.src)||typeof p.group!=='string'||typeof p.name!=='string'||![p.width,p.height].every(n=>Number.isInteger(n)&&n>=1&&n<=384)))||Array.isArray(pack.customArt)&&new Set(pack.customArt.map(p=>p?.key)).size!==pack.customArt.length)problems.push('Uszkodzony zestaw własnych grafik.');
  const ids=new Set(),builtinIds=new Set(builtins().map(m=>m.id).filter(id=>!window.DBIGMWorldPublished?.maps?.includes(id)));
  for(const m of pack.maps){
   if(!validId.test(m.id)||ids.has(m.id)||builtinIds.has(m.id))problems.push('Mapa „'+m.name+'”: niepoprawne, powtórzone lub zajęte ID.');ids.add(m.id);
   const items=window.DBIWorldInventory?.editorItems?.();
   for(const unit of [...window.DBIWorld.editorMobVariants(m),m.boss].filter(Boolean)){
    if(unit.portrait&&!validAsset.test(unit.portrait))problems.push('Mapa '+m.name+': nieprawidłowa ścieżka portretu przeciwnika.');
    if(!window.DBIWorld.validEditorEnemy(unit))problems.push('Mapa '+m.name+': błędne statystyki lub tabela łupów.');
    else if(items&&unit.combat?.drops?.some(row=>!items.some(item=>item.id===row.id)))problems.push('Mapa '+m.name+': tabela łupów zawiera nieznany przedmiot.');
   }
   if((m.scenery||[]).filter(p=>!isEdge(p)).length>300)problems.push('Mapa „'+m.id+'”: maksymalnie 300 dekoracji.');
   if((m.scenery||[]).filter(isEdge).length>1200)problems.push('Mapa „'+m.id+'”: maksymalnie 1200 kafelków obramowania.');
   if((m.scenery||[]).some(p=>isEdge(p)&&p.edgeBlock===true&&edgeContains(p,m.spawn?.x,m.spawn?.y)))problems.push('Mapa „'+m.id+'”: start leży na obramowaniu blokującym ruch.');
   if([...(m.scenery||[]),...(m.npc||[])].some(p=>String(p.art).startsWith('user-')&&!pack.customArt?.some(a=>a.key===p.art)))problems.push('Brakuje grafiki obiektu na mapie '+m.id);
   if(m.spawn!=null&&(![m.spawn.x,m.spawn.y].every(Number.isFinite)||m.spawn.x<0||m.spawn.y<0||m.spawn.x>=m.sizeX*32||m.spawn.y>=m.sizeY*32))problems.push('Mapa '+m.name+': nieprawidłowy punkt startowy.');
   if(!m.spawn&&m.entryPortal?.from)problems.push('Mapa '+m.name+': usuń automatyczny portal wejściowy albo przywróć start.');
   if(!m.name?.trim())problems.push('Mapa „'+m.id+'”: podaj nazwę.');
   if(m.terrain){
    if(!terrain?.valid(m))problems.push('Mapa „'+m.id+'”: uszkodzona siatka kafelków terenu.');
    else if(m.spawn&&terrain.isBlocked(m,m.spawn.x,m.spawn.y))problems.push('Mapa „'+m.id+'”: punkt startowy leży na terenie nieprzechodnim. Przenieś start lub zmień kafelek.');
   }
   else if(!validAsset.test(m.art)||m.art.includes('..'))problems.push('Mapa „'+m.id+'”: podaj prawidłową ścieżkę grafiki assets/...');
   if(!(Number(m.sizeX)>=10&&Number(m.sizeX)<=100&&Number(m.sizeY)>=10&&Number(m.sizeY)<=100))problems.push('Mapa „'+m.id+'”: rozmiar od 10 do 100 kafelków.');
   if((m.portals||[]).some(p=>p.to&&(['laguna','island'].includes(p.to)||(!ids.has(p.to)&&!builtinIds.has(p.to)&&!pack.maps.some(map=>map.id===p.to)))))problems.push('Mapa „'+m.id+'”: portal ma nieznany cel.');
  }
  const legacyReturns=new Set();
  for(const m of pack.maps){
   const keys=new Set();
   for(const p of m.portals||[]){
    const key=portalKey(p);if(keys.has(key))problems.push('Mapa '+m.name+': powtórzony identyfikator portalu.');keys.add(key);
    const destination=p.to&&portalMap(pack,p.to);
    if(destination&&!destination.spawn&&(portalMode(p)==='spawn'||portalMode(p)==='custom'&&!p.destinationArrival))problems.push('Portal „'+(p.label||key)+'”: ustaw współrzędne albo wybierz portal docelowy. Mapa nie ma startu.');
    if(portalMode(p)!=='portal'||!p.to&&!p.targetPortalId)continue;
    const dest=portalMap(pack,p.to),target=portalTarget(pack,p);
    if(!dest||!target||!p.to||p.to===m.id||!Number.isFinite(target.x)||!Number.isFinite(target.y)||target.x<0||target.y<0||target.x>dest.sizeX*32||target.y>dest.sizeY*32)problems.push('Mapa '+m.name+': portal „'+(p.label||key)+'” nie ma prawidłowego portalu docelowego.');
    if(p.portalReturn===true&&!pack.maps.some(x=>x.id===p.to)){const id=p.to+'|'+p.targetPortalId;if(legacyReturns.has(id))problems.push('Dwa portale próbują ustawić powrót z tego samego portalu na starej mapie.');legacyReturns.add(id);}
   }
  }
  const qIds=new Set();for(const q of pack.quests){
   if(!validId.test(q.id)||qIds.has(q.id))problems.push('Quest: niepoprawne lub powtórzone ID '+q.id);qIds.add(q.id);
   if(!ids.has(q.mapId)&&!builtinIds.has(q.mapId))problems.push('Quest '+q.id+': nie ma mapy '+q.mapId);
   if(!q.steps?.length)problems.push('Quest '+q.id+': dodaj przynajmniej jeden etap.');
   for(const [i,step] of (q.steps||[]).entries()){
    const mapId=stepMap(q,step),map=pack.maps.find(m=>m.id===mapId)||legacyCatalog().maps.find(m=>m.id===mapId);
    if(!map)problems.push('Quest '+q.name+', etap '+(i+1)+': brak mapy.');
    if((q.id===JOURNEY_ID||mapId!==q.mapId||legacyCatalog().maps.some(m=>m.id===mapId)&&!pack.nativeEdits?.['map:'+mapId]?.value?.includes(q.id)&&!legacyCatalog().maps.find(m=>m.id===mapId)?.npc?.some(n=>n.questId===q.id)&&!legacyCatalog().maps.find(m=>m.id===mapId)?.scenery?.some(n=>n.questId===q.id))&&!step.point)problems.push('Quest '+q.name+', etap '+(i+1)+': ustaw punkt na mapie.');
    if(step.point&&(!map||![step.point.x,step.point.y].every(Number.isFinite)||step.point.x<0||step.point.y<0||step.point.x>map.sizeX*32||step.point.y>map.sizeY*32))problems.push('Quest '+q.name+', etap '+(i+1)+': nieprawidłowy punkt.');
    if(step.teleport!==undefined){
     const t=step.teleport,dest=t&&(pack.maps.find(m=>m.id===t.mapId)||legacyCatalog().maps.find(m=>m.id===t.mapId));
     const p=t?.mode==='spawn'?dest?.spawn:t;
     if(!dest||!['spawn','point'].includes(t?.mode)||!p||![p.x,p.y].every(Number.isFinite)||p.x<0||p.y<0||p.x>=dest.sizeX*32||p.y>=dest.sizeY*32||dest.terrain&&terrain?.isBlocked(dest,p.x,p.y)||(dest.scenery||[]).some(e=>isEdge(e)&&e.edgeBlock===true&&edgeContains(e,p.x,p.y))||(dest?.blocked||[]).some(([l,top,r,b])=>p&&p.x>=l&&p.x<=r&&p.y>=top&&p.y<=b))problems.push('Quest '+q.name+', etap '+(i+1)+': nieprawidłowy punkt teleportu.');
    }
    if(step.requirement==='kill'&&step.killVariants!==undefined){
     const roster=farmingRoster(mapId,pack),v=step.killVariants;
     if(!Array.isArray(v)||!v.length||new Set(v).size!==v.length||v.some(n=>!Number.isInteger(n)||n<0||n>2||!roster[n]))problems.push('Quest '+q.name+', etap '+(i+1)+': wybierz przynajmniej jeden dostępny wariant moba z expowiska na mapie etapu.');
    }
    if((step.rewards!==undefined&&!Array.isArray(step.rewards))||stepRewards(step).length>20||!stepRewards(step).every(validReward))problems.push('Quest '+q.name+', etap '+(i+1)+': sprawdź typ, ilość i przedmioty nagród (maks. 20).');
    if(step.requirement==='upgrade'&&!upgradeValid(step))problems.push('Quest '+q.name+', etap '+(i+1)+': wybierz wyposażenie lub dozwolone sloty i poprawny sposób ulepszenia.');
    if(step.requirement==='story'&&!validStoryEnemy(step.enemy))problems.push('Quest '+q.name+', etap '+(i+1)+': sprawdź przeciwnika fabularnego.');
   }
  }
  const pickupIds=new Set(),catalog=pickupCatalog();
  if(pack.pickups!==undefined&&(!Array.isArray(pack.pickups)||pack.pickups.length>1000))problems.push('Nieprawidłowa lista przedmiotów na mapie.');
  for(const p of Array.isArray(pack.pickups)?pack.pickups:[]){
   const m=pack.maps.find(m=>m.id===p?.mapId)||legacyCatalog().maps.find(m=>m.id===p?.mapId),q=pack.quests.find(q=>q.id===p?.questId);
   if(!p||!validId.test(p.id)||pickupIds.has(p.id)||!m||![p.x,p.y].every(Number.isFinite)||p.x<0||p.y<0||p.x>m.sizeX*32||p.y>m.sizeY*32||!catalog.some(i=>i.id===p.itemId)||!Number.isSafeInteger(p.amount)||p.amount<1||p.amount>100||!['always','accepted','after','complete'].includes(p.when)||p.when!=='always'&&(!q||p.when!=='complete'&&(!Number.isInteger(p.stage)||p.stage<0||p.stage>=q.steps.length)))problems.push('Przedmiot na mapie '+(p?.id||'?')+': sprawdź mapę, pozycję, przedmiot, ilość i warunek questa.');
   if(p?.id)pickupIds.add(p.id);
   if(p&&m?.terrain&&terrain?.isBlocked(m,p.x,p.y))problems.push('Przedmiot '+p.id+' znajduje się na nieprzechodnim terenie.');
  }
  const byId=new Map(pack.quests.map(q=>[q.id,q])),checked=new Set(),pending=new Set();
  function checkPrerequisites(q){
   if(checked.has(q.id))return;
   pending.add(q.id);
   for(const step of q.steps||[]){
    if(step.requirement!=='quest'||step.requiredQuestId==='legacy-town-journey')continue;
    const required=byId.get(step.requiredQuestId);
    if(!required)problems.push('W zadaniu „'+q.name+'” wybierz istniejący wymagany quest.');
    else if(pending.has(required.id))problems.push('Zadania tworzą pętlę wymagań przy „'+required.name+'”.');
    else checkPrerequisites(required);
   }
   pending.delete(q.id);checked.add(q.id);
  }
  for(const q of pack.quests)checkPrerequisites(q);
  for(const m of pack.maps)for(const n of questSources(m))if(n.questId&&!qIds.has(n.questId))problems.push('Na mapie '+m.name+' element '+(n.label||n.role||'bez nazwy')+': quest '+n.questId+' nie istnieje.');
  return problems;
 }
 // A search never changes the item ID; only choosing a result commits the field.
 const itemSearchOptions=new WeakMap();
 const normalizeItemSearch=value=>String(value??'').toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').trim();
 function searchableItemField(label,key,value,options){
  // Nazwa przedmiotu zostaje niezmienna; jakość rozróżnia odmiany w wyborze GM.
  const dustQualities={'dragon-ball-dust':'Pospolity','dragon-ball-dust-common':'Zwyczajny','dragon-ball-dust-rare':'Rzadki','dragon-ball-dust-epic':'Epicki'};
  const rows=options.map(([id,title])=>[id,Object.hasOwn(dustQualities,id)?'Pył smoczych kul · '+dustQualities[id]:title]);
  if(!rows.length||!value&&!rows.some(([id])=>id===''))rows.unshift(['','Wybierz przedmiot']);
  if(value&&!rows.some(([id])=>String(id)===String(value)))rows.push([value,'Brak w katalogu: '+value]);
  const selected=rows.some(([id])=>String(id)===String(value))?String(value):'';
  return '<div class="dbi-gme-field" data-gme-item-picker><span>'+esc(label)+'</span><input type="search" data-gme-item-search="'+esc(key)+'" aria-label="'+esc('Szukaj: '+label)+'" placeholder="🔎 Wpisz nazwę przedmiotu…" autocomplete="off"><select data-gme-field="'+esc(key)+'" aria-label="'+esc(label)+'">'+rows.map(([id,title])=>'<option value="'+esc(id)+'" '+(String(id)===selected?'selected':'')+'>'+esc(title)+'</option>').join('')+'</select><small data-gme-item-count role="status" style="color:#a9c2d8">'+rows.filter(([id])=>id!=='').length+' przedmiotów</small></div>';
 }
 function filterItemPicker(input){
  const picker=input.closest('[data-gme-item-picker]'),select=picker?.querySelector('select[data-gme-field]');if(!select)return null;
  let source=itemSearchOptions.get(select);
  if(!source){source=Array.from(select.options,o=>({value:o.value,label:o.textContent}));itemSearchOptions.set(select,source);}
  const selected=select.value,terms=normalizeItemSearch(input.value).split(/\s+/).filter(Boolean);
  const matches=source.filter(o=>o.value&&terms.every(t=>normalizeItemSearch(o.label+' '+o.value).includes(t)));
  const matched=new Set(matches.map(o=>o.value));
  const visible=source.filter(o=>!o.value||o.value===selected||matched.has(o.value));
  select.replaceChildren(...visible.map(o=>{const option=document.createElement('option');option.value=o.value;option.textContent=terms.length&&o.value&&o.value===selected&&!matched.has(o.value)?o.label+' (aktualnie wybrany)':o.label;return option;}));
  select.value=selected;
  const count=picker.querySelector('[data-gme-item-count]');if(count)count.textContent=terms.length?(matches.length?'Wyniki: '+matches.length:'Brak pasujących przedmiotów')+(selected&&!matched.has(selected)?' · zachowano aktualny wybór':''):matches.length+' przedmiotów';
  return {select,matches};
 }
 function field(label,key,value,{type='text',min,max,step,placeholder='',options=null,textarea=false,searchable=false}={}){
  if(searchable&&options)return searchableItemField(label,key,value,options);
  return '<label class="dbi-gme-field"><span>'+esc(label)+'</span>'+(textarea?'<textarea data-gme-field="'+esc(key)+'" rows="4" placeholder="'+esc(placeholder)+'">'+esc(value)+'</textarea>':options?'<select data-gme-field="'+esc(key)+'">'+options.map(([id,title])=>'<option value="'+esc(id)+'" '+(String(id)===String(value)?'selected':'')+'>'+esc(title)+'</option>').join('')+'</select>':'<input data-gme-field="'+esc(key)+'" type="'+esc(type)+'" value="'+esc(value)+'" '+(min!==undefined?'min="'+esc(min)+'" ':'')+(max!==undefined?'max="'+esc(max)+'" ':'')+(step!==undefined?'step="'+esc(step)+'" ':'')+'placeholder="'+esc(placeholder)+'">')+'</label>';
 }
 function mapSelect(){
  const legacy=legacyCatalog().maps;
  const palace=state.pack.maps.find(m=>m.id===palaceMapId);
  const palaceShortcut=palace?'<button type="button" class="'+(palace.id===state.mapId?'active':'')+'" data-gme-map="'+esc(palace.id)+'">Otwórz Pałac Wszechmogącego</button>':'';
  return '<div class="dbi-gme-projects">'+palaceShortcut+'<strong>Istniejące mapy ('+legacy.length+')</strong>'+legacy.map(m=>'<button type="button" class="dbi-gme-legacy-option '+(m.id===state.mapId?'active':'')+'" data-gme-map="'+esc(m.id)+'" title="Mapa z gry">'+esc(m.name)+'</button>').join('')+
   '<button type="button" data-gme-command="sync-installed">Wczytaj brakujące z gry</button><strong>Mapy projektu ('+state.pack.maps.length+')</strong>'+state.pack.maps.map(m=>'<button type="button" class="'+(m.id===state.mapId?'active':'')+'" data-gme-map="'+esc(m.id)+'">'+esc(m.name)+'</button>').join('')+'<label>Szablon lokacji <select data-map-theme><option>Równina</option><option>Leśna zatoka</option><option>Miasto kapsuł</option><option>Stadion</option><option>Pałac ponad chmurami</option><option>Osada Szmaragdowej Wody</option><option>Port orbitalny</option><option>Przystań zaświatów</option><option>Wyspa mistrza</option><option>Komnata wahadeł</option><option>Namek · archipelag</option><option>Namek · płaskowyż Starszego</option><option>Namek · obóz imperium</option><option>Namek · ostatnie chwile</option><option>Przyszłość · laboratorium czasu</option><option>Przyszłość · ruiny miasta</option><option>Ziemia · turniej sztuk walki</option><option>Zaświaty · sąd dusz</option><option>Statek – sala grawitacyjna</option><option>Górskie dojo</option></select></label><button type="button" data-gme-command="add-map">+ Nowa mapa</button></div>'
 }
 function editorTop(){return '<header class="dbi-gme-header"><div><span class="dbi-gme-tag">PANEL GM / NARZĘDZIA ŚWIATA</span><h2>🗺 Kreator map i questów v4.53</h2><p>Buduj teren od zera, rozmieszczaj obiekty i twórz questy. Edytuj także mapy i fabułę dodane do gry.</p></div><button type="button" data-gme-command="exit">Wróć do Panelu GM</button></header><nav class="dbi-gme-tabs">'+[['maps','Mapy i obiekty'],['pickups','Przedmioty na mapie'],['enemies','Moby i bossowie'],['quests','Questy i dialogi'],['publish','Zapis i publikacja']].map(([id,label])=>'<button type="button" data-gme-tab="'+id+'" class="'+(state.tab===id?'active':'')+'">'+label+'</button>').join('')+'</nav>'}
 const sceneryRoles=[['','Dekoracja'],['arena','Arena walki'],['qualifier','Hala eliminacyjna'],['building','Budynek'],['landmark','Punkt orientacyjny']];
 function questSources(map){return [...(map.npc||[]),...(map.scenery||[])]}
 // Project markers have explicit provenance, independent of their art, name or quest.
 // Old records: only the saved manual-marker flag or the dedicated campfire animation
 // can recover provenance; unknown scenery remains decoration until explicitly marked.
 function sceneryPlacement(n){
  if(!n)return 'decoration';
  if(['object','campfire','decoration'].includes(n.placementTool))return n.placementTool;
  if(n.animation==='campfire')return 'campfire';
  return n.questMarker===true?'object':'decoration';
 }
 function sceneryQuestMarker(n){return sceneryPlacement(n)!=='decoration'}
 // NPC artwork and the toolbar NPC marker share the storage array for historical
 // reasons, but only a marker is a selectable quest target. Never infer a marker
 // from the artwork's name. Old image-bearing records have no provenance; allow
 // the editor to explicitly restore a manual marker if that was its purpose.
 function npcPlacement(n){
  if(!n)return 'library-npc';
  if(n.placementTool==='npc'||n.placementTool==='library-npc')return n.placementTool;
  if(n.questMarker===false)return 'library-npc';
  if(n.questMarker===true)return 'npc';
  return n.art||n.file||n.source?'library-npc':'npc';
 }
 function npcQuestMarker(n){return npcPlacement(n)==='npc'}
 function stageQuestMarkers(mapId,map,targets){
  if(!state.pack.maps.some(m=>m.id===mapId))return targets;
  const selectable={...map,npc:(map.npc||[]).filter(npcQuestMarker),scenery:(map.scenery||[]).filter(sceneryQuestMarker),city:null,dungeon:null};
  return window.DBIWorld?.editorQuestTargets?.(mapId,selectable)||[];
 }
 function stagePickerPosition(n,map){
  // Picker dots show the actual map point, not the above-head quest exclamation.
  if(n.kind==='scenery'&&n.rect)return {x:(n.rect.left+n.rect.right)/2,y:(n.rect.top+n.rect.bottom)/2};
  if(n.kind==='npc'){const npc=(map.npc||[]).find(p=>p.x===n.x&&p.y===n.y&&(!state.pack.maps.some(m=>m.id===map.id)||npcQuestMarker(p)));if(npc?.art)return {x:n.x,y:n.y-window.DBIWorld.npcSize(npc).height/2};}
  return {x:n.x,y:n.y};
 }
 function projectPointObject(map,p){
  if(!map||!p||p.targetKind==='free'||!state.pack.maps.includes(map))return null;
  const rows=[...(map.npc||[]).filter(npcQuestMarker).map(n=>['npc',n]),...(map.scenery||[]).filter(sceneryQuestMarker).map(n=>['scenery',n]),...(map.portals||[]).map(n=>['portal',n]),...(map.mobs?[['mobs',map.mobs]]:[]),...(map.boss?[['boss',map.boss]]:[]),...(map.spawn?.placementTool==='spawn'?[['spawn',map.spawn]]:[])];
  const hits=[];
  for(const [kind,item] of rows){
   if(p.targetKind&&p.targetKind!==kind)continue;
   const one={...map,npc:[],scenery:[],portals:[],mobs:null,boss:null,city:null,dungeon:null,spawn:null};
   if(kind==='npc'||kind==='scenery')one[kind]=[item];else if(kind==='portal')one.portals=[item];else one[kind]=item;
   const t=window.DBIWorld.editorQuestTargets(map.id,one)[0];if(!t)continue;
   if(Math.hypot(t.x-p.x,t.y-p.y)<2||Math.hypot(item.x-p.x,item.y-p.y)<2)hits.push({item,kind,t});
  }
  return hits.find(h=>h.t.label===p.label)|| (hits.length===1?hits[0]:null);
 }
 function renameProjectPoint(map,hit,value){
  const refs=[];for(const q of state.pack.quests||[])for(const st of q.steps||[]){if(stepMap(q,st)!==map.id)continue;const other=projectPointObject(map,st.point);if(other?.item===hit.item)refs.push(st.point);}
  hit.item.label=String(value).trim().slice(0,90);
  const label=hit.item.label||({npc:'NPC',scenery:sceneryPlacement(hit.item)==='campfire'?'Ognisko':'Punkt fabularny',portal:'Portal',mobs:'Expowisko',boss:'Boss',spawn:'Start'}[hit.kind]);
  for(const point of refs)point.label=label;
 }
 function objectLabel(type,item,index){return item.label|| (type==='npc'?'NPC '+(index+1):type==='portals'?'Portal → '+(item.to||'?'):type==='scenery'?(sceneryPlacement(item)==='campfire'?'Ognisko':sceneryRoles.find(([key])=>key&&key===item.role)?.[1]||'Obiekt '+(index+1)):type==='blocked'?'Kolizja '+(index+1):type==='mobs'?'Expowisko':type==='boss'?'Boss':'Start')}
 function mapLegacyView(map){
  const W=map.sizeX*32,H=map.sizeY*32;
  const quests=legacyMapQuests(map.id);
  const projectQuests=state.pack.quests.filter(q=>q.steps?.some(st=>stepMap(q,st)===map.id)||q.mapId===map.id);
  const pins=[['spawn',map.spawn],...(map.npc||[]).map(o=>['npc',o]),...(map.scenery||[]).map(o=>['scenery',o]),...(map.portals||[]).map(o=>['portals',o]),...(map.mobs?[['mobs',map.mobs]]:[]),...(map.boss?[['boss',map.boss]]:[]),...(map.city?[['city',map.city]]:[]),...(map.dungeon?[['dungeon',map.dungeon]]:[])];
  const symbols={spawn:'🏁',npc:'👤',scenery:'🏠',portals:'🌀',mobs:'⚔',boss:'👑',city:'🏙',dungeon:'🏰'};
  const items=pins.filter(([,p])=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)).map(([type,p])=>'<span class="dbi-gme-pin dbi-gme-read-pin" style="left:'+(p.x/W*100)+'%;top:'+(p.y/H*100)+'%" title="'+esc(p.label||type)+'">'+symbols[type]+'</span>').join('');
  const blocks=(state.showBlocks===false?[]:map.blocked||[]).map(b=>'<span class="dbi-gme-block dbi-gme-read-block" style="left:'+(b[0]/W*100)+'%;top:'+(b[1]/H*100)+'%;width:'+((b[2]-b[0])/W*100)+'%;height:'+((b[3]-b[1])/H*100)+'%"></span>').join('');
  const list=(title,values)=>'<article class="dbi-gme-legacy-box"><h4>'+title+'</h4>'+(values.length?'<ul>'+values.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>':'<p>Brak elementów w definicji mapy.</p>')+'</article>';
  return '<section class="dbi-gme-work dbi-gme-legacy-view"><div class="dbi-gme-legacy-banner"><div><span class="dbi-gme-tag">MAPA Z GRY</span><h3>'+esc(map.name)+'</h3><p>ID: <code>'+esc(map.id)+'</code> · '+map.sizeX+' × '+map.sizeY+' kafelków · '+esc(map.art)+'</p></div><div class="dbi-gme-inline"><button type="button" data-gme-command="native-map">Edytuj mapę</button><button type="button" data-gme-command="add-quest">+ Dodaj quest na tej mapie</button><button type="button" data-gme-command="legacy-quests" '+(quests.length?'':'disabled')+'>Questy mapy ('+quests.length+')</button><button type="button" data-gme-command="legacy-copy">Utwórz edytowalną kopię</button><button type="button" data-gme-command="legacy-test">Przejdź na mapę (GM)</button></div></div>'+ 
    '<p class="dbi-gme-legacy-warning">Edytuj oryginał pod obecnym ID. Zmiany mapy są zapisywane w projekcie; uruchom test lub pobierz ZIP w zakładce Zapis i publikacja. Nowe questy można umieszczać bez zmieniania starej fabuły.</p>'+ (projectQuests.length?'<div class="dbi-gme-inline"><strong>Questy dodane do tej mapy:</strong>'+projectQuests.map(q=>'<button type="button" data-gme-quest="'+esc(q.id)+'">'+esc(q.name)+'</button>').join('')+'</div>':'')+ 
    '<div class="dbi-gme-map-wrap"><div class="dbi-gme-map-stage dbi-gme-legacy-stage" style="aspect-ratio:'+map.sizeX+'/'+map.sizeY+';background-image:url(\''+esc(map.art)+'\');background-size:100% 100%">'+blocks+items+'</div></div><div class="dbi-gme-legacy-details">'+
    list('NPC',(map.npc||[]).map(n=>(n.label||'NPC')+' — '+Math.round(n.x)+', '+Math.round(n.y)))+
    list('Portale',(map.portals||[]).map(p=>'→ '+(legacyCatalog().maps.find(x=>x.id===p.to)?.name||p.to)+' — '+Math.round(p.x)+', '+Math.round(p.y)))+
    list('Expowisko i boss',[...(map.mobs?[map.mobs.label||'Expowisko']:[]),...(map.boss?[map.boss.label||'Boss']:[]),...(map.mobNames||[]).map(m=>'Przeciwnik: '+m.name+' (poz. '+m.level+')')])+
    list('Obiekty i kolizje',[...(map.scenery||[]).map(s=>s.label||'Obiekt na mapie'),...(map.city?[map.city.label||'Miasto']:[]),...(map.dungeon?[map.dungeon.label||'Dungeon']:[]),'Zapisanych obszarów kolizji: '+(map.blocked||[]).length])+
    '<article class="dbi-gme-legacy-box"><h4>Istniejące questy w lokacji</h4>'+(quests.length?quests.map(q=>'<button type="button" class="dbi-gme-linked-quest" data-gme-legacy-quest="'+esc(q.id)+'">📜 '+esc(q.name)+' · '+esc(q.npc)+'</button>').join(''):'<p>Brak przypisanego skryptu fabularnego w katalogu. NPC mogą mieć zwykłe rozmowy.</p>')+'</article></div></section>';
 }
 // Siatka terenu: osobna warstwa, niezależna od NPC, portali i kolizji prostokątnych.
 const npcSeries=[
 [
  "Dragon Ball i Saiyanie",
  [
   [
    "son-goku-dziecko",
    "Kiro z Doliny"
   ],
   [
    "bulma",
    "Iria Iskra"
   ],
   [
    "genialny-zolw",
    "Mistrz Przypływu"
   ],
   [
    "kuririn",
    "Brat Koral"
   ],
   [
    "yamcha",
    "Sokół Wydm"
   ],
   [
    "puar",
    "Piórek"
   ],
   [
    "oolong",
    "Kupiec Ryjek"
   ],
   [
    "lunch",
    "Mika Nitka"
   ],
   [
    "chi-chi",
    "Kapitan Lian"
   ],
   [
    "gyumao",
    "Kowal Grom"
   ],
   [
    "tenshinhan",
    "Zielony Łucznik"
   ],
   [
    "chaozu",
    "Bębniarz Tao"
   ],
   [
    "yajirobe",
    "Szermierz Jun"
   ],
   [
    "wielki-krol-piccolo",
    "Król Korzeni"
   ],
   [
    "raditz",
    "Długi Cień"
   ],
   [
    "nappa",
    "Basalt"
   ]
  ]
 ],
 [
  "Namek i przybysze z przyszłości",
  [
   [
    "son-goku",
    "Kiro Wędrowny"
   ],
   [
    "vegeta",
    "Książę Varen"
   ],
   [
    "piccolo",
    "Strażnik Oru"
   ],
   [
    "son-gohan-dziecko",
    "Młody Tavi"
   ],
   [
    "dende",
    "Zielarz Neri"
   ],
   [
    "nail",
    "Włócznik Sarn"
   ],
   [
    "zarbon",
    "Szermierz Lazur"
   ],
   [
    "dodoria",
    "Tarcza Rafy"
   ],
   [
    "kapitan-ginyu",
    "Komandor Vey"
   ],
   [
    "jeice",
    "Czerwony Goniec"
   ],
   [
    "burter",
    "Indygowy Biegacz"
   ],
   [
    "recoome",
    "Miedziany Chwyt"
   ],
   [
    "guldo",
    "Pilot Ocznik"
   ],
   [
    "freezer",
    "Cesarz Porcelany"
   ],
   [
    "krol-cold",
    "Regent Szronu"
   ],
   [
    "trunks-z-przyszlosci",
    "Podróżnik Eon"
   ]
  ]
 ],
 [
  "Androidy, Cell i Majin Buu",
  [
   [
    "doktor-gero",
    "Zegarmistrz Arel"
   ],
   [
    "android-19",
    "Pajac z Kości"
   ],
   [
    "android-16",
    "Ratownik Szesnastka"
   ],
   [
    "android-17",
    "Mechanik Nox"
   ],
   [
    "android-18",
    "Pilotka Vega"
   ],
   [
    "cell",
    "Rycerz Chityny"
   ],
   [
    "cell-junior",
    "Kobaltowy Skoczek"
   ],
   [
    "mr-satan",
    "Mistrz Estrady"
   ],
   [
    "videl",
    "Pięść Miry"
   ],
   [
    "son-goten",
    "Mały Kien"
   ],
   [
    "trunks-dziecko",
    "Lawendowy Konstruktor"
   ],
   [
    "shin",
    "Sędzia Astralny"
   ],
   [
    "kibito",
    "Odźwierny Róż"
   ],
   [
    "babidi",
    "Alchemik Bagien"
   ],
   [
    "dabura",
    "Książę Szczeliny"
   ],
   [
    "majin-buu",
    "Piekarz Obłoków"
   ]
  ]
 ],
 [
  "Dragon Ball Super i GT",
  [
   [
    "beerus",
    "Rysioł Gwiazd"
   ],
   [
    "whis",
    "Kartograf Nieba"
   ],
   [
    "champa",
    "Mistrz Herbaty"
   ],
   [
    "vados",
    "Muzykantka Wiatru"
   ],
   [
    "hit",
    "Tropiciel Umbra"
   ],
   [
    "cabba",
    "Kadet Isen"
   ],
   [
    "caulifla",
    "Zora Wichru"
   ],
   [
    "kale",
    "Strażniczka Kalei"
   ],
   [
    "jiren",
    "Marszałek Popiołu"
   ],
   [
    "toppo",
    "Szeryf Aurum"
   ],
   [
    "dyspo",
    "Goniec Uszak"
   ],
   [
    "zamasu",
    "Filozof Szafran"
   ],
   [
    "goku-black",
    "Banita z Zaćmienia"
   ],
   [
    "pan-gt",
    "Lotniczka Pina"
   ],
   [
    "baby-vegeta",
    "Chromowy Następca"
   ],
   [
    "omega-shenron",
    "Bazyliszek Północy"
   ]
  ]
 ],
 [
  "Filmy, fuzje i inne postacie",
  [
   [
    "broly",
    "Jadeitowy Wygnaniec"
   ],
   [
    "gogeta-blue",
    "Akrobata Błękitu"
   ],
   [
    "vegetto",
    "Mistrz Dwóch Ostrzy"
   ],
   [
    "bardock",
    "Weteran Pogranicza"
   ],
   [
    "cooler",
    "Admirał Pancerza"
   ],
   [
    "janemba",
    "Błazen Rozłamu"
   ],
   [
    "turles",
    "Przemytnik z Luny"
   ],
   [
    "bojack",
    "Korsarz Turkus"
   ],
   [
    "lord-slug",
    "Władca Mchu"
   ],
   [
    "tapion",
    "Bard Tapir"
   ],
   [
    "uub",
    "Uczeń Oru"
   ],
   [
    "super-android-17",
    "Chromowy Wartownik"
   ],
   [
    "pilaf",
    "Generał Modrak"
   ],
   [
    "shu",
    "Lis Zwiadowca"
   ],
   [
    "mai",
    "Major Suma"
   ],
   [
    "shenron",
    "Smok Rzecznych Gwiazd"
   ]
  ]
 ],
 [
  "Podniebny pałac i dalekie krainy",
  [
   [
    "oru-mistrz-powrotu",
    "Oru, mistrz powrotu"
   ],
   [
    "namiestnik-nimbo",
    "Namiestnik Nimbo"
   ],
   [
    "kronikarz-chmur",
    "Kronikarz Chmur"
   ],
   [
    "straznik-poludnika",
    "Strażnik Południka"
   ],
   [
    "przewoznik-eteru",
    "Przewoźnik Eteru"
   ],
   [
    "ogrodniczka-gwiazd",
    "Ogrodniczka Gwiazd"
   ],
   [
    "wieszczka-komety",
    "Wieszczka Komety"
   ],
   [
    "sowa-swiatynna",
    "Sowa Świątynna"
   ],
   [
    "budowniczka-mostow",
    "Budowniczka Mostów"
   ],
   [
    "goniec-dzwonow",
    "Goniec Dzwonów"
   ],
   [
    "koci-medrzec",
    "Koci Mędrzec"
   ],
   [
    "porcelanowy-sparingpartner",
    "Porcelanowy Sparingpartner"
   ],
   [
    "sedzia-piaskow",
    "Sędzia Piasków"
   ],
   [
    "uzdrowicielka-lotosu",
    "Uzdrowicielka Lotosu"
   ],
   [
    "badacz-grawitacji",
    "Badacz Grawitacji"
   ],
   [
    "zwiadowczyni-imperium",
    "Zwiadowczyni Imperium"
   ]
  ]
 ]
];
 const npcLibrary=npcSeries.flatMap(([series,characters])=>characters.map(([id,name])=>({
  key:'npc-'+id,name,series,group:'NPC',width:34,height:49,art:'assets/ui/map-editor/npc/'+id+'.png'
 })));
 const spaceNpcs=[
 {
  "key": "space410-vegeta",
  "art": "assets/ui/map-editor/space410/vegeta.png",
  "name": "Vegeta",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Wojownicy i imperium",
  "alias": ""
 },
 {
  "key": "space410-nappa",
  "art": "assets/ui/map-editor/space410/nappa.png",
  "name": "Nappa",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Wojownicy i imperium",
  "alias": ""
 },
 {
  "key": "space410-son-goku",
  "art": "assets/ui/map-editor/space410/son-goku.png",
  "name": "Son Goku",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Wojownicy i imperium",
  "alias": "Goku"
 },
 {
  "key": "space410-piccolo",
  "art": "assets/ui/map-editor/space410/piccolo.png",
  "name": "Piccolo",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Wojownicy i imperium",
  "alias": ""
 },
 {
  "key": "space410-freezer",
  "art": "assets/ui/map-editor/space410/freezer.png",
  "name": "Freezer",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Wojownicy i imperium",
  "alias": "Frieza"
 },
 {
  "key": "space410-bulma",
  "art": "assets/ui/map-editor/space410/bulma.png",
  "name": "Bulma",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Wojownicy i imperium",
  "alias": ""
 },
 {
  "key": "space410-son-gohan",
  "art": "assets/ui/map-editor/space410/son-gohan.png",
  "name": "Son Gohan",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Wojownicy i imperium",
  "alias": "Gohan"
 },
 {
  "key": "space410-trunks-z-przyszlosci",
  "art": "assets/ui/map-editor/space410/trunks-z-przyszlosci.png",
  "name": "Trunks z przyszłości",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Wojownicy i imperium",
  "alias": "Future Trunks"
 },
 {
  "key": "space410-kuririn",
  "art": "assets/ui/map-editor/space410/kuririn.png",
  "name": "Kuririn",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Wojownicy i imperium",
  "alias": "Krillin"
 },
 {
  "key": "space410-genialny-zolw",
  "art": "assets/ui/map-editor/space410/genialny-zolw.png",
  "name": "Genialny Żółw",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Wojownicy i imperium",
  "alias": "Roshi"
 },
 {
  "key": "space410-android-18",
  "art": "assets/ui/map-editor/space410/android-18.png",
  "name": "Android 18",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Wojownicy i imperium",
  "alias": ""
 },
 {
  "key": "space410-android-17",
  "art": "assets/ui/map-editor/space410/android-17.png",
  "name": "Android 17",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Wojownicy i imperium",
  "alias": ""
 },
 {
  "key": "space410-cell",
  "art": "assets/ui/map-editor/space410/cell.png",
  "name": "Cell",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Wojownicy i imperium",
  "alias": ""
 },
 {
  "key": "space410-majin-buu",
  "art": "assets/ui/map-editor/space410/majin-buu.png",
  "name": "Majin Buu",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Wojownicy i imperium",
  "alias": ""
 },
 {
  "key": "space410-uub-gt",
  "art": "assets/ui/map-editor/space410/uub-gt.png",
  "name": "Uub (GT)",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Wojownicy i imperium",
  "alias": "Uub GT Majuub"
 },
 {
  "key": "space410-pan-popo",
  "art": "assets/ui/map-editor/space410/pan-popo.png",
  "name": "Pan Popo",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Wojownicy i imperium",
  "alias": "Mr Popo"
 }
];
 const sagaNpcs=[
 {
  "key": "saga411-dende",
  "art": "assets/ui/map-editor/sagi/dende.png",
  "name": "Dende",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Namek i armia Freezera",
  "alias": ""
 },
 {
  "key": "saga411-nail",
  "art": "assets/ui/map-editor/sagi/nail.png",
  "name": "Nail",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Namek i armia Freezera",
  "alias": ""
 },
 {
  "key": "saga411-wielki-starszy-guru",
  "art": "assets/ui/map-editor/sagi/wielki-starszy-guru.png",
  "name": "Wielki Starszy Guru",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Namek i armia Freezera",
  "alias": "Saichoro"
 },
 {
  "key": "saga411-moori",
  "art": "assets/ui/map-editor/sagi/moori.png",
  "name": "Moori",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Namek i armia Freezera",
  "alias": ""
 },
 {
  "key": "saga411-cargo",
  "art": "assets/ui/map-editor/sagi/cargo.png",
  "name": "Cargo",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Namek i armia Freezera",
  "alias": ""
 },
 {
  "key": "saga411-zarbon",
  "art": "assets/ui/map-editor/sagi/zarbon.png",
  "name": "Zarbon",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Namek i armia Freezera",
  "alias": ""
 },
 {
  "key": "saga411-dodoria",
  "art": "assets/ui/map-editor/sagi/dodoria.png",
  "name": "Dodoria",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Namek i armia Freezera",
  "alias": ""
 },
 {
  "key": "saga411-kapitan-ginyu",
  "art": "assets/ui/map-editor/sagi/kapitan-ginyu.png",
  "name": "Kapitan Ginyu",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Namek i armia Freezera",
  "alias": "Ginyu Force"
 },
 {
  "key": "saga411-jeice",
  "art": "assets/ui/map-editor/sagi/jeice.png",
  "name": "Jeice",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Namek i armia Freezera",
  "alias": ""
 },
 {
  "key": "saga411-burter",
  "art": "assets/ui/map-editor/sagi/burter.png",
  "name": "Burter",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Namek i armia Freezera",
  "alias": ""
 },
 {
  "key": "saga411-recoome",
  "art": "assets/ui/map-editor/sagi/recoome.png",
  "name": "Recoome",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Namek i armia Freezera",
  "alias": ""
 },
 {
  "key": "saga411-guldo",
  "art": "assets/ui/map-editor/sagi/guldo.png",
  "name": "Guldo",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Namek i armia Freezera",
  "alias": ""
 },
 {
  "key": "saga411-krol-cold",
  "art": "assets/ui/map-editor/sagi/krol-cold.png",
  "name": "Król Cold",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Namek i armia Freezera",
  "alias": "King Cold"
 },
 {
  "key": "saga411-freezer-pierwsza-forma",
  "art": "assets/ui/map-editor/sagi/freezer-pierwsza-forma.png",
  "name": "Freezer (pierwsza forma)",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Namek i armia Freezera",
  "alias": ""
 },
 {
  "key": "saga411-porunga",
  "art": "assets/ui/map-editor/sagi/porunga.png",
  "name": "Porunga",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Namek i armia Freezera",
  "alias": ""
 },
 {
  "key": "saga411-shenron",
  "art": "assets/ui/map-editor/sagi/shenron.png",
  "name": "Shenron",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Namek i armia Freezera",
  "alias": ""
 },
 {
  "key": "saga411-son-goku-dziecko",
  "art": "assets/ui/map-editor/sagi/son-goku-dziecko.png",
  "name": "Son Goku (dziecko)",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Pierwsze wyprawy",
  "alias": ""
 },
 {
  "key": "saga411-yamcha",
  "art": "assets/ui/map-editor/sagi/yamcha.png",
  "name": "Yamcha",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Pierwsze wyprawy",
  "alias": ""
 },
 {
  "key": "saga411-tenshinhan",
  "art": "assets/ui/map-editor/sagi/tenshinhan.png",
  "name": "Tenshinhan",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Pierwsze wyprawy",
  "alias": "Tien"
 },
 {
  "key": "saga411-chaozu",
  "art": "assets/ui/map-editor/sagi/chaozu.png",
  "name": "Chaozu",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Pierwsze wyprawy",
  "alias": "Chiaotzu"
 },
 {
  "key": "saga411-puar",
  "art": "assets/ui/map-editor/sagi/puar.png",
  "name": "Puar",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Pierwsze wyprawy",
  "alias": ""
 },
 {
  "key": "saga411-oolong",
  "art": "assets/ui/map-editor/sagi/oolong.png",
  "name": "Oolong",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Pierwsze wyprawy",
  "alias": ""
 },
 {
  "key": "saga411-lunch",
  "art": "assets/ui/map-editor/sagi/lunch.png",
  "name": "Lunch",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Pierwsze wyprawy",
  "alias": "Launch"
 },
 {
  "key": "saga411-chi-chi",
  "art": "assets/ui/map-editor/sagi/chi-chi.png",
  "name": "Chi-Chi",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Pierwsze wyprawy",
  "alias": ""
 },
 {
  "key": "saga411-gyumao",
  "art": "assets/ui/map-editor/sagi/gyumao.png",
  "name": "Gyūmaō",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Pierwsze wyprawy",
  "alias": "Ox King"
 },
 {
  "key": "saga411-yajirobe",
  "art": "assets/ui/map-editor/sagi/yajirobe.png",
  "name": "Yajirobe",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Pierwsze wyprawy",
  "alias": ""
 },
 {
  "key": "saga411-karin",
  "art": "assets/ui/map-editor/sagi/karin.png",
  "name": "Karin",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Pierwsze wyprawy",
  "alias": "Korin"
 },
 {
  "key": "saga411-wszechmogacy",
  "art": "assets/ui/map-editor/sagi/wszechmogacy.png",
  "name": "Wszechmogący",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Pierwsze wyprawy",
  "alias": "Kami"
 },
 {
  "key": "saga411-wielki-krol-piccolo",
  "art": "assets/ui/map-editor/sagi/wielki-krol-piccolo.png",
  "name": "Wielki Król Piccolo",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Pierwsze wyprawy",
  "alias": ""
 },
 {
  "key": "saga411-tao-pai-pai",
  "art": "assets/ui/map-editor/sagi/tao-pai-pai.png",
  "name": "Tao Pai Pai",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Pierwsze wyprawy",
  "alias": ""
 },
 {
  "key": "saga411-pilaf",
  "art": "assets/ui/map-editor/sagi/pilaf.png",
  "name": "Pilaf",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Pierwsze wyprawy",
  "alias": ""
 },
 {
  "key": "saga411-mistrz-zuraw",
  "art": "assets/ui/map-editor/sagi/mistrz-zuraw.png",
  "name": "Mistrz Żuraw",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Pierwsze wyprawy",
  "alias": ""
 },
 {
  "key": "saga411-raditz",
  "art": "assets/ui/map-editor/sagi/raditz.png",
  "name": "Raditz",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Saiyanie, androidy i Buu",
  "alias": ""
 },
 {
  "key": "saga411-bardock",
  "art": "assets/ui/map-editor/sagi/bardock.png",
  "name": "Bardock",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Saiyanie, androidy i Buu",
  "alias": ""
 },
 {
  "key": "saga411-krol-vegeta",
  "art": "assets/ui/map-editor/sagi/krol-vegeta.png",
  "name": "Król Vegeta",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Saiyanie, androidy i Buu",
  "alias": ""
 },
 {
  "key": "saga411-son-goten",
  "art": "assets/ui/map-editor/sagi/son-goten.png",
  "name": "Son Goten",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Saiyanie, androidy i Buu",
  "alias": ""
 },
 {
  "key": "saga411-trunks-dziecko",
  "art": "assets/ui/map-editor/sagi/trunks-dziecko.png",
  "name": "Trunks (dziecko)",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Saiyanie, androidy i Buu",
  "alias": ""
 },
 {
  "key": "saga411-gotenks",
  "art": "assets/ui/map-editor/sagi/gotenks.png",
  "name": "Gotenks",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Saiyanie, androidy i Buu",
  "alias": ""
 },
 {
  "key": "saga411-vegetto",
  "art": "assets/ui/map-editor/sagi/vegetto.png",
  "name": "Vegetto",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Saiyanie, androidy i Buu",
  "alias": "Vegito"
 },
 {
  "key": "saga411-gogeta",
  "art": "assets/ui/map-editor/sagi/gogeta.png",
  "name": "Gogeta",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Saiyanie, androidy i Buu",
  "alias": ""
 },
 {
  "key": "saga411-mr-satan",
  "art": "assets/ui/map-editor/sagi/mr-satan.png",
  "name": "Mr. Satan",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Saiyanie, androidy i Buu",
  "alias": ""
 },
 {
  "key": "saga411-videl",
  "art": "assets/ui/map-editor/sagi/videl.png",
  "name": "Videl",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Saiyanie, androidy i Buu",
  "alias": ""
 },
 {
  "key": "saga411-doktor-gero",
  "art": "assets/ui/map-editor/sagi/doktor-gero.png",
  "name": "Doktor Gero",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Saiyanie, androidy i Buu",
  "alias": ""
 },
 {
  "key": "saga411-android-19",
  "art": "assets/ui/map-editor/sagi/android-19.png",
  "name": "Android 19",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Saiyanie, androidy i Buu",
  "alias": ""
 },
 {
  "key": "saga411-android-16",
  "art": "assets/ui/map-editor/sagi/android-16.png",
  "name": "Android 16",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Saiyanie, androidy i Buu",
  "alias": ""
 },
 {
  "key": "saga411-cell-junior",
  "art": "assets/ui/map-editor/sagi/cell-junior.png",
  "name": "Cell Junior",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Saiyanie, androidy i Buu",
  "alias": ""
 },
 {
  "key": "saga411-dabura",
  "art": "assets/ui/map-editor/sagi/dabura.png",
  "name": "Dabura",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Saiyanie, androidy i Buu",
  "alias": ""
 },
 {
  "key": "saga411-kid-buu",
  "art": "assets/ui/map-editor/sagi/kid-buu.png",
  "name": "Kid Buu",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Saiyanie, androidy i Buu",
  "alias": ""
 },
 {
  "key": "saga411-beerus",
  "art": "assets/ui/map-editor/sagi/beerus.png",
  "name": "Beerus",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Dragon Ball Super",
  "alias": ""
 },
 {
  "key": "saga411-whis",
  "art": "assets/ui/map-editor/sagi/whis.png",
  "name": "Whis",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Dragon Ball Super",
  "alias": ""
 },
 {
  "key": "saga411-champa",
  "art": "assets/ui/map-editor/sagi/champa.png",
  "name": "Champa",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Dragon Ball Super",
  "alias": ""
 },
 {
  "key": "saga411-vados",
  "art": "assets/ui/map-editor/sagi/vados.png",
  "name": "Vados",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Dragon Ball Super",
  "alias": ""
 },
 {
  "key": "saga411-jiren",
  "art": "assets/ui/map-editor/sagi/jiren.png",
  "name": "Jiren",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Dragon Ball Super",
  "alias": ""
 },
 {
  "key": "saga411-toppo",
  "art": "assets/ui/map-editor/sagi/toppo.png",
  "name": "Toppo",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Dragon Ball Super",
  "alias": ""
 },
 {
  "key": "saga411-dyspo",
  "art": "assets/ui/map-editor/sagi/dyspo.png",
  "name": "Dyspo",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Dragon Ball Super",
  "alias": ""
 },
 {
  "key": "saga411-hit",
  "art": "assets/ui/map-editor/sagi/hit.png",
  "name": "Hit",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Dragon Ball Super",
  "alias": ""
 },
 {
  "key": "saga411-cabba",
  "art": "assets/ui/map-editor/sagi/cabba.png",
  "name": "Cabba",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Dragon Ball Super",
  "alias": ""
 },
 {
  "key": "saga411-caulifla",
  "art": "assets/ui/map-editor/sagi/caulifla.png",
  "name": "Caulifla",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Dragon Ball Super",
  "alias": ""
 },
 {
  "key": "saga411-kale",
  "art": "assets/ui/map-editor/sagi/kale.png",
  "name": "Kale",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Dragon Ball Super",
  "alias": ""
 },
 {
  "key": "saga411-kefla",
  "art": "assets/ui/map-editor/sagi/kefla.png",
  "name": "Kefla",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Dragon Ball Super",
  "alias": ""
 },
 {
  "key": "saga411-zamasu",
  "art": "assets/ui/map-editor/sagi/zamasu.png",
  "name": "Zamasu",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Dragon Ball Super",
  "alias": ""
 },
 {
  "key": "saga411-goku-black",
  "art": "assets/ui/map-editor/sagi/goku-black.png",
  "name": "Goku Black",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Dragon Ball Super",
  "alias": ""
 },
 {
  "key": "saga411-zeno",
  "art": "assets/ui/map-editor/sagi/zeno.png",
  "name": "Zen’ō",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Dragon Ball Super",
  "alias": "Zeno"
 },
 {
  "key": "saga411-wielki-kaplan",
  "art": "assets/ui/map-editor/sagi/wielki-kaplan.png",
  "name": "Wielki Kapłan",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "Dragon Ball Super",
  "alias": "Daishinkan Grand Priest"
 },
 {
  "key": "saga411-pan-gt",
  "art": "assets/ui/map-editor/sagi/pan-gt.png",
  "name": "Pan (GT)",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "GT i filmy",
  "alias": ""
 },
 {
  "key": "saga411-giru",
  "art": "assets/ui/map-editor/sagi/giru.png",
  "name": "Giru",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "GT i filmy",
  "alias": ""
 },
 {
  "key": "saga411-baby-vegeta",
  "art": "assets/ui/map-editor/sagi/baby-vegeta.png",
  "name": "Baby Vegeta",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "GT i filmy",
  "alias": ""
 },
 {
  "key": "saga411-super-android-17",
  "art": "assets/ui/map-editor/sagi/super-android-17.png",
  "name": "Super Android 17",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "GT i filmy",
  "alias": ""
 },
 {
  "key": "saga411-omega-shenron",
  "art": "assets/ui/map-editor/sagi/omega-shenron.png",
  "name": "Omega Shenron",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "GT i filmy",
  "alias": ""
 },
 {
  "key": "saga411-nuova-shenron",
  "art": "assets/ui/map-editor/sagi/nuova-shenron.png",
  "name": "Nuova Shenron",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "GT i filmy",
  "alias": ""
 },
 {
  "key": "saga411-eis-shenron",
  "art": "assets/ui/map-editor/sagi/eis-shenron.png",
  "name": "Eis Shenron",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "GT i filmy",
  "alias": ""
 },
 {
  "key": "saga411-syn-shenron",
  "art": "assets/ui/map-editor/sagi/syn-shenron.png",
  "name": "Syn Shenron",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "GT i filmy",
  "alias": ""
 },
 {
  "key": "saga411-broly",
  "art": "assets/ui/map-editor/sagi/broly.png",
  "name": "Broly",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "GT i filmy",
  "alias": ""
 },
 {
  "key": "saga411-cooler",
  "art": "assets/ui/map-editor/sagi/cooler.png",
  "name": "Cooler",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "GT i filmy",
  "alias": ""
 },
 {
  "key": "saga411-janemba",
  "art": "assets/ui/map-editor/sagi/janemba.png",
  "name": "Janemba",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "GT i filmy",
  "alias": ""
 },
 {
  "key": "saga411-bojack",
  "art": "assets/ui/map-editor/sagi/bojack.png",
  "name": "Bojack",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "GT i filmy",
  "alias": ""
 },
 {
  "key": "saga411-turles",
  "art": "assets/ui/map-editor/sagi/turles.png",
  "name": "Turles",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "GT i filmy",
  "alias": ""
 },
 {
  "key": "saga411-lord-slug",
  "art": "assets/ui/map-editor/sagi/lord-slug.png",
  "name": "Lord Slug",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "GT i filmy",
  "alias": ""
 },
 {
  "key": "saga411-tapion",
  "art": "assets/ui/map-editor/sagi/tapion.png",
  "name": "Tapion",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "GT i filmy",
  "alias": ""
 },
 {
  "key": "saga411-hirudegarn",
  "art": "assets/ui/map-editor/sagi/hirudegarn.png",
  "name": "Hirudegarn",
  "group": "NPC",
  "width": 34,
  "height": 49,
  "series": "GT i filmy",
  "alias": ""
 },
 {
  "key": "saga411-son-goku-super-saiyan",
  "art": "assets/ui/map-editor/sagi/son-goku-super-saiyan.png",
  "name": "Son Goku (Super Saiyan)",
  "group": "NPC",
  "series": "Formy wojowników",
  "alias": "SSJ SSJ1",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-son-goku-super-saiyan-3",
  "art": "assets/ui/map-editor/sagi/son-goku-super-saiyan-3.png",
  "name": "Son Goku (Super Saiyan 3)",
  "group": "NPC",
  "series": "Formy wojowników",
  "alias": "SSJ3",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-son-goku-super-saiyan-god",
  "art": "assets/ui/map-editor/sagi/son-goku-super-saiyan-god.png",
  "name": "Son Goku (Super Saiyan God)",
  "group": "NPC",
  "series": "Formy wojowników",
  "alias": "SSG",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-son-goku-super-saiyan-blue",
  "art": "assets/ui/map-editor/sagi/son-goku-super-saiyan-blue.png",
  "name": "Son Goku (Super Saiyan Blue)",
  "group": "NPC",
  "series": "Formy wojowników",
  "alias": "SSB",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-son-goku-ultra-instynkt",
  "art": "assets/ui/map-editor/sagi/son-goku-ultra-instynkt.png",
  "name": "Son Goku (Ultra Instynkt)",
  "group": "NPC",
  "series": "Formy wojowników",
  "alias": "Ultra Instinct UI",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-son-goku-super-saiyan-4",
  "art": "assets/ui/map-editor/sagi/son-goku-super-saiyan-4.png",
  "name": "Son Goku (Super Saiyan 4)",
  "group": "NPC",
  "series": "Formy wojowników",
  "alias": "SSJ4",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-majin-vegeta",
  "art": "assets/ui/map-editor/sagi/majin-vegeta.png",
  "name": "Majin Vegeta",
  "group": "NPC",
  "series": "Formy wojowników",
  "alias": "Majin",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-vegeta-super-saiyan-blue",
  "art": "assets/ui/map-editor/sagi/vegeta-super-saiyan-blue.png",
  "name": "Vegeta (Super Saiyan Blue)",
  "group": "NPC",
  "series": "Formy wojowników",
  "alias": "SSB",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-vegeta-super-saiyan-4",
  "art": "assets/ui/map-editor/sagi/vegeta-super-saiyan-4.png",
  "name": "Vegeta (Super Saiyan 4)",
  "group": "NPC",
  "series": "Formy wojowników",
  "alias": "SSJ4",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-son-gohan-super-saiyan-2",
  "art": "assets/ui/map-editor/sagi/son-gohan-super-saiyan-2.png",
  "name": "Son Gohan (Super Saiyan 2)",
  "group": "NPC",
  "series": "Formy wojowników",
  "alias": "SSJ2",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-son-gohan-beast",
  "art": "assets/ui/map-editor/sagi/son-gohan-beast.png",
  "name": "Son Gohan (Beast)",
  "group": "NPC",
  "series": "Formy wojowników",
  "alias": "Beast",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-orange-piccolo",
  "art": "assets/ui/map-editor/sagi/orange-piccolo.png",
  "name": "Orange Piccolo",
  "group": "NPC",
  "series": "Formy wojowników",
  "alias": "Pomarańczowy",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-golden-freezer",
  "art": "assets/ui/map-editor/sagi/golden-freezer.png",
  "name": "Golden Freezer",
  "group": "NPC",
  "series": "Formy wojowników",
  "alias": "Golden Frieza",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-metal-cooler",
  "art": "assets/ui/map-editor/sagi/metal-cooler.png",
  "name": "Metal Cooler",
  "group": "NPC",
  "series": "Formy wojowników",
  "alias": "Meta Cooler",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-super-buu",
  "art": "assets/ui/map-editor/sagi/super-buu.png",
  "name": "Super Buu",
  "group": "NPC",
  "series": "Formy wojowników",
  "alias": "Buu",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-scalony-zamasu",
  "art": "assets/ui/map-editor/sagi/scalony-zamasu.png",
  "name": "Scalony Zamasu",
  "group": "NPC",
  "series": "Formy wojowników",
  "alias": "Fused Zamasu",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-krol-kai",
  "art": "assets/ui/map-editor/sagi/krol-kai.png",
  "name": "Król Kai",
  "group": "NPC",
  "series": "Zaświaty i Ziemia",
  "alias": "King Kai",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-bubbles",
  "art": "assets/ui/map-editor/sagi/bubbles.png",
  "name": "Bubbles",
  "group": "NPC",
  "series": "Zaświaty i Ziemia",
  "alias": "",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-gregory",
  "art": "assets/ui/map-editor/sagi/gregory.png",
  "name": "Gregory",
  "group": "NPC",
  "series": "Zaświaty i Ziemia",
  "alias": "",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-krol-enma",
  "art": "assets/ui/map-editor/sagi/krol-enma.png",
  "name": "Król Enma",
  "group": "NPC",
  "series": "Zaświaty i Ziemia",
  "alias": "King Yemma",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-stary-kaioshin",
  "art": "assets/ui/map-editor/sagi/stary-kaioshin.png",
  "name": "Stary Kaiōshin",
  "group": "NPC",
  "series": "Zaświaty i Ziemia",
  "alias": "",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-shin",
  "art": "assets/ui/map-editor/sagi/shin.png",
  "name": "Shin",
  "group": "NPC",
  "series": "Zaświaty i Ziemia",
  "alias": "",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-kibito",
  "art": "assets/ui/map-editor/sagi/kibito.png",
  "name": "Kibito",
  "group": "NPC",
  "series": "Zaświaty i Ziemia",
  "alias": "",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-kibitoshin",
  "art": "assets/ui/map-editor/sagi/kibitoshin.png",
  "name": "Kibitoshin",
  "group": "NPC",
  "series": "Zaświaty i Ziemia",
  "alias": "",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-babidi",
  "art": "assets/ui/map-editor/sagi/babidi.png",
  "name": "Babidi",
  "group": "NPC",
  "series": "Zaświaty i Ziemia",
  "alias": "",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-paikuhan",
  "art": "assets/ui/map-editor/sagi/paikuhan.png",
  "name": "Paikūhan",
  "group": "NPC",
  "series": "Zaświaty i Ziemia",
  "alias": "Pikkon",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-android-8",
  "art": "assets/ui/map-editor/sagi/android-8.png",
  "name": "Android 8",
  "group": "NPC",
  "series": "Zaświaty i Ziemia",
  "alias": "",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-general-blue",
  "art": "assets/ui/map-editor/sagi/general-blue.png",
  "name": "Generał Blue",
  "group": "NPC",
  "series": "Zaświaty i Ziemia",
  "alias": "",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-komandor-red",
  "art": "assets/ui/map-editor/sagi/komandor-red.png",
  "name": "Komandor Red",
  "group": "NPC",
  "series": "Zaświaty i Ziemia",
  "alias": "",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-oficer-black",
  "art": "assets/ui/map-editor/sagi/oficer-black.png",
  "name": "Oficer Black",
  "group": "NPC",
  "series": "Zaświaty i Ziemia",
  "alias": "",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-jaco",
  "art": "assets/ui/map-editor/sagi/jaco.png",
  "name": "Jaco",
  "group": "NPC",
  "series": "Zaświaty i Ziemia",
  "alias": "",
  "width": 34,
  "height": 49
 },
 {
  "key": "saga411-monaka",
  "art": "assets/ui/map-editor/sagi/monaka.png",
  "name": "Monaka",
  "group": "NPC",
  "series": "Zaświaty i Ziemia",
  "alias": "",
  "width": 34,
  "height": 49
 }

];
 const npcAliases={'npc-genialny-zolw':'Roshi Kame Sennin','npc-kuririn':'Krillin','npc-lunch':'Launch','npc-tenshinhan':'Tien','npc-chaozu':'Chiaotzu','npc-freezer':'Frieza Freeza','npc-vegetto':'Vegito','npc-mr-satan':'Herkules Hercule','npc-gyumao':'Ox King','npc-cell':'Komórczak Komorczak','npc-wielki-krol-piccolo':'Piccolo Daimao Szatan Serduszko','npc-shin':'Kaioshin'};
 const inspirationAliases={
 "npc-son-goku-dziecko": "Son Goku (dziecko)",
 "npc-bulma": "Bulma",
 "npc-genialny-zolw": "Genialny Żółw",
 "npc-kuririn": "Kuririn",
 "npc-yamcha": "Yamcha",
 "npc-puar": "Puar",
 "npc-oolong": "Oolong",
 "npc-lunch": "Lunch",
 "npc-chi-chi": "Chi-Chi",
 "npc-gyumao": "Gyūmaō",
 "npc-tenshinhan": "Tenshinhan",
 "npc-chaozu": "Chaozu",
 "npc-yajirobe": "Yajirobe",
 "npc-wielki-krol-piccolo": "Wielki Król Piccolo",
 "npc-raditz": "Raditz",
 "npc-nappa": "Nappa",
 "npc-son-goku": "Son Goku",
 "npc-vegeta": "Vegeta",
 "npc-piccolo": "Piccolo",
 "npc-son-gohan-dziecko": "Son Gohan (dziecko)",
 "npc-dende": "Dende",
 "npc-nail": "Nail",
 "npc-zarbon": "Zarbon",
 "npc-dodoria": "Dodoria",
 "npc-kapitan-ginyu": "Kapitan Ginyu",
 "npc-jeice": "Jeice",
 "npc-burter": "Burter",
 "npc-recoome": "Recoome",
 "npc-guldo": "Guldo",
 "npc-freezer": "Freezer",
 "npc-krol-cold": "Król Cold",
 "npc-trunks-z-przyszlosci": "Trunks z przyszłości",
 "npc-doktor-gero": "Doktor Gero",
 "npc-android-19": "Android 19",
 "npc-android-16": "Android 16",
 "npc-android-17": "Android 17",
 "npc-android-18": "Android 18",
 "npc-cell": "Cell",
 "npc-cell-junior": "Cell Junior",
 "npc-mr-satan": "Mr. Satan",
 "npc-videl": "Videl",
 "npc-son-goten": "Son Goten",
 "npc-trunks-dziecko": "Trunks (dziecko)",
 "npc-shin": "Shin",
 "npc-kibito": "Kibito",
 "npc-babidi": "Babidi",
 "npc-dabura": "Dabura",
 "npc-majin-buu": "Majin Buu",
 "npc-beerus": "Beerus",
 "npc-whis": "Whis",
 "npc-champa": "Champa",
 "npc-vados": "Vados",
 "npc-hit": "Hit",
 "npc-cabba": "Cabba",
 "npc-caulifla": "Caulifla",
 "npc-kale": "Kale",
 "npc-jiren": "Jiren",
 "npc-toppo": "Toppo",
 "npc-dyspo": "Dyspo",
 "npc-zamasu": "Zamasu",
 "npc-goku-black": "Goku Black",
 "npc-pan-gt": "Pan (GT)",
 "npc-baby-vegeta": "Baby Vegeta",
 "npc-omega-shenron": "Omega Shenron",
 "npc-broly": "Broly",
 "npc-gogeta-blue": "Gogeta (Blue)",
 "npc-vegetto": "Vegetto",
 "npc-bardock": "Bardock",
 "npc-cooler": "Cooler",
 "npc-janemba": "Janemba",
 "npc-turles": "Turles",
 "npc-bojack": "Bojack",
 "npc-lord-slug": "Lord Slug",
 "npc-tapion": "Tapion",
 "npc-uub": "Uub",
 "npc-super-android-17": "Super Android 17",
 "npc-pilaf": "Pilaf",
 "npc-shu": "Shu",
 "npc-mai": "Mai",
 "npc-shenron": "Shenron",
 "npc-oru-mistrz-powrotu": "Uub GT Majuub Oob dorosły",
 "npc-namiestnik-nimbo": "Pan Popo Mr Popo Mister Popo sługa pałacu wszechmogącego",
 "npc-kronikarz-chmur": "Kronikarz Chmur",
 "npc-straznik-poludnika": "Strażnik Południka",
 "npc-przewoznik-eteru": "Przewoźnik Eteru",
 "npc-ogrodniczka-gwiazd": "Ogrodniczka Gwiazd",
 "npc-wieszczka-komety": "Wieszczka Komety",
 "npc-sowa-swiatynna": "Sowa Świątynna",
 "npc-budowniczka-mostow": "Budowniczka Mostów",
 "npc-goniec-dzwonow": "Goniec Dzwonów",
 "npc-koci-medrzec": "Koci Mędrzec",
 "npc-porcelanowy-sparingpartner": "Porcelanowy Sparingpartner",
 "npc-sedzia-piaskow": "Sędzia Piasków",
 "npc-uzdrowicielka-lotosu": "Uzdrowicielka Lotosu",
 "npc-badacz-grawitacji": "Badacz Grawitacji",
 "npc-zwiadowczyni-imperium": "Zwiadowczyni Imperium"
};
 const searchable=text=>String(text).toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l');
 function libraryCards(entries,group){
  const needle=searchable(state.npcSearch||'').trim();
  const propNeedle=searchable(state.propSearch||'').trim();
  const matches=entries.filter(p=>(group!=='NPC'&&propNeedle?p.group!=='NPC'&&searchable(p.name+' '+(p.group||'')).includes(propNeedle):(p.group||'Podstawowe')===group)&&(group!=='NPC'||((!state.npcSeries||(p.series||'Postacie świata gry')===state.npcSeries)&&searchable(p.name+' '+(p.alias||'')+' '+(npcAliases[p.key]||'')+' '+(inspirationAliases[p.key]||'')).includes(needle))));
  return matches.map(p=>'<button type="button" data-gme-prop="'+esc(p.key)+'" class="'+(state.propKey===p.key?'active':'')+'"><img loading="lazy" src="'+esc(p.src||p.art)+'" alt=""><span>'+esc(p.name)+'</span></button>').join('')||'<p>Brak wyników.</p>';
 }
 function npcFilters(){return '<label>Saga lub grupa <select data-npc-series><option value="">Wszystkie</option>'+[...new Set(library().filter(p=>p.group==='NPC').map(p=>p.series||'Postacie świata gry'))].map(name=>'<option '+(state.npcSeries===name?'selected':'')+'>'+esc(name)+'</option>').join('')+'</select></label> <label>Szukaj NPC <input type="search" data-npc-search value="'+esc(state.npcSearch||'')+'" placeholder="Nazwa postaci"></label>'}
 function library(){return [...terrain.props,...sagaNpcs,...spaceNpcs,...npcLibrary,...(state.pack.customArt||[])]}
 function hasNpcImage(n){return !!n.art&&(validAsset.test(n.art)||spriteUrl(n.art)!==n.art)}
 function spriteUrl(key){return state.pack.customArt?.find(p=>p.key===key)?.src||key}
 function propView(){
  const entries=library(),group=state.propGroup||'Podstawowe',groups=[...new Set(entries.map(p=>p.group||'Podstawowe'))];
  const cards=libraryCards(entries,group);
  return '<details class="dbi-gme-prop-library" '+(state.libraryOpen?'open':'')+'><summary>Biblioteka obiektów i NPC ('+entries.length+')</summary><label>Zestaw <select data-prop-group>'+groups.map(g=>'<option '+(g===group?'selected':'')+'>'+esc(g)+'</option>').join('')+'</select></label>'+(group==='NPC'?npcFilters():'<label>Szukaj obiektu we wszystkich zestawach <input type="search" data-prop-search value="'+esc(state.propSearch||'')+'"></label>')+'<div class="dbi-gme-prop-grid">'+cards+'</div><label>Nazwa własnego zestawu <input data-set-name maxlength="40" placeholder="Moje dekoracje"></label> <label>Rodzaj grafiki <select data-art-kind><option value="prop">Dekoracja</option><option value="npc">NPC do questów</option></select></label> <label>Dodaj grafiki <input type="file" multiple accept="image/png,image/jpeg,image/webp" data-art-import></label></details>'
 }
 async function importArt(input){
  const session=state,pack=session.pack,files=Array.from(input.files);
  const npcMode=session.root.querySelector('[data-art-kind]')?.value==='npc';
  const group='Własne · '+(session.root.querySelector('[data-set-name]').value.trim()||'Moje dekoracje');
  const pending=[];
  try{
   for(const file of files){
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8000000)throw Error('Wybierz PNG, JPEG lub WebP do 8 MB.');
    const bitmap=await createImageBitmap(file);
    const scale=Math.min(1,384/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    const key='user-'+crypto.randomUUID(),src=canvas.toDataURL('image/webp',.88);
    pending.push({key,art:key,name:file.name.replace(/\.[^.]+$/,''),group:npcMode?'NPC':group,...(npcMode?{series:group}:{}),src,width:Math.max(1,Math.round(canvas.width/3)),height:Math.max(1,Math.round(canvas.height/3))});
   }
   if(state!==session||state.pack!==pack||!pending.length)return;
   const proposed=[...(pack.customArt||[]),...pending];
   if(proposed.length>200||JSON.stringify(proposed).length>1500000)throw Error('Zestawy przekraczają limit 200 grafik lub 1,5 MB.');
   const old=pack.customArt;pack.customArt=proposed;
   if(!saveDraft()){pack.customArt=old;return}
   state.propGroup=npcMode?'NPC':group;if(npcMode){state.npcSeries=group;state.npcSearch=''}state.libraryOpen=true;draw();setStatus('Dodano grafiki: '+pending.length);
  }catch(error){setStatus('Import grafiki: '+error.message)}
 }
 const tileTools=new Set(['tile-height','tile-brush','tile-erase','tile-fill','tile-rect','tile-pick']);
 function tileView(map){
  const brush=state.tileBrush??0,size=state.tileSize||1,s=terrain.settings(map);
  const options=(attr,values,active)=>'<select '+attr+'>'+values.map(([id,label])=>'<option value="'+id+'" '+(String(id)===String(active)?'selected':'')+'>'+label+'</option>').join('')+'</select>';
  const visualSelect=(key,values)=>options('data-terrain-visual="'+key+'"',values,s[key]);
  const palette=terrain.groups.map(group=>{const [g1,g2,title]=group;return '<details class="dbi-gme-material-group" '+((state.materialGroup??terrain.palette[brush]?.group)===g1||(state.materialGroup??terrain.palette[brush]?.group)===g2?'open':'')+'><summary>'+esc(title)+'</summary><div class="dbi-gme-tile-palette">'+terrain.palette.filter(t=>t.group===g1||t.group===g2).map(t=>{const hd=s.enabled&&terrain.hdSwatch(t.id),pos=hd||terrain.swatch(t.id);return '<button type="button" data-gme-palette="'+t.id+'" class="dbi-gme-tile-choice '+(brush===t.id?'active':'')+'" title="'+esc(t.name)+(t.blocked?' — nieprzechodnie':' — przechodnie')+'"><span class="dbi-gme-tile-swatch" style="background-image:url(assets/ui/map-editor/'+(hd?'terrain-v452.webp':'terrain-v411.png')+');background-size:'+(hd?'6400% 8000%':'800% 5200%')+';background-position:'+pos.x+'% '+pos.y+'%"></span><span>'+esc(t.name)+'</span>'+(t.blocked?'<small>⛔</small>':'')+'</button>'}).join('')+'</div></details>'}).join('');
  return '<div class="dbi-gme-terrain-panel"><div class="dbi-gme-terrain-heading"><strong>🎨 Budowanie terenu</strong><span>Mapa kafelkowa · '+map.sizeX+' × '+map.sizeY+'</span></div>'+
   '<div class="dbi-gme-terrain-toolbar">'+[['tile-height','Wysokość'],['tile-brush','🖌 Pędzel'],['tile-erase','⌫ Gumka'],['tile-fill','▣ Wypełnij'],['tile-rect','▭ Prostokąt'],['tile-pick','◎ Pipeta']].map(([id,label])=>'<button type="button" data-gme-tool="'+id+'" class="'+(state.tool===id?'active':'')+'">'+label+'</button>').join('')+
   '<label>Poziom wysokości <select data-height>'+[0,1,2,3,4].map(n=>'<option '+(n===(state.height??1)?'selected':'')+'>'+n+'</option>').join('')+'</select></label>'+
   '<label class="dbi-gme-terrain-size">Rozmiar pędzla <select data-gme-brush-size>'+[1,2,3,5,7,9].map(n=>'<option value="'+n+'" '+(size===n?'selected':'')+'>'+n+' × '+n+'</option>').join('')+'</select></label>'+
   '<button type="button" data-gme-command="tile-undo" '+(!state.undo?.length?'disabled':'')+'>↶ Cofnij</button><button type="button" data-gme-command="tile-redo" '+(!state.redo?.length?'disabled':'')+'>↷ Ponów</button>'+
   '<label class="dbi-gme-grid-toggle"><input type="checkbox" data-gme-grid '+(state.showGrid?'checked':'')+'> Siatka</label></div>'+
   '<div class="dbi-gme-inline" style="margin:8px 0;flex-wrap:wrap"><label>Kształt pędzla '+options('data-terrain-brush',[['square','Kwadrat'],['round','Okrąg'],['organic','Organiczny'],['soft','Miękki / rozproszony']],state.brushShape||'organic')+'</label><label><input type="checkbox" data-terrain-visual="enabled" '+(s.enabled?'checked':'')+'> Teren HD</label><label><input type="checkbox" data-terrain-visual="transitions" '+(s.transitions?'checked':'')+'> Automatyczne przejścia</label></div><div class="dbi-gme-inline" style="flex-wrap:wrap"><label>Twardość '+visualSelect('hardness',[[0,'Bardzo miękka'],[1,'Naturalna'],[2,'Wyraźna'],[3,'Twarda']])+'</label><label>Organiczność '+visualSelect('organic',[[0,'Równa'],[1,'Lekka'],[2,'Naturalna'],[3,'Duża']])+'</label><label>Zróżnicowanie tonów '+visualSelect('variation',[[0,'Bez dodatkowych tonów'],[1,'Małe'],[2,'Średnie'],[3,'Duże']])+'</label><label>Detale '+visualSelect('details',[[0,'Wyłączone'],[1,'Subtelne'],[2,'Średnie'],[3,'Gęste']])+'</label></div>'+
   '<div class="dbi-gme-materials">'+palette+'</div><p>80 materiałów · 65 tekstur HD z ciągłymi wariantami. Teren HD zmienia wyłącznie wygląd, nie kolizje. Przejścia i detale są zapisywane dla mapy. Gumka przywraca trawę; prostokąt i wypełnienie pozostają dokładne.</p></div>';
 }
 function ensureHistory(){state.undo??=[];state.redo??=[]}
 function historySnapshot(){const m=currentMap();if(!m?.terrain)return;ensureHistory();state.undo.push(clone(m.terrain));if(state.undo.length>35)state.undo.shift();state.redo.length=0}
 function applyHistory(reverse){const m=currentMap();if(!m?.terrain)return;ensureHistory();const source=reverse?state.undo:state.redo,dest=reverse?state.redo:state.undo;if(!source.length)return;dest.push(clone(m.terrain));m.terrain=source.pop();saveDraft();draw()}
 function brushIncludes(map,x,y,c,r,size,shape=state.brushShape||'organic'){
  if(size===1||shape==='square'||state.tool==='tile-height'||state.tool==='tile-rect')return true;
  const half=Math.floor((size-1)/2),center=(size-1)/2-half,dx=x-c-center,dy=y-r-center,dist=Math.hypot(dx,dy),radius=size/2;
  if(shape==='round')return dist<=radius+.12;
  const s=terrain.settings(map),h=(((Math.imul(x+217,73856093)^Math.imul(y+931,19349663)^Math.imul(c+43,83492791)^Math.imul(r+67,2654435761))>>>0)%1000)/1000;
  if(shape==='soft')return dist<=radius*(.55+.45*h)+.35||dist<.8;
  return dist<=radius+(h-.5)*s.organic*.52||dist<.8;
 }
 function paintTile(map,c,r,id,size=1){if(!map?.terrain)return false;let changed=false;const half=Math.floor((size-1)/2);
  const heightTool=state.tool==='tile-height';
  const values=heightTool?(map.terrain.heights??=Array(map.sizeX*map.sizeY).fill(0)):map.terrain.tiles;
  if(heightTool)id=state.height??1;
  for(let y=r-half;y<r-half+size;y++)for(let x=c-half;x<c-half+size;x++)if(x>=0&&y>=0&&x<map.sizeX&&y<map.sizeY&&brushIncludes(map,x,y,c,r,size)){const index=y*map.sizeX+x;if(values[index]!==id){values[index]=id;changed=true}}
  return changed;
 }
 function paintFill(map,c,r,id){if(!map?.terrain||c<0||r<0||c>=map.sizeX||r>=map.sizeY)return false;
  const width=map.sizeX,values=map.terrain.tiles,target=values[r*width+c];if(target===id)return false;
  const stack=[r*width+c];values[r*width+c]=id;
  while(stack.length){const i=stack.pop(),x=i%width,y=Math.floor(i/width);for(const n of [x>0?i-1:-1,x<width-1?i+1:-1,y>0?i-width:-1,y<map.sizeY-1?i+width:-1])if(n>=0&&values[n]===target){values[n]=id;stack.push(n)}}
  return true;
 }
 function paintRect(map,a,b,id){if(!map?.terrain)return false;let changed=false;for(let y=Math.min(a.y,b.y);y<=Math.max(a.y,b.y);y++)for(let x=Math.min(a.x,b.x);x<=Math.max(a.x,b.x);x++)changed=paintTile(map,x,y,id)||changed;return changed}
 function drawPickupTerrain(){const pc=$(state.root,'[data-pickup-terrain]');if(pc){const m=projectMapData(state.mapId);pc.width=m.sizeX*32;pc.height=m.sizeY*32;terrain.draw(pc.getContext('2d'),m);}}
 let terrainFrame=0;function scheduleTerrainPreview(){if(!terrainFrame)terrainFrame=requestAnimationFrame(()=>{terrainFrame=0;drawTerrainPreview()})}
 function drawTerrainPreview(){
  const map=currentMap(),canvas=$(state.root,'[data-gme-terrain-canvas]');if(!map?.terrain||!canvas||!terrain?.valid(map))return;
  const width=map.sizeX*32,height=map.sizeY*32;if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;terrain.draw(ctx,map);
 }
 let previewFrame=0;
 function animatePreview(){
  cancelAnimationFrame(previewFrame);
  const stage=state.root.querySelector('[data-gme-map-stage]'),m=currentMap();if(!stage||!m)return;
  const water=!!m.terrain;
  const effects=(m.scenery||[]).filter(p=>p.effect&&(window.DBIWorld.mapDrawOrder('scenery',p)>=20?state.showAbove!==false:state.showProps!==false));
  if(!water&&!effects.length)return;
  const makeCanvas=parent=>{const c=document.createElement('canvas');c.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';parent.appendChild(c);return c};
  const wc=water?makeCanvas(stage):null;
  if(wc){wc.width=m.sizeX*32;wc.height=m.sizeY*32;stage.querySelector('[data-gme-terrain-canvas]').after(wc)}
  const layers=effects.flatMap(p=>{const parent=stage.querySelector('[data-gme-select="scenery:'+m.scenery.indexOf(p)+'"]');if(!parent)return [];const canvas=makeCanvas(parent);canvas.width=p.width;canvas.height=p.height;canvas.style.transform=parent.querySelector('img')?.style.transform||'';return [{canvas,p}]});
  let last=-100;
  function tick(t){if(!stage.isConnected)return;if(t-last>=100){last=t;if(wc){const g=wc.getContext('2d');g.clearRect(0,0,wc.width,wc.height);terrain.drawWater(g,m,t)}
   for(const {canvas,p} of layers){const g=canvas.getContext('2d');g.clearRect(0,0,canvas.width,canvas.height);terrain.drawEffect(g,p.effect,0,0,p.width,p.height,t)}}
   previewFrame=requestAnimationFrame(tick)}
  previewFrame=requestAnimationFrame(tick)
 }
 function pickupView(){
  const m=projectMapData(state.mapId);if(!m)return '<section class="dbi-gme-empty">Wybierz mapę.</section>';
  const list=(state.pack.pickups||[]).filter(p=>p.mapId===m.id),p=list.find(p=>p.id===state.pickupId),W=m.sizeX*32,H=m.sizeY*32;
  const q=state.pack.quests.find(q=>q.id===p?.questId),catalog=pickupCatalog();
  const backdrop=[...(m.scenery||[]).map(o=>({ ...o,w:o.width||32,h:o.height||32,left:o.x,top:o.y})),...(m.npc||[]).map(o=>({...o,w:32,h:32,left:o.x-16,top:o.y-32}))].filter(o=>o.art&&(validAsset.test(o.art)||spriteUrl(o.art)!==o.art)).map(o=>'<img alt="" draggable="false" src="'+esc(spriteUrl(o.art))+'" style="position:absolute;pointer-events:none;left:'+(o.left/W*100)+'%;top:'+(o.top/H*100)+'%;width:'+(o.w/W*100)+'%;height:'+(o.h/H*100)+'%">').join('');
  const pins=list.map(item=>'<button type="button" class="dbi-gme-pin '+(item===p?'is-selected':'')+'" data-pickup-select="'+esc(item.id)+'" style="left:'+(item.x/W*100)+'%;top:'+(item.y/H*100)+'%" title="'+esc(pickupName(item))+'"><span>📦</span></button>').join('');
  const fields=p?'<div class="dbi-gme-fields">'+field('Przedmiot z ekwipunku','pickup.itemId',p.itemId,{options:catalog.map(i=>[i.id,i.name+' ('+i.id+')']),searchable:true})+field('Ilość','pickup.amount',p.amount,{type:'number',min:1,max:100})+field('Pozycja X','pickup.x',p.x,{type:'number',min:0,max:W})+field('Pozycja Y','pickup.y',p.y,{type:'number',min:0,max:H})+field('Pojawia się','pickup.when',p.when,{options:[['always','Zawsze'],['accepted','Po zaakceptowaniu etapu questa'],['after','Po ukończeniu etapu questa'],['complete','Po ukończeniu całego questa']]})+(p.when!=='always'?field('Quest','pickup.questId',p.questId||'',{options:[['','Wybierz quest'],...state.pack.quests.map(q=>[q.id,q.name])]})+(p.when!=='complete'?field('Etap','pickup.stage',p.stage??0,{options:(q?.steps||[]).map((st,i)=>[i,'Etap '+(i+1)+' · '+(st.dialog||'').slice(0,55)])}):''):'')+'</div><button type="button" class="danger" data-gme-command="pickup-delete">Usuń przedmiot z mapy</button>':'<p>Wybierz przedmiot lub dodaj nowy.</p>';
  return '<section class="dbi-gme-work" style="grid-column:1/-1"><h3>Przedmioty do podniesienia – '+esc(m.name)+'</h3><p>Każda postać podnosi własny egzemplarz tylko raz. Podejdź i naciśnij E. Przedmioty są oddzielne od dekoracji, także na starych mapach.</p>'+field('Mapa','pickup.map',m.id,{options:allLocations().map(l=>[l.id,l.name])})+'<div class="dbi-gme-inline"><button type="button" data-gme-command="pickup-add" '+(catalog.length?'':'disabled')+'>+ Dodaj przedmiot</button><button type="button" data-gme-command="publish-live">Włącz w grze (lokalnie)</button></div><p>Kliknij mapę, aby ustawić pozycję wybranego przedmiotu.</p><div class="dbi-gme-map-wrap"><div data-pickup-map class="dbi-gme-map-stage" style="aspect-ratio:'+m.sizeX+'/'+m.sizeY+';background-image:'+(m.terrain?'none':'url(&quot;'+esc(m.art)+'&quot;)')+';background-size:100% 100%">'+(m.terrain?'<canvas data-pickup-terrain style="position:absolute;width:100%;height:100%;inset:0;pointer-events:none"></canvas>':'')+backdrop+pins+'</div></div><div class="dbi-gme-inline">'+list.map(item=>'<button type="button" data-pickup-select="'+esc(item.id)+'" class="'+(item===p?'active':'')+'">'+esc(pickupName(item))+' ×'+item.amount+'</button>').join('')+'</div>'+fields+'</section>';
 }
 // Connected decorative borders; never quest targets. Bit mask N/E/S/W.
 const edgeSets=[['forest','Las HD — zwarte drzewa'],['hedge','Żywopłot'],['rock','Kamienie i skały'],['brick','Mur ceglany'],['wood','Płot drewniany'],['desert','Pustkowia — skały piaskowe'],['cliff','Klify górskie'],['snow','Lodowe skały'],['volcano','Wulkaniczne skały'],['namek-rock','Namek — niebieskie skały'],['namek-tree','Namek — turkusowa roślinność'],['army','Baza armii — stalowe mury'],['capsule','Metropolia — panele technologiczne'],['arena','Arena turniejowa — kamienny mur'],['temple','Świątynia — czerwone ogrodzenie'],['space','Kosmiczna baza — panele energetyczne']];
 const isEdge=p=>p?.edgeTile===true;
 const edgeKey=(x,y)=>x+':'+y;
 const edgeArt=(style,mask,blob=false,variant=null)=>'assets/ui/map-editor/edges/'+style+'-'+(blob?'block-':'')+mask+(blob&&style==='forest'&&variant!==null?'-v'+variant:'')+'.png';
 const edgeMaskNames=['Pojedynczy','Góra','Prawo','Róg góra–prawo','Dół','Pion','Róg prawo–dół','T góra–prawo–dół','Lewo','Róg lewo–góra','Poziom','T lewo–góra–prawo','Róg dół–lewo','T góra–dół–lewo','T prawo–dół–lewo','Krzyż'];
 const edgeSize=()=>[1,2,3,4].includes(Number(state.edgeSize))?Number(state.edgeSize):2;
 const edgeContains=(p,x,y)=>x>=p.x&&x<p.x+p.width&&y>=p.y&&y<p.y+p.height;
 const edgeOverlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
 // Blob autotiling: diagonals matter only when both adjacent sides are connected.
 function edgeBlobMask(p,tiles){
  let mask=0;const same=q=>q!==p&&q.edgeStyle===p.edgeStyle;
  for(const q of tiles){if(!same(q))continue;
   const horizontal=p.x<q.x+q.width&&p.x+p.width>q.x,vertical=p.y<q.y+q.height&&p.y+p.height>q.y;
   if(horizontal&&q.y+q.height===p.y)mask|=1;
   if(vertical&&q.x===p.x+p.width)mask|=2;
   if(horizontal&&q.y===p.y+p.height)mask|=4;
   if(vertical&&q.x+q.width===p.x)mask|=8;
  }
  const occupied=(x,y)=>tiles.some(q=>same(q)&&edgeContains(q,x,y));
  if((mask&3)===3&&occupied(p.x+p.width,p.y-1))mask|=16;
  if((mask&6)===6&&occupied(p.x+p.width,p.y+p.height))mask|=32;
  if((mask&12)===12&&occupied(p.x-1,p.y+p.height))mask|=64;
  if((mask&9)===9&&occupied(p.x-1,p.y-1))mask|=128;
  return mask;
 }
 function refreshEdges(m){
  const tiles=(m.scenery||[]).filter(isEdge);
  // All automatic segments share the same blob atlas, so line and block join.
  for(const p of tiles){const mask=edgeBlobMask(p,tiles);
   const size=Math.max(1,Number(p.edgeSize)||Math.round(p.width/32)||1)*32;
   const variant=(Math.floor(p.x/size)%2)+2*(Math.floor(p.y/size)%2);
   p.art=p.edgeManual===true?edgeArt(p.edgeStyle,p.edgeMask):edgeArt(p.edgeStyle,mask,true,variant);
   p.placementTool='decoration';p.questMarker=false;
  }
 }
 function edgeCells(m,a,b,mode,size=edgeSize()){
  const cols=Math.ceil(m.sizeX/size),rows=Math.ceil(m.sizeY/size);
  const snap=p=>({x:Math.max(0,Math.min(cols-1,Math.floor(p.x/size))),y:Math.max(0,Math.min(rows-1,Math.floor(p.y/size)))});
  const cells=new Map(),add=(x,y)=>{if(x>=0&&y>=0&&x<cols&&y<rows)cells.set(edgeKey(x,y),{x:x*size*32,y:y*size*32,width:Math.min(size,m.sizeX-x*size)*32,height:Math.min(size,m.sizeY-y*size)*32})};
  if(mode==='perimeter'){a={x:0,y:0};b={x:cols-1,y:rows-1};mode='rect'}else{a=snap(a);b=snap(b)}
  if(mode==='manual'){add(b.x,b.y)}
  else if(mode==='fill'){for(let y=Math.min(a.y,b.y);y<=Math.max(a.y,b.y);y++)for(let x=Math.min(a.x,b.x);x<=Math.max(a.x,b.x);x++)add(x,y)}
  else if(mode==='rect'){for(let x=Math.min(a.x,b.x);x<=Math.max(a.x,b.x);x++){add(x,a.y);add(x,b.y)}for(let y=Math.min(a.y,b.y);y<=Math.max(a.y,b.y);y++){add(a.x,y);add(b.x,y)}}
  else {for(let x=Math.min(a.x,b.x);x<=Math.max(a.x,b.x);x++)add(x,a.y);for(let y=Math.min(a.y,b.y);y<=Math.max(a.y,b.y);y++)add(b.x,y)}
  return [...cells.values()];
 }
 function edgeEdit(m,a,b,mode,erase=false){
  const before=m.scenery||[],size=erase?1:edgeSize(),cells=edgeCells(m,a,b,mode,size),tiles=before.filter(p=>!isEdge(p)||!cells.some(c=>edgeOverlap(p,c)));
  if(!erase)for(const cell of cells){tiles.push({...cell,label:'',art:edgeArt(state.edgeStyle||'forest',0),placementTool:'decoration',questMarker:false,edgeTile:true,edgeSize:size,edgeStyle:state.edgeStyle||'forest',edgeBlock:state.edgeBlock!==false,edgeManual:mode==='manual',edgeMask:state.edgeMask||0,layer:state.edgeAbove?'above':''})}
  if(tiles.filter(isEdge).length>1200)return setStatus('Limit 1200 kafelków obramowania na mapę.');
  const previous=clone(before.filter(isEdge));m.scenery=clone(tiles);refreshEdges(m);state.selection=null;
  if(!saveDraft()){m.scenery=before;return}
  state.edgeUndo={mapId:m.id,tiles:previous};draw();
 }
 function edgeUndo(){const m=currentMap(),u=state.edgeUndo;if(!m||u?.mapId!==m.id)return;const before=m.scenery;m.scenery=[...before.filter(p=>!isEdge(p)),...clone(u.tiles)];if(!saveDraft()){m.scenery=before;return}state.edgeUndo=null;state.selection=null;draw()}
 function edgeView(map){const style=state.edgeStyle||'forest',mode=state.edgeMode||'line';
  return '<details '+(state.edgeOpen?'open':'')+' class="dbi-gme-terrain-panel" data-edge-panel><summary>Krawędzie / obramowania mapy · 16 zestawów</summary><div class="dbi-gme-inline"><label>Zestaw <select data-edge-style>'+edgeSets.map(([id,label])=>'<option value="'+id+'" '+(style===id?'selected':'')+'>'+esc(label)+'</option>').join('')+'</select></label><label>Tryb <select data-edge-mode>'+[['line','Linia / zakręt (przeciągnij)'],['rect','Obrys prostokąta'],['fill','Pełny blok (wypełniony prostokąt)'],['manual','Ręczny kafelek']].map(([id,n])=>'<option value="'+id+'" '+(mode===id?'selected':'')+'>'+n+'</option>').join('')+'</select></label></div><div class="dbi-gme-inline">'+(mode==='manual'?'<label>Element <select data-edge-mask>'+edgeMaskNames.map((n,i)=>'<option value="'+i+'" '+((state.edgeMask||0)===i?'selected':'')+'>'+n+'</option>').join('')+'</select></label>':'')+'<label>Rozmiar segmentu <select data-edge-size>'+[1,2,3,4].map(n=>'<option value="'+n+'" '+(edgeSize()===n?'selected':'')+'>'+n+' × '+n+' ('+(n*32)+' px)</option>').join('')+'</select></label><label><input type="checkbox" data-edge-block '+(state.edgeBlock!==false?'checked':'')+'> Blokuje ruch</label><label><input type="checkbox" data-edge-above '+(state.edgeAbove?'checked':'')+'> Nad postacią</label></div><div class="dbi-gme-inline">'+[0,2,10,6,5,15,255].map(i=>'<img alt="'+(i===255?'Pełne wnętrze':edgeMaskNames[i])+'" title="'+(i===255?'Pełne wnętrze':edgeMaskNames[i])+'" src="'+(mode==='manual'&&i!==255?edgeArt(style,i):edgeArt(style,i,true))+'" style="width:48px;height:48px;image-rendering:pixelated;background:#395832;border:1px solid #496478">').join('')+'</div><div class="dbi-gme-inline"><button type="button" data-gme-tool="edge-paint" class="'+(state.tool==='edge-paint'?'active':'')+'">Rysuj obramowanie</button><button type="button" data-gme-tool="edge-erase" class="'+(state.tool==='edge-erase'?'active':'')+'">Gumka obramowania</button><button type="button" data-gme-command="edge-perimeter">Obuduj całą mapę</button><button type="button" data-gme-command="edge-refresh">Przelicz połączenia istniejących obramowań</button><button type="button" data-gme-command="edge-undo" '+(state.edgeUndo?.mapId===map.id?'':'disabled')+'>Cofnij ostatnie obramowanie</button></div><p>Przeciągnij po mapie lub kliknij pojedynczy kafelek. Tryb Pełny blok wypełnia cały przeciągnięty prostokąt. Bloki i linie tego samego zestawu łączą się automatycznie, także w narożnikach wewnętrznych. Dla równych połączeń używaj jednego rozmiaru na odcinku. Przy niepodzielnym wymiarze mapy skrajny segment jest węższy. Gumka usuwa cały wskazany segment. Malowanie zastępuje nakładające się obramowania. Obramowanie nie tworzy punktów questów. Liczba segmentów: '+(map.scenery||[]).filter(isEdge).length+'/1200.</p></details>';
 }
 function mapView(){
  const map=currentMap();
  if(!map&&legacyMap())return mapLegacyView(legacyMap());
  if(!map)return '<section class="dbi-gme-empty">Utwórz pierwszą mapę, aby rozpocząć.</section>';
  const tools=[['select','↖ Wybierz / przesuń'],['spawn','🏁 Start'],['npc','👤 NPC'],['scenery','🏠 Obiekt'],['campfire','🔥 Ognisko'],['mobs','⚔ Expowisko'],['boss','👑 Boss (znacznik)'],['portal','🌀 Portal'],['blocked','⛔ Kolizja']];
  const W=map.sizeX*32,H=map.sizeY*32;
  const pins=[['spawn',0,map.spawn],...(map.scenery||[]).map((x,i)=>['scenery',i,x]),...(map.npc||[]).map((x,i)=>['npc',i,x]),...(map.portals||[]).map((x,i)=>['portals',i,x]),...(map.mobs?[['mobs',0,map.mobs]]:[]),...(map.boss?[['boss',0,map.boss]]:[])];
  const glyph={spawn:'🏁',npc:'👤',scenery:'🏠',portals:'🌀',mobs:'⚔',boss:'👑'};
  const order=(type,p)=>window.DBIWorld.mapDrawOrder(type,p);
  const objectSelector='<label>Wybierz NPC lub obiekt <select data-gme-layer-object><option value="">Wybierz z listy</option>'+pins.filter(([type])=>type==='npc'||type==='scenery').filter(([, ,p])=>!isEdge(p)).map(([type,i,p])=>'<option value="'+type+':'+i+'" '+(state.selection?.type===type&&state.selection?.index===i?'selected':'')+'>'+esc(objectLabel(type,p,i))+' · '+(i+1)+'</option>').join('')+'</select></label>';
  const objects=pins.filter(([type,i,p])=>p&&(type==='scenery'?(order(type,p)>=20?state.showAbove!==false:state.showProps!==false):state.showMarkers!==false)).map(([type,i,p])=>{const selected=state.selection?.type===type&&state.selection?.index===i,visible=type==='scenery'&&p.art&&(validAsset.test(p.art)||spriteUrl(p.art)!==p.art)&&!p.art.includes('..')&&p.animation!=='campfire';
   const z=type==='npc'||type==='scenery'?order(type,p)+101:205;
   if(type==='npc'&&hasNpcImage(p)){
    const {width,height}=window.DBIWorld.npcSize(p);
    return '<button type="button" class="dbi-gme-pin dbi-gme-sprite-pin '+(selected?'is-selected':'')+'" data-gme-select="npc:'+i+'" title="'+esc(p.label)+'" aria-label="'+esc(p.label)+'" style="z-index:'+z+';left:'+(p.x/W*100)+'%;top:'+(p.y/H*100)+'%;width:'+(width/W*100)+'%;height:'+(height/H*100)+'%;transform:translate(-50%,-100%)"><img src="'+esc(spriteUrl(p.art))+'" alt="" draggable="false">'+(npcQuestMarker(p)?'<span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none;background:#102438;border:1px solid #d0ab60;border-radius:50%;padding:3px">👤</span>':'')+'</button>';
   }
   if(visible)return '<button type="button" class="dbi-gme-pin dbi-gme-sprite-pin '+(selected?'is-selected':'')+'" data-gme-select="'+type+':'+i+'" style="z-index:'+z+';left:'+(p.x/W*100)+'%;top:'+(p.y/H*100)+'%;width:'+(p.width/W*100)+'%;height:'+(p.height/H*100)+'%" title="'+esc(objectLabel(type,p,i))+'"><img draggable="false" src="'+esc(spriteUrl(p.art))+'" style="transform:rotate('+number(p.rotation,0,270,0)+'deg) scaleX('+(p.flipX==='yes'?-1:1)+')" alt="">'+(sceneryQuestMarker(p)?'<span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none;background:#102438;border:1px solid #d0ab60;border-radius:50%;padding:3px">🏠</span>':'')+'</button>';
   return '<button type="button" class="dbi-gme-pin '+(p.animation==='campfire'?'dbi-gme-fire-pin ':'')+(selected?'is-selected':'')+'" data-gme-select="'+type+':'+i+'" style="z-index:'+z+';left:'+((p.animation==='campfire'?p.x+(p.width||64)/2:p.x)/W*100)+'%;top:'+((p.animation==='campfire'?p.y+(p.height||64)/2:p.y)/H*100)+'%" title="'+esc(objectLabel(type,p,i))+'"><span>'+(p.animation==='campfire'?'🔥':type==='scenery'&&!sceneryQuestMarker(p)?'·':glyph[type])+'</span></button>'}).join('');
  const blocks=(state.showBlocks===false?[]:map.blocked||[]).map((b,i)=>'<button type="button" data-gme-select="blocked:'+i+'" class="dbi-gme-block '+(state.selection?.type==='blocked'&&state.selection.index===i?'is-selected':'')+'" style="left:'+(b[0]/W*100)+'%;top:'+(b[1]/H*100)+'%;width:'+((b[2]-b[0])/W*100)+'%;height:'+((b[3]-b[1])/H*100)+'%"></button>').join('');
  const selected=currentObject();
  return '<section class="dbi-gme-work"><div class="dbi-gme-terrain-mode"><strong>Rodzaj tła mapy</strong><div class="dbi-gme-inline"><button type="button" data-gme-command="mode-tiles" class="'+(map.terrain?'active':'')+'">🎨 Buduj z kafelków</button><button type="button" data-gme-command="mode-png" class="'+(!map.terrain?'active':'')+'">🖼 Tło PNG</button></div></div><div class="dbi-gme-map-settings">'+field('ID mapy','map.id',map.id)+field('Nazwa mapy','map.name',map.name)+field('Szerokość (kafelki)','map.sizeX',map.sizeX,{type:'number',min:10,max:100})+field('Wysokość (kafelki)','map.sizeY',map.sizeY,{type:'number',min:10,max:100})+(map.terrain?'':field('Grafika tła (ścieżka pliku)','map.art',map.art,{placeholder:'assets/world/moja-mapa.webp'}))+'<div class="dbi-gme-inline"><button type="button" data-gme-command="duplicate-map">Duplikuj</button><button type="button" data-gme-command="delete-map" class="danger">Usuń mapę</button></div><p>'+(map.terrain?'Tło budujesz z kafelków — nie potrzebujesz PNG.':'Grafikę mapy dodaj osobno do folderu <code>assets/</code>. Tutaj wskazujesz jej ścieżkę.')+'</p><div class="dbi-gme-entry">'+(!map.spawn?'<p class="dbi-gme-help">Brak punktu startowego. Domyślny teleport jest wyłączony. Ustaw wejście przez portal z własnym punktem docelowym albo przez quest.</p>':'')+'<strong>Opcjonalny portal wejściowy z istniejącej mapy</strong><p>Używa istniejącego portalu i animacji. Poprzednie portale pozostaną bez zmian.</p><div class="dbi-gme-fields">'+field('Mapa wejściowa','entry.from',map.entryPortal?.from||'',{options:[['','Bez wejścia'],...allLocations().filter(loc=>loc.id!==map.id&&!['laguna','island'].includes(loc.id)).map(loc=>[loc.id,loc.name])]})+field('Pozycja portalu X (px)','entry.x',map.entryPortal?.x??128,{type:'number',min:0,max:4000})+field('Pozycja portalu Y (px)','entry.y',map.entryPortal?.y??128,{type:'number',min:0,max:4000})+'</div></div></div>'+(map.terrain?tileView(map):'')+edgeView(map)+propView()+'<div class="dbi-gme-layerbar">'+[['showProps','Dekoracje'],['showAbove','Nad postacią'],['showMarkers','NPC i znaczniki'],['showBlocks','Kolizje']].map(([k,label])=>'<label><input type="checkbox" data-gme-layer="'+k+'" '+(state[k]!==false?'checked':'')+'> '+label+'</label>').join('') +objectSelector+'<button type="button" data-gme-command="overview">Podgląd całej mapy</button><label>Powiększenie <select data-gme-zoom>'+[100,150,200,300].map(n=>'<option value="'+n+'" '+((state.zoom||100)===n?'selected':'')+'>'+n+'%</option>').join('')+'</select></label></div><div class="dbi-gme-tools">'+tools.map(([id,title])=>'<button type="button" data-gme-tool="'+id+'" class="'+(state.tool===id?'active':'')+'">'+title+'</button>').join('')+'</div><div class="dbi-gme-map-wrap"><div data-gme-map-stage class="dbi-gme-map-stage '+(map.terrain&&state.showGrid?'show-grid':'')+' '+(map.terrain&&tileTools.has(state.tool)?'is-tile-painting':'')+'" style="width:'+(state.zoom||100)+'%;--gme-columns:'+map.sizeX+';--gme-rows:'+map.sizeY+';aspect-ratio:'+map.sizeX+'/'+map.sizeY+';'+(map.terrain?'background-image:none': 'background-image:url(&quot;'+esc(map.art)+'&quot;);background-size:100% 100%')+'">'+(map.terrain?'<canvas data-gme-terrain-canvas class="dbi-gme-terrain-canvas" aria-label="Teren mapy"></canvas>':'')+blocks+objects+'<div class="dbi-gme-drawing" hidden></div></div></div><p class="dbi-gme-help">Kliknij narzędzie, a potem miejsce na mapie. Kliknij postawiony obiekt, aby wybrać jego rolę i opcjonalny quest. Prawy przycisk usuwa element pod kursorem. Wybór i przesuwanie: narzędzie ↖. Kolizje: przeciągnij prostokąt. NPC i obiekty są osobno od tła. Statystyki bossa i łupy ustawisz w zakładce Moby i bossowie.</p><div class="dbi-gme-inspector"><h3>Właściwości zaznaczenia</h3>'+inspector(map,selected)+'</div></section>';
 }
 function inspector(map,selected){
  const sel=state.selection;
  if(!sel||!selected)return '<p>Wybierz obiekt na mapie, aby zmienić jego właściwości.</p>';
  if(sel.type==='scenery'&&isEdge(selected))return '<p>Kafelek obramowania: '+esc(edgeSets.find(([id])=>id===selected.edgeStyle)?.[1]||selected.edgeStyle)+'. Do modyfikacji użyj narzędzia obramowania.</p><button type="button" class="danger" data-gme-command="delete-object">Usuń kafelek</button>'; 
  let html='';
  const pointFields=()=>field('Pozycja X (px)','item.x',Math.round(selected.x),{type:'number',min:0,max:map.sizeX*32})+field('Pozycja Y (px)','item.y',Math.round(selected.y),{type:'number',min:0,max:map.sizeY*32});
  if(sel.type==='blocked')html=field('Lewo','rect.0',selected[0],{type:'number'})+field('Góra','rect.1',selected[1],{type:'number'})+field('Prawo','rect.2',selected[2],{type:'number'})+field('Dół','rect.3',selected[3],{type:'number'});
  else{
   html=pointFields();
   if(sel.type==='npc')html+=field('Typ elementu NPC','item.placementTool',npcPlacement(selected),{options:[['npc','👤 NPC — ręczny znacznik questa'],['library-npc','Grafika NPC — bez znacznika questa']]})+(hasNpcImage(selected)?field('Rozmiar obrazu NPC (%)','item.scalePct',window.DBIWorld.npcSize(selected).percent,{type:'number',min:25,max:400,step:1}):'')+field('Nazwa NPC na mapie gry','item.label',selected.label)+field('Grafika sprite’a','item.art',selected.art||'',{placeholder:'assets/world/npc.png'})+field('Przypisany quest','item.questId',selected.questId||'',{options:[['','Bez questa'],...state.pack.quests.map(q=>[q.id,q.name])]});
   if(sel.type==='spawn'&&selected.placementTool==='spawn')html+=field('Nazwa na mapie gry','item.label',selected.label||'');
   if(sel.type==='portals')html+=portalConnectionsView(map,selected);
   if(sel.type==='scenery')html+=field('Typ elementu mapy','item.placementTool',sceneryPlacement(selected),{options:[['object','🏠 Obiekt — znacznik questa'],['campfire','🔥 Ognisko — znacznik questa'],['decoration','Dekoracja — bez znacznika questa']]})+field('Co reprezentuje obiekt?','item.role',selected.role||'',{options:sceneryRoles})+field('Quest przy obiekcie','item.questId',selected.questId||'',{options:[['','Bez questa'],...state.pack.quests.map(q=>[q.id,q.name])]})+field('Nazwa na mapie gry','item.label',selected.label||'',{placeholder:'np. Arena turniejowa'})+field('Grafika obiektu','item.art',selected.art||'')+field('Animacja dekoracji','item.animation',selected.animation||'',{options:[['','Brak animacji'],['campfire','Ognisko — płomienie i iskry']]})+field('Domyślna warstwa dekoracji','item.layer',selected.layer||'',{options:[['','Pod postacią'],['above','Nad postacią (bez ogniska)']]})+field('Obrót grafiki','item.rotation',selected.rotation||0,{options:[[0,'0°'],[90,'90°'],[180,'180°'],[270,'270°']]})+field('Odbicie poziome','item.flipX',selected.flipX||'',{options:[['','Nie'],['yes','Tak']]})+field('Szerokość (px)','item.width',selected.width,{type:'number',min:1})+field('Wysokość (px)','item.height',selected.height,{type:'number',min:1});
   if(sel.type==='npc'||sel.type==='scenery'){
    html+=field('Kolejność rysowania','item.drawOrder',selected.drawOrder??'',{
     type:'number',min:-100,max:100,step:1,placeholder:String(window.DBIWorld.mapDrawOrder(sel.type,selected))
    })+'<p>Wyższa liczba oznacza bliżej przodu. Domyślnie zwykłe dekoracje mają 0, NPC 10, a dekoracje nad postacią 30. Poziomy od 20 zasłaniają gracza. Puste pole przywraca ustawienie domyślne.</p>';
   }
   if(sel.type==='mobs')html+=field('Nazwa expowiska','item.label',selected.label||'Expowisko')+field('Grafika expowiska','item.art',selected.art||'')+'<button type="button" data-gme-command="enc-open-mobs">Ustaw moby i łupy</button>';
   if(sel.type==='boss')html+=field('Nazwa bossa','item.label',selected.label||'Boss')+field('Grafika bossa','item.art',selected.art||'')+'<button type="button" data-gme-command="enc-open-boss">Ustaw bossa i łupy</button>';
  }
  return '<div class="dbi-gme-fields">'+html+'</div>'+'<button type="button" class="danger" data-gme-command="delete-object">'+(sel.type==='spawn'?'Usuń punkt startowy':'Usuń zaznaczony element')+'</button>';
 }
 const statNames={strength:'Siła',speed:'Szybkość',endurance:'Wytrzymałość',intelligence:'Inteligencja',ki:'KI'};
 const enemyFields={...statNames,attack:'Atak',defense:'Obrona',hp:'HP'};
 const ranks=['Zwykły','Silny','Super'];
 function prepareRoster(m){
  if(!m?.mobs)return;
  m.mobNames??=[];
  const variants=window.DBIWorld.editorMobVariants(m);
  m.mobNames.splice(0,3,...variants);
 }
 function chosenEnemy(m){return state.enemyKey==='boss'?m?.boss:m?.mobs&&Number(state.enemyKey||0)<3?m.mobNames?.[Number(state.enemyKey||0)]:null}
 function encountersView(){
  const m=currentMap(),pick=field('Mapa projektu','enc.map',m?.id||'',{options:[['','Wybierz mapę'],...state.pack.maps.map(x=>[x.id,x.name])]});
  if(!m)return '<section>'+pick+'</section>';
  prepareRoster(m);
  const entries=m.mobs?ranks.map((rank,i)=>[String(i),rank+' · '+m.mobNames[i].name]):[];
  if(m.boss)entries.push(['boss','Boss · '+m.boss.label]);
  if(!entries.length)return '<section class="dbi-gme-work">'+pick+'<p>Na tej mapie umieść expowisko lub bossa, aby ustawić przeciwników.</p></section>';
  if(!chosenEnemy(m))state.enemyKey=entries[0][0];
  const unit=chosenEnemy(m),boss=state.enemyKey==='boss',catalog=window.DBIWorldInventory?.editorItems?.()||[];
  const button=(cmd,label)=>'<button type="button" data-gme-command="'+cmd+'">'+label+'</button>';
  let html=pick;
  if(m.mobs){
   html+='<h3>'+esc(m.mobs.label||'Expowisko')+'</h3><div class="dbi-gme-fields">';
   for(const [i,rank] of ranks.entries()){
    html+=field(rank+' · nazwa','enc.variant.'+i+'.name',m.mobNames[i].name)+field(rank+' · poziom','enc.variant.'+i+'.level',m.mobNames[i].level,{type:'number',min:1,max:999999});
   }
   html+='</div><p>Statystyki każdego wariantu gra wylicza z jego poziomu.</p>';
  }
  html+=field('Łupy moba lub konfiguracja bossa','enc.pick',state.enemyKey||'0',{options:entries});
  html+='<div class="dbi-gme-fields">'+field('Portret w walce (assets/...; puste = automatyczny)','enc.portrait',unit.portrait||'',{placeholder:window.DBIWorld.defaultEnemyPortrait})+'</div>';
  const c=unit.combat||{};
  if(boss){
   html+='<h3>Boss</h3><div class="dbi-gme-fields">'+field('Nazwa bossa','enc.name',unit.label)+field('Poziom bossa','enc.level',unit.level||1,{type:'number',min:1});
   for(const [key,label] of Object.entries(enemyFields))html+=field(label,'enc.stat.'+key,c.stats?.[key]??'',{type:'number',min:key==='hp'?1:0,placeholder:'Według poziomu'});
   for(const [key,label] of [['gold','Złoto'],['exp','EXP']])html+=field(label,'enc.'+key,c[key]??0,{type:'number',min:0});
   html+='</div>';
  }
  html+='<h3>Łupy · '+esc(boss?unit.label:unit.name)+'</h3>';
  if(!boss)html+=field('Tabela łupów','enc.dropMode',Array.isArray(c.drops)?'custom':'default',{options:[['default','Standardowa'],['custom','Własna']]});
  if(boss||Array.isArray(c.drops)){
   for(const [i,row] of (c.drops||[]).entries())html+='<div class="dbi-gme-fields">'+field('Przedmiot','enc.loot.'+i+'.id',row.id,{options:catalog.map(x=>[x.id,x.name]),searchable:true})+field('Szansa (%)','enc.loot.'+i+'.chance',row.chance,{type:'number',min:0,max:100,step:'any'})+field('Liczba sztuk','enc.loot.'+i+'.qty',row.qty,{type:'number',min:1,max:100})+button('enc-drop-remove-'+i,'Usuń z łupów')+'</div>';
   html+=button('enc-drop-add','+ Dodaj przedmiot');
  }
  return '<section class="dbi-gme-work">'+html+'</section>';
 }
 function encounterField(path,value){
  if(path==='enc.map'){state.mapId=value;state.enemyKey=currentMap()?.mobs?'0':'boss';state.selection=null;return true}
  if(path==='enc.pick'){state.enemyKey=value;return true}
  if(path.startsWith('enc.variant.')){
   const m=currentMap(),[, ,slot,prop]=path.split('.'),i=Number(slot);
   if(!m?.mobs||!Number.isInteger(i)||i<0||i>2)return false;
   prepareRoster(m);
   if(prop==='level')m.mobNames[i].level=Math.trunc(number(value,1,999999));
   else if(prop==='name'&&value.trim()){
    const name=value.trim().slice(0,80),previous=m.mobNames[i].name;
    function rename(index,next){
     const old=m.mobNames[index].name;m.mobNames[index].name=next;
     for(const q of state.pack.quests)for(const step of q.steps||[])if(stepMap(q,step)===m.id&&step.requirement==='kill'&&step.target===old)step.target=next;
    }
    if(i===0)for(const [n,suffix] of [[1,' (Silny)'],[2,' (Super)']])if(m.mobNames[n].name===previous+suffix)rename(n,name+suffix);
    rename(i,name);
   }else return false;
   saveDraft();return true;
  }
  const unit=chosenEnemy(currentMap());if(!unit)return false;
  const c=unit.combat??={},[,key,index,prop]=path.split('.');
  if(['name','level','stat','gold','exp'].includes(key)&&state.enemyKey!=='boss')return false;
  if(key==='portrait'){const path=value.trim();if(path&&!validAsset.test(path)){setStatus('Portret musi być plikiem z assets/ (png, webp, jpg).');return false}unit.portrait=path;}
  else if(key==='name'){if(!value.trim())return false;unit[state.enemyKey==='boss'?'label':'name']=value.trim().slice(0,80)}
  else if(key==='level')unit.level=Math.trunc(number(value,1,999999));
  else if(key==='stat'){c.stats??={};if(value==='')delete c.stats[index];else c.stats[index]=Math.trunc(number(value,index==='hp'?1:0,999999999))}
  else if(key==='dropMode'){if(value==='custom')c.drops??=[];else delete c.drops}
  else if(key==='loot'){const row=c.drops?.[Number(index)];if(!row)return false;row[prop]=prop==='id'?value:prop==='chance'?number(value,0,100):Math.trunc(number(value,1,100))}
  else if(key==='exp'||key==='gold')c[key]=Math.trunc(number(value,0,999999999));
  saveDraft();return true;
 }
 function encounterCommand(name,m){
  if(!m)return;
  const unit=chosenEnemy(m);
  if(name==='enc-open-mobs'||name==='enc-open-boss'){
   if(name==='enc-open-mobs'?!m.mobs:!m.boss)return;
   state.enemyKey=name==='enc-open-mobs'?'0':'boss';state.tab='enemies';draw();return;
  }
  if(!unit)return;
  if(name==='enc-drop-add'){const first=window.DBIWorldInventory?.editorItems?.()[0];if(!first)return;unit.combat??={};const rows=unit.combat.drops??=[];if(rows.length<30)rows.push({id:first.id,chance:100,qty:1})}
  else if(name.startsWith('enc-drop-remove-'))unit.combat?.drops?.splice(Number(name.slice(16)),1);
  saveDraft();draw();
 }
 // The editor is a point picker, not an in-game above-head marker renderer.
 function stagePreviewSelection(p,markers,allTargets,map){
  if(!p)return {selected:null,pin:null};
  if(p.targetKind==='free')return {selected:null,pin:{x:p.x,y:p.y}};
  const exact=(point)=>{
   const hits=markers.filter(t=>(!p.targetKind||t.kind===p.targetKind)&&Math.hypot(t.x-point.x,t.y-point.y)<2);
   return hits.find(t=>t.label===p.label)||hits[0]||null;
  };
  const direct=exact(p);
  if(direct)return {selected:direct,pin:null};
  // Support previously saved anchors (e.g. top-left of legacy buildings).
  const resolved=window.DBIWorld?.resolveEditorQuestPoint?.(p,allTargets)||p;
  const selected=exact(resolved);
  return {selected,pin:selected?null:{x:resolved.x,y:resolved.y}};
 }
 function stageLocationView(q,st,i){
  const prefix='step.'+i+'.',mapId=stepMap(q,st),map=projectMapData(mapId),p=st.point;
  const allTargets=map?(window.DBIWorld?.editorQuestTargets?.(mapId,map)||[]):[],bound=projectPointObject(map,p);
  const markers=map?stageQuestMarkers(mapId,map,allTargets):[];
  const {selected,pin}=stagePreviewSelection(p,markers,allTargets,map);
  const preview=map?'<div class="dbi-gme-quest-map" data-stage-map="'+i+'" style="aspect-ratio:'+map.sizeX+'/'+map.sizeY+';'+(map.terrain?'':'background-image:url(&quot;'+esc(map.art)+'&quot;)')+'">'+(map.terrain?'<canvas data-stage-terrain="'+i+'"></canvas>':'')+markers.map(n=>{const at=stagePickerPosition(n,map),active=n===selected;return '<button type="button" class="dbi-gme-stage-npc" data-stage-pick="'+i+'" aria-pressed="'+active+'" data-x="'+n.x+'" data-y="'+n.y+'" data-kind="'+esc(n.kind)+'" data-label="'+esc(n.label||'Punkt fabularny')+'" title="'+esc((n.label||'Punkt fabularny')+' · '+({npc:'NPC',scenery:n.label==='Ognisko'?'Ognisko / obiekt':'Obiekt',portal:'Portal',mobs:'Expowisko',boss:'Boss',spawn:'Start'}[n.kind]||n.kind)+' · X: '+n.x+', Y: '+n.y)+'" style="left:'+number(at.x,0,map.sizeX*32)/(map.sizeX*32)*100+'%;top:'+number(at.y,0,map.sizeY*32)/(map.sizeY*32)*100+'%;width:18px;height:18px;min-width:18px;padding:0;border-radius:50%;transform:translate(-50%,-50%);display:grid;place-items:center;line-height:1;'+(active?'background:#ffc45d;color:#2b1b0b;border:1px solid #473119;font-weight:900;z-index:5;':'')+'">'+(active?'!':'•')+'</button>'}).join('')+(pin?'<span class="dbi-gme-stage-pin" style="left:'+number(pin.x,0,map.sizeX*32)/(map.sizeX*32)*100+'%;top:'+number(pin.y,0,map.sizeY*32)/(map.sizeY*32)*100+'%;transform:translate(-50%,-50%);pointer-events:none">!</span>':'')+'</div>':'';
  return '<details class="dbi-gme-stage-location" '+(p||q.id===JOURNEY_ID?'open':'')+'><summary>📍 Mapa i punkt etapu: '+esc(map?.name||mapId)+'</summary><div class="dbi-gme-fields">'+field('Mapa etapu',prefix+'mapId',mapId,{options:allLocations().map(m=>[m.id,m.name])})+(p?(bound?field('Nazwa punktu na mapie gry',prefix+'point.mapLabel',bound.item.label||'',{placeholder:'np. Arena turniejowa'}):field('Nazwa interakcji (tylko dialog; nazwa mapy w jej edytorze)',prefix+'point.label',p.label))+field('X (px)',prefix+'point.x',p.x,{type:'number',min:0,max:map?.sizeX*32})+field('Y (px)',prefix+'point.y',p.y,{type:'number',min:0,max:map?.sizeY*32}):'')+'</div><p>'+(p?'✓ Punkt etapu ustawiony.':'⚠ Nie ustawiono punktu etapu — kliknij mapę lub znacznik NPC.')+' Kliknij mapę lub znacznik istniejącego NPC / obiektu. Kropki pochodzą wyłącznie z punktów narzędzi mapy (NPC, Obiekt, Ognisko, Expowisko, Boss, Portal i ręcznie ustawiony Start). Grafiki NPC i obiektów z biblioteki, dekoracje i kolizje nie tworzą kropek. Starszy NPC z grafiką można jawnie oznaczyć jako ręczny znacznik w jego właściwościach. Nazwy zmienisz we właściwościach w zakładce Mapy i obiekty. W grze pojawi się tylko wykrzyknik, bez dodatkowej grafiki i podpisu. Oryginalny obiekt i jego quest pozostaną bez zmian.</p>'+(map?'<p>Dostępne punkty interakcji: '+markers.length+'. Najedź na znacznik, aby sprawdzić jego współrzędne.</p>':'')+preview+(p?'<button type="button" data-stage-clear="'+i+'">Usuń punkt etapu</button>':'')+'</details>';
 }
 function storyEnemyView(st,i){
  const e=st.enemy||newStoryEnemy(),prefix='step.'+i+'.enemy.';
  return '<div class="dbi-gme-story-enemy"><h4>⚔ Przeciwnik fabularny</h4><div class="dbi-gme-fields">'+field('Nazwa',prefix+'name',e.name)+field('Rasa',prefix+'race',e.race)+field('Portret (assets/...; puste = automatyczny)',prefix+'art',e.art||'',{placeholder:window.DBIWorld.defaultEnemyPortrait})+Object.entries(storyFields).map(([key,label])=>field(label,prefix+key,e[key],{type:'number',min:key==='hp'||key==='level'?1:0,max:999999999,step:1})).join('')+'</div><p>Walka fabularna 1 na 1, w istniejącym systemie 21 rund. Etap zalicza tylko zwycięstwo.</p></div>';
 }
 function continueJourney(){
  let q=state.pack.quests.find(q=>q.id===JOURNEY_ID);
  if(!q){q={id:JOURNEY_ID,name:'Pierwsza Podróż',mapId:'armyBase',steps:[newStep('armyBase')]};state.pack.quests.push(q);state.openSteps.add(q.steps[0])}
  state.questId=q.id;state.legacyQuestId=null;state.tab='quests';saveDraft();draw();
 }
 function stageTeleportView(q,st,i){
  const t=st.teleport,prefix='step.'+i+'.teleport.',m=t&&projectMapData(t.mapId);
  const preview=m&&t.mode==='point'?'<div class="dbi-gme-quest-map" data-teleport-map="'+i+'" style="aspect-ratio:'+m.sizeX+'/'+m.sizeY+';'+(m.terrain?'':'background-image:url(&quot;'+esc(m.art)+'&quot;)')+'">'+(m.terrain?'<canvas data-teleport-terrain="'+i+'"></canvas>':'')+'<span class="dbi-gme-stage-pin" style="left:'+t.x/(m.sizeX*32)*100+'%;top:'+t.y/(m.sizeY*32)*100+'%">✦</span></div>':'';
  return '<details class="dbi-gme-stage-location" '+(t?'open':'')+'><summary>🚪 Po ukończeniu etapu: '+esc(t?(m?.name||t.mapId):'Bez przenoszenia')+'</summary><div class="dbi-gme-fields">'+field('Mapa docelowa',prefix+'mapId',t?.mapId||'',{options:[['','Bez przenoszenia'],...allLocations().map(m=>[m.id,m.name])]})+(t?field('Miejsce pojawienia się',prefix+'mode',t.mode,{options:[['spawn','Punkt startowy mapy'],['point','Własna pozycja']] }):'')+(m&&t.mode==='point'?field('X (px)',prefix+'x',t.x,{type:'number',min:0,max:m.sizeX*32-1})+field('Y (px)',prefix+'y',t.y,{type:'number',min:0,max:m.sizeY*32-1}):'')+'</div><p>Teleport następuje po zaliczeniu wymagań i odebraniu nagrody, także na ostatnim etapie. '+(t?.mode==='point'?'Kliknij mapę docelową, aby wskazać miejsce. ':'')+'Mapa następnego etapu pozostaje niezależnym ustawieniem.</p>'+preview+'</details>';
 }
 // Expansion is editor-only state, keyed by step object (not its mutable index).
 // Do not serialize it into the draft or published quest.
 function stepSummary(q,st){
  const mapId=stepMap(q,st),mapName=allLocations().find(m=>m.id===mapId)?.name||mapId||'Brak mapy';
  const req=st.requirement==='upgrade'?upgradeGoal(st):st.requirement==='story'?'Pokonaj: '+(st.enemy?.name||'przeciwnika fabularnego'):st.requirement==='kill'?'Pokonaj: '+killGoal(q,st,state.pack)+' ×'+(st.count||1):st.requirement==='item'?'Oddaj: '+(pickupCatalog().find(item=>item.id===st.target)?.name||st.target||'—')+' ×'+(st.count||1):st.requirement==='level'?'Poziom '+(st.count||1):st.requirement==='quest'?'Ukończ: '+(state.pack.quests.find(other=>other.id===st.requiredQuestId)?.name||(st.requiredQuestId==='legacy-town-journey'?'Pierwsza Podróż (dotychczasowa fabuła)':st.requiredQuestId||'—')):'Rozmowa';
  const dialog=String(st.dialog||'').replace(/\s+/g,' ').trim(),excerpt=dialog.length>100?dialog.slice(0,100)+'…':dialog;
  return [mapName,req,excerpt].filter(Boolean).join(' · ');
 }
 function stepHeader(q,st,i){
  const expanded=state.openSteps.has(st);
  return '<div class="dbi-gme-step-title" style="margin-bottom:'+(expanded?'11px':'0')+';align-items:center"><button type="button" data-gme-toggle-step="'+i+'" aria-expanded="'+expanded+'" aria-controls="dbi-gme-step-body-'+i+'" style="flex:1;text-align:left;min-width:0;overflow-wrap:anywhere;padding:8px 10px"><b style="color:#ffca79">'+(expanded?'▼':'▶')+' Etap '+(i+1)+'</b><span style="display:block;margin-top:4px;font-size:11px;color:#c4d6e8;font-weight:400">'+esc(stepSummary(q,st))+'</span></button>'+(expanded?'<button type="button" class="danger" data-gme-delete-step="'+i+'">Usuń etap</button>':'')+'</div>';
 }
 function killTargetView(q,st,i){
  const prefix='step.'+i+'.',roster=farmingRoster(stepMap(q,st),state.pack),byRoster=Array.isArray(st.killVariants);
  const choices=[...(roster.some(Boolean)?[['roster',roster[0]||'Expowisko']]:[['roster','Brak mobów na mapie etapu']]),['exact','Dokładna nazwa (stary sposób)']];
  let html=field('Przeciwnik z expowiska (mapa etapu)',prefix+'killMode',byRoster?'roster':'exact',{options:choices});
  if(!byRoster)return html+field('Dokładna nazwa przeciwnika',prefix+'target',st.target||'')+'<p>Wybierz przeciwnika z expowiska na liście powyżej, aby zaliczać kilka wariantów.</p>';
  html+='<div class="dbi-gme-field"><span>Zaliczane warianty</span>'+killRankNames.map((name,n)=>'<label style="display:flex;align-items:center;gap:8px;margin:4px 0"><input style="width:auto" type="checkbox" data-gme-kill-variant="'+i+':'+n+'" '+(st.killVariants.includes(n)&&roster[n]?'checked ':'')+(roster[n]?'':'disabled')+'> '+esc(name+(roster[n]?' — '+roster[n]:' — niedostępny'))+'</label>').join('')+'<small>Każde pokonanie zaznaczonego wariantu dodaje 1 do wspólnego licznika. Mapa expowiska = mapa etapu.</small></div>';
  return html;
 }
 function resetKillRoster(q,step,pack){
  const roster=farmingRoster(stepMap(q,step),pack);
  const available=roster.flatMap((name,i)=>name?[i]:[]);
  step.killVariants=available.length?available:[0,1,2];step.target=roster[0]||'';
 }
 function questView(){
  const q=currentQuest(),legacy=legacyQuest(),legacyQuests=legacyCatalog().quests;
  const list='<div class="dbi-gme-projects"><strong>Istniejące questy ('+legacyQuests.length+')</strong>'+legacyQuests.map(x=>'<button type="button" data-gme-legacy-quest="'+esc(x.id)+'" class="dbi-gme-legacy-option '+(x.id===state.legacyQuestId?'active':'')+'">'+esc(x.name)+'</button>').join('')+
   '<strong>Questy projektu ('+state.pack.quests.length+')</strong>'+state.pack.quests.map(x=>'<button type="button" data-gme-quest="'+esc(x.id)+'" class="'+(x.id===state.questId?'active':'')+'">'+esc(x.name)+'</button>').join('')+'<button type="button" data-gme-command="add-quest">+ Nowy quest</button></div>';
  if(legacy){
   const steps=(legacy.steps||[]).map((s,i)=>'<article class="dbi-gme-step"><div class="dbi-gme-step-title"><b>Etap / cel '+(i+1)+'</b></div><p>'+esc(s.dialog||'')+'</p>'+(s.requirement?'<p><b>Wymaganie:</b> '+esc(s.requirement)+'</p>':'')+(s.reward?'<p><b>Nagroda:</b> '+esc(s.reward)+'</p>':'')+(s.button?'<p><b>Przycisk:</b> '+esc(s.button)+'</p>':'')+'</article>').join('');
   return '<div class="dbi-gme-quest-layout">'+list+'<section class="dbi-gme-quest-edit dbi-gme-legacy-quest"><span class="dbi-gme-tag">QUEST FABULARNY</span><h3>'+esc(legacy.name)+'</h3><p><b>NPC / punkt fabularny:</b> '+esc(legacy.npc)+'</p><p><b>Lokacje:</b> '+legacy.mapIds.map(id=>esc(legacyCatalog().maps.find(m=>m.id===id)?.name||id)).join(' · ')+'</p><p>'+esc(legacy.summary)+'</p><p><button type="button" data-gme-command="native-quest">Edytuj dotychczasowe etapy</button>'+(['legacy-woodcutter','legacy-town-journey'].includes(legacy.id)?'<button type="button" data-gme-command="continue-journey">+ Dodaj dalsze etapy Pierwszej Podróży</button>':'')+'</p><div class="dbi-gme-inline">'+legacy.mapIds.map(id=>'<button type="button" data-gme-map="'+esc(id)+'">🗺 '+esc(legacyCatalog().maps.find(m=>m.id===id)?.name||id)+'</button>').join('')+'</div>'+ (steps||'<p>Otwórz edycję, aby zobaczyć dialogi i warunki tej fabuły.</p>')+'</section></div>';
  }
  if(!q)return '<div class="dbi-gme-quest-layout">'+list+'<p>Dodaj quest i przypisz go do NPC w edytorze mapy.</p></div>';
  const steps=q.steps.map((st,i)=>'<article class="dbi-gme-step" style="scroll-margin-top:90px" data-gme-step-card="'+i+'">'+stepHeader(q,st,i)+'<div id="dbi-gme-step-body-'+i+'" '+(state.openSteps.has(st)?'':'hidden')+'>'+(state.openSteps.has(st)?'<div class="dbi-gme-fields">'+
   field('Treść dialogu','step.'+i+'.dialog',st.dialog,{textarea:true,placeholder:'[Generał] Witaj, {gracz}!\n[{gracz}] Witaj, generale!'})+'<p style="font-size:12px;color:#c4d6e8;margin:0">Wpisz <code>{gracz}</code>, aby wstawić nick aktualnej postaci. Każdą wypowiedź zacznij od <code>[Nazwa NPC]</code> lub <code>[{gracz}]</code> w nowej linii. Znacznik działa również w tekście przycisku.</p>'+field('Przycisk','step.'+i+'.button',st.button||'Dalej')+
   field('Wymaganie','step.'+i+'.requirement',st.requirement||'none',{options:[['none','Brak (rozmowa)'],['level','Poziom postaci'],['item','Oddaj przedmiot'],['upgrade','Oddaj przedmiot do ulepszenia'],['kill','Pokonaj przeciwników (expowisko)'],['story','Pokonaj przeciwnika fabularnego'],['quest','Ukończ quest']]})+
   (st.requirement==='upgrade'?upgradeConfig(st,i):st.requirement==='quest'?field('Wymagany quest','step.'+i+'.requiredQuestId',st.requiredQuestId||'',{options:[['','Wybierz zadanie'],['legacy-town-journey','Pierwsza Podróż (dotychczasowa fabuła)'],...state.pack.quests.filter(other=>other.id!==q.id).map(other=>[other.id,other.name])] }):
    st.requirement==='story'||st.requirement==='none'?'':(st.requirement==='item'?field('Przedmiot do oddania','step.'+i+'.target',st.target||'',{options:[['','Wybierz przedmiot'],...pickupCatalog().map(item=>[item.id,item.name])],searchable:true}):st.requirement==='kill'?killTargetView(q,st,i):'')+
    field('Wymagana liczba / poziom','step.'+i+'.count',st.count||1,{type:'number',min:1,max:100000}))+
   rewardsView(st,i)+'</div>'+(st.requirement==='story'?storyEnemyView(st,i):'')+stageLocationView(q,st,i)+stageTeleportView(q,st,i):'')+'</div></article>').join('');
  return '<div class="dbi-gme-quest-layout">'+list+'<section class="dbi-gme-quest-edit"><div class="dbi-gme-fields">'+(q.id===JOURNEY_ID?'<p><strong>Pierwsza Podróż — dalsze etapy</strong><br>Kontynuacja od zakończonego etapu w Mieście pod Górami. Dotychczasowe zapisy graczy pozostają bez zmian.</p>':field('ID questa','quest.id',q.id)+field('Nazwa questa','quest.name',q.name))+field('Mapa powiązana','quest.mapId',q.mapId,{options:allLocations().map(m=>[m.id,m.name])})+'</div><p>Każdy etap może mieć własną mapę oraz punkt interakcji. Możesz też użyć dotychczasowego przypisania do NPC. Etapy wykonują się po kolei, a postęp zapisuje się dla każdej postaci.</p><div class="dbi-gme-inline"><button type="button" data-gme-command="test-quest">Testuj quest od początku (GM)</button><button type="button" data-gme-command="publish-live">Włącz questy w grze (lokalnie)</button><button type="button" class="danger" data-gme-command="delete-quest">Usuń quest</button></div><div class="dbi-gme-inline" style="position:sticky;top:0;z-index:4;background:#10243b;border:1px solid #466986;border-radius:7px;padding:8px;margin-top:12px"><button type="button" data-gme-command="add-step">+ Dodaj etap</button><button type="button" data-gme-command="collapse-steps">Zwiń wszystkie</button><button type="button" data-gme-command="expand-steps">Rozwiń wszystkie</button><span style="font-size:12px;color:#c4d6e8">Etapy: '+q.steps.length+'</span></div>'+steps+'<div class="dbi-gme-inline" style="margin-top:12px"><button type="button" data-gme-command="add-step">+ Dodaj etap</button><button type="button" data-gme-command="collapse-steps">Zwiń wszystkie</button></div></section></div>';
 }
 function publicationData(pack=state.pack){
  const deployed=clone(pack);delete deployed.nativeEdits;delete deployed.baseRevision;delete deployed.adoptedPalace;delete deployed.palaceTeleportOnly;deployed.includesPublished=true;
  deployed.revision=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);return deployed;
 }
 function publicationError(issues){state.tab='publish';draw();setStatus('Publikacja zablokowana: '+issues[0]);}
 function publishLive(){
  const issues=validate(state.pack);if(issues.length)return publicationError(issues);
  // A native-only attachment needs an installed script; points are data-driven.
  if(Object.keys(state.pack.nativeEdits||{}).length&&!confirm('Włączyć questy i nowe mapy w bieżącej grze? Zmiany kodu starych map i questów wymagają osobnego ZIP. Punkty etapów działają niezależnie.'))return;
  if(!saveDraft())return;
  try{const p=publicationData();p.baseRevision=window.DBIWorldProjectSignature(window.DBI_GM_WORLD_DATA);localStorage.setItem(PUBLISHED_KEY,JSON.stringify(p));runtimeQuests=undefined;runtimePickups=undefined;
   if(!confirm('Włączono lokalnie '+p.quests.length+' questów. Odświeżyć grę teraz?')){setStatus('Opublikowano lokalnie. Odśwież grę, aby wczytać także mapy.');return}
   location.reload();
  }catch(e){setStatus('Nie udało się opublikować: '+e.message)}
 }
 async function publishOriginals(name,pack=state.pack,report=setStatus){
  const issues=validate(pack);
  if(issues.length)return report===setStatus?publicationError(issues):report('Publikacja zablokowana: '+issues[0]);
  if(report===setStatus&&!saveDraft())return;
  const test=name!=='download-js',questTest=name==='test-quest';
  if(questTest&&!/^https?:$/.test(location.protocol))return setStatus('Odizolowany test wymaga HTTP/HTTPS. Otwórz grę przez lokalny serwer lub GitHub Pages.');
  let seed=null;
  if(questTest){try{seed=questTestSeed(currentQuest())}catch(e){return setStatus(e.message)}}
  const tab=test?window.open('about:blank','_blank'):null;
  if(test&&!tab)return setStatus('Zezwól na otwarcie karty testowej.');
  try{
   const native=Object.keys(pack.nativeEdits||{}).length>0;
   if(native){
    if(location.protocol==='file:')throw Error('Projekt zawiera zmiany kodu starych map lub questów. Otwórz grę przez HTTP/HTTPS (lokalny serwer lub GitHub Pages) i ponów eksport. Szkic jest zapisany; nie pominięto żadnych zmian.');
    try{await window.DBINativeEditor.load(true)}catch(e){throw Error('Nie można odczytać kodu starych map/questów (js/world.js lub js/app.js): '+e.message+'. Szkic zapisany; ponów eksport po przywróceniu dostępu do plików.')}
   }
   const output=native?window.DBINativeEditor.build(pack.nativeEdits):{};
   const deployed=publicationData(pack);
   deployed.gmContent=window.DBIContent.read();
   deployed.gmCatalog=window.DBIGmPublicationCatalog();
   output['data/gm-world-published.json']=JSON.stringify(deployed,null,2)+'\n';
   if(test){await window.DBINativeEditor.preview(tab,output,seed);setStatus(questTest?'Quest od początku w odizolowanej karcie — prawdziwy postęp nie jest zmieniany.':'Projekt uruchomiony w odizolowanej karcie testowej.');}
   else{
    let versioned=false;
    if(native){
     try{
      const response=await fetch(new URL('index.html',document.baseURI),{cache:'no-store'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const html=await response.text(),changed=new Set();
      const updated=html.replace(/(<script\b[^>]*\bsrc=["'])([^"'?]+)(?:\?[^"']*)?(["'])/gi,(all,lead,path,end)=>{
       const key=path.replace(/^\.\//,'');
       if(!Object.hasOwn(output,key))return all;
       changed.add(key);return lead+path+'?v='+deployed.revision+end;
      });
      if(!html.includes('dbi-world-data-loader')||!Object.keys(output).filter(k=>k.endsWith('.js')).every(key=>changed.has(key)))throw Error('Nieprawidłowy index.html lub brak odwołania do pliku.');
      output['index.html']=updated;versioned=true;
     }catch(e){console.warn('Kreator GM: eksport bez index.html:',e.message)}
    }
    window.DBINativeEditor.saveZip(output);
    report('Pobrano ZIP z publikacją w data/gm-world-published.json. Rozpakuj pliki do folderu gry z zachowaniem ścieżek. Gra wczyta publikację przez HTTP/HTTPS.'+(native&&!versioned?' Odśwież stronę skrótem Ctrl+F5.':''));
   }
  }catch(e){tab?.close();report('Nie udało się przygotować zmian: '+e.message)}
 }
 function characterDiagnostics(q){
  if(!q)return '';
  try{
   const session=JSON.parse(sessionStorage.getItem('dboidle_demo_session_v1')||'null');
   const chars=JSON.parse(localStorage.getItem('dboidle_characters_v1_'+String(session?.name||'').toLowerCase())||'[]');
   if(!Array.isArray(chars)||!chars.length)return '';
   return '<h4>Dostępność kontynuacji dla postaci na tym koncie</h4><ul>'+chars.map(c=>{
    const p=getQuestProgress(c.id,q.id),step=q.steps?.[p.stage];
    const msg=!questUnlocked(q,c.id)?'Zablokowana — ukończ poprzednią fabułę':!step?'Ukończona ('+q.steps.length+'/'+q.steps.length+')':'Dostępna — etap '+(p.stage+1)+'/'+q.steps.length+' · '+(builtins().find(m=>m.id===stepMap(q,step))?.name||stepMap(q,step));
    return '<li><b>'+esc(c.name)+'</b>: '+esc(msg)+'</li>';
   }).join('')+'</ul>';
  }catch{return '<p>Nie udało się odczytać listy postaci.</p>'}
 }
 function questTestSeed(q){
  if(!window.DBIGmAccess?.hasSession?.())throw Error('Test dostępny tylko dla GM.');
  const active=JSON.parse(sessionStorage.getItem(charKey)||'null'),session=JSON.parse(sessionStorage.getItem('dboidle_demo_session_v1')||'null');
  if(!active?.id||!session?.name||active.account!==session.name.toLowerCase())throw Error('Brak aktywnej postaci.');
  if(!q?.steps?.length)throw Error('Wybierz quest z co najmniej jednym etapem.');
  const id=active.id,first=q.steps[0],mapId=stepMap(q,first),map=projectMapData(mapId)||builtins().find(m=>m.id===mapId);
  const entry=map?.spawn||first.point;
  if(!entry)throw Error('Ustaw punkt pierwszego etapu, aby przetestować quest na mapie bez startu.');
  const charsKey='dboidle_characters_v1_'+session.name.toLowerCase();
  const chars=JSON.parse(localStorage.getItem(charsKey)||'[]'),character=chars.find(c=>c.id===id);
  if(!character)throw Error('Nie znaleziono postaci.');
  // These are overlay writes only, never writes to real localStorage.
  const writes={ [questProgressKey(id,q.id)]:JSON.stringify({stage:0,kills:0}), ['dboidle_battle_v1_'+id]:null,
   ['dboidle_world_v1_'+id]:JSON.stringify({location:mapId,x:entry.x,y:entry.y,dir:'down'}) };
  for(const p of state.pack.pickups||[])if(p.questId===q.id)writes[pickupKey(id,p.id)]=null;
  if(q.id===JOURNEY_ID){
   writes['dboidle_north_journey_v1_'+id]=JSON.stringify({stage:16,kills:0,won:true});
   writes['dboidle_town_journey_v1_'+id]=JSON.stringify({stage:5,won:true});
  }
  // Clear reward claim flags in the isolated copy, preserving current stats.
  if(character.questRewards){for(const key of Object.keys(character.questRewards))if(key.startsWith('gm-quest:'+q.id+':'))delete character.questRewards[key]}
  writes[charsKey]=JSON.stringify(chars);
  return {writes,characterId:id};
 }
 function publishView(){
  const problems=validate(state.pack),native=Object.keys(state.pack.nativeEdits||{}).length;
  const live=currentPublished(),journey=state.pack.quests.find(q=>q.id===JOURNEY_ID),publishedJourney=live.quests.find(q=>q.id===JOURNEY_ID);
  let char;try{char=JSON.parse(sessionStorage.getItem(charKey)||'null')}catch{}
  const status=char?.id?(originalJourneyDone(char.id)?'Dotychczasowa fabuła ukończona.':'Dotychczasowa fabuła nieukończona: kontynuacja odblokuje się po rozmowie z Prezydentem i Generałem.'):'Brak aktywnej postaci.';
  const diagnostic=journey?'<p><b>Pierwsza Podróż:</b> projekt: '+journey.steps.length+' etapów; w bieżącej publikacji: '+(publishedJourney?.steps?.length||0)+'. '+esc(status)+'</p>':'';
  return '<div class="dbi-gme-publish"><h3>Zapis i publikacja</h3><p>Projekt: '+state.pack.maps.length+' map, '+state.pack.quests.length+' questów. W bieżącej publikacji: '+live.quests.length+' questów.</p>'+diagnostic+characterDiagnostics(publishedJourney)+(window.DBI_GM_WORLD_LOAD_ERROR?'<p class="dbi-gme-errors">Błąd wczytania JSON: '+esc(window.DBI_GM_WORLD_LOAD_ERROR)+'</p>':'')+(native?'<p>Zmiany kodu starych map i questów ('+native+') wymagają eksportu ZIP lub odizolowanej karty testowej.</p>':'')+(problems.length?'<div class="dbi-gme-errors"><b>Popraw przed publikacją:</b><ul>'+problems.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>':'<p class="dbi-gme-valid">✓ Projekt gotowy do publikacji.</p>')+'<div class="dbi-gme-publish-actions"><button data-gme-command="save">Zapisz projekt (szkic)</button><button data-gme-command="publish-live">Włącz questy w grze (lokalnie)</button><button data-gme-command="publish-local">Otwórz odizolowany test</button>'+(state.pack.maps.length?'<button data-gme-command="test-map">Testuj wybraną mapę</button>':'')+'<button data-gme-command="download-js">Pobierz ZIP na GitHub</button><button data-gme-command="export">Eksport projektu JSON</button><button data-gme-command="import-trigger">Import projektu JSON</button></div><input hidden type="file" data-gme-import accept=".json"><p>ZIP zawiera projekt świata, katalog przedmiotów, zawartość skrzyń i ustawienia mobów oraz bossów z Panelu GM. Rozpakuj wszystkie pliki do folderu gry z zachowaniem ścieżek. Eksport zmian kodu starych map wymaga otwarcia gry przez HTTP/HTTPS.</p></div>';
 }
 // The map and sidebar scroll independently of the page. Replacing the editor DOM
 // otherwise discards their positions, focus and manually expanded material groups.
 function rememberView(root){
  const scrolls=[];
  for(let parent=root;parent;parent=parent.parentElement){
   if(parent.scrollTop||parent.scrollLeft)scrolls.push([parent,parent.scrollLeft,parent.scrollTop]);
  }
  const wrap=root.querySelector('.dbi-gme-map-wrap');
  const projects=root.querySelector('.dbi-gme-projects');
  const local=[['.dbi-gme-map-wrap',wrap],['.dbi-gme-projects',projects]].map(([selector,el])=>[selector,el?.scrollLeft||0,el?.scrollTop||0]);
  const groups=Array.from(root.querySelectorAll('.dbi-gme-material-group'),g=>g.open);
  const libraryExpanded=root.querySelector('.dbi-gme-prop-library')?.open;
  const x=window.scrollX,y=window.scrollY,focus=document.activeElement;
  const id=focus&&root.contains(focus)&&Array.from(focus.attributes).find(a=>a.name.startsWith('data-'));
  return ()=>{
   root.querySelectorAll('.dbi-gme-material-group').forEach((g,i)=>{if(i<groups.length)g.open=groups[i]});
   const libraryPanel=root.querySelector('.dbi-gme-prop-library');
   if(libraryPanel&&typeof libraryExpanded==='boolean')libraryPanel.open=libraryExpanded;
   if(id)root.querySelector('['+id.name+'="'+CSS.escape(id.value)+'"]')?.focus({preventScroll:true});
   for(const [selector,left,top] of local){const el=root.querySelector(selector);if(el){el.scrollLeft=left;el.scrollTop=top}}
   for(const [el,left,top] of scrolls){el.scrollLeft=left;el.scrollTop=top}
   if(window.scrollX!==x||window.scrollY!==y)window.scrollTo({left:x,top:y,behavior:'instant'});
  };
 }
 function showOverview(){
  const source=state.root.querySelector('[data-gme-map-stage]');if(!source)return;
  const dialog=document.createElement('dialog');dialog.className='dbi-gme-overview';
  const close=document.createElement('button');close.type='button';close.textContent='Zamknij podgląd';close.onclick=()=>dialog.close();
  const copy=source.cloneNode(true),map=currentMap();
  copy.removeAttribute('data-gme-map-stage');copy.classList.remove('show-grid');
  copy.style.width='min(86vw, '+(74*map.sizeX/map.sizeY)+'vh)';copy.style.minHeight='0';copy.inert=true;
  const originals=source.querySelectorAll('canvas');
  copy.querySelectorAll('canvas').forEach((canvas,i)=>canvas.getContext('2d').drawImage(originals[i],0,0));
  copy.querySelectorAll('.dbi-gme-block,.dbi-gme-drawing,.dbi-gme-brush-ghost').forEach(el=>el.remove());
  dialog.append(copy,close);document.body.appendChild(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
 }
 function draw(){
  if(!state)return;
  ensurePortalIds(state.pack);
  const restore=rememberView(state.root);
  state.root.innerHTML='<div class="dbi-gme">'+editorTop()+'<div class="dbi-gme-content">'+(state.tab==='maps'?'<aside class="dbi-gme-sidebar">'+mapSelect()+'</aside>'+mapView():state.tab==='pickups'?pickupView():state.tab==='enemies'?encountersView():state.tab==='quests'?questView():publishView())+'</div><footer class="dbi-gme-footer"><span data-gme-status role="status">'+esc(lastStatus||'Zapis projektu nie publikuje questów w grze. Użyj opcji Włącz w grze.')+'</span><button type="button" data-gme-command="save">Zapisz</button></footer></div>';
  restore();
  wireRewardImages(state.root);
  wireStage();
  drawPickupTerrain();
  drawTerrainPreview();
  animatePreview();
  drawStageTerrains();
 }
 function drawStageTerrains(){if(!state)return;
  for(const canvas of state.root.querySelectorAll('[data-teleport-terrain]')){const t=currentQuest()?.steps[Number(canvas.dataset.teleportTerrain)]?.teleport,m=t&&projectMapData(t.mapId);if(m?.terrain){canvas.width=m.sizeX*32;canvas.height=m.sizeY*32;terrain.draw(canvas.getContext('2d'),m)}}
  for(const canvas of state.root.querySelectorAll('[data-stage-terrain]')){const q=currentQuest(),st=q?.steps[Number(canvas.dataset.stageTerrain)],m=st&&projectMapData(stepMap(q,st));if(m?.terrain){canvas.width=m.sizeX*32;canvas.height=m.sizeY*32;terrain.draw(canvas.getContext('2d'),m)}}
 }
 // Coordinates are in tiles; sprites are anchored by the centre of their base.
 const realmLayouts={
 "Namek · archipelag": [
  [
   "Dom Nameczanina",
   9,
   10
  ],
  [
   "Dom rady wioski",
   13,
   9
  ],
  [
   "Zbiornik ze źródlaną wodą",
   8,
   14
  ],
  [
   "Sadzonki ajisy",
   12,
   15
  ],
  [
   "Drzewo ajisa",
   6,
   11
  ],
  [
   "Ajisa trójkoronna",
   30,
   8
  ],
  [
   "Zagajnik ajisy",
   32,
   15
  ],
  [
   "Łódź muszlowa",
   16,
   14
  ],
  [
   "Dende",
   12,
   12
  ],
  [
   "Moori",
   30,
   12
  ]
 ],
 "Namek · płaskowyż Starszego": [
  [
   "Siedziba Wielkiego Starszego",
   23,
   9
  ],
  [
   "Chata na skalnej nodze",
   12,
   12
  ],
  [
   "Brama Nameczan",
   20,
   15
  ],
  [
   "Jasny koral lądowy",
   28,
   13
  ],
  [
   "Liliowy krzew",
   8,
   15
  ],
  [
   "Nail",
   21,
   13
  ],
  [
   "Wielki Starszy Guru",
   23,
   10
  ]
 ],
 "Namek · obóz imperium": [
  [
   "Okręt flagowy Freezera",
   20,
   8
  ],
  [
   "Fotel lewitacyjny imperatora",
   18,
   12
  ],
  [
   "Moduł odwiertu",
   29,
   12
  ],
  [
   "Generator pola",
   11,
   12
  ],
  [
   "Kapsuła medyczna",
   27,
   8
  ],
  [
   "Freezer (pierwsza forma)",
   20,
   11
  ],
  [
   "Zarbon",
   16,
   13
  ],
  [
   "Dodoria",
   24,
   13
  ]
 ],
 "Namek · ostatnie chwile": [
  [
   "Wrak silnika",
   10,
   10
  ],
  [
   "Chata na skalnej nodze",
   30,
   13
  ],
  [
   "Nameczańskie smocze kule",
   17,
   12
  ],
  [
   "Porunga",
   21,
   9
  ],
  [
   "Son Goku",
   19,
   14
  ],
  [
   "Freezer",
   23,
   14
  ]
 ],
 "Przyszłość · laboratorium czasu": [
  [
   "Warsztat wehikułów",
   12,
   8
  ],
  [
   "Wehikuł czasu z otwartą kabiną",
   20,
   12
  ],
  [
   "Konsola daty i celu",
   15,
   13
  ],
  [
   "Rdzeń chrononowy",
   26,
   9
  ],
  [
   "Fotel pilota czasu",
   24,
   14
  ],
  [
   "Zasobnik paliwa wehikułu",
   10,
   14
  ],
  [
   "Trunks z przyszłości",
   18,
   15
  ],
  [
   "Bulma",
   14,
   14
  ]
 ],
 "Przyszłość · ruiny miasta": [
  [
   "Ruina metropolii",
   28,
   9
  ],
  [
   "Porzucony wehikuł czasu",
   13,
   11
  ],
  [
   "Wrak silnika",
   25,
   16
  ],
  [
   "Zniszczona plansza",
   8,
   17
  ],
  [
   "Trunks z przyszłości",
   16,
   13
  ],
  [
   "Android 17",
   27,
   12
  ]
 ],
 "Ziemia · turniej sztuk walki": [
  [
   "Hala mistrzostw",
   20,
   7
  ],
  [
   "Plansza turniejowa",
   20,
   14
  ],
  [
   "Trybuny",
   9,
   12
  ],
  [
   "Trybuny",
   31,
   12
  ],
  [
   "Gong mistrzów",
   25,
   17
  ],
  [
   "Mr. Satan",
   20,
   15
  ],
  [
   "Videl",
   24,
   16
  ]
 ],
 "Zaświaty · sąd dusz": [
  [
   "Stacja sądu dusz",
   20,
   9
  ],
  [
   "Brama astralnego pałacu",
   20,
   15
  ],
  [
   "Dzwon wiatru",
   13,
   13
  ],
  [
   "Wielki Kapłan",
   20,
   12
  ]
 ]
,
  'Statek – sala grawitacyjna':[['Platforma grawitacyjna',20,13],['Sterownik grawitacji',15,11],['Rdzeń reaktora',8,7],['Rdzeń reaktora',32,7],['Śluza otwarta',20,20],['Iluminator',15,5],['Iluminator',25,5],['Dron treningowy',23,11],['Pulpit nawigacyjny',20,6],['Lampy alarmowe',27,7],['Koja pokładowa',31,14],['Kontener zapasów',8,15],['Panel ścienny',10,5],['Panel ścienny',30,5],['Son Goku',19,14]],
  'Wyspa mistrza':[['Dom Morskiej Bryzy',19,10],['Palma z hamakiem',13,12],['Pomost rybacki',26,15],['Łódź przybrzeżna',28,16],['Mistrz Przypływu',19,13]],
  'Komnata wahadeł':[['Wrota wahadeł',20,8],['Klepsydra ciszy',15,11],['Klepsydra ciszy',25,11],['Krąg treningowy',20,15],['Porcelanowy Sparingpartner',22,15]],
  'Górskie dojo':[['Dojo Granatowego Liścia',20,8],['Gong mistrzów',25,11],['Wieża Pielgrzymów',9,11],['Gorące źródło',28,16],['Koci Mędrzec',19,11]],
  'Pałac ponad chmurami':[
   ['Pałac Jutrzenki',14,12],['Lampa podniebna',7,13],['Lampa podniebna',21,13],
   ['Cyprysy w marmurze',9,7],['Cyprysy w marmurze',19,7],
   ['Cyprysy w marmurze',10,15],['Cyprysy w marmurze',18,15],
   ['Palma dziedzińcowa',11.5,18.5],['Palma dziedzińcowa',16.5,18.5],
   ['Cyprysy w marmurze',8.5,22],['Cyprysy w marmurze',19.5,22],
   ['Namiestnik Nimbo',14,14],['Oru, mistrz powrotu',16,17]],
  'Osada Szmaragdowej Wody':[['Dom muszlowy',10,8],['Dom muszlowy',24,9],['Cysterna osady',16,13],['Drzewo świetlne',26,16],['Kryształ spiralny',8,15],['Uzdrowicielka Lotosu',17,14]],
  'Port orbitalny':[['Lądowisko',12,12],['Kamienica orbitalna',7,7],['Kopuła grawitacyjna',26,9],['Maszt sygnałowy',33,11],['Antena orbitalna',28,16],['Komora odnowy',22,13],['Badacz Grawitacji',20,14]],
  'Przystań zaświatów':[['Brama zaświatów',20,9],['Tron z bazaltu',13,12],['Dzwon wiatru',28,12],['Przewoźnik Eteru',20,14]]
 };
 function sagaTerrain(theme,x,y){
  const curve=Math.sin(x*.31+y*.12),patch=Math.sin(x*.61)*Math.cos(y*.43);
  if(theme==='Namek · archipelag'){
   const shore=Math.min(((x-10)/8.6)**2+((y-12)/8.2)**2,((x-30)/8)**2+((y-12)/8.6)**2)+curve*.09;
   if(y===12&&x>=16&&x<=24)return 'nmBridge';
   if(shore>1.8)return 'nmDeep';
   if(shore>1.27)return 'nmLake';
   if(shore>1)return 'nmShoal';
   if(shore>.80)return 'nmPearl';
   if(Math.abs(y-12)<1.1)return 'nmDust';
   return patch>.45?'nmLilac':patch<-.35?'nmMint':'nmAzure';
  }
  if(theme==='Namek · płaskowyż Starszego'){
   if(x<2||x>37||y<3)return 'nmChalk';
   if(y===10&&x>10&&x<31&&Math.abs(x-22)>2)return 'nmStrata';
   return y<10?'nmTop':Math.abs(x-21)<2?'nmDust':patch>.25?'nmMoss':'nmTurquoise';
  }
  if(theme==='Namek · obóz imperium'){
   if(x>33+curve||y>21)return 'nmLagoon';
   if(y<3)return 'nmCrag';
   return x>31+curve?'nmGravel':y<11&&x>12&&x<28?'deck':Math.abs(y-13)<2?'nmDust':'nmMint';
  }
  if(theme==='Namek · ostatnie chwile'){
   if(Math.abs(x-7-curve*2)<1||Math.abs(x-32+curve*2)<1)return 'nmFault';
   if(y<3||y>21)return 'nmObsidian';
   return patch>.3?'nmDry':'nmCinder';
  }
  if(theme==='Przyszłość · laboratorium czasu')return x<2||x>37||y<2||y>21?'wall':x%8===0?'deck':'nmCircuit';
  if(theme==='Przyszłość · ruiny miasta')return Math.abs(y-13)<2?'city':patch>.4?'nmCinder':'nmRuins';
  if(theme==='Ziemia · turniej sztuk walki')return x<2||x>37||y<2||y>21?'red_wall':x>9&&x<30&&y>5&&y<18?'nmArena':'meadow';
  if(theme==='Zaświaty · sąd dusz')return (x-20)**2/225+(y-11)**2/72<1?'temple':Math.abs(x-20)<=2?'spirit':'cloud';
  return null;
 }
 function buildRealm(map,theme,num){
  map.name=theme+' '+num;
  const ids=Object.fromEntries(terrain.palette.map(t=>[t.key,t.id]));
  const palace=theme==='Pałac ponad chmurami',afterlife=theme==='Przystań zaświatów';
  if(palace){
   map.sizeX=28;map.sizeY=28;map.terrain=terrain.create(28,28);
   map.terrain.terrace={x:448,y:437,r:400};
  }
  for(let y=0;y<map.sizeY;y++)for(let x=0;x<map.sizeX;x++){
   const oval=((x-19.5)/15)**2+((y-10)/8.5)**2;
   let key=sagaTerrain(theme,x,y);
   if(key){map.terrain.tiles[y*map.sizeX+x]=ids[key];continue}
   if(palace){
    const disk=map.terrain.terrace,d=Math.hypot((x+.5)*32-disk.x,(y+.5)*32-disk.y);
    key=d<disk.r-24?'ivory':d<=disk.r+38?'gold':'sky';
   }else if(afterlife){
    key=afterlife?'twilight':'sky';
    if(oval<=1)key=afterlife?'ash':oval>.84?'gold':x===19||x===20?'jade':'ivory';
    if(y>=15&&y<=22&&x>=18&&x<=21)key=afterlife?'spirit':'bridge';
   }else if(theme==='Statek – sala grawitacyjna'){
    const hull=x<4||x>35||y<2||y>21||((x<7||x>32)&&(y<4||y>19));
    key=hull?'space':y<5||x===4||x===35?'wall':((x-20)**2+(y-12)**2<32?'metal':x%8===0||y%6===0?'deck':'hangar');
   }else if(theme==='Wyspa mistrza'){
    const island=((x-19)/13)**2+((y-12)/8)**2+.08*Math.sin(y*.75);
    key=island>1?'water':island>.76?'beach':'grass_lush';
   }else if(theme==='Komnata wahadeł'){key=x%10===0||y%8===0?'temple':'ivory'}
   else if(theme==='Górskie dojo'){key=x<3||x>36||y<3?'cliff':Math.abs(x-20)<2||Math.abs(y-13)<2?'courtyard':'snow'}
   else if(theme==='Port orbitalny'){key=x%10<2||y%8<2?'deck':'hangar'}
   else{key=x>30+Math.sin(y*.4)*3?'alienLake':Math.abs(y-11-Math.sin(x*.22)*2)<1.5?'alienSoil':'alienMeadow'}
   map.terrain.tiles[y*map.sizeX+x]=ids[key];
  }
  map.spawn=palace?{x:448,y:720}:{x:20*32+16,y:(afterlife?21:17)*32+16};
  if(theme==='Namek · archipelag')map.spawn={x:10*32+16,y:12*32+16};
  if(theme==='Namek · płaskowyż Starszego')map.terrain.heights=map.terrain.tiles.map((_,i)=>Math.floor(i/map.sizeX)<10?2:0);
  const items=library();
  for(const [name,x,y] of realmLayouts[theme]){
   const p=items.find(entry=>entry.name===name);
   if(p.group==='NPC')map.npc.push({x:x*32,y:y*32,label:p.name,art:p.art,questId:'',placementTool:'library-npc',questMarker:false});
   else map.scenery.push({x:x*32-p.width/2,y:y*32-p.height,width:p.width,height:p.height,art:p.art,label:'',placementTool:'decoration',questMarker:false});
  }
 }
 function addMap(){
  let num=state.pack.maps.length+1,id='nowa-mapa-'+num;while(state.pack.maps.some(m=>m.id===id)||builtins().some(m=>m.id===id))id='nowa-mapa-'+(++num);
  state.pack.maps.push({id,name:'Nowa mapa '+num,sizeX:40,sizeY:24,art:'assets/world/army/terrain.webp',terrain:terrain.create(40,24),spawn:{x:128,y:128},blocked:[],npc:[],scenery:[],portals:[],mobNames:[]});state.mapId=id;const theme=state.root.querySelector('[data-map-theme]')?.value;
  if(realmLayouts[theme])buildRealm(currentMap(),theme,num);
  else if(theme&&theme!=='Równina'){
   const map=currentMap();map.name=theme+' '+num;
   const forest=theme==='Leśna zatoka',city=theme==='Miasto kapsuł';
   for(let y=0;y<map.sizeY;y++)for(let x=0;x<map.sizeX;x++){
    const shore=32+3*Math.sin(y*.34)-y*.18;
    map.terrain.tiles[y*map.sizeX+x]=forest?(x>shore+1?5:x>shore-1?3:(x<2||y>21)?6:Math.abs(y-11-Math.sin(x*.25)*3)<1.3?2:0):city?(x%10<2||y%8<2?25:22):(x<1||y<1||x===39||y===23?23:y>15?0:30);
   }
   const layout=forest?[['Wierzba',200,60],['Wiśnia',375,480],['Palmy',800,510],['Trzciny',890,365],['Wejście do jaskini',515,90],['Wodospad',900,120]]:city?[['Laboratorium',415,90],['Posiadłość',730,320],['Kapsuła zwiadowcza',220,370],['Pawilon widokowy',380,420],['Handlarz',910,210]]:[['Arena',580,180],['Hala eliminacji',240,230],['Pustelnik',535,315]];
   for(const [name,x,y] of layout){const p=terrain.props.find(p=>p.name===name);if(p.group==='NPC')map.npc.push({x,y,label:name,art:p.art,questId:'',placementTool:'library-npc',questMarker:false});else map.scenery.push({x,y,width:p.width,height:p.height,art:p.art,effect:p.effect,label:'',placementTool:'decoration',questMarker:false})}
  }
  state.selection=null;state.undo=[];state.redo=[];state.tab='maps';saveDraft();draw();
 }
 function addQuest(){let n=state.pack.quests.length+1,id='nowy-quest-'+n;while(state.pack.quests.some(q=>q.id===id))id='nowy-quest-'+(++n);
  const mapId=state.mapId||allLocations()[0]?.id||'';state.pack.quests.push({id,name:'Nowy quest '+n,mapId,steps:[{...newStep(mapId),dialog:'Witaj, podróżniku!'}]});state.questId=id;state.legacyQuestId=null;state.tab='quests';state.openSteps.add(currentQuest().steps[0]);saveDraft();draw();
 }
 function onCommand(name){const m=currentMap(),q=currentQuest();if(name==='edge-perimeter'&&m){state.edgeOpen=true;return edgeEdit(m,null,null,'perimeter')}if(name==='edge-refresh'&&m){const before=clone(m.scenery||[]);refreshEdges(m);if(!saveDraft()){m.scenery=before;return}state.edgeUndo={mapId:m.id,tiles:before.filter(isEdge)};draw();return}
  if(name==='edge-undo')return edgeUndo();if(name.startsWith('enc-'))return encounterCommand(name,m);
  if(name==='pickup-add'){
   const map=projectMapData(state.mapId),item=pickupCatalog()[0];if(!map||!item)return;
   const id='pickup-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
   (state.pack.pickups??=[]).push({id,mapId:map.id,x:Math.round(map.spawn?.x??map.sizeX*16),y:Math.round(map.spawn?.y??map.sizeY*16),itemId:item.id,amount:1,when:'always',questId:'',stage:0});state.pickupId=id;saveDraft();draw();return;
  }
  if(name==='pickup-delete'){if(!confirm('Usunąć przedmiot z mapy?'))return;state.pack.pickups=(state.pack.pickups||[]).filter(p=>p.id!==state.pickupId);state.pickupId=null;saveDraft();draw();return;}
  if(name==='sync-installed'){
   const deployed=window.DBI_GM_WORLD_DATA;if(deployed?.version!==1)return setStatus('Nie znaleziono opublikowanego projektu.');
   let count=0;
   for(const type of ['maps','quests','customArt','pickups']){
    const key=type==='customArt'?'key':'id',values=state.pack[type]??=[];
    for(const entry of deployed[type]||[])if(!values.some(v=>v[key]===entry[key])){values.push(clone(entry));count++}
   }
   if(saveDraft()){draw();setStatus('Wczytano brakujące elementy z opublikowanego projektu: '+count+'.')}return;
  }
  if(name==='continue-journey'){continueJourney();return}
  if(name==='native-map'||name==='native-quest'){
   const isMap=name==='native-map',item=isMap?legacyMap():legacyQuest();if(!item)return;
   window.DBINativeEditor.open({kind:isMap?'map':'quest',id:item.id,title:item.name,map:isMap?item:null,pack:state.pack,persist:saveDraft,onClose:()=>draw()}).catch(e=>setStatus('Błąd edytora: '+e.message));return;
  }
  if(name==='legacy-quests'){
   const list=legacyMapQuests(state.mapId);
   if(!list.length)return;
   state.legacyQuestId=list[0].id;state.questId=null;state.tab='quests';draw();return;
  }
  if(name==='legacy-copy'){
   const source=legacyMap();if(!source)return;
   let suffix=1,id='kopia-'+source.id.toLowerCase()+'-'+suffix;
   while(state.pack.maps.some(m=>m.id===id)||builtins().some(x=>x.id===id))id='kopia-'+source.id.toLowerCase()+'-'+(++suffix);
   const copy={id,name:source.name+' — kopia',sizeX:source.sizeX,sizeY:source.sizeY,art:source.art,spawn:clone(source.spawn),
    blocked:clone(source.blocked||[]),npc:(source.npc||[]).map(n=>({x:n.x,y:n.y,label:n.label||'NPC',art:n.art||'',scalePct:window.DBIWorld.npcSize(n).percent,questId:'',placementTool:'npc',questMarker:true})),
    scenery:(source.scenery||[]).filter(s=>s.art).map(s=>({x:s.x,y:s.y,width:s.width||64,height:s.height||64,label:s.label||'',art:s.art,placementTool:s.placementTool||((s.label||s.questId)?'object':'decoration'),questMarker:!!(s.label||s.questId)})),
    portals:(source.portals||[]).filter(p=>p.to&&!['laguna','island'].includes(p.to)).map(p=>({x:p.x,y:p.y,to:p.to,destinationArrival:clone(p.destinationArrival||p.arrival||{x:128,y:128})})),
    mobNames:clone(source.mobNames||[])};
   if(source.mobs)copy.mobs={x:source.mobs.x,y:source.mobs.y,label:source.mobs.label||'Expowisko',art:source.mobs.art||''};
   if(source.boss)copy.boss={x:source.boss.x,y:source.boss.y,label:source.boss.label||'Boss',art:source.boss.art||'',portrait:source.boss.portrait||''};
   state.pack.maps.push(copy);state.mapId=id;state.selection=null;saveDraft();draw();setStatus('Utworzono edytowalną kopię. Oryginalna mapa i jej questy pozostają bez zmian.');return;
  }
  if(name==='legacy-test'){
   const source=legacyMap();if(!source)return;
   let active=null;try{active=JSON.parse(sessionStorage.getItem(charKey)||'null')}catch{}
   const result=window.DBIWorld?.gmTeleport?.(active?.id,source.id);
   if(!result?.ok)return setStatus(result?.message||'Nie można przejść na tę mapę.');
   sessionStorage.setItem('dboidle_last_page_'+active.id,JSON.stringify({title:'Mapa świata',section:'ŚWIAT'}));location.reload();return;
  }

  if(name==='mode-tiles'&&m){if(!m.terrain){m.terrain=terrain.create(m.sizeX,m.sizeY);state.tool='tile-brush';state.undo=[];state.redo=[];saveDraft()}draw();return}
  if(name==='mode-png'&&m){if(m.terrain){if(!confirm('Przełączyć na PNG? Zapisane kafelki tej mapy zostaną usunięte. Zapisz/wyeksportuj projekt, jeśli chcesz je zachować.'))return;delete m.terrain;state.tool='select';state.undo=[];state.redo=[];saveDraft()}draw();return}
  if(name==='tile-undo'){applyHistory(true);return}
  if(name==='tile-redo'){applyHistory(false);return}
  if(name==='exit'){state.onExit?.();state=null;return}
  if(name==='overview'){showOverview();return}
  if(name==='save'){saveDraft();return}
  if(name==='add-map'){addMap();return}
  if(name==='add-quest'){addQuest();return}
  if((name==='collapse-steps'||name==='expand-steps')&&q){
   for(const step of q.steps){if(name==='expand-steps')state.openSteps.add(step);else state.openSteps.delete(step)}
   draw();return;
  }
  if(name==='add-step'&&q){const step=newStep(stepMap(q,q.steps.at(-1)||{}));q.steps.push(step);state.openSteps.add(step);saveDraft();draw();const card=$(state.root,'[data-gme-step-card="'+(q.steps.length-1)+'"]');card?.scrollIntoView?.({block:'start',behavior:'instant'});card?.querySelector('textarea')?.focus({preventScroll:true});return}
  if((name==='portal-pair'||name==='portal-unpair')&&m&&state.selection?.type==='portals'){
   const p=currentObject(),target=p&&portalTarget(state.pack,p),dest=p&&portalMap(state.pack,p.to),otherMap=state.pack.maps.find(x=>x.id===p?.to);
   if(!p||portalMode(p)!=='portal'||!target||!dest)return setStatus('Najpierw wybierz portal docelowy.');
   if(name==='portal-unpair'){unlinkPortalReturn(m,p);saveDraft();draw();setStatus('Pozostawiono przejście w jedną stronę.');return;}
   if(!otherMap){
    const conflict=state.pack.maps.some(x=>(x.portals||[]).some(o=>o!==p&&o.portalReturn===true&&o.to===p.to&&o.targetPortalId===p.targetPortalId));
    if(conflict)return setStatus('Ten portal ma już ustawiony inny powrót. Najpierw rozłącz poprzednie połączenie.');
   }
   if(target.to&&!(otherMap&&isPortalPair(p,m,target,otherMap))&&!confirm('Portal docelowy ma już kierunek przejścia. Zastąpić go powrotem do „'+m.name+'”?'))return;
   if(otherMap){unlinkPortalReturn(otherMap,target);target.to=m.id;target.arrivalMode='portal';target.targetPortalId=portalKey(p);delete target.portalReturn;}
   else p.portalReturn=true;
   saveDraft();draw();setStatus('Połączono portale w obie strony.');return;
  }
  if(name==='delete-map'&&m){if(state.pack.maps.some(x=>x!==m&&(x.portals||[]).some(p=>p.to===m.id)))return setStatus('Najpierw zmień portale prowadzące do tej mapy.');if(state.pack.quests.some(q=>q.steps?.some(s=>s.teleport?.mapId===m.id)))return setStatus('Najpierw zmień teleporty questów prowadzące na tę mapę.');if(state.pack.pickups?.some(p=>p.mapId===m.id))return setStatus('Najpierw usuń przedmioty z tej mapy.');if(!confirm('Usunąć mapę „'+m.name+'” z projektu?'))return;state.pack.maps=state.pack.maps.filter(x=>x!==m);state.mapId=state.pack.maps[0]?.id||null;state.selection=null;state.undo=[];state.redo=[];saveDraft();draw();return}
  if(name==='duplicate-map'&&m){const copy=clone(m);let n=2;while(state.pack.maps.some(x=>x.id===m.id+'-'+n))n++;copy.id=m.id+'-'+n;copy.name=m.name+' (kopia)';for(const p of copy.portals||[]){delete p.portalReturn;if(portalMode(p)==='portal'){p.arrivalMode='spawn';delete p.targetPortalId;}}state.pack.maps.push(copy);state.mapId=copy.id;state.selection=null;state.undo=[];state.redo=[];saveDraft();draw();return}
  if(name==='delete-object'&&m){const s=state.selection;if(!s)return;if(s.type==='spawn'){delete m.spawn;state.selection=null;saveDraft();draw();return}if(s.type==='portals'){const p=m.portals[s.index];if(state.pack.maps.some(x=>(x.portals||[]).some(o=>o!==p&&portalMode(o)==='portal'&&o.to===m.id&&o.targetPortalId===portalKey(p)))){if(!confirm('Inny portal prowadzi do tego punktu. Usunięcie przerwie połączenie; przed publikacją wybierz nowy cel. Kontynuować?'))return;}delete p.portalReturn;}if(s.type==='scenery'&&isEdge(m.scenery[s.index])){const p=m.scenery[s.index],a={x:p.x/32,y:p.y/32};return edgeEdit(m,a,a,'manual',true)}if(s.type==='mobs'||s.type==='boss')delete m[s.type];else m[s.type].splice(s.index,1);state.selection=null;saveDraft();draw();return}
  if(name==='delete-quest'&&q){if(state.pack.pickups?.some(p=>p.questId===q.id&&p.when!=='always'))return setStatus('Najpierw zmień warunki pojawiania się powiązanych przedmiotów.');if(!confirm('Usunąć quest „'+q.name+'”?'))return;state.pack.quests=state.pack.quests.filter(x=>x!==q);for(const m of state.pack.maps)for(const n of questSources(m))if(n.questId===q.id)n.questId='';state.questId=state.pack.quests[0]?.id||null;saveDraft();draw();return}
  if(name==='export'){download('astralni-map-quest-projekt.json',JSON.stringify(state.pack,null,2),'application/json');return}
  if(name==='import-trigger'){$(state.root,'[data-gme-import]')?.click();return}
  if(name==='publish-live')return publishLive();
  if(name==='publish-local'||name==='download-js'||name==='test-quest')return publishOriginals(name);
  if(name==='test-map'){
   if(!m?.spawn)return setStatus('Ta mapa nie ma startu. Testuj ją przez ustawiony portal lub quest.');
   if(Object.keys(state.pack.nativeEdits||{}).length)return publishOriginals(name);
   const errors=validate(state.pack);if(errors.length)return publicationError(errors);
   try{const p=publicationData();p.baseRevision=window.DBIWorldProjectSignature(window.DBI_GM_WORLD_DATA);localStorage.setItem(PUBLISHED_KEY,JSON.stringify(p))}catch{return setStatus('Nie udało się zapisać publikacji lokalnej.')}
   {
    if(!m)return setStatus('Wybierz mapę do testowania.');
    let active=null;try{active=JSON.parse(sessionStorage.getItem(charKey)||'null')}catch{}
    if(!active?.id)return setStatus('Brak aktywnej postaci.');
    try{
     const key='dboidle_battle_v1_'+active.id,battle=JSON.parse(localStorage.getItem(key)||'null');if(battle?.status==='running')return setStatus('Najpierw zakończ walkę.');
     const worldKey='dboidle_world_v1_'+active.id,world=JSON.parse(localStorage.getItem(worldKey)||'{}');
     localStorage.setItem(worldKey,JSON.stringify({...world,location:m.id,x:m.spawn.x,y:m.spawn.y,dir:'down'}));
     sessionStorage.setItem('dboidle_last_page_'+active.id,JSON.stringify({title:'Mapa świata',section:'ŚWIAT'}));
     location.reload();
    }catch{return setStatus('Nie udało się rozpocząć testu mapy.')}
    return;
   }
  }
 }
 function setField(path,value){const m=currentMap(),q=currentQuest(),oldId=m?.id,oldQuestId=q?.id;
  if(path==='pickup.map'){state.mapId=value;state.pickupId=null;return true}
  if(path.startsWith('pickup.')){const p=state.pack.pickups?.find(p=>p.id===state.pickupId),m=projectMapData(state.mapId);if(!p||!m)return false;const k=path.slice(7);if(k==='amount')p.amount=Math.round(number(value,1,100));else if(k==='x'||k==='y')p[k]=Math.round(number(value,0,(k==='x'?m.sizeX:m.sizeY)*32));else if(k==='stage')p.stage=Number(value);else if(['when','itemId','questId'].includes(k)){p[k]=value;if(k==='questId')p.stage=0;}else return false;saveDraft();return true;}
  if(path.startsWith('enc.'))return encounterField(path,value);
  if(path.startsWith('entry.')&&m){m.entryPortal??={from:'',x:128,y:128};const prop=path.slice(6);m.entryPortal[prop]=prop==='from'?String(value):number(value,0,4000,0)}
  else if(path==='map.mobNames'&&m){m.mobNames=String(value).split('\n').slice(0,12).map(line=>line.trim()).filter(Boolean).map(line=>{const [name,level]=line.split('|');return {name:String(name||'Potwór').slice(0,80),level:number(level,1,999999,1)}})}
  else if(path.startsWith('map.')&&m){const prop=path.slice(4);if(prop==='id'){if(!validId.test(value)||state.pack.maps.some(x=>x!==m&&x.id===value)||builtins().some(x=>x.id===value)){setStatus('ID mapy musi być unikalne: litery a-z, cyfry, - lub _.');return false}m.id=value;state.mapId=value;for(const x of state.pack.maps){for(const p of x.portals||[])if(p.to===oldId)p.to=value;if(x.entryPortal?.from===oldId)x.entryPortal.from=value;}for(const p of state.pack.pickups||[])if(p.mapId===oldId)p.mapId=value;for(const x of state.pack.quests){if(x.mapId===oldId)x.mapId=value;for(const st of x.steps||[]){if(st.mapId===oldId)st.mapId=value;if(st.teleport?.mapId===oldId)st.teleport.mapId=value}}}
   else if(['sizeX','sizeY'].includes(prop)){
    const oldWidth=m.sizeX,oldHeight=m.sizeY,oldTiles=m.terrain?.tiles?.slice();
    m[prop]=Math.round(number(value,10,100,40));m.scenery=(m.scenery||[]).filter(p=>!isEdge(p)||p.x<m.sizeX*32&&p.y<m.sizeY*32).map(p=>isEdge(p)?{...p,width:Math.min(p.width,m.sizeX*32-p.x),height:Math.min(p.height,m.sizeY*32-p.y)}:p);refreshEdges(m);state.edgeUndo=null;
    if(oldTiles){const next=terrain.create(m.sizeX,m.sizeY);next.visual=terrain.settings(m);if(m.terrain.terrace)next.terrace={...m.terrain.terrace};if(m.terrain.heights)next.heights=Array(next.tiles.length).fill(0);for(let row=0;row<Math.min(oldHeight,m.sizeY);row++)for(let col=0;col<Math.min(oldWidth,m.sizeX);col++){next.tiles[row*m.sizeX+col]=oldTiles[row*oldWidth+col];if(next.heights)next.heights[row*m.sizeX+col]=m.terrain.heights[row*oldWidth+col]}m.terrain=next;state.undo=[];state.redo=[]}
   }
   else if(prop==='art'){if(!validAsset.test(value)||value.includes('..')){setStatus('Wpisz ścieżkę do grafiki w folderze assets/ (png, jpg, webp).');return false}m.art=value}
   else m[prop]=String(value).slice(0,100);
  }else if(path.startsWith('quest.')&&q){const prop=path.slice(6);if(prop==='id'){if(!validId.test(value)||state.pack.quests.some(x=>x!==q&&x.id===value)){setStatus('Quest musi mieć unikalne ID.');return false}q.id=value;state.questId=value;for(const p of state.pack.pickups||[])if(p.questId===oldQuestId)p.questId=value;for(const other of state.pack.quests)for(const step of other.steps||[])if(step.requiredQuestId===oldQuestId)step.requiredQuestId=value;for(const map of state.pack.maps)for(const n of questSources(map))if(n.questId===oldQuestId)n.questId=value}else {q[prop]=String(value).slice(0,160);if(prop==='mapId')for(const st of q.steps||[])if(!st.mapId&&st.requirement==='kill'&&Array.isArray(st.killVariants))resetKillRoster(q,st,state.pack)}}
  else if(path.startsWith('step.')&&q){const parts=path.split('.'),step=q.steps[Number(parts[1])];if(!step)return false;const prop=parts[2],key=parts[3];
   if(prop==='rewards'){
    const j=Number(key),r=editableRewards(step)[j],k=parts[4];if(!r)return false;
    if(k==='type'&&rewardTypes().some(([id])=>id===value)){r.type=value;r.amount=Math.min(rewardMax(value),Math.max(1,Number(r.amount)||1));if(value!=='item')r.item='';}
    else if(k==='item'&&r.type==='item'){if(value&&!rewardDef(value))return false;r.item=value;}
    else if(k==='amount')r.amount=Math.round(number(value,1,rewardMax(r.type),1));
    else return false;
   }
   else if(['upgradeSelection','upgradeMode','upgradeValue'].includes(prop)){
    if(step.requirement!=='upgrade')return false;
    const p=step.upgradePolicy??={selection:'specific',mode:'exact',value:1,slots:upgradeSlots().map(x=>x.id)};
    if(prop==='upgradeSelection'&&['specific','any'].includes(value)){p.selection=value;if(value==='any'&&p.mode==='exact')p.mode='relative';}
    else if(prop==='upgradeMode'&&['exact','relative','absolute'].includes(value)&&!(p.selection==='any'&&value==='exact'))p.mode=value;
    else if(prop==='upgradeValue')p.value=Math.round(number(value,1,upgradeMax(),1));
    else return false;
   }
   else if(prop==='upgradeFrom'||prop==='upgradeTo'){
    if(step.requirement!=='upgrade')return false;
    const max=upgradeMax();
    if(prop==='upgradeFrom'){step.upgradeFrom=Math.round(number(value,0,max-1));step.upgradeTo=Math.max(step.upgradeFrom+1,Math.min(max,Number(step.upgradeTo)||1));}
    else step.upgradeTo=Math.round(number(value,step.upgradeFrom+1,max,step.upgradeFrom+1));
   }
   else if(prop==='killMode'){
    if(value==='roster')resetKillRoster(q,step,state.pack);
    else if(value==='exact'){step.target=selectedKillNames(q,step,state.pack)[0]||step.target||'';delete step.killVariants;}
    else return false;
   }
   else if(prop==='enemy'){step.enemy??=newStoryEnemy();step.enemy[key]=Object.hasOwn(storyFields,key)?Math.round(number(value,key==='hp'||key==='level'?1:0,999999999,0)):String(value).slice(0,150)}
   else if(prop==='teleport'){
    if(key==='mapId'){if(!value)delete step.teleport;else{const dest=projectMapData(value);if(!dest)return false;step.teleport={mapId:value,mode:dest.spawn?'spawn':'point',x:Math.round(dest.spawn?.x??dest.sizeX*16),y:Math.round(dest.spawn?.y??dest.sizeY*16)};}}
    else if(step.teleport&&key==='mode'&&['spawn','point'].includes(value))step.teleport.mode=value;
    else if(step.teleport&&['x','y'].includes(key)){const dest=projectMapData(step.teleport.mapId);if(!dest)return false;step.teleport[key]=Math.round(number(value,0,Math.ceil((key==='x'?dest.sizeX:dest.sizeY)*32)-1));}
    else return false;
   }
   else if(prop==='point'&&step.point){const m=projectMapData(stepMap(q,step));if(['x','y'].includes(key)){step.point[key]=Math.round(number(value,0,(key==='x'?m.sizeX:m.sizeY)*32,0));step.point.targetKind='free';}else if(key==='mapLabel'){const bound=projectPointObject(m,step.point);if(!bound)return false;renameProjectPoint(m,bound,value);}else if(key==='label')step.point.label=String(value).slice(0,150);}
   else if(prop==='mapId'){const changed=value!==stepMap(q,step);if(changed)delete step.point;step.mapId=value;if(changed&&step.requirement==='kill'&&Array.isArray(step.killVariants))resetKillRoster(q,step,state.pack);}
   else {const previous=step.requirement;step[prop]=['count','rewardAmount'].includes(prop)?Math.round(number(value,1,999999,1)):String(value).slice(0,2000);if(prop==='requirement'&&value==='upgrade'&&previous!=='upgrade'){step.target='';step.count=1;step.upgradeFrom=0;step.upgradeTo=1;delete step.upgradePolicy;}if(prop==='requirement'&&value==='story')step.enemy??=newStoryEnemy();if(prop==='requirement'&&value==='kill'&&previous!=='kill')resetKillRoster(q,step,state.pack)}
  }
  else if(path.startsWith('rect.')&&m&&state.selection?.type==='blocked'){const i=Number(path.slice(5)),rect=currentObject();rect[i]=number(value,0,Math.max(m.sizeX,m.sizeY)*32,0);if(rect[2]<rect[0])[rect[0],rect[2]]=[rect[2],rect[0]];if(rect[3]<rect[1])[rect[1],rect[3]]=[rect[3],rect[1]]}
  else if(path.startsWith('item.')&&m){const item=currentObject();if(!item)return false;const prop=path.slice(5);if(state.selection?.type==='npc'&&prop!=='placementTool'&&!['npc','library-npc'].includes(item.placementTool)){item.placementTool=npcPlacement(item);item.questMarker=npcQuestMarker(item);}if(state.selection?.type==='portals'&&prop==='to'){
    if(item.to!==value){unlinkPortalReturn(m,item);item.to=value;delete item.targetPortalId;item.arrivalMode='portal';}
   }else if(state.selection?.type==='portals'&&prop==='arrivalMode'){
    if(!['portal','spawn','custom'].includes(value))return false;if(portalMode(item)!==value){unlinkPortalReturn(m,item);item.arrivalMode=value;if(value!=='portal')delete item.targetPortalId;}
   }else if(state.selection?.type==='portals'&&prop==='targetPortalId'){
    if(value&&!(portalMap(state.pack,item.to)?.portals||[]).some(p=>portalKey(p)===value))return false;
    if(item.targetPortalId!==value){unlinkPortalReturn(m,item);item.targetPortalId=value;item.arrivalMode='portal';}
   }else if(prop==='destinationArrival.x'||prop==='destinationArrival.y'){item.destinationArrival??={x:0,y:0};item.destinationArrival[prop.split('.')[1]]=number(value,0,5000,0)}
   else if(['x','y','width','height'].includes(prop))item[prop]=number(value,prop==='width'||prop==='height'?1:0,5000,0);
   else if(prop==='art'&&value&&(!validAsset.test(value)||value.includes('..'))){setStatus('Grafika musi być plikiem z assets/.');return false}
   else if(prop==='scalePct'&&state.selection?.type==='npc'){
    if(!hasNpcImage(item))return false;
    item.scalePct=window.DBIWorld.npcSize({scalePct:value}).percent;
   }
   else if(prop==='label'){
    const kind=state.selection.type==='portals'?'portal':state.selection.type;
    const bound={item,kind};renameProjectPoint(m,bound,value);
   }
   else if(prop==='placementTool'&&state.selection?.type==='npc'){
    if(!['npc','library-npc'].includes(value))return false;
    item.placementTool=value;item.questMarker=value==='npc';
   }
   else if(prop==='placementTool'&&state.selection?.type==='scenery'){
    if(!['object','campfire','decoration'].includes(value))return false;
    item.placementTool=value;item.questMarker=value!=='decoration';
    if(value==='campfire'){item.animation='campfire';if(!item.label)item.label='Ognisko';}
   }
   else if(prop==='drawOrder'&&['npc','scenery'].includes(state.selection?.type)){
    if(value==='')delete item.drawOrder;
    else item.drawOrder=Math.round(number(value,-100,100,0));
   }
   else if(prop==='rotation'&&state.selection?.type==='scenery')item.rotation=[0,90,180,270].includes(Number(value))?Number(value):0;
   else if(prop==='animation'&&state.selection?.type==='scenery')item.animation=value==='campfire'?'campfire':'';
   else item[prop]=String(value).slice(0,150);
  }else return false;
  saveDraft();return true;
 }
 function place(tool,x,y){const m=currentMap();if(!m)return;
  x=Math.round(number(x,0,m.sizeX*32,0));y=Math.round(number(y,0,m.sizeY*32,0));
  if(tool==='spawn'){m.spawn={...m.spawn,x,y,placementTool:'spawn',label:m.spawn?.label||''};state.selection={type:'spawn',index:0}}
  else if(tool==='npc'){m.npc.push({x,y,label:'Nowy NPC',art:'',questId:'',placementTool:'npc',questMarker:true});state.selection={type:'npc',index:m.npc.length-1}}
  else if(tool==='portal'){if(m.portals.length>=20)return setStatus('Limit 20 portali na mapę.');m.portals.push({x,y,label:'',placementTool:'portal',to:'',arrivalMode:'portal',destinationArrival:{x:128,y:128}});state.selection={type:'portals',index:m.portals.length-1}}
  else if(tool==='library-prop'){const p=library().find(p=>p.key===state.propKey);if(!p)return;if(p.group==='NPC'){state.showMarkers=true;if(m.npc.length>=60)return setStatus('Limit 60 NPC.');m.npc.push({x,y,label:p.name,art:p.art,questId:'',placementTool:'library-npc',questMarker:false});state.selection={type:'npc',index:m.npc.length-1};saveDraft();draw();return}state.showProps=true;if(m.scenery.filter(p=>!isEdge(p)).length>=300){setStatus('Limit dekoracji: 300 na mapę.');return}const left=p.snapToTile?Math.floor(x/terrain.TILE)*terrain.TILE:x-Math.round(p.width/2);
   const top=p.snapToTile?Math.floor(y/terrain.TILE)*terrain.TILE:y-p.height;
   m.scenery.push({x:Math.max(0,Math.min(m.sizeX*32-p.width,left)),y:Math.max(0,Math.min(m.sizeY*32-p.height,top)),width:p.width,height:p.height,label:'',effect:p.effect,art:p.art,placementTool:'decoration',questMarker:false});state.selection={type:'scenery',index:m.scenery.length-1};saveDraft();draw();return}
  else if(tool==='scenery'){m.scenery.push({x,y,width:84,height:84,label:'',art:'',placementTool:'object',questMarker:true});state.selection={type:'scenery',index:m.scenery.length-1}}
  else if(tool==='campfire'){m.scenery.push({x:Math.max(0,Math.min(m.sizeX*32-64,x-32)),y:Math.max(0,Math.min(m.sizeY*32-64,y-52)),width:64,height:64,label:'Ognisko',art:'',animation:'campfire',placementTool:'campfire',questMarker:true});state.selection={type:'scenery',index:m.scenery.length-1}}
  else if(tool==='mobs'){m.mobs={label:'Expowisko',art:'',...m.mobs,x,y};prepareRoster(m);state.enemyKey='0';state.tab='enemies';state.selection={type:'mobs',index:0}}
  else if(tool==='boss'){m.boss={label:'Boss',art:'',combat:{},...m.boss,x,y};state.enemyKey='boss';state.tab='enemies';state.selection={type:'boss',index:0}}
  else return;
  state.tool='select';saveDraft();draw();
 }
 function wireStage(){const stage=$(state.root,'[data-gme-map-stage]');if(!stage)return;
  let start=null,drag=null,tileDrag=null,edgeDrag=null;
  const tileCoords=e=>{const rect=stage.getBoundingClientRect(),m=currentMap();return {x:Math.max(0,Math.min(m.sizeX-1,Math.floor((e.clientX-rect.left)/rect.width*m.sizeX))),y:Math.max(0,Math.min(m.sizeY-1,Math.floor((e.clientY-rect.top)/rect.height*m.sizeY)))}};
  const tileTool=()=>currentMap()?.terrain&&tileTools.has(state.tool);
  const ghost=document.createElement('div');ghost.className='dbi-gme-brush-ghost';ghost.hidden=true;stage.appendChild(ghost);
  function showBrush(e){
   if(['edge-paint','edge-erase'].includes(state.tool)&&!edgeDrag&&e.pointerType!=='touch'){
    const m=currentMap(),at=tileCoords(e),erase=state.tool==='edge-erase',hit=erase&&(m.scenery||[]).find(p=>isEdge(p)&&edgeOverlap(p,{x:at.x*32,y:at.y*32,width:32,height:32})),c=hit||edgeCells(m,at,at,'manual',erase?1:edgeSize())[0];
    if(c){Object.assign(ghost.style,{left:100*c.x/(m.sizeX*32)+'%',top:100*c.y/(m.sizeY*32)+'%',width:100*c.width/(m.sizeX*32)+'%',height:100*c.height/(m.sizeY*32)+'%',backgroundColor:erase?'#db555555':'#d5b86a55',borderRadius:'0'});ghost.hidden=false;return;}
   }
   if(!tileTool()||tileDrag||e.pointerType==='touch'){ghost.hidden=true;return}
   const m=currentMap(),at=tileCoords(e),size=['tile-brush','tile-erase','tile-height'].includes(state.tool)?state.tileSize:1;
   const offset=Math.floor((size-1)/2),x=Math.max(0,at.x-offset),y=Math.max(0,at.y-offset);
   const w=Math.min(m.sizeX,at.x-offset+size)-x,h=Math.min(m.sizeY,at.y-offset+size)-y;
   Object.assign(ghost.style,{left:100*x/m.sizeX+'%',top:100*y/m.sizeY+'%',width:100*w/m.sizeX+'%',height:100*h/m.sizeY+'%',backgroundColor:terrain.palette[state.tool==='tile-erase'?0:state.tileBrush].color+'66',borderRadius:state.tool==='tile-height'||state.tool==='tile-rect'||state.brushShape==='square'?'0':'48%'});
   ghost.hidden=false;
  }
  stage.addEventListener('contextmenu',e=>{
   e.preventDefault();
   if(start||tileDrag||drag||edgeDrag)return;
   let pin=e.target.closest('[data-gme-select]');
   if(!pin&&stage.classList.contains('is-tile-painting')){
    stage.classList.remove('is-tile-painting');
    try{pin=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-gme-select]')}
    finally{stage.classList.add('is-tile-painting')}
   }
   if(!pin||!stage.contains(pin))return;
   const [type,index]=pin.dataset.gmeSelect.split(':');
   state.selection={type,index:Number(index)};
   onCommand('delete-object');
  });
  stage.addEventListener('pointermove',showBrush);
  stage.addEventListener('pointerleave',()=>{ghost.hidden=true});
  stage.addEventListener('pointerdown',()=>{ghost.hidden=true});
  const tilePaint=e=>{const m=currentMap(),at=tileCoords(e),id=state.tool==='tile-erase'?0:state.tileBrush;
   const did=paintTile(m,at.x,at.y,id,state.tileSize);if(did){tileDrag.changed=true;scheduleTerrainPreview()}return at};
  const coords=e=>{const r=stage.getBoundingClientRect(),m=currentMap();return {x:Math.round(number((e.clientX-r.left)/r.width,0,1,0)*m.sizeX*32),y:Math.round(number((e.clientY-r.top)/r.height,0,1,0)*m.sizeY*32)}};
  stage.addEventListener('pointerdown',e=>{
   if(e.button!==0)return;
   if(['edge-paint','edge-erase'].includes(state.tool)){e.preventDefault();edgeDrag=tileCoords(e);try{stage.setPointerCapture(e.pointerId)}catch{}return;}
   if(tileTool()){
    e.preventDefault();const m=currentMap(),at=tileCoords(e);
    if(state.tool==='tile-pick'){state.tileBrush=terrain.getTile(m,at.x,at.y);state.materialGroup=terrain.palette[state.tileBrush].group;state.tool='tile-brush';draw();return}
    if(state.tool==='tile-fill'){if(terrain.getTile(m,at.x,at.y)!==state.tileBrush){historySnapshot();paintFill(m,at.x,at.y,state.tileBrush);saveDraft();draw()}return}
    if(state.tool==='tile-height'||state.tool==='tile-brush'||state.tool==='tile-erase'||state.tool==='tile-rect'){
     historySnapshot();tileDrag={start:at,changed:false,last:at};
     try{stage.setPointerCapture(e.pointerId)}catch{}
     if(state.tool!=='tile-rect')tilePaint(e);else{const box=$(stage,'.dbi-gme-drawing');box.hidden=false;Object.assign(box.style,{left:at.x/m.sizeX*100+'%',top:at.y/m.sizeY*100+'%',width:100/m.sizeX+'%',height:100/m.sizeY+'%'})}
     return;
    }
   }
   const target=e.target.closest('[data-gme-select]');
   if(target&&(state.tool==='select'||state.tool==='library-prop'&&target.dataset.gmeSelect.startsWith('scenery:'))){e.preventDefault();const [type,index]=target.dataset.gmeSelect.split(':');state.selection={type,index:Number(index)};
    if(state.tool==='select'&&type!=='blocked'&&!(type==='scenery'&&isEdge(currentObject()))){const o=currentObject(),at=coords(e);drag={type,index:Number(index),element:target,dx:at.x-o.x,dy:at.y-o.y};stage.setPointerCapture(e.pointerId)}else draw();return;
   }
   if(state.tool==='blocked'){
    start=coords(e);stage.setPointerCapture(e.pointerId);const block=$(stage,'.dbi-gme-drawing');block.hidden=false;Object.assign(block.style,{left:start.x/(currentMap().sizeX*32)*100+'%',top:start.y/(currentMap().sizeY*32)*100+'%',width:'0',height:'0'});return;
   }
   if(state.tool!=='select'&&!tileTools.has(state.tool))place(state.tool,coords(e).x,coords(e).y);
   else{state.selection=null;draw()}
  });
  stage.addEventListener('pointermove',e=>{
   if(edgeDrag){const m=currentMap(),box=$(stage,'.dbi-gme-drawing'),cells=edgeCells(m,edgeDrag,tileCoords(e),state.edgeMode||'line',state.tool==='edge-erase'?1:edgeSize()),left=Math.min(...cells.map(c=>c.x)),top=Math.min(...cells.map(c=>c.y)),right=Math.max(...cells.map(c=>c.x+c.width)),bottom=Math.max(...cells.map(c=>c.y+c.height));box.hidden=false;Object.assign(box.style,{left:left/(m.sizeX*32)*100+'%',top:top/(m.sizeY*32)*100+'%',width:(right-left)/(m.sizeX*32)*100+'%',height:(bottom-top)/(m.sizeY*32)*100+'%'});return;}
   if(tileDrag){const m=currentMap(),at=tileCoords(e);if(state.tool==='tile-rect'){const box=$(stage,'.dbi-gme-drawing');Object.assign(box.style,{left:Math.min(at.x,tileDrag.start.x)/m.sizeX*100+'%',top:Math.min(at.y,tileDrag.start.y)/m.sizeY*100+'%',width:(Math.abs(at.x-tileDrag.start.x)+1)/m.sizeX*100+'%',height:(Math.abs(at.y-tileDrag.start.y)+1)/m.sizeY*100+'%'})}else if(at.x!==tileDrag.last.x||at.y!==tileDrag.last.y){ // Malowanie ciągłe również przy szybkich ruchach myszy.
    const x0=tileDrag.last.x,y0=tileDrag.last.y,steps=Math.max(Math.abs(at.x-x0),Math.abs(at.y-y0));
    for(let n=1;n<=steps;n++){const x=Math.round(x0+(at.x-x0)*n/steps),y=Math.round(y0+(at.y-y0)*n/steps);tileDrag.changed=paintTile(m,x,y,state.tool==='tile-erase'?0:state.tileBrush,state.tileSize)||tileDrag.changed}
    if(tileDrag.changed)scheduleTerrainPreview();tileDrag.last=at;
   }return}
   if(drag){const at=coords(e),x=Math.max(0,Math.min(currentMap().sizeX*32,at.x-drag.dx)),y=Math.max(0,Math.min(currentMap().sizeY*32,at.y-drag.dy));Object.assign(drag.element.style,{left:x/(currentMap().sizeX*32)*100+'%',top:y/(currentMap().sizeY*32)*100+'%'});return}
   if(start){const {x,y}=coords(e),m=currentMap(),rect=$(stage,'.dbi-gme-drawing');Object.assign(rect.style,{left:Math.min(x,start.x)/(m.sizeX*32)*100+'%',top:Math.min(y,start.y)/(m.sizeY*32)*100+'%',width:Math.abs(x-start.x)/(m.sizeX*32)*100+'%',height:Math.abs(y-start.y)/(m.sizeY*32)*100+'%'})}
  });
  stage.addEventListener('pointerup',e=>{
   if(edgeDrag){const a=edgeDrag;edgeDrag=null;$(stage,'.dbi-gme-drawing').hidden=true;edgeEdit(currentMap(),a,tileCoords(e),state.edgeMode||'line',state.tool==='edge-erase');return;}
   if(tileDrag){const m=currentMap();if(state.tool==='tile-rect'){const at=tileCoords(e);tileDrag.changed=paintRect(m,tileDrag.start,at,state.tileBrush)||tileDrag.changed}
    if(tileDrag.changed)saveDraft();else{state.undo?.pop()}tileDrag=null;draw();return}
   if(drag){const o=currentObject(),p=coords(e);if(o){o.x=Math.max(0,Math.min(currentMap().sizeX*32,p.x-drag.dx));o.y=Math.max(0,Math.min(currentMap().sizeY*32,p.y-drag.dy))}drag=null;saveDraft();draw();return}
   if(start){const end=coords(e);if(Math.abs(end.x-start.x)>=12&&Math.abs(end.y-start.y)>=12){const m=currentMap();m.blocked.push([Math.min(start.x,end.x),Math.min(start.y,end.y),Math.max(start.x,end.x),Math.max(start.y,end.y)]);state.selection={type:'blocked',index:m.blocked.length-1};saveDraft();}start=null;draw()}
  });
  stage.addEventListener('pointercancel',()=>{if(edgeDrag){edgeDrag=null;$(stage,'.dbi-gme-drawing').hidden=true}if(tileDrag){if(tileDrag.changed)saveDraft();else state.undo?.pop();tileDrag=null;draw()}});
 }
 function bindEvents(){
  state.root.addEventListener('toggle',e=>{if(e.target.matches?.('[data-edge-panel]')&&e.target.isConnected)state.edgeOpen=e.target.open},true);
  state.root.addEventListener('input',e=>{
   if(e.target.matches('[data-gme-item-search]')){filterItemPicker(e.target);return}
   if(e.target.matches('[data-prop-search]')){state.propSearch=e.target.value;state.root.querySelector('.dbi-gme-prop-grid').innerHTML=libraryCards(library(),state.propGroup||'Podstawowe');return}
   if(!e.target.matches('[data-npc-search]'))return;
   state.npcSearch=e.target.value;
   state.root.querySelector('.dbi-gme-prop-grid').innerHTML=libraryCards(library(),'NPC');
  });
  state.root.addEventListener('keydown',e=>{
   if(!e.target.matches('[data-gme-item-search]')||e.isComposing||!['Enter','ArrowDown'].includes(e.key))return;
   e.preventDefault();const result=filterItemPicker(e.target);if(!result)return;
   if(e.key==='Enter'&&result.matches.length===1){const value=result.matches[0].value;if(result.select.value!==value){result.select.value=value;result.select.dispatchEvent(new Event('change',{bubbles:true}));}else result.select.focus();}
   else result.select.focus();
  });
  state.root.addEventListener('click',e=>{
   const addReward=e.target.closest('[data-gme-add-reward]'),removeReward=e.target.closest('[data-gme-remove-reward]');
   if(addReward||removeReward){const [i,j]=String(addReward?addReward.dataset.gmeAddReward:removeReward.dataset.gmeRemoveReward).split(':').map(Number),st=currentQuest()?.steps[i];if(!st)return;
    const rows=editableRewards(st);if(addReward&&rows.length<20)rows.push({type:'item',item:'',amount:1});else if(removeReward&&Number.isInteger(j)&&j>=0&&j<rows.length)rows.splice(j,1);saveDraft();draw();return;}
   const toggleStep=e.target.closest('[data-gme-toggle-step]');
   if(toggleStep){const i=Number(toggleStep.dataset.gmeToggleStep),step=currentQuest()?.steps[i];if(!step)return;
    if(state.openSteps.has(step))state.openSteps.delete(step);else state.openSteps.add(step);
    draw();$(state.root,'[data-gme-toggle-step="'+i+'"]')?.scrollIntoView?.({block:'nearest',behavior:'instant'});return;
   }
   const pick=e.target.closest('[data-pickup-select]'),ground=e.target.closest('[data-pickup-map]');
   if(pick){state.pickupId=pick.dataset.pickupSelect;draw();return}
   if(ground){const p=state.pack.pickups?.find(p=>p.id===state.pickupId),m=projectMapData(state.mapId);if(!p||!m)return;const rect=ground.getBoundingClientRect();p.x=Math.round(number((e.clientX-rect.left)/rect.width,0,1)*m.sizeX*32);p.y=Math.round(number((e.clientY-rect.top)/rect.height,0,1)*m.sizeY*32);saveDraft();draw();return;}
   const teleportMap=e.target.closest('[data-teleport-map]');
   if(teleportMap){const t=currentQuest()?.steps[Number(teleportMap.dataset.teleportMap)]?.teleport,m=t&&projectMapData(t.mapId);if(!m||t.mode!=='point')return;const r=teleportMap.getBoundingClientRect();t.x=Math.min(Math.ceil(m.sizeX*32)-1,Math.round(number((e.clientX-r.left)/r.width,0,1)*m.sizeX*32));t.y=Math.min(Math.ceil(m.sizeY*32)-1,Math.round(number((e.clientY-r.top)/r.height,0,1)*m.sizeY*32));saveDraft();draw();return;}
   const picker=e.target.closest('[data-stage-pick]'),mapPoint=e.target.closest('[data-stage-map]'),clear=e.target.closest('[data-stage-clear]');
   if(picker||mapPoint||clear){const q=currentQuest(),i=Number(clear?.dataset.stageClear??picker?.dataset.stagePick??mapPoint?.dataset.stageMap),st=q?.steps[i];if(!st)return;
    if(clear)delete st.point;
    else{const m=projectMapData(stepMap(q,st)),r=mapPoint.getBoundingClientRect();st.point={x:picker?Number(picker.dataset.x):Math.round(number((e.clientX-r.left)/r.width,0,1,0)*m.sizeX*32),y:picker?Number(picker.dataset.y):Math.round(number((e.clientY-r.top)/r.height,0,1,0)*m.sizeY*32),label:picker?picker.dataset.label:st.point?.label||'Punkt fabularny',targetKind:picker?picker.dataset.kind:'free'};}
    saveDraft();draw();return;
   }
   const tab=e.target.closest('[data-gme-tab]'),command=e.target.closest('[data-gme-command]'),map=e.target.closest('[data-gme-map]'),quest=e.target.closest('[data-gme-quest]'),legacyQ=e.target.closest('[data-gme-legacy-quest]'),tool=e.target.closest('[data-gme-tool]'),paletteButton=e.target.closest('[data-gme-palette]'),del=e.target.closest('[data-gme-delete-step]');
   if(tab){state.tab=tab.dataset.gmeTab;draw()}
   else if(command)onCommand(command.dataset.gmeCommand);
   else if(map){state.mapId=map.dataset.gmeMap;state.selection=null;state.undo=[];state.redo=[];state.tab='maps';draw()}
   else if(quest){state.questId=quest.dataset.gmeQuest;state.legacyQuestId=null;state.tab='quests';draw()}
   else if(legacyQ){state.legacyQuestId=legacyQ.dataset.gmeLegacyQuest;state.questId=null;state.tab='quests';draw()}
   else if(paletteButton){state.tileBrush=Number(paletteButton.dataset.gmePalette);state.materialGroup=terrain.palette[state.tileBrush].group;state.tool='tile-brush';draw()}
   else if(e.target.closest('[data-gme-prop]')){state.libraryOpen=true;state.propKey=e.target.closest('[data-gme-prop]').dataset.gmeProp;state.tool='library-prop';draw()}
   else if(tool){state.tool=tool.dataset.gmeTool;if(state.tool.startsWith('edge-'))state.edgeOpen=true;draw()}
   else if(del){const q=currentQuest(),i=Number(del.dataset.gmeDeleteStep);if(q&&state.pack.pickups?.some(p=>p.questId===q.id&&['accepted','after'].includes(p.when)&&p.stage>=i)){setStatus('Najpierw zmień warunki powiązanych przedmiotów.');return}if(q&&confirm('Usunąć etap '+(i+1)+'? Jeżeli zadanie było już opublikowane, zmieni to kolejność zapisanych etapów graczy. Bezpieczniej dopisywać nowe etapy na końcu.')){q.steps.splice(i,1);saveDraft();draw()}}
  });
  state.root.addEventListener('click',e=>{const btn=e.target.closest('[data-gme-upgrade-all]');if(!btn)return;const st=currentQuest()?.steps?.[Number(btn.dataset.gmeUpgradeAll)];if(st?.requirement==='upgrade'&&st.upgradePolicy?.selection==='any'){st.upgradePolicy.slots=upgradeSlots().map(x=>x.id);saveDraft();draw();}});
  state.root.addEventListener('change',async e=>{
   if(e.target.matches('[data-terrain-brush]')){state.brushShape=e.target.value;return;}
   if(e.target.matches('[data-terrain-visual]')){const m=currentMap();if(!m?.terrain)return;const key=e.target.dataset.terrainVisual;if(!['enabled','transitions','hardness','variation','details','organic'].includes(key))return;historySnapshot();m.terrain.visual={...terrain.settings(m),[key]:e.target.type==='checkbox'?e.target.checked:Number(e.target.value)};saveDraft();draw();return;}
   if(e.target.matches('[data-edge-style],[data-edge-mode],[data-edge-mask],[data-edge-size],[data-edge-block],[data-edge-above]')){state.edgeOpen=true;if(e.target.matches('[data-edge-style]'))state.edgeStyle=e.target.value;else if(e.target.matches('[data-edge-mode]'))state.edgeMode=e.target.value;else if(e.target.matches('[data-edge-mask]'))state.edgeMask=Number(e.target.value);else if(e.target.matches('[data-edge-size]'))state.edgeSize=Number(e.target.value);else if(e.target.matches('[data-edge-block]'))state.edgeBlock=e.target.checked;else state.edgeAbove=e.target.checked;draw();return;}
   if(e.target.matches('[data-gme-upgrade-slot]')){const st=currentQuest()?.steps?.[Number(e.target.dataset.gmeUpgradeSlot)],id=e.target.value;if(st?.requirement!=='upgrade'||st.upgradePolicy?.selection!=='any'||!upgradeSlots().some(x=>x.id===id))return;const selected=new Set(st.upgradePolicy.slots);if(e.target.checked)selected.add(id);else selected.delete(id);st.upgradePolicy.slots=[...selected];saveDraft();draw();return;}
   if(e.target.matches('[data-gme-kill-variant]')){
    const [i,n]=e.target.dataset.gmeKillVariant.split(':').map(Number),q=currentQuest(),st=q?.steps?.[i];
    if(!st||st.requirement!=='kill'||!Array.isArray(st.killVariants)||!farmingRoster(stepMap(q,st),state.pack)[n])return;
    const next=new Set(st.killVariants);if(e.target.checked)next.add(n);else next.delete(n);
    st.killVariants=[...next].sort((a,b)=>a-b);saveDraft();draw();return;
   }
   if(e.target.matches('[data-npc-series]')){state.npcSeries=e.target.value;state.libraryOpen=true;draw();return}
   if(e.target.matches('[data-prop-group]')){state.libraryOpen=true;state.propGroup=e.target.value;state.propSearch='';draw();return}
   if(e.target.matches('[data-gme-layer-object]')){
    if(e.target.value){
     const [type,index]=e.target.value.split(':');
     state.selection={type,index:Number(index)};
    }else state.selection=null;
    draw();return;
   }
   if(e.target.matches('[data-art-import]')){await importArt(e.target);return}
   if(e.target.matches('[data-height]')){state.height=Number(e.target.value);state.tool='tile-height';draw();return}
   if(e.target.matches('[data-gme-layer]')){state[e.target.dataset.gmeLayer]=e.target.checked;draw();return}if(e.target.matches('[data-gme-zoom]')){state.zoom=Number(e.target.value)||100;draw();return}if(e.target.matches('[data-gme-brush-size]')){state.tileSize=Number(e.target.value)||1;return}if(e.target.matches('[data-gme-grid]')){state.showGrid=e.target.checked;draw();return}const field=e.target.closest('[data-gme-field]');if(field){const path=field.dataset.gmeField;if(setField(path,field.value)){const simpleQuest=(path.startsWith('step.')||path.startsWith('quest.'))&&field.tagName!=='SELECT'&&path!=='quest.id'&&!/\.rewardAmount$|\.rewards\.\d+\.amount$/.test(path)&&!/\.(?:point|teleport)\.(?:x|y|mapLabel)$/.test(path);if(!simpleQuest)draw()}return}
   if(e.target.matches('[data-gme-import]')){
    const file=e.target.files[0];if(!file)return;
    try{const data=JSON.parse(await file.text());if(data.version!==1||!Array.isArray(data.maps)||!Array.isArray(data.quests))throw Error('Nieprawidłowy format projektu.');
     if(data.maps.length>50||data.quests.length>200||file.size>8_000_000)throw Error('Zbyt duży projekt.');
     const errors=validate(data);if(errors.length)throw Error(errors[0]);
     localStorage.setItem(DRAFT_KEY,JSON.stringify(data));
     state.pack=clone(data);state.mapId=state.pack.maps[0]?.id||legacyCatalog().maps[0]?.id||null;state.questId=state.pack.quests[0]?.id||null;state.selection=null;state.undo=[];state.redo=[];saveDraft();draw();setStatus('Zaimportowano projekt JSON.');
    }catch(error){setStatus('Błąd importu: '+error.message)}
   }
  });
 }
 function open(mount,onExit){
  lastStatus='';
  if(!window.DBIGmAccess?.hasSession?.()||!mount)return;
  mount.replaceChildren();const view=document.createElement('div');view.className='dbi-gme-mount';mount.appendChild(view);
  state={root:view,pack:draft(),tab:'maps',tool:'select',mapId:null,questId:null,legacyQuestId:null,selection:null,tileBrush:0,tileSize:1,brushShape:'organic',showGrid:false,undo:[],redo:[],openSteps:new WeakSet(),onExit};
  state.mapId=state.pack.maps[0]?.id||legacyCatalog().maps[0]?.id||null;state.questId=state.pack.quests[0]?.id||null;
  bindEvents();terrain?.onReady(()=>{if(state?.root===view){drawTerrainPreview();drawPickupTerrain();drawStageTerrains()}});draw();
 }
 window.DBIGMMapEditor={open,renderNpcQuest,recordKill,activePoints,activePickups,collectPickup,readDraft:draft,readPublished:currentPublished,
  download:report=>publishOriginals('download-js',draft(),report)};
})();
