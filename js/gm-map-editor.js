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
 const clone=x=>JSON.parse(JSON.stringify(x));
 const number=(v,min,max,defaultValue=min)=>Math.min(max,Math.max(min,Number.isFinite(Number(v))?Number(v):defaultValue));
 function read(key){try{const x=JSON.parse(localStorage.getItem(key)||'null');return x&&x.version===1?x:null}catch{return null}}
 const empty=()=>({version:1,maps:[],quests:[]});
 const draft=()=>clone(read(DRAFT_KEY)||empty());
 const currentPublished=()=>{
  const maps=new Map(),quests=new Map();
  for(const p of [window.DBI_GM_WORLD_DATA,read(PUBLISHED_KEY)]){
   if(!p||p.version!==1)continue;
   for(const m of Array.isArray(p.maps)?p.maps:[])if(m?.id)maps.set(m.id,m);
   for(const q of Array.isArray(p.quests)?p.quests:[])if(q?.id)quests.set(q.id,q);
  }
  return {version:1,maps:[...maps.values()],quests:[...quests.values()]};
 };
 const quests=()=>currentPublished().quests;
 const questProgressKey=(id,questId)=>'dboidle_gm_quest_v1_'+String(id)+'_'+String(questId);
 function getQuestProgress(charId,questId){
  try{const state=JSON.parse(localStorage.getItem(questProgressKey(charId,questId))||'null');return state&&Number.isInteger(state.stage)?state:{stage:0,kills:0}}catch{return {stage:0,kills:0}}
 }
 function questById(questId){return quests().find(q=>q.id===questId)}
 function renderNpcQuest({side,npc,characterId,onChange,onClose}){
  const quest=questById(npc.questId);if(!quest)return false;
  let state=getQuestProgress(characterId,quest.id);
  const steps=Array.isArray(quest.steps)?quest.steps:[];
  if(state.stage>=steps.length){
   side.innerHTML='<div class="dbi-quest-panel"><header class="dbi-quest-title">'+esc(quest.name)+'</header><section class="dbi-quest-story">Zakończono wszystkie etapy tego zadania.</section><button class="world-action secondary" data-gme-close>Zamknij</button></div>';
   $(side,'[data-gme-close]').onclick=onClose;return true;
  }
  const step=steps[state.stage],need=Math.max(1,Number(step.count)||1),level=Math.floor(Number(window.DBIWorldInventory?.character?.()?.level)||1);
  const inventory=window.DBIWorldInventory;
  const quantity=step.requirement==='item'?Number(inventory?.countQuestItem?.(step.target))||0:step.requirement==='level'?level:step.requirement==='kill'?Number(state.kills)||0:1;
  const satisfied=step.requirement==='none'||quantity>=need;
  const condition=step.requirement==='item'?'Oddaj '+esc(step.target):step.requirement==='level'?'Osiągnij poziom '+need:step.requirement==='kill'?'Pokonaj '+esc(step.target):'';
  const reward=step.rewardType==='premium'?`${number(step.rewardAmount,0,999999)} Premium`:step.rewardType==='exp'?`${number(step.rewardAmount,0,999999999)} EXP`:step.rewardType==='item'?`${esc(step.rewardItem)} ×${number(step.rewardAmount,1,4000,1)}`:'';
  side.innerHTML='<div class="dbi-quest-panel"><header class="dbi-quest-title">'+esc(quest.name)+'</header><section class="dbi-quest-story"><p>'+esc(step.dialog||'...').replace(/\n/g,'<br>')+'</p></section>'+
   (condition?'<div class="dbi-quest-goal '+(satisfied?'done':'pending')+'">Wymagania: '+condition+' ('+Math.min(need,quantity)+'/'+need+')</div>':'')+
   (reward?'<div class="dbi-quest-rewards"><strong>Nagroda</strong><div class="dbi-quest-reward-item">'+reward+'</div></div>':'')+
   '<p role="status" data-gme-error class="world-quest-error" hidden></p><div class="dbi-quest-buttons"><button type="button" class="world-action" data-gme-next '+(satisfied?'':'disabled')+'>'+esc(step.button||'Dalej')+'</button><button type="button" class="world-action secondary" data-gme-close>Zamknij</button></div></div>';
  $(side,'[data-gme-close]').onclick=onClose;
  $(side,'[data-gme-next]').onclick=()=>{
   // Recheck aktualnego etapu i zasobów bezpośrednio przed nadaniem nagrody.
   const latest=getQuestProgress(characterId,quest.id);
   if(latest.stage!==state.stage)return onChange();
   const have=step.requirement==='item'?Number(inventory?.countQuestItem?.(step.target))||0:step.requirement==='level'?Math.floor(Number(inventory?.character?.()?.level)||1):step.requirement==='kill'?Number(latest.kills)||0:1;
   if(step.requirement!=='none'&&have<need)return onChange();
   const error=message=>{const node=$(side,'[data-gme-error]');node.hidden=false;node.textContent=message};
   const count=number(step.rewardAmount,1,4000,1);
   // Nagroda przed zapisem postępu — bez oznaczania zadania jako ukończonego w razie braku miejsca.
   if(step.rewardType==='item'){
    if(!validId.test(String(step.rewardItem||'')))return error('Nieprawidłowy identyfikator przedmiotu.');
    if(inventory?.grant?.(Array(count).fill(step.rewardItem))!==count)return error('Nie udało się odebrać nagrody. Zwolnij miejsce w ekwipunku.');
   }
   if(step.requirement==='item'){
    if(inventory?.consumeQuestItem?.(step.target,need)!==true)return error('Nie udało się oddać przedmiotów.');
   }
   if(step.rewardType==='premium'){
    const key='dboidle_premium_v1_'+characterId;
    try{localStorage.setItem(key,String((Number(localStorage.getItem(key))||0)+number(step.rewardAmount,0,999999)));window.DBIRefreshWallet?.()}catch{return error('Nie udało się zapisać Premium.')}
   }
   if(step.rewardType==='exp')inventory?.grantExp?.(number(step.rewardAmount,0,999999999));
   try{localStorage.setItem(questProgressKey(characterId,quest.id),JSON.stringify({stage:latest.stage+1,kills:0}));}
   catch{return error('Nie udało się zapisać postępu zadania.')}
   onChange();
  };
  return true;
 }
 function recordKill(charId,mobName,mapId){
  for(const q of quests()){
   if(q.mapId!==mapId)continue;
   const state=getQuestProgress(charId,q.id),step=q.steps?.[state.stage];
   if(step?.requirement!=='kill'||step.target!==mobName)continue;
   state.kills=Math.min(9999,Math.max(0,Number(state.kills)||0)+1);
   try{localStorage.setItem(questProgressKey(charId,q.id),JSON.stringify(state))}catch{}
  }
 }
 // Rejestr misji: korzysta z tych samych stanów co NPC.
 function registerMissions(){
  window.DBIQuestRegistry?.register?.({id:'gm-editor-quests',getMissions(charId){
   const list=[];
   for(const q of quests()){
    const state=getQuestProgress(charId,q.id),step=q.steps?.[state.stage];
    if(!step||state.stage===0)continue;
    const count=step.requirement==='level'?Number(window.DBIWorldInventory?.character?.()?.level)||1:step.requirement==='item'?Number(window.DBIWorldInventory?.countQuestItem?.(step.target))||0:step.requirement==='kill'?state.kills:1;
    list.push({id:'gm-'+q.id,name:q.name,location:q.mapId,count:Math.min(step.count||1,count),total:step.count||1,description:step.dialog||'Misja z kreatora',ready:'Wróć do NPC i porozmawiaj.'});
   }
   return list;
  }});
 }
 registerMissions();

 let state=null;
 function saveDraft(){
  if(!state)return false;
  try{localStorage.setItem(DRAFT_KEY,JSON.stringify(state.pack));setStatus('Projekt zapisany lokalnie.');return true}
  catch(e){setStatus('Nie udało się zapisać. Sprawdź limit pamięci przeglądarki.');return false}
 }
 function setStatus(text){const node=state?.root?.querySelector('[data-gme-status]');if(node)node.textContent=text}
 function download(name,text,mime){
  const url=URL.createObjectURL(new Blob([text],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2500);
 }
 function builtins(){return Array.isArray(window.DBIWorld?.locations)?window.DBIWorld.locations:[]}
 function legacyCatalog(){return window.DBIWorld?.legacyEditorData?.()||{maps:[],quests:[]}}
 function legacyMap(){return legacyCatalog().maps.find(m=>m.id===state?.mapId)||null}
 function legacyQuest(){return legacyCatalog().quests.find(q=>q.id===state?.legacyQuestId)||null}
 function legacyMapQuests(mapId){return legacyCatalog().quests.filter(q=>q.mapIds?.includes(mapId))}

 function allLocations(){const list=builtins().map(l=>({id:l.id,name:l.name}));for(const m of state.pack.maps)if(!list.some(l=>l.id===m.id))list.push({id:m.id,name:m.name});return list}
 function currentMap(){return state.pack.maps.find(m=>m.id===state.mapId)||null}
 function currentQuest(){return state.pack.quests.find(q=>q.id===state.questId)||null}
 function currentObject(){const m=currentMap();if(!m)return null;if(state.selection?.type==='spawn')return m.spawn;if(state.selection?.type==='mobs')return m.mobs;if(state.selection?.type==='boss')return m.boss;if(state.selection?.type==='blocked')return m.blocked[state.selection.index];return m[state.selection?.type]?.[state.selection.index]||null}
 function validate(pack){
  const problems=[],ids=new Set(),builtinIds=new Set(builtins().map(m=>m.id));
  for(const m of pack.maps){
   if(!validId.test(m.id)||ids.has(m.id)||builtinIds.has(m.id))problems.push('Mapa „'+m.name+'”: niepoprawne, powtórzone lub zajęte ID.');ids.add(m.id);
   if(!m.name?.trim())problems.push('Mapa „'+m.id+'”: podaj nazwę.');
   if(m.terrain){
    if(!terrain?.valid(m))problems.push('Mapa „'+m.id+'”: uszkodzona siatka kafelków terenu.');
    else if(terrain.isBlocked(m,Number(m.spawn?.x)||0,Number(m.spawn?.y)||0))problems.push('Mapa „'+m.id+'”: punkt startowy leży na terenie nieprzechodnim. Przenieś start lub zmień kafelek.');
   }
   else if(!validAsset.test(m.art)||m.art.includes('..'))problems.push('Mapa „'+m.id+'”: podaj prawidłową ścieżkę grafiki assets/...');
   if(!(Number(m.sizeX)>=10&&Number(m.sizeX)<=100&&Number(m.sizeY)>=10&&Number(m.sizeY)<=100))problems.push('Mapa „'+m.id+'”: rozmiar od 10 do 100 kafelków.');
   if((m.portals||[]).some(p=>p.to&&(['laguna','island'].includes(p.to)||(!ids.has(p.to)&&!builtinIds.has(p.to)&&!pack.maps.some(map=>map.id===p.to)))))problems.push('Mapa „'+m.id+'”: portal ma nieznany cel.');
  }
  const qIds=new Set();for(const q of pack.quests){
   if(!validId.test(q.id)||qIds.has(q.id))problems.push('Quest: niepoprawne lub powtórzone ID '+q.id);qIds.add(q.id);
   if(!ids.has(q.mapId))problems.push('Quest '+q.id+': nie ma mapy '+q.mapId);
   if(!q.steps?.length)problems.push('Quest '+q.id+': dodaj przynajmniej jeden etap.');
  }
  for(const m of pack.maps)for(const n of m.npc||[])if(n.questId&&!qIds.has(n.questId))problems.push('NPC '+n.label+': quest '+n.questId+' nie istnieje.');
  return problems;
 }
 function field(label,key,value,{type='text',min,max,placeholder='',options=null,textarea=false}={}){
  return '<label class="dbi-gme-field"><span>'+esc(label)+'</span>'+(textarea?'<textarea data-gme-field="'+esc(key)+'" rows="4" placeholder="'+esc(placeholder)+'">'+esc(value)+'</textarea>':options?'<select data-gme-field="'+esc(key)+'">'+options.map(([id,title])=>'<option value="'+esc(id)+'" '+(String(id)===String(value)?'selected':'')+'>'+esc(title)+'</option>').join('')+'</select>':'<input data-gme-field="'+esc(key)+'" type="'+esc(type)+'" value="'+esc(value)+'" '+(min!==undefined?'min="'+esc(min)+'" ':'')+(max!==undefined?'max="'+esc(max)+'" ':'')+'placeholder="'+esc(placeholder)+'">')+'</label>';
 }
 function mapSelect(){
  const legacy=legacyCatalog().maps;
  return '<div class="dbi-gme-projects"><strong>Istniejące mapy ('+legacy.length+')</strong>'+legacy.map(m=>'<button type="button" class="dbi-gme-legacy-option '+(m.id===state.mapId?'active':'')+'" data-gme-map="'+esc(m.id)+'" title="Oryginalna mapa — podgląd">'+esc(m.name)+'</button>').join('')+
   '<strong>Mapy projektu ('+state.pack.maps.length+')</strong>'+state.pack.maps.map(m=>'<button type="button" class="'+(m.id===state.mapId?'active':'')+'" data-gme-map="'+esc(m.id)+'">'+esc(m.name)+'</button>').join('')+'<button type="button" data-gme-command="add-map">+ Nowa mapa</button></div>'
 }
 function editorTop(){return '<header class="dbi-gme-header"><div><span class="dbi-gme-tag">PANEL GM / NARZĘDZIA ŚWIATA</span><h2>🗺 Kreator map i questów v3</h2><p>Buduj teren od zera, rozmieszczaj obiekty i twórz questy. Stare mapy pozostają bez zmian.</p></div><button type="button" data-gme-command="exit">Wróć do Panelu GM</button></header><nav class="dbi-gme-tabs">'+[['maps','Mapy i obiekty'],['quests','Questy i dialogi'],['publish','Zapis i publikacja']].map(([id,label])=>'<button type="button" data-gme-tab="'+id+'" class="'+(state.tab===id?'active':'')+'">'+label+'</button>').join('')+'</nav>'}
 function objectLabel(type,item,index){return type==='npc'?item.label||'NPC '+(index+1):type==='portals'?'Portal → '+(item.to||'?'):type==='scenery'?item.label||'Obiekt '+(index+1):type==='blocked'?'Kolizja '+(index+1):type==='mobs'?'Expowisko':type==='boss'?'Boss':'Start'}
 function mapLegacyView(map){
  const W=map.sizeX*32,H=map.sizeY*32;
  const quests=legacyMapQuests(map.id);
  const pins=[['spawn',map.spawn],...(map.npc||[]).map(o=>['npc',o]),...(map.scenery||[]).map(o=>['scenery',o]),...(map.portals||[]).map(o=>['portals',o]),...(map.mobs?[['mobs',map.mobs]]:[]),...(map.boss?[['boss',map.boss]]:[]),...(map.city?[['city',map.city]]:[]),...(map.dungeon?[['dungeon',map.dungeon]]:[])];
  const symbols={spawn:'🏁',npc:'👤',scenery:'🏠',portals:'🌀',mobs:'⚔',boss:'👑',city:'🏙',dungeon:'🏰'};
  const items=pins.filter(([,p])=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)).map(([type,p])=>'<span class="dbi-gme-pin dbi-gme-read-pin" style="left:'+(p.x/W*100)+'%;top:'+(p.y/H*100)+'%" title="'+esc(p.label||type)+'">'+symbols[type]+'</span>').join('');
  const blocks=(map.blocked||[]).map(b=>'<span class="dbi-gme-block dbi-gme-read-block" style="left:'+(b[0]/W*100)+'%;top:'+(b[1]/H*100)+'%;width:'+((b[2]-b[0])/W*100)+'%;height:'+((b[3]-b[1])/H*100)+'%"></span>').join('');
  const list=(title,values)=>'<article class="dbi-gme-legacy-box"><h4>'+title+'</h4>'+(values.length?'<ul>'+values.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>':'<p>Brak elementów w definicji mapy.</p>')+'</article>';
  return '<section class="dbi-gme-work dbi-gme-legacy-view"><div class="dbi-gme-legacy-banner"><div><span class="dbi-gme-tag">MAPA Z GRY · PODGLĄD</span><h3>'+esc(map.name)+'</h3><p>ID: <code>'+esc(map.id)+'</code> · '+map.sizeX+' × '+map.sizeY+' kafelków · '+esc(map.art)+'</p></div><div class="dbi-gme-inline"><button type="button" data-gme-command="legacy-quests" '+(quests.length?'':'disabled')+'>Questy mapy ('+quests.length+')</button><button type="button" data-gme-command="legacy-copy">Utwórz edytowalną kopię</button><button type="button" data-gme-command="legacy-test">Przejdź na mapę (GM)</button></div></div>'+ 
    '<p class="dbi-gme-legacy-warning">To oryginalna lokacja z <code>world.js</code>. Przeglądanie nie zmienia mapy ani fabuły. Kopia tworzy nową mapę z nowym ID — nie kopiuje skryptów fabularnych ani specjalnych kolizji zapisanych w kodzie.</p>'+ 
    '<div class="dbi-gme-map-wrap"><div class="dbi-gme-map-stage dbi-gme-legacy-stage" style="aspect-ratio:'+map.sizeX+'/'+map.sizeY+';background-image:url(\''+esc(map.art)+'\');background-size:100% 100%">'+blocks+items+'</div></div><div class="dbi-gme-legacy-details">'+
    list('NPC',(map.npc||[]).map(n=>(n.label||'NPC')+' — '+Math.round(n.x)+', '+Math.round(n.y)))+
    list('Portale',(map.portals||[]).map(p=>'→ '+(legacyCatalog().maps.find(x=>x.id===p.to)?.name||p.to)+' — '+Math.round(p.x)+', '+Math.round(p.y)))+
    list('Expowisko i boss',[...(map.mobs?[map.mobs.label||'Expowisko']:[]),...(map.boss?[map.boss.label||'Boss']:[]),...(map.mobNames||[]).map(m=>'Przeciwnik: '+m.name+' (poz. '+m.level+')')])+
    list('Obiekty i kolizje',[...(map.scenery||[]).map(s=>s.label||'Obiekt na mapie'),...(map.city?[map.city.label||'Miasto']:[]),...(map.dungeon?[map.dungeon.label||'Dungeon']:[]),'Zapisanych obszarów kolizji: '+(map.blocked||[]).length])+
    '<article class="dbi-gme-legacy-box"><h4>Istniejące questy w lokacji</h4>'+(quests.length?quests.map(q=>'<button type="button" class="dbi-gme-linked-quest" data-gme-legacy-quest="'+esc(q.id)+'">📜 '+esc(q.name)+' · '+esc(q.npc)+'</button>').join(''):'<p>Brak przypisanego skryptu fabularnego w katalogu. NPC mogą mieć zwykłe rozmowy.</p>')+'</article></div></section>';
 }
 // Siatka terenu: osobna warstwa, niezależna od NPC, portali i kolizji prostokątnych.
 const tileTools=new Set(['tile-brush','tile-erase','tile-fill','tile-rect','tile-pick']);
 function tileView(map){
  const brush=state.tileBrush??0,size=state.tileSize||1;
  const palette=terrain.palette.map(t=>'<button type="button" data-gme-palette="'+t.id+'" class="dbi-gme-tile-choice '+(brush===t.id?'active':'')+'" title="'+esc(t.name)+(t.blocked?' — nieprzechodnie':' — przechodnie')+'"><span class="dbi-gme-tile-swatch" style="background-position:'+((t.id/9)*100)+'% 0"></span><span>'+esc(t.name)+'</span>'+(t.blocked?'<small>⛔</small>':'')+'</button>').join('');
  return '<div class="dbi-gme-terrain-panel"><div class="dbi-gme-terrain-heading"><strong>🎨 Budowanie terenu</strong><span>Mapa kafelkowa · '+map.sizeX+' × '+map.sizeY+'</span></div>'+
   '<div class="dbi-gme-terrain-toolbar">'+[['tile-brush','🖌 Pędzel'],['tile-erase','⌫ Gumka'],['tile-fill','▣ Wypełnij'],['tile-rect','▭ Prostokąt'],['tile-pick','◎ Pipeta']].map(([id,label])=>'<button type="button" data-gme-tool="'+id+'" class="'+(state.tool===id?'active':'')+'">'+label+'</button>').join('')+
   '<label class="dbi-gme-terrain-size">Rozmiar pędzla <select data-gme-brush-size><option value="1" '+(size===1?'selected':'')+'>1 × 1</option><option value="2" '+(size===2?'selected':'')+'>2 × 2</option><option value="3" '+(size===3?'selected':'')+'>3 × 3</option></select></label>'+
   '<button type="button" data-gme-command="tile-undo" '+(!state.undo?.length?'disabled':'')+'>↶ Cofnij</button><button type="button" data-gme-command="tile-redo" '+(!state.redo?.length?'disabled':'')+'>↷ Ponów</button>'+
   '<label class="dbi-gme-grid-toggle"><input type="checkbox" data-gme-grid '+(state.showGrid?'checked':'')+'> Siatka</label></div>'+
   '<div class="dbi-gme-tile-palette">'+palette+'</div><p>Maluj przeciągając po mapie. Gumka przywraca trawę. Woda, las, skały i mury automatycznie blokują ruch. Mapa PNG nadal jest dostępna jako osobny tryb.</p></div>';
 }
 function ensureHistory(){state.undo??=[];state.redo??=[]}
 function historySnapshot(){const m=currentMap();if(!m?.terrain)return;ensureHistory();state.undo.push(m.terrain.tiles.slice());if(state.undo.length>35)state.undo.shift();state.redo.length=0}
 function applyHistory(reverse){const m=currentMap();if(!m?.terrain)return;ensureHistory();const source=reverse?state.undo:state.redo,dest=reverse?state.redo:state.undo;if(!source.length)return;dest.push(m.terrain.tiles.slice());m.terrain.tiles=source.pop();saveDraft();draw()}
 function paintTile(map,c,r,id,size=1){if(!map?.terrain)return false;let changed=false;const half=Math.floor((size-1)/2);
  for(let y=r-half;y<r-half+size;y++)for(let x=c-half;x<c-half+size;x++)if(x>=0&&y>=0&&x<map.sizeX&&y<map.sizeY){const index=y*map.sizeX+x;if(map.terrain.tiles[index]!==id){map.terrain.tiles[index]=id;changed=true}}
  return changed;
 }
 function paintFill(map,c,r,id){if(!map?.terrain||c<0||r<0||c>=map.sizeX||r>=map.sizeY)return false;
  const width=map.sizeX,values=map.terrain.tiles,target=values[r*width+c];if(target===id)return false;
  const stack=[r*width+c];values[r*width+c]=id;
  while(stack.length){const i=stack.pop(),x=i%width,y=Math.floor(i/width);for(const n of [x>0?i-1:-1,x<width-1?i+1:-1,y>0?i-width:-1,y<map.sizeY-1?i+width:-1])if(n>=0&&values[n]===target){values[n]=id;stack.push(n)}}
  return true;
 }
 function paintRect(map,a,b,id){if(!map?.terrain)return false;let changed=false;for(let y=Math.min(a.y,b.y);y<=Math.max(a.y,b.y);y++)for(let x=Math.min(a.x,b.x);x<=Math.max(a.x,b.x);x++)changed=paintTile(map,x,y,id)||changed;return changed}
 function drawTerrainPreview(){
  const map=currentMap(),canvas=$(state.root,'[data-gme-terrain-canvas]');if(!map?.terrain||!canvas||!terrain?.valid(map))return;
  const width=map.sizeX*32,height=map.sizeY*32;if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;terrain.draw(ctx,map);
 }
 function mapView(){
  const map=currentMap();
  if(!map&&legacyMap())return mapLegacyView(legacyMap());
  if(!map)return '<section class="dbi-gme-empty">Utwórz pierwszą mapę, aby rozpocząć.</section>';
  const tools=[['select','↖ Wybierz / przesuń'],['spawn','🏁 Start'],['npc','👤 NPC'],['scenery','🏠 Obiekt'],['mobs','⚔ Expowisko'],['boss','👑 Boss (znacznik)'],['portal','🌀 Portal'],['blocked','⛔ Kolizja']];
  const W=map.sizeX*32,H=map.sizeY*32;
  const pins=[['spawn',0,map.spawn],...(map.npc||[]).map((x,i)=>['npc',i,x]),...(map.scenery||[]).map((x,i)=>['scenery',i,x]),...(map.portals||[]).map((x,i)=>['portals',i,x]),...(map.mobs?[['mobs',0,map.mobs]]:[]),...(map.boss?[['boss',0,map.boss]]:[])];
  const glyph={spawn:'🏁',npc:'👤',scenery:'🏠',portals:'🌀',mobs:'⚔',boss:'👑'};
  const objects=pins.filter(p=>p[2]).map(([type,i,p])=>'<button type="button" class="dbi-gme-pin '+(state.selection?.type===type&&state.selection?.index===i?'is-selected':'')+'" data-gme-select="'+type+':'+i+'" style="left:'+(p.x/W*100)+'%;top:'+(p.y/H*100)+'%" title="'+esc(objectLabel(type,p,i))+'"><span>'+glyph[type]+'</span></button>').join('');
  const blocks=(map.blocked||[]).map((b,i)=>'<button type="button" data-gme-select="blocked:'+i+'" class="dbi-gme-block '+(state.selection?.type==='blocked'&&state.selection.index===i?'is-selected':'')+'" style="left:'+(b[0]/W*100)+'%;top:'+(b[1]/H*100)+'%;width:'+((b[2]-b[0])/W*100)+'%;height:'+((b[3]-b[1])/H*100)+'%"></button>').join('');
  const selected=currentObject();
  return '<section class="dbi-gme-work"><div class="dbi-gme-terrain-mode"><strong>Rodzaj tła mapy</strong><div class="dbi-gme-inline"><button type="button" data-gme-command="mode-tiles" class="'+(map.terrain?'active':'')+'">🎨 Buduj z kafelków</button><button type="button" data-gme-command="mode-png" class="'+(!map.terrain?'active':'')+'">🖼 Tło PNG</button></div></div><div class="dbi-gme-map-settings">'+field('ID mapy','map.id',map.id)+field('Nazwa mapy','map.name',map.name)+field('Szerokość (kafelki)','map.sizeX',map.sizeX,{type:'number',min:10,max:100})+field('Wysokość (kafelki)','map.sizeY',map.sizeY,{type:'number',min:10,max:100})+(map.terrain?'':field('Grafika tła (ścieżka pliku)','map.art',map.art,{placeholder:'assets/world/moja-mapa.webp'}))+'<div class="dbi-gme-inline"><button type="button" data-gme-command="duplicate-map">Duplikuj</button><button type="button" data-gme-command="delete-map" class="danger">Usuń mapę</button></div><p>'+(map.terrain?'Tło budujesz z kafelków — nie potrzebujesz PNG.':'Grafikę mapy dodaj osobno do folderu <code>assets/</code>. Tutaj wskazujesz jej ścieżkę.')+'</p><div class="dbi-gme-entry"><strong>Opcjonalny portal wejściowy z istniejącej mapy</strong><p>Używa istniejącego portalu i animacji. Poprzednie portale pozostaną bez zmian.</p><div class="dbi-gme-fields">'+field('Mapa wejściowa','entry.from',map.entryPortal?.from||'',{options:[['','Bez wejścia'],...allLocations().filter(loc=>loc.id!==map.id&&!['laguna','island'].includes(loc.id)).map(loc=>[loc.id,loc.name])]})+field('Pozycja portalu X (px)','entry.x',map.entryPortal?.x??128,{type:'number',min:0,max:4000})+field('Pozycja portalu Y (px)','entry.y',map.entryPortal?.y??128,{type:'number',min:0,max:4000})+'</div></div></div>'+(map.terrain?tileView(map):'')+'<div class="dbi-gme-tools">'+tools.map(([id,title])=>'<button type="button" data-gme-tool="'+id+'" class="'+(state.tool===id?'active':'')+'">'+title+'</button>').join('')+'</div><div class="dbi-gme-map-wrap"><div data-gme-map-stage class="dbi-gme-map-stage '+(map.terrain&&state.showGrid?'show-grid':'')+' '+(map.terrain&&tileTools.has(state.tool)?'is-tile-painting':'')+'" style="--gme-columns:'+map.sizeX+';--gme-rows:'+map.sizeY+';aspect-ratio:'+map.sizeX+'/'+map.sizeY+';'+(map.terrain?'background-image:none': 'background-image:url(&quot;'+esc(map.art)+'&quot;);background-size:100% 100%')+'">'+(map.terrain?'<canvas data-gme-terrain-canvas class="dbi-gme-terrain-canvas" aria-label="Teren mapy"></canvas>':'')+blocks+objects+'<div class="dbi-gme-drawing" hidden></div></div></div><p class="dbi-gme-help">Kliknij narzędzie, a potem miejsce na mapie. Wybór i przesuwanie: narzędzie ↖. Kolizje: przeciągnij prostokąt. NPC i obiekty są osobno od tła. Nowy Boss jest na razie znacznikiem — bez definiowania statystyk i walki.</p><div class="dbi-gme-inspector"><h3>Właściwości zaznaczenia</h3>'+inspector(map,selected)+'</div></section>';
 }
 function inspector(map,selected){
  const sel=state.selection;
  if(!sel||!selected)return '<p>Wybierz obiekt na mapie, aby zmienić jego właściwości.</p>';
  let html='';
  const pointFields=()=>field('Pozycja X (px)','item.x',Math.round(selected.x),{type:'number',min:0,max:map.sizeX*32})+field('Pozycja Y (px)','item.y',Math.round(selected.y),{type:'number',min:0,max:map.sizeY*32});
  if(sel.type==='blocked')html=field('Lewo','rect.0',selected[0],{type:'number'})+field('Góra','rect.1',selected[1],{type:'number'})+field('Prawo','rect.2',selected[2],{type:'number'})+field('Dół','rect.3',selected[3],{type:'number'});
  else{
   html=pointFields();
   if(sel.type==='npc')html+=field('Nazwa NPC','item.label',selected.label)+field('Grafika sprite’a','item.art',selected.art||'',{placeholder:'assets/world/npc.png'})+field('Przypisany quest','item.questId',selected.questId||'',{options:[['','Bez questa'],...state.pack.quests.map(q=>[q.id,q.name])]});
   if(sel.type==='portals')html+=field('Mapa docelowa','item.to',selected.to||'',{options:[['','Wybierz lokację'],...allLocations().filter(loc=>loc.id!==map.id&&!['laguna','island'].includes(loc.id)).map(loc=>[loc.id,loc.name])]})+field('Miejsce pojawienia X','item.destinationArrival.x',selected.destinationArrival?.x??0,{type:'number',min:0})+field('Miejsce pojawienia Y','item.destinationArrival.y',selected.destinationArrival?.y??0,{type:'number',min:0});
   if(sel.type==='scenery')html+=field('Nazwa (opcjonalna)','item.label',selected.label||'')+field('Grafika obiektu','item.art',selected.art||'')+field('Szerokość (px)','item.width',selected.width,{type:'number',min:1})+field('Wysokość (px)','item.height',selected.height,{type:'number',min:1});
   if(sel.type==='mobs')html+=field('Nazwa expowiska','item.label',selected.label||'Expowisko')+field('Grafika expowiska','item.art',selected.art||'')+field('Przeciwnicy: Nazwa|Poziom (po jednym wierszu)','map.mobNames',map.mobNames.map(m=>m.name+'|'+m.level).join('\n'),{textarea:true,placeholder:'Najemnik|100'});
   if(sel.type==='boss')html+=field('Nazwa bossa','item.label',selected.label||'Boss')+field('Grafika bossa','item.art',selected.art||'');
  }
  return '<div class="dbi-gme-fields">'+html+'</div>'+(sel.type!=='spawn'?'<button type="button" class="danger" data-gme-command="delete-object">Usuń zaznaczony element</button>':'');
 }
 function questView(){
  const q=currentQuest(),legacy=legacyQuest(),legacyQuests=legacyCatalog().quests;
  const list='<div class="dbi-gme-projects"><strong>Istniejące questy ('+legacyQuests.length+')</strong>'+legacyQuests.map(x=>'<button type="button" data-gme-legacy-quest="'+esc(x.id)+'" class="dbi-gme-legacy-option '+(x.id===state.legacyQuestId?'active':'')+'">'+esc(x.name)+'</button>').join('')+
   '<strong>Questy projektu ('+state.pack.quests.length+')</strong>'+state.pack.quests.map(x=>'<button type="button" data-gme-quest="'+esc(x.id)+'" class="'+(x.id===state.questId?'active':'')+'">'+esc(x.name)+'</button>').join('')+'<button type="button" data-gme-command="add-quest">+ Nowy quest</button></div>';
  if(legacy){
   const steps=(legacy.steps||[]).map((s,i)=>'<article class="dbi-gme-step"><div class="dbi-gme-step-title"><b>Etap / cel '+(i+1)+'</b></div><p>'+esc(s.dialog||'')+'</p>'+(s.requirement?'<p><b>Wymaganie:</b> '+esc(s.requirement)+'</p>':'')+(s.reward?'<p><b>Nagroda:</b> '+esc(s.reward)+'</p>':'')+(s.button?'<p><b>Przycisk:</b> '+esc(s.button)+'</p>':'')+'</article>').join('');
   return '<div class="dbi-gme-quest-layout">'+list+'<section class="dbi-gme-quest-edit dbi-gme-legacy-quest"><span class="dbi-gme-tag">ISTNIEJĄCY QUEST · TYLKO ODCZYT</span><h3>'+esc(legacy.name)+'</h3><p><b>NPC / punkt fabularny:</b> '+esc(legacy.npc)+'</p><p><b>Lokacje:</b> '+legacy.mapIds.map(id=>esc(legacyCatalog().maps.find(m=>m.id===id)?.name||id)).join(' · ')+'</p><p>'+esc(legacy.summary)+'</p><p>Ten quest ma własną logikę i postęp w <code>js/world.js</code>. Podgląd pokazuje rozpoznane cele i dialogi; nie jest pełną konwersją wszystkich etapów do edytora. Edycja w tym widoku nie zmienia oryginalnej fabuły.</p><div class="dbi-gme-inline">'+legacy.mapIds.map(id=>'<button type="button" data-gme-map="'+esc(id)+'">🗺 '+esc(legacyCatalog().maps.find(m=>m.id===id)?.name||id)+'</button>').join('')+'</div>'+ (steps||'<p>Etapy są obsługiwane bezpośrednio w kodzie fabularnym, dlatego nie są tu edytowalne.</p>')+'</section></div>';
  }
  if(!q)return '<div class="dbi-gme-quest-layout">'+list+'<p>Dodaj quest i przypisz go do NPC w edytorze mapy.</p></div>';
  const steps=q.steps.map((st,i)=>'<article class="dbi-gme-step"><div class="dbi-gme-step-title"><b>Etap '+(i+1)+'</b><button type="button" class="danger" data-gme-delete-step="'+i+'">Usuń etap</button></div><div class="dbi-gme-fields">'+
   field('Treść dialogu','step.'+i+'.dialog',st.dialog,{textarea:true})+field('Przycisk','step.'+i+'.button',st.button||'Dalej')+
   field('Wymaganie','step.'+i+'.requirement',st.requirement||'none',{options:[['none','Brak (rozmowa)'],['level','Poziom postaci'],['item','Oddaj przedmiot'],['kill','Pokonaj przeciwników']]})+
   field('Cel — ID przedmiotu lub nazwa przeciwnika','step.'+i+'.target',st.target||'')+
   field('Wymagana liczba / poziom','step.'+i+'.count',st.count||1,{type:'number',min:1,max:100000})+
   field('Typ nagrody','step.'+i+'.rewardType',st.rewardType||'none',{options:[['none','Bez nagrody'],['item','Przedmiot'],['premium','Premium'],['exp','Doświadczenie postaci']]})+
   field('ID przedmiotu nagrody','step.'+i+'.rewardItem',st.rewardItem||'')+
   field('Ilość nagrody','step.'+i+'.rewardAmount',st.rewardAmount||1,{type:'number',min:1,max:999999})+'</div></article>').join('');
  return '<div class="dbi-gme-quest-layout">'+list+'<section class="dbi-gme-quest-edit"><div class="dbi-gme-fields">'+field('ID questa','quest.id',q.id)+field('Nazwa questa','quest.name',q.name)+field('Mapa powiązana','quest.mapId',q.mapId,{options:state.pack.maps.map(m=>[m.id,m.name])})+'</div><p>Po zapisaniu przypisz quest do NPC w zakładce „Mapy i obiekty”. Etapy wykonują się po kolei, a postęp zapisuje się oddzielnie dla każdej postaci.</p><div class="dbi-gme-inline"><button type="button" data-gme-command="add-step">+ Dodaj etap</button><button type="button" class="danger" data-gme-command="delete-quest">Usuń quest</button></div>'+steps+'</section></div>';
 }
 function publishView(){
  const problems=validate(state.pack);
  return '<div class="dbi-gme-publish"><h3>Publikowanie projektów</h3><p><strong>Lokalny projekt:</strong> '+state.pack.maps.length+' map, '+state.pack.quests.length+' questów.</p><p>Wersja testowa działa tylko w tej przeglądarce. Aby wszyscy gracze widzieli nowe mapy i questy, pobierz wygenerowany plik i dodaj go do repozytorium gry.</p>'+(problems.length?'<div class="dbi-gme-errors"><b>Popraw przed publikacją:</b><ul>'+problems.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>':'<p class="dbi-gme-valid">✓ Podstawowa walidacja projektu zakończona pomyślnie.</p>')+'<div class="dbi-gme-publish-actions"><button type="button" data-gme-command="save">Zapisz projekt</button><button type="button" data-gme-command="export">Eksport JSON projektu</button><button type="button" data-gme-command="import-trigger">Import JSON projektu</button><button type="button" data-gme-command="publish-local" '+(problems.length?'disabled':'')+'>Publikuj lokalnie (test)</button><button type="button" data-gme-command="download-js" '+(problems.length?'disabled':'')+'>Pobierz plik na GitHub</button><button type="button" data-gme-command="test-map" '+(problems.length||!state.pack.maps.length?'disabled':'')+'>Testuj wybraną mapę</button></div><input type="file" data-gme-import accept=".json,application/json" hidden><div class="dbi-gme-instructions"><strong>Publikacja na GitHub Pages</strong><p>1. Kliknij „Pobierz plik na GitHub”. 2. Wgraj pobrany plik <code>data/gm-world-published.js</code> do repozytorium, zastępując pustą wersję. 3. Po aktualizacji strony wszyscy gracze zobaczą nowe mapy i questy. Grafiki wskazane w ścieżkach <code>assets/...</code> również muszą znaleźć się w repozytorium.</p><p>Nie zmieniamy oryginalnych plików <code>world.js</code> przy każdej kolejnej mapie.</p></div></div>';
 }
 function draw(){
  if(!state)return;
  state.root.innerHTML='<div class="dbi-gme">'+editorTop()+'<div class="dbi-gme-content">'+(state.tab==='maps'?'<aside class="dbi-gme-sidebar">'+mapSelect()+'</aside>'+mapView():state.tab==='quests'?questView():publishView())+'</div><footer class="dbi-gme-footer"><span data-gme-status role="status">Projekty są zapisywane lokalnie. Istniejące lokacje pozostają bez zmian.</span><button type="button" data-gme-command="save">Zapisz</button></footer></div>';
  wireStage();
  drawTerrainPreview();
 }
 function addMap(){
  let num=state.pack.maps.length+1,id='nowa-mapa-'+num;while(state.pack.maps.some(m=>m.id===id)||builtins().some(m=>m.id===id))id='nowa-mapa-'+(++num);
  state.pack.maps.push({id,name:'Nowa mapa '+num,sizeX:40,sizeY:24,art:'assets/world/army/terrain.webp',terrain:terrain.create(40,24),spawn:{x:128,y:128},blocked:[],npc:[],scenery:[],portals:[],mobNames:[]});state.mapId=id;state.selection=null;state.tab='maps';saveDraft();draw();
 }
 function addQuest(){if(!state.pack.maps.length){setStatus('Najpierw dodaj nową mapę lub utwórz kopię istniejącej mapy, aby przypisać quest do projektu.');return;}let n=state.pack.quests.length+1,id='nowy-quest-'+n;while(state.pack.quests.some(q=>q.id===id))id='nowy-quest-'+(++n);
  state.pack.quests.push({id,name:'Nowy quest '+n,mapId:currentMap()?.id||state.pack.maps[0]?.id||'',steps:[{dialog:'Witaj, podróżniku!',button:'Dalej',requirement:'none',target:'',count:1,rewardType:'none',rewardItem:'',rewardAmount:1}]});state.questId=id;state.legacyQuestId=null;state.tab='quests';saveDraft();draw();
 }
 function onCommand(name){const m=currentMap(),q=currentQuest();
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
    blocked:clone(source.blocked||[]),npc:(source.npc||[]).map(n=>({x:n.x,y:n.y,label:n.label||'NPC',art:n.art||'',questId:''})),
    scenery:(source.scenery||[]).filter(s=>s.art).map(s=>({x:s.x,y:s.y,width:s.width||64,height:s.height||64,label:s.label||'',art:s.art})),
    portals:(source.portals||[]).filter(p=>p.to&&!['laguna','island'].includes(p.to)).map(p=>({x:p.x,y:p.y,to:p.to,destinationArrival:clone(p.destinationArrival||p.arrival||{x:128,y:128})})),
    mobNames:clone(source.mobNames||[])};
   if(source.mobs)copy.mobs={x:source.mobs.x,y:source.mobs.y,label:source.mobs.label||'Expowisko',art:source.mobs.art||''};
   if(source.boss)copy.boss={x:source.boss.x,y:source.boss.y,label:source.boss.label||'Boss',art:source.boss.art||''};
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
  if(name==='save'){saveDraft();return}
  if(name==='add-map'){addMap();return}
  if(name==='add-quest'){addQuest();return}
  if(name==='add-step'&&q){q.steps.push({dialog:'',button:'Dalej',requirement:'none',target:'',count:1,rewardType:'none',rewardItem:'',rewardAmount:1});saveDraft();draw();return}
  if(name==='delete-map'&&m){if(!confirm('Usunąć mapę „'+m.name+'” z projektu?'))return;state.pack.maps=state.pack.maps.filter(x=>x!==m);state.mapId=state.pack.maps[0]?.id||null;state.selection=null;saveDraft();draw();return}
  if(name==='duplicate-map'&&m){const copy=clone(m);let n=2;while(state.pack.maps.some(x=>x.id===m.id+'-'+n))n++;copy.id=m.id+'-'+n;copy.name=m.name+' (kopia)';state.pack.maps.push(copy);state.mapId=copy.id;state.selection=null;saveDraft();draw();return}
  if(name==='delete-object'&&m){const s=state.selection;if(!s||s.type==='spawn')return;if(s.type==='mobs'||s.type==='boss')delete m[s.type];else m[s.type].splice(s.index,1);state.selection=null;saveDraft();draw();return}
  if(name==='delete-quest'&&q){if(!confirm('Usunąć quest „'+q.name+'”?'))return;state.pack.quests=state.pack.quests.filter(x=>x!==q);for(const m of state.pack.maps)for(const n of m.npc)n.questId=n.questId===q.id?'':n.questId;state.questId=state.pack.quests[0]?.id||null;saveDraft();draw();return}
  if(name==='export'){download('astralni-map-quest-projekt.json',JSON.stringify(state.pack,null,2),'application/json');return}
  if(name==='import-trigger'){$(state.root,'[data-gme-import]')?.click();return}
  if(name==='publish-local'||name==='download-js'||name==='test-map'){
   const errors=validate(state.pack);if(errors.length){setStatus('Popraw błędy walidacji w zakładce publikacji.');return}
   if(name!=='download-js')try{localStorage.setItem(PUBLISHED_KEY,JSON.stringify(state.pack))}catch{return setStatus('Nie udało się zapisać publikacji lokalnej.')}
   if(name==='download-js'){
    const json=JSON.stringify(state.pack).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
    download('gm-world-published.js','/* Astralni Wojownicy — definicje map i questów z Kreatora GM */\nwindow.DBI_GM_WORLD_DATA='+json+';\n','text/javascript');setStatus('Pobrano plik: data/gm-world-published.js');return;
   }
   if(name==='publish-local'){setStatus('Opublikowano lokalnie. Odśwież grę, aby wczytać mapy.');return}
   if(name==='test-map'){
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
  if(path.startsWith('entry.')&&m){m.entryPortal??={from:'',x:128,y:128};const prop=path.slice(6);m.entryPortal[prop]=prop==='from'?String(value):number(value,0,4000,0)}
  else if(path==='map.mobNames'&&m){m.mobNames=String(value).split('\n').slice(0,12).map(line=>line.trim()).filter(Boolean).map(line=>{const [name,level]=line.split('|');return {name:String(name||'Potwór').slice(0,80),level:number(level,1,999999,1)}})}
  else if(path.startsWith('map.')&&m){const prop=path.slice(4);if(prop==='id'){if(!validId.test(value)||state.pack.maps.some(x=>x!==m&&x.id===value)||builtins().some(x=>x.id===value)){setStatus('ID mapy musi być unikalne: litery a-z, cyfry, - lub _.');return false}m.id=value;state.mapId=value;for(const x of state.pack.quests)if(x.mapId===oldId)x.mapId=value}
   else if(['sizeX','sizeY'].includes(prop)){
    const oldWidth=m.sizeX,oldHeight=m.sizeY,oldTiles=m.terrain?.tiles?.slice();
    m[prop]=number(value,10,100,40);
    if(oldTiles){const next=terrain.create(m.sizeX,m.sizeY);for(let row=0;row<Math.min(oldHeight,m.sizeY);row++)for(let col=0;col<Math.min(oldWidth,m.sizeX);col++)next.tiles[row*m.sizeX+col]=oldTiles[row*oldWidth+col];m.terrain=next;state.undo=[];state.redo=[]}
   }
   else if(prop==='art'){if(!validAsset.test(value)||value.includes('..')){setStatus('Wpisz ścieżkę do grafiki w folderze assets/ (png, jpg, webp).');return false}m.art=value}
   else m[prop]=String(value).slice(0,100);
  }else if(path.startsWith('quest.')&&q){const prop=path.slice(6);if(prop==='id'){if(!validId.test(value)||state.pack.quests.some(x=>x!==q&&x.id===value)){setStatus('Quest musi mieć unikalne ID.');return false}q.id=value;state.questId=value;for(const map of state.pack.maps)for(const n of map.npc)if(n.questId===oldQuestId)n.questId=value}else q[prop]=String(value).slice(0,160)}
  else if(path.startsWith('step.')&&q){const parts=path.split('.'),step=q.steps[Number(parts[1])];if(!step)return false;const prop=parts[2];step[prop]=['count','rewardAmount'].includes(prop)?number(value,1,999999,1):String(value).slice(0,2000)}
  else if(path.startsWith('rect.')&&m&&state.selection?.type==='blocked'){const i=Number(path.slice(5)),rect=currentObject();rect[i]=number(value,0,Math.max(m.sizeX,m.sizeY)*32,0);if(rect[2]<rect[0])[rect[0],rect[2]]=[rect[2],rect[0]];if(rect[3]<rect[1])[rect[1],rect[3]]=[rect[3],rect[1]]}
  else if(path.startsWith('item.')&&m){const item=currentObject();if(!item)return false;const prop=path.slice(5);if(prop==='destinationArrival.x'||prop==='destinationArrival.y'){item.destinationArrival??={x:0,y:0};item.destinationArrival[prop.split('.')[1]]=number(value,0,5000,0)}
   else if(['x','y','width','height'].includes(prop))item[prop]=number(value,prop==='width'||prop==='height'?1:0,5000,0);
   else if(prop==='art'&&value&&(!validAsset.test(value)||value.includes('..'))){setStatus('Grafika musi być plikiem z assets/.');return false}
   else item[prop]=String(value).slice(0,150);
  }else return false;
  saveDraft();return true;
 }
 function place(tool,x,y){const m=currentMap();if(!m)return;
  x=Math.round(number(x,0,m.sizeX*32,0));y=Math.round(number(y,0,m.sizeY*32,0));
  if(tool==='spawn'){m.spawn={x,y};state.selection={type:'spawn',index:0}}
  else if(tool==='npc'){m.npc.push({x,y,label:'Nowy NPC',art:'',questId:''});state.selection={type:'npc',index:m.npc.length-1}}
  else if(tool==='portal'){m.portals.push({x,y,to:'',destinationArrival:{x:128,y:128}});state.selection={type:'portals',index:m.portals.length-1}}
  else if(tool==='scenery'){m.scenery.push({x,y,width:84,height:84,label:'',art:''});state.selection={type:'scenery',index:m.scenery.length-1}}
  else if(tool==='mobs'){m.mobs={x,y,label:'Expowisko',art:''};state.selection={type:'mobs',index:0}}
  else if(tool==='boss'){m.boss={x,y,label:'Boss',art:''};state.selection={type:'boss',index:0}}
  else return;
  state.tool='select';saveDraft();draw();
 }
 function wireStage(){const stage=$(state.root,'[data-gme-map-stage]');if(!stage)return;
  let start=null,drag=null,tileDrag=null;
  const tileCoords=e=>{const rect=stage.getBoundingClientRect(),m=currentMap();return {x:Math.max(0,Math.min(m.sizeX-1,Math.floor((e.clientX-rect.left)/rect.width*m.sizeX))),y:Math.max(0,Math.min(m.sizeY-1,Math.floor((e.clientY-rect.top)/rect.height*m.sizeY)))}};
  const tileTool=()=>currentMap()?.terrain&&tileTools.has(state.tool);
  const tilePaint=e=>{const m=currentMap(),at=tileCoords(e),id=state.tool==='tile-erase'?0:state.tileBrush;
   const did=paintTile(m,at.x,at.y,id,state.tileSize);if(did){tileDrag.changed=true;drawTerrainPreview()}return at};
  const coords=e=>{const r=stage.getBoundingClientRect(),m=currentMap();return {x:Math.round(number((e.clientX-r.left)/r.width,0,1,0)*m.sizeX*32),y:Math.round(number((e.clientY-r.top)/r.height,0,1,0)*m.sizeY*32)}};
  stage.addEventListener('pointerdown',e=>{
   if(e.button!==0)return;
   if(tileTool()){
    e.preventDefault();const m=currentMap(),at=tileCoords(e);
    if(state.tool==='tile-pick'){state.tileBrush=terrain.getTile(m,at.x,at.y);state.tool='tile-brush';draw();return}
    if(state.tool==='tile-fill'){if(terrain.getTile(m,at.x,at.y)!==state.tileBrush){historySnapshot();paintFill(m,at.x,at.y,state.tileBrush);saveDraft();draw()}return}
    if(state.tool==='tile-brush'||state.tool==='tile-erase'||state.tool==='tile-rect'){
     historySnapshot();tileDrag={start:at,changed:false,last:at};
     try{stage.setPointerCapture(e.pointerId)}catch{}
     if(state.tool!=='tile-rect')tilePaint(e);else{const box=$(stage,'.dbi-gme-drawing');box.hidden=false;Object.assign(box.style,{left:at.x/m.sizeX*100+'%',top:at.y/m.sizeY*100+'%',width:100/m.sizeX+'%',height:100/m.sizeY+'%'})}
     return;
    }
   }
   const target=e.target.closest('[data-gme-select]');
   if(target){e.preventDefault();const [type,index]=target.dataset.gmeSelect.split(':');state.selection={type,index:Number(index)};
    if(state.tool==='select'&&type!=='blocked'){drag={type,index:Number(index),element:target};stage.setPointerCapture(e.pointerId)}else draw();return;
   }
   if(state.tool==='blocked'){
    start=coords(e);stage.setPointerCapture(e.pointerId);const block=$(stage,'.dbi-gme-drawing');block.hidden=false;Object.assign(block.style,{left:start.x/(currentMap().sizeX*32)*100+'%',top:start.y/(currentMap().sizeY*32)*100+'%',width:'0',height:'0'});return;
   }
   if(state.tool!=='select')place(state.tool,coords(e).x,coords(e).y);
   else{state.selection=null;draw()}
  });
  stage.addEventListener('pointermove',e=>{
   if(tileDrag){const m=currentMap(),at=tileCoords(e);if(state.tool==='tile-rect'){const box=$(stage,'.dbi-gme-drawing');Object.assign(box.style,{left:Math.min(at.x,tileDrag.start.x)/m.sizeX*100+'%',top:Math.min(at.y,tileDrag.start.y)/m.sizeY*100+'%',width:(Math.abs(at.x-tileDrag.start.x)+1)/m.sizeX*100+'%',height:(Math.abs(at.y-tileDrag.start.y)+1)/m.sizeY*100+'%'})}else if(at.x!==tileDrag.last.x||at.y!==tileDrag.last.y){ // Malowanie ciągłe również przy szybkich ruchach myszy.
    const x0=tileDrag.last.x,y0=tileDrag.last.y,steps=Math.max(Math.abs(at.x-x0),Math.abs(at.y-y0));
    for(let n=1;n<=steps;n++){const x=Math.round(x0+(at.x-x0)*n/steps),y=Math.round(y0+(at.y-y0)*n/steps);tileDrag.changed=paintTile(m,x,y,state.tool==='tile-erase'?0:state.tileBrush,state.tileSize)||tileDrag.changed}
    if(tileDrag.changed)drawTerrainPreview();tileDrag.last=at;
   }return}
   if(drag){const {x,y}=coords(e);Object.assign(drag.element.style,{left:x/(currentMap().sizeX*32)*100+'%',top:y/(currentMap().sizeY*32)*100+'%'});return}
   if(start){const {x,y}=coords(e),m=currentMap(),rect=$(stage,'.dbi-gme-drawing');Object.assign(rect.style,{left:Math.min(x,start.x)/(m.sizeX*32)*100+'%',top:Math.min(y,start.y)/(m.sizeY*32)*100+'%',width:Math.abs(x-start.x)/(m.sizeX*32)*100+'%',height:Math.abs(y-start.y)/(m.sizeY*32)*100+'%'})}
  });
  stage.addEventListener('pointerup',e=>{
   if(tileDrag){const m=currentMap();if(state.tool==='tile-rect'){const at=tileCoords(e);tileDrag.changed=paintRect(m,tileDrag.start,at,state.tileBrush)||tileDrag.changed}
    if(tileDrag.changed)saveDraft();else{state.undo?.pop()}tileDrag=null;draw();return}
   if(drag){const o=currentObject(),p=coords(e);if(o){o.x=p.x;o.y=p.y}drag=null;saveDraft();draw();return}
   if(start){const end=coords(e);if(Math.abs(end.x-start.x)>=12&&Math.abs(end.y-start.y)>=12){const m=currentMap();m.blocked.push([Math.min(start.x,end.x),Math.min(start.y,end.y),Math.max(start.x,end.x),Math.max(start.y,end.y)]);state.selection={type:'blocked',index:m.blocked.length-1};saveDraft();}start=null;draw()}
  });
  stage.addEventListener('pointercancel',()=>{if(tileDrag){if(tileDrag.changed)saveDraft();else state.undo?.pop();tileDrag=null;draw()}});
 }
 function bindEvents(){
  state.root.addEventListener('click',e=>{const tab=e.target.closest('[data-gme-tab]'),command=e.target.closest('[data-gme-command]'),map=e.target.closest('[data-gme-map]'),quest=e.target.closest('[data-gme-quest]'),legacyQ=e.target.closest('[data-gme-legacy-quest]'),tool=e.target.closest('[data-gme-tool]'),paletteButton=e.target.closest('[data-gme-palette]'),del=e.target.closest('[data-gme-delete-step]');
   if(tab){state.tab=tab.dataset.gmeTab;draw()}
   else if(command)onCommand(command.dataset.gmeCommand);
   else if(map){state.mapId=map.dataset.gmeMap;state.selection=null;state.undo=[];state.redo=[];state.tab='maps';draw()}
   else if(quest){state.questId=quest.dataset.gmeQuest;state.legacyQuestId=null;draw()}
   else if(legacyQ){state.legacyQuestId=legacyQ.dataset.gmeLegacyQuest;state.questId=null;state.tab='quests';draw()}
   else if(paletteButton){state.tileBrush=Number(paletteButton.dataset.gmePalette);state.tool='tile-brush';draw()}
   else if(tool){state.tool=tool.dataset.gmeTool;draw()}
   else if(del){const q=currentQuest();q?.steps.splice(Number(del.dataset.gmeDeleteStep),1);saveDraft();draw()}
  });
  state.root.addEventListener('change',async e=>{if(e.target.matches('[data-gme-brush-size]')){state.tileSize=Number(e.target.value)||1;return}if(e.target.matches('[data-gme-grid]')){state.showGrid=e.target.checked;draw();return}const field=e.target.closest('[data-gme-field]');if(field){if(setField(field.dataset.gmeField,field.value))draw();return}
   if(e.target.matches('[data-gme-import]')){
    const file=e.target.files[0];if(!file)return;
    try{const data=JSON.parse(await file.text());if(data.version!==1||!Array.isArray(data.maps)||!Array.isArray(data.quests))throw Error('Nieprawidłowy format projektu.');
     if(data.maps.length>50||data.quests.length>200||file.size>2_000_000)throw Error('Zbyt duży projekt.');
     const errors=validate(data);if(errors.length)throw Error(errors[0]);
     state.pack=clone(data);state.mapId=state.pack.maps[0]?.id||legacyCatalog().maps[0]?.id||null;state.questId=state.pack.quests[0]?.id||null;state.selection=null;saveDraft();draw();setStatus('Zaimportowano projekt JSON.');
    }catch(error){setStatus('Błąd importu: '+error.message)}
   }
  });
 }
 function open(mount,onExit){
  if(!window.DBIGmAccess?.hasSession?.()||!mount)return;
  mount.replaceChildren();const view=document.createElement('div');view.className='dbi-gme-mount';mount.appendChild(view);
  state={root:view,pack:draft(),tab:'maps',tool:'select',mapId:null,questId:null,legacyQuestId:null,selection:null,tileBrush:0,tileSize:1,showGrid:false,undo:[],redo:[],onExit};
  state.mapId=state.pack.maps[0]?.id||legacyCatalog().maps[0]?.id||null;state.questId=state.pack.quests[0]?.id||null;
  bindEvents();terrain?.onReady(()=>{if(state?.root===view)drawTerrainPreview()});draw();
 }
 window.DBIGMMapEditor={open,renderNpcQuest,recordKill,readDraft:draft,readPublished:currentPublished};
})();
