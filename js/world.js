/* DBOidle v2.1 — Błękitna Laguna, samodzielna mapa canvas bez bibliotek. */
(()=>{'use strict';
const SIZE=200,TILE=32,WORLD=SIZE*TILE,SPAWN={x:100.5*TILE,y:100.5*TILE};
const NPC={x:105.5*TILE,y:100.5*TILE};
const ISLAND_SIZE=15,ISLAND_WORLD=ISLAND_SIZE*TILE;
const ISLAND_SPAWN={x:7.5*TILE,y:11.5*TILE};
const ISLAND_HOUSE={x:9.2*TILE,y:5.6*TILE};
const ISLAND_TRAINING={x:10.6*TILE,y:9.1*TILE};
const ISLAND_INTERACT_RADIUS=52;
// Krillin: nieruchomy NPC na trawie na południowo-zachodniej części wyspy.
const ISLAND_KRILLIN={x:4.35*TILE,y:11.15*TILE};
const krillinSprite=new Image();krillinSprite.src='assets/krillin-npc.png';
const roshiSprite=new Image();roshiSprite.src='assets/roshi-npc.png';
const bulmaSprite=new Image();bulmaSprite.src='assets/bulma-npc.png';
const EXTRA_MAPS={
 forest:{name:'Dziki Las',sizeX:30,sizeY:30,art:'assets/dziki-las.png',spawn:{x:14.5*TILE,y:25.5*TILE},npc:[{x:14*TILE,y:14*TILE,label:'Genialny Żółw'},{x:22*TILE,y:21*TILE,label:'Bulma'}],mobs:{x:23*TILE,y:8*TILE,label:'Moby'},mobNames:[{name:'Dzikie zwierzę',level:5}]},
 mountain:{name:'Góra Króla Lasu',sizeX:20,sizeY:15,art:'assets/gora-krola-lasu.png',spawn:{x:10*TILE,y:13*TILE},npc:[{x:9*TILE,y:10*TILE,label:'Genialny Żółw'}],mobs:{x:17*TILE,y:4*TILE,label:'Moby'},mobNames:[{name:'Zamachowiec Góry',level:8},{name:'Zamachowiec Góry (Silny)',level:12},{name:'Zamachowiec Góry (Super)',level:15}]},
 stadium:{name:'Stadion 1',sizeX:10,sizeY:10,art:'assets/stadion-1.png',spawn:{x:5*TILE,y:7*TILE},npc:[{x:5*TILE,y:5*TILE,label:'Turniej sztuk walk'},{x:5*TILE,y:2.5*TILE,label:'Wrota stadionu'}],mobs:null,mobNames:[]},
 centralForest:{name:'Las centralny',sizeX:20,sizeY:40,art:'assets/las-centralny.png',spawn:{x:10*TILE,y:36*TILE},npc:[],mobs:null,mobNames:[]}
};
for(const config of Object.values(EXTRA_MAPS)){config.image=new Image();config.image.src=config.art;}
// Znaczniki questów są rysowane przez silnik, nigdy nie są częścią grafiki PNG.
// Gdy przyszły quest NPC zapisze {state:'completed'} pod tym kluczem,
// wykrzyknik automatycznie znika (bez modyfikacji grafiki mapy).
const extraNpcQuestKey=(loc,index,id)=>'dboidle_quest_extra_'+loc+'_'+index+'_v1_'+String(id||'test');
function extraNpcQuestDone(loc,index,id){
 try{return JSON.parse(localStorage.getItem(extraNpcQuestKey(loc,index,id))||'null')?.state==='completed'}catch{return false}
}
function drawQuestMark(ctx,x,y,time){
 const bob=Math.sin(time/260)*2;
 ctx.save();ctx.font='900 21px Arial,sans-serif';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#35200b';ctx.fillStyle='#ffdb3c';
 ctx.strokeText('!',x,y-49+bob);ctx.fillText('!',x,y-49+bob);ctx.restore();
}
const extraMap=loc=>EXTRA_MAPS[loc]||null;
const extraBlocked=(loc,x,y)=>{
 const map=extraMap(loc);if(!map)return true;
 const tx=Math.floor(x/TILE),ty=Math.floor(y/TILE);
 if(tx<1||ty<1||tx>=map.sizeX-1||ty>=map.sizeY-1)return true;
 // Arena: jedynie centralne 3x3 pola są dostępne; trybuny blokują przejście.
 if(loc==='stadium')return !(tx>=4&&tx<=6&&ty>=2&&ty<=6);
 // Zablokowane krawędzie, góra, gęsty las i stałe dekoracje; szlaki pozostają otwarte.
 if(loc==='mountain'&&ty<7&&tx<14)return true;
 if(loc==='forest'&&ty<4)return true;
 return false;
};

// Centralny rejestr lokacji: panel GM pobiera listę bez ręcznego dodawania przycisków.
const DBI_WORLD_LOCATIONS=Object.freeze([
 {id:'laguna',name:'Błękitna Laguna',spawn:{...SPAWN}},
 {id:'island',name:'Wyspa Genialnego Żółwia',spawn:{...ISLAND_SPAWN}},
 {id:'forest',name:'Dziki Las',spawn:{...EXTRA_MAPS.forest.spawn}},
 {id:'mountain',name:'Góra Króla Lasu',spawn:{...EXTRA_MAPS.mountain.spawn}},
 {id:'stadium',name:'Stadion 1',spawn:{...EXTRA_MAPS.stadium.spawn}},
 {id:'centralForest',name:'Las centralny',spawn:{...EXTRA_MAPS.centralForest.spawn}}
]);
function gmTeleport(characterId,locationId){
 const destination=DBI_WORLD_LOCATIONS.find(x=>x.id===locationId);
 if(!destination||!characterId)return {ok:false,message:'Nieznana lokacja lub brak aktywnej postaci.'};
 const battleKey='dboidle_battle_v1_'+String(characterId);
 try{const battle=JSON.parse(localStorage.getItem(battleKey)||'null');if(battle?.status==='running')return {ok:false,message:'Najpierw zakończ trwającą walkę.'};}catch{}
 const key='dboidle_world_v1_'+String(characterId);
 let state={};try{state=JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{}
 state={...state,location:destination.id,x:destination.spawn.x,y:destination.spawn.y,dir:'down'};
 try{localStorage.setItem(key,JSON.stringify(state));return {ok:true,message:'Przeniesiono do: '+destination.name+'.'}}
 catch{return {ok:false,message:'Nie udało się zapisać pozycji postaci.'}}
}

const islandArt=new Image();islandArt.src='assets/wyspa-genialnego-zolwia.png';
let islandPixels=null;
islandArt.onload=()=>{const c=document.createElement('canvas');c.width=ISLAND_SIZE;c.height=ISLAND_SIZE;const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(islandArt,0,0,15,15);islandPixels=cx.getImageData(0,0,15,15).data;};
const TENT={x:96.5*TILE,y:103.5*TILE};
let active=null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=(x,y)=>{let n=Math.imul(x+137,374761393)+Math.imul(y+941,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295};
function tile(x,y){
 if(x<0||y<0||x>=SIZE||y>=SIZE)return 'wall';
 if(x===0||y===0||x===SIZE-1||y===SIZE-1)return 'wall';
 const dx=x-100,dy=y-100;
 if(Math.abs(dx)<11&&Math.abs(dy)<9)return 'grass';
 const h=Math.sin(x*.087)+Math.cos(y*.071)+Math.sin((x+y)*.043);
 if(h>1.62)return 'water';
 const r=hash(x,y);
 if(h>1.30)return 'sand';
 if(r>.965)return 'rock';
 if(r>.865)return 'tree';
 if(r<.095)return 'flower';
 return 'grass';
}
function islandBlocked(px,py){
 const margin=9;
 for(const ox of [-margin,margin])for(const oy of [-margin,margin]){
  const tx=Math.floor((px+ox)/TILE),ty=Math.floor((py+oy)/TILE);
  if(tx<1||ty<1||tx>=14||ty>=14)return true;
  // Woda jest granicą wyspy; środek pola próbkowany z autorskiej grafiki.
  if(islandPixels){const i=(ty*15+tx)*4,r=islandPixels[i],g=islandPixels[i+1],b=islandPixels[i+2];
   if(b>r*1.18&&b>g*1.10&&b>90)return true;
  }else if(Math.hypot(tx-7,ty-7)>5.2)return true;
 }
 return false;
}
function blocked(px,py){const margin=10;for(const ox of [-margin,margin])for(const oy of [-margin,margin]){
 const t=tile(Math.floor((px+ox)/TILE),Math.floor((py+oy)/TILE));if(['wall','water','tree','rock'].includes(t))return true;
}return Math.hypot(px-NPC.x,py-NPC.y)<23;}
function drawTile(ctx,x,y,t){const sx=x*TILE,sy=y*TILE,h=hash(x,y);ctx.fillStyle=t==='water'?'#287a9e':t==='sand'?'#b5a267':t==='wall'?'#233745':'#427b43';ctx.fillRect(sx,sy,TILE,TILE);
 if(t==='water'){ctx.fillStyle='#61bbce';ctx.fillRect(sx+3+(h*13|0),sy+9,13,2);ctx.fillStyle='#1c648d';ctx.fillRect(sx+9,sy+22,18,2)}
 else if(t==='wall'){ctx.fillStyle='#527181';ctx.fillRect(sx+2,sy+2,28,6);ctx.fillStyle='#142632';ctx.fillRect(sx+3,sy+15,24,13)}
 else{ctx.fillStyle=h>.5?'#548b4b':'#376c3c';ctx.fillRect(sx+5,sy+6,3,5);ctx.fillRect(sx+22,sy+21,5,3);if(t==='sand'){ctx.fillStyle='#dfc98a';ctx.fillRect(sx+14,sy+11,3,3)}
 if(t==='flower'){ctx.fillStyle='#ffd06e';ctx.fillRect(sx+14,sy+12,5,5);ctx.fillStyle='#f1e3a9';ctx.fillRect(sx+16,sy+10,2,9)}
 if(t==='rock'){ctx.fillStyle='#52646b';ctx.beginPath();ctx.moveTo(sx+3,sy+25);ctx.lineTo(sx+10,sy+8);ctx.lineTo(sx+24,sy+6);ctx.lineTo(sx+30,sy+24);ctx.fill();ctx.fillStyle='#88969a';ctx.fillRect(sx+11,sy+11,12,4)}
 if(t==='tree'){ctx.fillStyle='#5b3d2a';ctx.fillRect(sx+13,sy+18,7,13);ctx.fillStyle='#174b35';ctx.fillRect(sx+3,sy+6,26,18);ctx.fillStyle='#2d7545';ctx.fillRect(sx+7,sy+2,18,18);ctx.fillStyle='#4e9a51';ctx.fillRect(sx+10,sy+5,9,5)}
 } }
// Sprite bohatera: 4 kolumny (klatki) × 4 wiersze (dół, góra, lewo, prawo).
const gokuSprite=new Image();
gokuSprite.src='assets/goku-walk.png';
function drawGoku(ctx,x,y,dir,walking,time){
 const row=({down:0,up:1,left:2,right:3})[dir]??0;
 const frame=walking?Math.floor(time/145)%4:0;
 ctx.save();
 ctx.translate(Math.round(x),Math.round(y));
 ctx.fillStyle='#14241c88';
 ctx.beginPath();ctx.ellipse(0,13,11,4,0,0,Math.PI*2);ctx.fill();
 ctx.imageSmoothingEnabled=false;
 // Stopy są zakotwiczone w tej samej pozycji co poprzednia postać canvas.
 ctx.drawImage(gokuSprite,frame*80,row*96,80,96,-20,-34,40,50);
 ctx.restore();
}
function character(ctx,x,y,dir,walking,time,npc=false){
 if(!npc&&gokuSprite.complete&&gokuSprite.naturalWidth){drawGoku(ctx,x,y,dir,walking,time);return;}
 ctx.save();ctx.translate(Math.round(x),Math.round(y));const step=walking?Math.sin(time*.014)*3:0;
 ctx.fillStyle='#14241c88';ctx.beginPath();ctx.ellipse(0,9,12,5,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=npc?'#6b5a9d':'#293b69';ctx.fillRect(-8,-5,16,15);ctx.fillStyle=npc?'#b5a4db':'#d77b42';ctx.fillRect(-9,-4,18,8);
 ctx.fillStyle='#222c3c';ctx.fillRect(-7,9,5,7+step);ctx.fillRect(3,9,5,7-step);
 ctx.fillStyle='#f0c4a0';ctx.fillRect(-7,-19,14,14);
 ctx.fillStyle=npc?'#c6e5e5':'#e0b45e';ctx.fillRect(-9,-22,18,6);ctx.fillRect(-7,-25,6,5);ctx.fillRect(2,-27,7,7);
 if(dir==='left'||dir==='right'){ctx.fillStyle='#222';ctx.fillRect(dir==='left'?-6:4,-14,2,2)}else if(dir==='down'){ctx.fillStyle='#222';ctx.fillRect(-4,-14,2,2);ctx.fillRect(3,-14,2,2)}
 ctx.restore();}
function start(container,id){stop();const turtleDropKey='dboidle_turtle_first_drop_v1_'+String(id||'test');
 const turtleInventoryKey='dboidle_inventory_v1_'+String(id||'test');
 let turtleAlreadyDropped=false;
 try{turtleAlreadyDropped=localStorage.getItem(turtleDropKey)==='1'||JSON.parse(localStorage.getItem(turtleInventoryKey)||'[]').some(ref=>ref==='quest-turtle-stone'||ref.startsWith('quest-turtle-stone~'));}catch{}
 try{const pending=JSON.parse(localStorage.getItem('dboidle_battle_v1_'+String(id||'test'))||'null');if(pending?.loot?.some(item=>item.id==='quest-turtle-stone'))turtleAlreadyDropped=true;}catch{}
 if(turtleAlreadyDropped)try{localStorage.setItem(turtleDropKey,'1')}catch{}
 const key='dboidle_world_v1_'+String(id||'test');let saved;try{saved=JSON.parse(localStorage.getItem(key)||'null')}catch{}
 const player={x:SPAWN.x,y:SPAWN.y,dir:'down',location:'laguna'};
 if(saved&&(saved.location==='island'||extraMap(saved.location))){player.location=saved.location;const spawn=DBI_WORLD_LOCATIONS.find(l=>l.id===saved.location)?.spawn||ISLAND_SPAWN;player.x=Number.isFinite(saved.x)?saved.x:spawn.x;player.y=Number.isFinite(saved.y)?saved.y:spawn.y;player.dir=['up','down','left','right'].includes(saved.dir)?saved.dir:'down';}else if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)&&!blocked(saved.x,saved.y)){player.x=clamp(saved.x,20,WORLD-20);player.y=clamp(saved.y,20,WORLD-20);player.dir=['up','down','left','right'].includes(saved.dir)?saved.dir:'down';}
 container.innerHTML=`<div class="world-grid"><section class="world-shell"><div class="world-toolbar"><strong>🌿 BŁĘKITNA LAGUNA</strong><span id="worldCoords">Pozycja: —</span></div><div class="world-frame"><canvas id="worldCanvas" tabindex="0" aria-label="Mapa gry, WASD i strzałki"></canvas><div class="world-prompt" id="worldPrompt" hidden>Naciśnij E, aby porozmawiać z Opiekunem Laguny</div></div><div class="world-help">WASD / strzałki — ruch. Wejdź na namiot, aby wybrać potwory. Podejdź do Opiekuna Laguny i naciśnij E, aby rozpocząć misję.</div></section><aside id="worldSide" class="world-side"><h2>🌍 Błękitna Laguna</h2><p>Znajdź namiot treningowy na mapie. Po wejściu na niego zobaczysz listę 15 przeciwników. Walkę można ukryć i otworzyć ponownie.</p></aside></div><div id="worldOverlay" class="world-overlay" hidden><section id="worldBattle" class="world-battle world-modal"></section></div>`;
 const canvas=container.querySelector('canvas'),ctx=canvas.getContext('2d'),frame=container.querySelector('.world-frame'),prompt=container.querySelector('#worldPrompt'),coords=container.querySelector('#worldCoords');
 const keys=new Set();let raf=0,last=0,lastSave=0,camX=player.x,camY=player.y,closed=false;
 const save=()=>{try{localStorage.setItem(key,JSON.stringify(player))}catch{}};
 function resize(){const r=frame.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;}
 const observer=new ResizeObserver(resize);observer.observe(frame);resize();
 const near=()=>player.location==='laguna'&&Math.hypot(player.x-NPC.x,player.y-NPC.y)<70;
 const nearKrillin=()=>player.location==='island'&&Math.hypot(player.x-ISLAND_KRILLIN.x,player.y-ISLAND_KRILLIN.y)<55;
 const nearHouse=()=>player.location==='island'&&Math.hypot(player.x-ISLAND_HOUSE.x,player.y-ISLAND_HOUSE.y)<ISLAND_INTERACT_RADIUS;
 const nearTraining=()=>player.location==='island'&&Math.hypot(player.x-ISLAND_TRAINING.x,player.y-ISLAND_TRAINING.y)<ISLAND_INTERACT_RADIUS;
 const nearExtraMobs=()=>{
   const m=extraMap(player.location)?.mobs;
   if(!m)return false;
   if(player.location==='mountain'){
    // Prostokąt namiotu wskazany na zrzucie: w oryginalnej grafice
    // x ≈ 15–18.5 kafelka, y ≈ 1.5–3.8 kafelka.
    // Używamy pozycji stóp postaci (nie pozycji napisu „Moby”).
    const tileX=player.x/TILE, tileY=player.y/TILE;
    return tileX>=14.8 && tileX<=18.6 && tileY>=1.4 && tileY<=3.9;
   }
   return Math.hypot(player.x-m.x,player.y-m.y)<110;
  };
 const nearExtraNpc=()=>extraMap(player.location)?.npc.find(n=>Math.hypot(player.x-n.x,player.y-n.y)<55);

 const questKey='dboidle_quest_laguna_v1_'+String(id||'test');
 let quest={state:'available',kills:0};
 try{const stored=JSON.parse(localStorage.getItem(questKey)||'null');if(stored&&['available','accepted','completed'].includes(stored.state))quest={state:stored.state,kills:Math.min(10,Math.max(0,Number(stored.kills)||0))};}catch{}
 const saveQuest=()=>{try{localStorage.setItem(questKey,JSON.stringify(quest))}catch{}};
 const quest2Key='dboidle_quest_laguna_belt_v1_'+String(id||'test');
 let quest2={state:'available'};
 try{const old=JSON.parse(localStorage.getItem(quest2Key)||'null');if(['available','accepted','completed'].includes(old?.state))quest2=old;}catch{}
 const saveQuest2=()=>{try{localStorage.setItem(quest2Key,JSON.stringify(quest2))}catch{}};
 const krillinQuestKey='dboidle_quest_island_krillin_v1_'+String(id||'test');
 let krillinQuest={state:'available'};
 try{const old=JSON.parse(localStorage.getItem(krillinQuestKey)||'null');if(['available','won','completed'].includes(old?.state))krillinQuest=old;}catch{}
 const saveKrillinQuest=()=>{try{localStorage.setItem(krillinQuestKey,JSON.stringify(krillinQuest))}catch{}};
 const krillinQuestCompleted=()=>krillinQuest.state==='completed';
 const krillinStats={level:3,race:'Człowiek',speed:3,attack:2,defense:1,maxHp:20,maxKi:5};
 function krillinQuestMarkup(){
  if(krillinQuest.state==='completed')return '<h2>📜 Krillin</h2><p>Dziękuję za wspólny trening! Jeszcze kiedyś się spotkamy.</p><button class="world-action secondary" id="krillinClose">Zamknij</button>';
  if(krillinQuest.state==='won')return `<h2>📜 Krillin</h2><p>Wow, jesteś silniejszy niż myślałem.<br>Wybacz mi moje zachowanie, nie wiedziałem że przysłał Cię mistrz<br>Przyjmij to w ramach rekompensaty</p><p><strong>Nagroda:</strong> Biała Opaska ×1</p><div class="world-side-actions"><button class="world-action" id="krillinClaim">Zakończ</button></div>`;
  return `<h2>📜 Krillin</h2><p>Dlaczego przerywasz mi w treningu dzieciaku!<br>Wiesz kim jestem? Najzdolniejszym uczniem żółwiego pustelnika!<br>Lepiej się przygotuj, bo zamierzam dać Ci małą nauczkę<br>Za twoje nietaktowne zachowania</p><div class="world-quest-section"><strong>Przeciwnik:</strong> <strong style="color:#f0646c">Krillin</strong> <span class="krillin-inspect" tabindex="0" aria-label="Podgląd statystyk Krillina" style="display:inline-block;position:relative;cursor:help;color:#e9c36b">🔍<span class="krillin-inspect-pop" role="tooltip" style="display:none;position:absolute;top:calc(100% + 8px);left:0;min-width:205px;padding:12px;border:1px solid #ac874b;border-radius:8px;background:#102334;color:#eaf1f7;z-index:10;box-shadow:0 10px 30px #000a;line-height:1.65">Krillin · Poziom ${krillinStats.level}<br>Rasa: ${krillinStats.race}<br>Moc: ${krillinStats.attack+krillinStats.defense+krillinStats.speed}<br>HP: ${krillinStats.maxHp}<br>KI: ${krillinStats.maxKi}<br>Atak: ${krillinStats.attack}<br>Obrona: ${krillinStats.defense}<br>Szybkość: ${krillinStats.speed}</span></span></div><div class="world-side-actions"><button class="world-action" id="krillinFight">⚔ Walcz</button><button class="world-action secondary" id="krillinClose">Zamknij</button></div>`;
 }
 const islandQuestKey='dboidle_quest_island_students_v1_'+String(id||'test');
 let islandQuest={state:'available',kills:0};
 try{const old=JSON.parse(localStorage.getItem(islandQuestKey)||'null');if(old&&['available','accepted','completed'].includes(old.state))islandQuest={state:old.state,kills:clamp(Number(old.kills)||0,0,20)}}catch{}
 const saveIslandQuest=()=>{try{localStorage.setItem(islandQuestKey,JSON.stringify(islandQuest))}catch{}};
 const masterKrillinKey='dboidle_quest_master_krillin_v1_'+String(id||'test');
 const masterCampKey='dboidle_quest_master_camp_v1_'+String(id||'test');
 const readStage=(key)=>{try{return localStorage.getItem(key)||'available'}catch{return 'available'}};
 let masterKrillin=readStage(masterKrillinKey),masterCamp=readStage(masterCampKey);
 const saveStage=(key,state)=>{try{localStorage.setItem(key,state)}catch{}};
 const masterKrillinReady=()=>krillinQuest.state==='won'||krillinQuest.state==='completed';
 const characterLevel=()=>Math.max(1,Number(window.DBIWorldInventory?.character?.()?.level)||1);
 function goToForest(){
  if(window.DBISpiritual?.isActive())return;
  if(battle?.status==='running'||window.DBIStoryCombat?.isRunning?.())return;
  const dest=EXTRA_MAPS.forest.spawn;
  masterCamp='completed';saveStage(masterCampKey,masterCamp);
  player.location='forest';player.x=dest.x;player.y=dest.y;player.dir='down';camX=player.x;camY=player.y;
  questOpen=false;keys.clear();lastSide='';save();updateSide(true);
 }

 const stadiumQuestKey='dboidle_stadium_tournament_v1_'+String(id||'test');
 let stadiumQuest={stage:0,wins:{}};
 try{const st=JSON.parse(localStorage.getItem(stadiumQuestKey)||'null');if(st&&Number.isInteger(st.stage))stadiumQuest={stage:Math.max(0,Math.min(6,st.stage)),wins:st.wins&&typeof st.wins==='object'?st.wins:{}}}catch{}
 const saveStadiumQuest=()=>localStorage.setItem(stadiumQuestKey,JSON.stringify(stadiumQuest));
 const stadiumFighters=[
  {name:'Giran',strength:20,speed:15,endurance:35,intelligence:8,ki:0},
  {name:'Nam',strength:40,speed:60,endurance:60,intelligence:40,ki:0},
  {name:'Jackie Chun',strength:100,speed:90,endurance:120,intelligence:200,ki:200}
 ];
 function stadiumQuestMarkup(atGate=false){
  const stage=stadiumQuest.stage;
  const button=(label,disabled=false)=>`<button class="world-action" id="stadiumClaim" ${disabled?'disabled':''}>${label}</button>`;
  const close='<button class="world-action secondary" id="stadiumClose">Zamknij</button>';
  const say=(who,msg)=>`<p><strong>${escapeText(who)}:</strong> ${msg}</p>`;
  const playerName=escapeText(window.DBIWorldInventory?.character?.()?.name||'Wojownik');
  if(atGate){
   if(stage<5)return '<h2>📜 Wrota stadionu</h2><p>Najpierw ukończ turniej.</p>'+close;
   if(stage>=6)return '<h2>📜 Wrota stadionu</h2><p>Twoja samotna podróż właśnie się zaczyna.</p>'+close;
   const hasBelt=window.DBIWorldInventory?.countQuestItem?.('quest-glory-belt')>0;
   return '<h2>📜 Samotna podróż</h2><p>Czas wyruszyć w samotną podróż i zwiększyć swoje możliwości, aby przy następnym spotkaniu pokazać wszystkim kto jest najsilniejszym wojownikiem.</p><p><strong>Wymagania:</strong> Posiadaj Pas Chwały '+(hasBelt?'✓':'✗')+'</p>'+button('Ruszam.',!hasBelt)+close;
  }
  if(stage===0)return '<h2>📜 Genialny Żółw — turniej</h2>'+say('Genialny Żółw','Jesteśmy na miejscu, teraz już wszystko zależy od was, ja wam bardziej pomóc nie mogę, nauczyłem was wszystkiego co potrafiłem. Na koniec mam dla was nagrodę i honor reprezentowania mojej szkoły. O to kimono szkoły żółwia, noście je dumnie. Powodzenia!!')+'<p><strong>Nagroda:</strong> Strój treningowy szkoły żółwia +0 ×1</p>'+button('Dziękujemy!')+close;
  if(stage>=1&&stage<=3){
   const f=stadiumFighters[stage-1],won=!!stadiumQuest.wins[f.name];
   const intro=stage===1?'Wraz z Krillinem udaliście się do szatni, przebraliście i udaliście się na eliminację. Eliminacje były dziecinnie proste po treningu u starego pustelnika, więc nie odczuliście zbytnio zagrożenia, a finałową walkę widzieliście między sobą. Czas na twoją pierwszą ćwierćfinałową walkę, twoim przeciwnikiem będzie olbrzymi smok Giran.':stage===2?'Teraz czas na półfinał, zmierzysz się w nim z wojownikiem o ciemnej karnacji niezbyt lubianej przez ogół społeczeństwa, a twoim przeciwnikiem będzie Nam!':`Czas na wielki finał turnieju, zmierzy się w nim ${playerName} i Jackie Chun, który od początku tego turnieju zaskakiwał swoją siłą!`;
   const stats=`<span class="stadium-stats-tip" role="tooltip"><strong>${escapeText(f.name)}</strong><span>Siła: ${f.strength}</span><span>Szybkość: ${f.speed}</span><span>Wytrzymałość: ${f.endurance}</span><span>Inteligencja: ${f.intelligence}</span><span>KI: ${f.ki}</span></span>`;
   const inspect=`<span class="stadium-stats-inspect" tabindex="0" aria-label="Statystyki ${escapeText(f.name)}" title="Najedź, aby zobaczyć statystyki">🔍${stats}</span>`;
   const inspectStyle='<style>.stadium-stats-inspect{display:inline-flex;align-items:center;position:relative;margin-left:6px;cursor:help;vertical-align:middle;outline-offset:3px}.stadium-stats-tip{display:none;position:absolute;left:0;top:calc(100% + 6px);min-width:175px;padding:10px 13px;background:#102334;border:1px solid #ac874b;border-radius:7px;color:#eaf1f7;z-index:100;box-shadow:0 8px 22px #0009;line-height:1.7;white-space:nowrap;font-weight:normal}.stadium-stats-tip strong,.stadium-stats-tip span{display:block}.stadium-stats-inspect:hover .stadium-stats-tip,.stadium-stats-inspect:focus .stadium-stats-tip,.stadium-stats-inspect:focus-within .stadium-stats-tip{display:block}</style>';
   return inspectStyle+'<h2>🏆 Światowy turniej sztuk walk</h2><p>'+intro+'</p><p><strong>Wymagania:</strong> Pokonaj '+f.name+inspect+'</p>'+(stage===3?'<p><strong>Nagroda:</strong> Pas Chwały +0 ×1</p>':'')+button(won?['Udało się!','Było blisko','UDAŁO MI SIĘ!!!'][stage-1]:'⚔ Walcz')+close;
  }
  if(stage===4)return '<h2>📜 Po turnieju</h2>'+say('Genialny Żółw','Wspaniale Ci poszło, to były świetne pojedynki, wiedziałem, że masz talent i będziesz silnym wojownikiem, co teraz zamierzasz?')+say(playerName,'Było tu dużo silnych wojowników, myślę, że daleka droga przede mną, aby wygrywać w turnieju. Wyruszę na samotną podróż i spotkamy się tutaj za trzy lata wraz z następnym światowym turniejem sztuk walk. Do zobaczenia!')+button('Czas wyruszać.')+close;
  return '<h2>🏆 Turniej ukończony</h2><p>Udaj się do wrót stadionu, aby rozpocząć samotną podróż.</p>'+close;
 }
 function stadiumClaim(atGate){
  const st=stadiumQuest.stage;
  if(atGate){if(st!==5||!(window.DBIWorldInventory?.countQuestItem?.('quest-glory-belt')>0))return;stadiumQuest.stage=6;const dest=EXTRA_MAPS.centralForest.spawn;player.location='centralForest';player.x=dest.x;player.y=dest.y;player.dir='up';camX=player.x;camY=player.y;questOpen=false;keys.clear();}
  else if(st===0){if(window.DBIWorldInventory?.grant?.(['quest-turtle-school-outfit'])!==1)return;stadiumQuest.stage=1;}
  else if(st>=1&&st<=3){
   const f=stadiumFighters[st-1];
   if(!stadiumQuest.wins[f.name]){
    if(window.DBISpiritual?.isActive()||window.DBIStoryCombat?.isRunning?.())return;
    const stats={level:st===1?25:st===2?35:50,race:'Człowiek',strength:f.strength,intelligence:f.intelligence,endurance:f.endurance,ki:f.ki,speed:f.speed,attack:Math.max(0,Math.round(f.strength*.5)),defense:Math.max(0,Math.round(f.endurance*.1)),maxHp:[100,200,300][st-1],maxKi:Math.max(0,Math.round(5+f.intelligence*.01))};
    window.DBIStoryCombat?.open({characterId:id,playerName:document.querySelector('#name')?.textContent||'Wojownik',playerRace:'Wojownik',opponentName:f.name,opponentStats:stats,onFinish:(result)=>{if(result==='win'){stadiumQuest.wins[f.name]=true;saveStadiumQuest()}lastSide='';updateSide(true)}});
    return;
   }
   if(st===3&&window.DBIWorldInventory?.grant?.(['quest-glory-belt'])!==1)return;
   stadiumQuest.stage=st+1;
  }else if(st===4){stadiumQuest.stage=5;questOpen=false;keys.clear();}
  else return;
  saveStadiumQuest();window.DBIDaily?.record('quests',1);lastSide='';updateSide(true);
 }
 const mountainRoshiKey='dboidle_mountain_roshi_v1_'+String(id||'test');
 let mountainRoshi={stage:0};
 try{const old=JSON.parse(localStorage.getItem(mountainRoshiKey)||'{}');if(Number.isInteger(old.stage))mountainRoshi.stage=Math.max(0,Math.min(8,old.stage))}catch{}
 const saveMountainRoshi=()=>localStorage.setItem(mountainRoshiKey,JSON.stringify(mountainRoshi));
 // Postacie, które ukończyły już ostatni quest w poprzedniej wersji, przenieś na Stadion 1.
 if(mountainRoshi.stage>=4&&player.location==='mountain'){const dest=EXTRA_MAPS.stadium.spawn;player.location='stadium';player.x=dest.x;player.y=dest.y;player.dir='down';camX=player.x;camY=player.y;save();}
 function mountainRoshiMarkup(){
  const close='<button class="world-action secondary" id="mountainClose">Zamknij</button>';
  const title='<h2>📜 Genialny Żółw — Góra Króla Lasu</h2>';
  const say=(speaker,words)=>`<p><strong>${speaker}:</strong> ${words}</p>`;
  const button=(caption,ready=true)=>`<button class="world-action" id="mountainClaim" ${ready?'':'disabled'}>${caption}</button>`;
  const lvl=characterLevel();
  switch(mountainRoshi.stage){
   case 0:return title+say('Genialny Żółw','Jesteśmy na miejscu, to góra króla i stoi cała w płomieniach. To straszne')+say('Król Gór','O wielki Mistrzu, przybyłeś! Jaki jestem uradowany, a któż to Ci towarzyszy.')+say('Genialny Żółw','To moi uczniowie, przygotowuje ich do najbliższego turnieju sztuk walk, ale to chyba teraz najmniejsza istotna sprawa.')+say('Król Gór','Tak! Mistrzu, proszę, czy możesz ugasić ten wielki ogień?!')+say('Genialny Żółw','Nie obiecuje, ale zrobię co w mojej mocy! Odsuńcie się.')+`<p><strong>Wymagania:</strong> Osiągnij poziom 20 (${lvl}/20)</p>`+button('Tak jest!',lvl>=20)+close;
   case 1:return title+say('Genialny Żółw','Kaaa-Meeee-Haaa-Meee- HAAAAA!')+'<p><strong>Nagroda:</strong> +50 do statystyki KI</p>'+button('Wow!!')+close;
   case 2:return title+say('Genialny Żółw','I po problemie, to wszystko było całkiem wymęczający spektatklem')+say('Król Gór','O wielki Mistrzu! Jestem Ci dozgonnie wdzięczny, nie wiem co bym zrobił gdyby moja Góra spłonęła.')+say('Genialny Żółw','To żaden problem')+say(escapeText(window.DBIWorldInventory?.character?.()?.name||'Wojownik'),'Co to było!? Nauczysz mnie tego mistrzu?')+say('Genialny Żółw','To nie takie proste, ale jeżeli bardzo chcesz, to mogę Ci pokazać podstawy.')+'<p><strong>Nagroda:</strong> Technika Fala Uderzeniowa</p><img src="assets/techniques/fala_uderzeniowa_1.png" alt="Fala Uderzeniowa" style="width:110px;height:110px;object-fit:contain;display:block;margin:10px 0">'+button('Z chęcią zobaczę podstawy')+close;
   case 3:return title+say('Genialny Żółw','Dobrze, myślę, że jesteście gotowi do światowego turnieju sztuk walk, ruszajmy!')+`<p><strong>Wymagania:</strong> Osiągnij 25 lvl (${lvl}/25)</p>`+button('Ruszajmy!',lvl>=25)+close;
   default:return title+'<p>Do zobaczenia na światowym turnieju sztuk walk!</p>'+close;
  }
 }
 function claimMountainRoshi(){
  const stage=mountainRoshi.stage;
  if(stage===0){if(characterLevel()<20)return;mountainRoshi.stage=1}
  else if(stage===1){if(!window.DBIWorldInventory?.grantMountainKi?.())return;mountainRoshi.stage=2}
  else if(stage===2){
   const key='dboidle_technique_quest_unlock_v1_'+String(id||'test');
   try{const state=JSON.parse(localStorage.getItem(key)||'{}')||{};state.fala_uderzeniowa=true;localStorage.setItem(key,JSON.stringify(state))}catch{return}
   mountainRoshi.stage=3;
  }else if(stage===3){if(characterLevel()<25)return;mountainRoshi.stage=4;const dest=EXTRA_MAPS.stadium.spawn;player.location='stadium';player.x=dest.x;player.y=dest.y;player.dir='down';camX=player.x;camY=player.y;questOpen=false;keys.clear();save()}
  else return;
  saveMountainRoshi();window.DBIDaily?.record('quests',1);lastSide='';updateSide(true);
 }
 const forestRoshiKey='dboidle_forest_roshi_v1_'+String(id||'test');
 const forestBulmaKey='dboidle_forest_bulma_v1_'+String(id||'test');
 const readForest=(key,initial)=>{try{return {...initial,...JSON.parse(localStorage.getItem(key)||'{}')}}catch{return {...initial}}};
 let roshi=readForest(forestRoshiKey,{stage:0,kills:0}),bulma=readForest(forestBulmaKey,{stage:0});
 const saveForest=()=>{localStorage.setItem(forestRoshiKey,JSON.stringify(roshi));localStorage.setItem(forestBulmaKey,JSON.stringify(bulma))};
 const itemCount=(key)=>window.DBIWorldInventory?.countQuestItem?.(key)||0;
 const spiritPoint=()=>{try{const st=window.DBISpiritual?.settle?.();return (Number(st?.level)||1)>1||Object.values(st?.bonuses||{}).some(x=>Number(x)>0)}catch{return false}};
 function forestNpcMarkup(index){
  const close='<button class="world-action secondary" id="forestClose">Zamknij</button>';
  if(index===0){
   if(roshi.stage===0)return `<h2>📜 Genialny Żółw</h2><p>Jesteśmy na miejscu, tutaj przygotuję Cię do przyszłego turnieju walki. Będziesz trenował wraz z Krillinem, zaczniemy od sprawdzenia jak radzicie sobie w terenie.</p><p><em>*Genialny Żółw podniósł kamień, napisał na nim symbol swojej szkoły, po czym rzucił w głąb wielkiego lasu*</em></p><p>Ten, który przyniesie mi ten kamień będzie mógł zjeść kolację, powodzenia!</p><p><strong>Wymóg:</strong> Kamień Żółwia ${itemCount('quest-turtle-stone')}/1</p><button class="world-action" id="forestClaim" ${itemCount('quest-turtle-stone')?'':'disabled'}>Oddaj</button>${close}`;
   if(roshi.stage===1)return `<h2>📜 Genialny Żółw</h2><p>Świetnie wam poszło, teraz musimy trochę popracować nad waszym duchem. Usiądźcie i skupcie się nad energią w waszym wnętrzu.</p><p><strong>Wymagania:</strong> Zdobądź 1 pkt rozwoju ducha. ${spiritPoint()?'✓':'✗'}</p><button class="world-action" id="forestClaim" ${spiritPoint()?'':'disabled'}>Gotowe!</button>${close}`;
   if(roshi.stage===2)return `<h2>📜 Genialny Żółw</h2><p>Macie talent chłopacy, ostatnio doszły mnie słuchy, że dzikie zwierzęta grasują w okolicy, to będzie dla was bardzo dobry trening, pozbądźcie się ich!</p><p><strong>Wymaganie:</strong> Pokonaj dzikie zwierzę ${roshi.kills}/30</p><p><strong>Nagroda:</strong> Czerwony Magiczny Kij +4 ×1</p><button class="world-action" id="forestClaim" ${roshi.kills>=30?'':'disabled'}>Zrobione!</button>${close}`;
   if(roshi.stage===3)return `<h2>📜 Genialny Żółw</h2><p>Doszły do mnie złe wieści, góra króla gór stoi w płomieniach, musimy udać się na ratunek!</p><p><strong>Wymagania:</strong> Osiągnij 10 lvl. (${characterLevel()}/10)</p><p><strong>Nagroda:</strong> Stary Naszyjnik ×1</p><button class="world-action" id="forestClaim" ${characterLevel()>=10?'':'disabled'}>Ruszajmy!</button>${close}`;
   return `<h2>📜 Genialny Żółw</h2><p>Ruszajmy na Górę Króla Lasu!</p>${close}`;
  }
  if(bulma.stage===0)return `<h2>📜 Bulma</h2><p>Cześć chłopaczku! Nie chciałbyś mi trochę pomóc?</p><button class="world-action" id="forestClaim">Pewnie!</button>${close}`;
  if(bulma.stage===1)return `<h2>📜 Bulma</h2><p>Wspaniale, widzisz szukam smoczych kul spełniających życzenia. Pomógłbyś mi je znaleźć? Wynagrodzę Cię naprawdę porządnie, jeśli Ci się uda.</p><p><strong>Wymagania:</strong> Oddaj małe smocze kule ${itemCount('quest-small-dragon-ball')}/7</p><button class="world-action" id="forestClaim" ${itemCount('quest-small-dragon-ball')>=7?'':'disabled'}>Proszę!</button>${close}`;
  if(bulma.stage===2)return `<h2>📜 Bulma</h2><p>Wow, zebrałeś wszystkie, jesteś niesamowity! Jestem Bulma i mam nadzieję, że nasza współpraca nie skończy się dzisiaj! W nagrodę dam Ci specjalną kapsułę, która przyda Ci się później. Na razie!</p><p><strong>Nagroda:</strong> Specjalna kapsuła Capsule</p><button class="world-action" id="forestClaim">Dzięki...</button>${close}`;
  return `<h2>📜 Bulma</h2><p>Do zobaczenia!</p>${close}`;
 }
 function claimForest(index){
  const inv=window.DBIWorldInventory;
  if(index===0){
   if(roshi.stage===0){if(!inv?.consumeQuestItem?.('quest-turtle-stone',1))return;roshi.stage=1}
   else if(roshi.stage===1){if(!spiritPoint())return;roshi.stage=2}
   else if(roshi.stage===2){if(roshi.kills<30||inv?.grant?.(['starter-red-staff~4'])!==1)return;roshi.stage=3}
   else if(roshi.stage===3){if(characterLevel()<10||inv?.grant?.(['quest-old-necklace'])!==1)return;roshi.stage=4;const d=EXTRA_MAPS.mountain.spawn;player.location='mountain';player.x=d.x;player.y=d.y;camX=player.x;camY=player.y;questOpen=false;save()}
  }else{
   if(bulma.stage===0)bulma.stage=1;
   else if(bulma.stage===1){if(!inv?.consumeQuestItem?.('quest-small-dragon-ball',7))return;bulma.stage=2}
   else if(bulma.stage===2){if(inv?.grant?.(['quest-capsule-special'])!==1)return;bulma.stage=3}
  }
  saveForest();window.DBIDaily?.record('quests',1);lastSide='';updateSide(true);
 }
 function addIslandQuestKills(n){if(islandQuest.state!=='accepted'||n<=0)return;islandQuest.kills=Math.min(20,islandQuest.kills+n);saveIslandQuest();if(questOpen){lastSide='';updateSide(true)}}
 function islandQuestMarkup(){
  const intro='<div class="world-quest-header"><h2>📜 Wielki Mistrz</h2><small>Wyspa Genialnego Żółwia</small></div>';
  const close='<button class="world-action secondary" id="worldIslandQuestClose">Zamknij</button>';
  if(islandQuest.state!=='completed'){
   const progress=islandQuest.kills;
   const story='<div class="world-quest-section"><strong>Treść questa</strong><p>Witaj na mojej wyspie, młody wojowniku! Sama siła nie wystarczy, aby zostać prawdziwym mistrzem. Udowodnij swoją wytrwałość w walce z moimi uczniami.</p></div>';
   const objective='<div class="world-quest-section"><strong>Cel zadania</strong><div class="world-quest-progress '+(progress>=20?'done':'pending')+'">Pokonaj uczniów mistrza '+progress+'/20</div></div>';
   const footer=islandQuest.state==='available'?'<button class="world-action" id="islandQuestAccept">Akceptuj zadanie</button>':islandQuest.state==='accepted'&&progress>=20?'<button class="world-action" id="islandQuestClaim">Zatwierdź wykonanie</button>':'<p class="world-muted">Pokonuj uczniów na placu treningowym, a potem wróć do domku.</p>';
   return intro+story+objective+'<div class="world-quest-footer">'+footer+close+'</div>';
  }
  if(masterKrillin!=='completed'){
   const ready=masterKrillinReady();
   return intro+'<p>Całkiem nieźle Ci poszło, ale nadal nie jestem przekonany do twoich umiejętności.<br>Nad wodą trenuje mój najzdolniejszy uczeń.<br>Jeśli przetrwasz z nim sparing, to przyjmę Cię jako ucznia.</p>'+
    '<div class="world-quest-section"><strong>Wymóg:</strong> Pokonaj Krillina.<div class="world-quest-progress '+(ready?'done':'pending')+'">Krillin: '+(ready?'pokonany':'niepokonany')+'</div><p><strong>Nagroda:</strong> +1 do wszystkich statystyk</p></div>'+
    '<div class="world-quest-footer">'+(masterKrillin==='available'?'<button class="world-action" id="masterKrillinAccept">Akceptuj zadanie</button>':ready?'<button class="world-action" id="masterKrillinClaim">Zakończ zadanie</button>':'<p class="world-muted">Pokonaj Krillina i wróć do mistrza.</p>')+close+'</div>';
  }
  const ready=characterLevel()>=5;
  return intro+'<p>Masz potencjał, zdecydowanie teraz to widzę, chętnie udam się z tobą<br>na obóz treningowy, gdzie przygotuję Ciebie oraz Krillina do najbliższego<br>światowego turnieju sztuk walk, chodźcie za mną.</p>'+
   '<div class="world-quest-section"><strong>Wymóg:</strong> Osiągnij 5 lvl postaci.<div class="world-quest-progress '+(ready?'done':'pending')+'">Poziom '+characterLevel()+' / 5</div></div>'+
   '<div class="world-quest-footer">'+(masterCamp==='available'?'<button class="world-action" id="masterCampAccept">Akceptuj zadanie</button>':ready?'<button class="world-action" id="masterCampTravel">Przenieś na następną lokację</button>':'<p class="world-muted">Osiągnij poziom 5 i wróć do mistrza.</p>')+close+'</div>';
 }
 const transferKey='dboidle_quest_turtle_island_v1_'+String(id||'test');
 let transferDone=localStorage.getItem(transferKey)==='completed';
 function travelToIsland(){
  if(window.DBISpiritual?.isActive())return;
  if(battle?.status==='running')return;
  player.location='island';player.x=ISLAND_SPAWN.x;player.y=ISLAND_SPAWN.y;player.dir='up';
  camX=player.x;camY=player.y;questOpen=false;keys.clear();lastSide='';
  transferDone=true;localStorage.setItem(transferKey,'completed');save();updateSide(true);
 }
 let questOpen=false;
 function questMarkup(){
  if(quest.state==='completed'){
   if(quest2.state==='completed')return `<h2>📜 Opiekun Laguny — podróż do mistrza</h2><p>Widzę w tobie ukryty talent i wykonałeś wszystkie moje zadania, zabiorę Cię do wielkiego mistrza, który pozwoli Ci rozwinąć twój talent!</p><div class="world-side-actions"><button class="world-action" id="worldTravelAccept">Akceptuj — podróż na wyspę</button><button class="world-action secondary" id="worldQuestClose">Zamknij</button></div>`;
   if(quest2.state==='available')return `<h2>📜 Opiekun Laguny — drugie zadanie</h2><p>Podobno prawdziwy wojownik poznaje się po pasie. Przynieś mi swój Biały Pas, a oddam Ci go wzmocnionego!</p><p><strong>Cel:</strong> Oddaj Biały Pas (zwykły, bez ulepszeń).</p><p><strong>Nagroda:</strong> Biały Pas +1</p><div class="world-side-actions"><button class="world-action" id="worldQuest2Accept">Akceptuj questa</button><button class="world-action secondary" id="worldQuestClose">Zamknij</button></div>`;
   const hasBelt=!!window.DBIWorldInventory?.hasWhiteBelt?.();
   return `<h2>📜 Opiekun Laguny — Biały Pas</h2><p>Przynieś mi swój Biały Pas. Może znajdować się w inwentarzu lub być założony.</p><div class="world-quest-progress ${hasBelt?'done':'pending'}">Oddaj Biały Pas ${hasBelt?'1/1':'0/1'}</div><p><strong>Nagroda:</strong> Biały Pas +1</p>${hasBelt?'<button class="world-action" id="worldQuest2Claim">Zatwierdź jako wykonanie questa</button>':''}<button class="world-action secondary" id="worldQuestClose">Zamknij</button>`;
  }
  if(quest.state==='available')return `<h2>📜 Opiekun Laguny</h2><p>Witaj, podróżniku! Spokój Błękitnej Laguny zakłócają dzikie kukły treningowe. Pomóż mi oczyścić okolicę, a otrzymasz upominek na dobry początek.</p><p><strong>Cel:</strong> Pokonaj 10 × Kukła Treningowa.</p><div class="world-side-actions"><button class="world-action" id="worldQuestAccept">Akceptuj questa</button><button class="world-action secondary" id="worldQuestClose">Odrzuć</button></div>`;
  const done=quest.kills>=10;
  return `<h2>📜 Opiekun Laguny — misja</h2><p>Pokonaj kukły treningowe w namiocie EXPowiska, a potem wróć po nagrodę.</p><div class="world-quest-progress ${done?'done':'pending'}">Zabij Kukła Treningowa ${quest.kills}/10</div><p>Nagroda: <img class="world-quest-chest" src="assets/items/upominek-startowy.png" alt="Srebrna skrzynia"> Upominek Startowy</p>${done?'<button class="world-action" id="worldQuestClaim">Zatwierdź jako wykonanie questa</button>':''}<button class="world-action secondary" id="worldQuestClose">Zamknij</button>`;
 }
 function questAction(){questOpen=true;lastSide='';updateSide(true)}
 function addQuestKills(n){if(quest.state!=='accepted'||n<=0)return;quest.kills=Math.min(10,quest.kills+n);saveQuest();if(questOpen){lastSide='';updateSide(true)}}

 const input=e=>{if(window.DBISpiritual?.isActive()){keys.clear();if(['e','w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()))e.preventDefault();return;}if(!active||active.container!==container)return;const k=e.key.toLowerCase();if(k==='e'&&battle?.status!=='running'&&overlay.hidden){
   if(nearExtraNpc()){e.preventDefault();questOpen=true;lastSide='';updateSide(true);return}
   if(nearKrillin()){e.preventDefault();questOpen=true;lastSide='';updateSide(true);return}
   if(nearHouse()){e.preventDefault();questOpen=true;lastSide='';updateSide(true);return}
   if(near()){e.preventDefault();questAction();return}
  }if(k==='escape'&&!overlay.hidden){hideBattle();e.preventDefault();return}
 if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){
 if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;
 if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();keys.add(k)}
 }};
 const keyup=e=>keys.delete(e.key.toLowerCase());const blur=()=>keys.clear();
 document.addEventListener('keydown',input);document.addEventListener('keyup',keyup);window.addEventListener('blur',blur);

 function frameLoop(time){if(closed)return;const dt=Math.min((time-last)||16,40)/1000;last=time;let dx=0,dy=0;
 dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
 if(battle?.status==='running'||window.DBISpiritual?.isActive()){dx=0;dy=0;keys.clear()}
 const moving=dx!==0||dy!==0;if(moving){const len=Math.hypot(dx,dy);dx/=len;dy/=len;const speed=145*(1+(Number(window.DBIWorldInventory?.character()?.moveSpeedPct)||0)/100);const nx=player.x+dx*speed*dt,ny=player.y+dy*speed*dt;
 const collision=(x,y)=>player.location==='island'?islandBlocked(x,y):extraMap(player.location)?extraBlocked(player.location,x,y):blocked(x,y);
 if(!collision(nx,player.y))player.x=nx;if(!collision(player.x,ny))player.y=ny;
 if(Math.abs(dx)>Math.abs(dy))player.dir=dx>0?'right':'left';else player.dir=dy>0?'down':'up';}
 const width=canvas.clientWidth,height=canvas.clientHeight;camX+=(player.x-camX)*Math.min(1,dt*8);camY+=(player.y-camY)*Math.min(1,dt*8);
 const onIsland=player.location==='island';frame.classList.toggle('world-island',onIsland);
 const currentExtra=extraMap(player.location);const worldSize=currentExtra?currentExtra.sizeX*TILE:onIsland?ISLAND_WORLD:WORLD;const worldHeight=currentExtra?currentExtra.sizeY*TILE:worldSize;
 // Stadion 10×10: powiększamy cały świat (teren i bohatera), nie wklejamy małej miniatury na zielone tło.
 const viewScale=player.location==='stadium'?Math.min(width/worldSize,height/worldHeight):1;
 const visibleWidth=width/viewScale,visibleHeight=height/viewScale;
 const offsetX=(onIsland||currentExtra)&&visibleWidth>=worldSize?-(visibleWidth-worldSize)/2:clamp(camX-visibleWidth/2,0,Math.max(0,worldSize-visibleWidth)),offsetY=(onIsland||currentExtra)&&visibleHeight>=worldHeight?-(visibleHeight-worldHeight)/2:clamp(camY-visibleHeight/2,0,Math.max(0,worldHeight-visibleHeight));
 ctx.clearRect(0,0,width,height);if(onIsland||currentExtra){ctx.fillStyle=currentExtra?'#18372c':'#087eb2';ctx.fillRect(0,0,width,height)}ctx.save();ctx.imageSmoothingEnabled=false;ctx.scale(viewScale,viewScale);ctx.translate(-Math.round(offsetX),-Math.round(offsetY));
 if(currentExtra){
  const map=currentExtra;
  if(map.image.complete&&map.image.naturalWidth)ctx.drawImage(map.image,0,0,map.sizeX*TILE,map.sizeY*TILE);
  else{ctx.fillStyle='#365d39';ctx.fillRect(0,0,map.sizeX*TILE,map.sizeY*TILE);}
  ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#071725';ctx.fillStyle='#ffe4a3';
  for(const [index,n] of map.npc.entries()){
   if(player.location==='stadium')continue; // Stadion: znaczniki rysowane na końcu, nad postacią.
   const sprite=(player.location==='forest'||player.location==='mountain'||player.location==='stadium')?(n.label==='Genialny Żółw'?roshiSprite:n.label==='Bulma'?bulmaSprite:null):null;
   if(sprite&&sprite.complete&&sprite.naturalWidth)ctx.drawImage(sprite,n.x-17,n.y-49,34,49);
   else character(ctx,n.x,n.y,'down',false,time,true);
   ctx.strokeText(n.label,n.x,n.y-55);ctx.fillText(n.label,n.x,n.y-55);
   if(player.location==='forest'?(index===0?roshi.stage<4:bulma.stage<3):player.location==='mountain'?mountainRoshi.stage<4:player.location==='stadium'?(index===0?stadiumQuest.stage<5:stadiumQuest.stage===5):!extraNpcQuestDone(player.location,index,id))drawQuestMark(ctx,n.x,n.y-12,time);
  }
  if(map.mobs){ctx.strokeText('⚔ Moby',map.mobs.x,map.mobs.y-28);ctx.fillText('⚔ Moby',map.mobs.x,map.mobs.y-28);}
 }else if(onIsland){
  if(islandArt.complete&&islandArt.naturalWidth)ctx.drawImage(islandArt,0,0,ISLAND_WORLD,ISLAND_WORLD);
  else{ctx.fillStyle='#157da9';ctx.fillRect(0,0,ISLAND_WORLD,ISLAND_WORLD);ctx.fillStyle='#4b9a45';ctx.beginPath();ctx.ellipse(240,240,170,170,0,0,Math.PI*2);ctx.fill();}
   // Statyczny sprite Krillina: jedna poza, bez animacji i obracania.
   if(krillinSprite.complete&&krillinSprite.naturalWidth){ctx.drawImage(krillinSprite,ISLAND_KRILLIN.x-17,ISLAND_KRILLIN.y-45,34,45)}
   if(!krillinQuestCompleted())drawQuestMark(ctx,ISLAND_KRILLIN.x,ISLAND_KRILLIN.y-22,time);
   ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#071725';ctx.fillStyle='#ffe4a3';
   ctx.strokeText('Krillin',ISLAND_KRILLIN.x,ISLAND_KRILLIN.y-49);ctx.fillText('Krillin',ISLAND_KRILLIN.x,ISLAND_KRILLIN.y-49);
   // Znaczniki miejsc interakcji na wyspie (nie modyfikują grafiki terenu).
   ctx.font='bold 12px Segoe UI, sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#071725';ctx.fillStyle='#ffe4a3';
   ctx.strokeText('📜 Quest',ISLAND_HOUSE.x,ISLAND_HOUSE.y-25);ctx.fillText('📜 Quest',ISLAND_HOUSE.x,ISLAND_HOUSE.y-25);
   ctx.strokeText('⚔ Moby',ISLAND_TRAINING.x,ISLAND_TRAINING.y-26);ctx.fillText('⚔ Moby',ISLAND_TRAINING.x,ISLAND_TRAINING.y-26);
  }else{
  const minX=clamp(Math.floor(offsetX/TILE)-1,0,SIZE-1),maxX=clamp(Math.ceil((offsetX+width)/TILE)+1,0,SIZE-1),minY=clamp(Math.floor(offsetY/TILE)-1,0,SIZE-1),maxY=clamp(Math.ceil((offsetY+height)/TILE)+1,0,SIZE-1);
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)drawTile(ctx,x,y,tile(x,y));
  ctx.fillStyle='#5d3925';ctx.fillRect(TENT.x-29,TENT.y-12,58,37);
  ctx.fillStyle='#c49a58';ctx.beginPath();ctx.moveTo(TENT.x-35,TENT.y-11);ctx.lineTo(TENT.x,TENT.y-52);ctx.lineTo(TENT.x+35,TENT.y-11);ctx.fill();
  ctx.fillStyle='#ead19c';ctx.beginPath();ctx.moveTo(TENT.x-19,TENT.y-12);ctx.lineTo(TENT.x,TENT.y-38);ctx.lineTo(TENT.x+19,TENT.y-12);ctx.fill();
  ctx.fillStyle='#272126';ctx.fillRect(TENT.x-8,TENT.y-10,16,35);
  ctx.fillStyle='#ffe0a0';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText('EXPowisko',TENT.x,TENT.y-60);
  character(ctx,NPC.x,NPC.y,'down',false,time,true);ctx.fillStyle='#ffe1a0';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText('Opiekun Laguny',NPC.x,NPC.y-38);
 }
 character(ctx,player.x,player.y,player.dir,moving,time);
 // Stadion: wykrzyknik dokładnie na środku areny, rysowany na wierzchu.
 // Brama nie ma znacznika; jej interakcja pozostaje dostępna po turnieju.
 if(player.location==='stadium'&&stadiumQuest.stage<6){
  drawQuestMark(ctx,EXTRA_MAPS.stadium.npc[0].x,EXTRA_MAPS.stadium.npc[0].y+45,time);
 }
 ctx.restore();
 if(questOpen&&!(near()||nearHouse()||nearKrillin()||nearExtraNpc()))questOpen=false;
  prompt.hidden=!(near()||nearHouse()||nearKrillin()||nearExtraNpc());
  if(!prompt.hidden)prompt.textContent=nearKrillin()?'Naciśnij E, aby porozmawiać z Krillinem':nearExtraNpc()?'Naciśnij E, aby porozmawiać: '+nearExtraNpc().label:nearHouse()?'Naciśnij E, aby porozmawiać z Wielkim Mistrzem':'Naciśnij E, aby porozmawiać z Opiekunem Laguny';
 container.querySelector('.world-toolbar strong').textContent=currentExtra?'🌍 '+currentExtra.name.toUpperCase():onIsland?'🏝️ WYSPA GENIALNEGO ŻÓŁWIA':'🌿 BŁĘKITNA LAGUNA';
 container.querySelector('.world-help').textContent=currentExtra?'WASD / strzałki — ruch. Podejdź do NPC i naciśnij E. Przy wejściu do jaskini lub namiotu wybierz moby.':onIsland?'WASD / strzałki — ruch. Krillin: E — rozmowa. Domek mistrza: E — quest. Kukła treningowa — uczniowie LVL 3. Woda jest nieprzechodnia.':'WASD / strzałki — ruch. Wejdź na namiot, aby wybrać potwory. Podejdź do Opiekuna Laguny i naciśnij E, aby rozpocząć misję.';
 updateSide();coords.textContent='Pozycja: '+Math.floor(player.x/TILE)+' / '+Math.floor(player.y/TILE);

 if(time-lastSave>1500){save();lastSave=time}raf=requestAnimationFrame(frameLoop);
 }

 const side=container.querySelector('#worldSide'),battleEl=container.querySelector('#worldBattle'),overlay=container.querySelector('#worldOverlay');
 const showBattle=()=>{overlay.hidden=false;renderBattle(true)};
 const hideBattle=()=>{overlay.hidden=true;keys.clear();canvas.focus({preventScroll:true})};
 overlay.addEventListener('pointerdown',e=>{if(e.target===overlay)hideBattle()});
 const battleKey='dboidle_battle_v1_'+String(id||'test');
 const MOB_COUNT=15, MAX_MS=12*60*60*1000, REGEN_MS=5000;
 const baseMobStats={strength:4,speed:2,endurance:3,intelligence:0,ki:0,power:0};
 const mobStats=level=>Object.fromEntries(Object.entries(baseMobStats).map(([k,v])=>[k,v*level]));
 const mobHp=lvl=>lvl>=100?lvl*5+5000:lvl*5;
 const interval=speed=>Math.max(1500,3000-Math.max(0,Number(speed)||0)*.01);
 const dealt=(attack,defense)=>attack>0?Math.max(0,attack)*Math.max(.1,1-Math.max(0,defense)/(2*attack)):0;
 const num=v=>Math.round((Number(v)||0)*100000)/100000;
 const hero=()=>window.DBIWorldInventory?.character?.()||{};
 const mobDef=level=>mobStats(level).endurance*.1;
 const mobAttack=level=>mobStats(level).strength*.5;
 const heroInterval=()=>interval(hero().speed);
 const mobInterval=level=>interval(mobStats(level).speed);
 const regenAmount=()=>{const multiplier=1+Math.floor(Math.max(1,Number(hero().level)||1)/100);return {hp:multiplier,ki:multiplier*.5}};
 
 const lagunaMobs=Array.from({length:MOB_COUNT},(_,i)=>({id:i,level:1,name:'Kukła Treningowa'}));
 const islandMobs=Array.from({length:MOB_COUNT},(_,i)=>({id:i,level:3,name:'Uczeń Mistrza'}));
 const extraMobs={};for(const [loc,map] of Object.entries(EXTRA_MAPS))extraMobs[loc]=Array.from({length:MOB_COUNT},(_,i)=>({id:i,...map.mobNames[i%Math.max(1,map.mobNames.length)]}));
 const currentMobs=()=>extraMap(player.location)?extraMobs[player.location]:player.location==='island'?islandMobs:lagunaMobs;
 let selected=new Set(),battle=null,lastSide='none',lastRender=0,uiBattle=null;const sellSelection=new Set();
 try{
  const old=JSON.parse(localStorage.getItem(battleKey)||'null');
  if(old&&old.status&&Array.isArray(old.enemies)){
   battle=old;
   if(!battle.combatVersion){
    const ch=hero();
    battle.maxHp=ch.maxHp??10;battle.hp=battle.maxHp;
    battle.maxKi=ch.maxKi??5;battle.ki=battle.maxKi;
    battle.enemies.forEach(e=>{e.max=mobHp(e.level);e.hp=e.max;e.nextAttack=Date.now()+mobInterval(e.level);e.rewarded=false;});
    battle.nextHeroAttack=Date.now()+heroInterval();battle.nextRegen=Date.now()+REGEN_MS;
    battle.updated=Date.now();battle.combatVersion=2;
    battle.log=Array.isArray(battle.log)?battle.log:[];
   }
  }
 }catch{}
 function persistBattle(){try{localStorage.setItem(battleKey,JSON.stringify(battle))}catch{}}
 function inTent(){return player.location==='laguna'&&Math.abs(player.x-TENT.x)<36&&Math.abs(player.y-TENT.y)<35}
 function inTraining(){return nearTraining()||nearExtraMobs()}
 function updateSide(force=false){
  const mode=battle&&battle.status==='running'?'running':battle&&battle.status==='finished'?'finished':extraMap(player.location)?(questOpen&&nearExtraNpc()?'extraNpc':inTraining()?'tent':'extra'):player.location==='island'?(questOpen&&nearKrillin()?'krillin':questOpen&&nearHouse()?'islandQuest':inTraining()?'tent':'island'):questOpen?'quest':inTent()?'tent':'none';
  if(!force&&mode===lastSide)return;
  const previousList=side.querySelector('.world-mobs');
  const previousScroll=previousList?previousList.scrollTop:0;
  lastSide=mode;
  if(mode==='quest'){
   side.innerHTML=questMarkup();
   side.querySelector('#worldTravelAccept')?.addEventListener('click',travelToIsland);
   side.querySelector('#worldQuestClose')?.addEventListener('click',()=>{questOpen=false;lastSide='';updateSide(true)});
   side.querySelector('#worldQuestAccept')?.addEventListener('click',()=>{quest.state='accepted';quest.kills=0;saveQuest();lastSide='';updateSide(true)});
   side.querySelector('#worldQuest2Accept')?.addEventListener('click',()=>{if(quest.state!=='completed')return;quest2.state='accepted';saveQuest2();lastSide='';updateSide(true)});
   side.querySelector('#worldQuest2Claim')?.addEventListener('click',()=>{
    if(quest.state!=='completed'||quest2.state!=='accepted')return;
    if(!window.DBIWorldInventory?.exchangeWhiteBelt?.()){lastSide='';updateSide(true);return;}
    quest2.state='completed';saveQuest2();window.DBIDaily?.record('quests',1);lastSide='';updateSide(true);
   });
   side.querySelector('#worldQuestClaim')?.addEventListener('click',()=>{
    if(quest.state!=='accepted'||quest.kills<10)return;
    const granted=window.DBIWorldInventory?.grant(['quest-starter-gift'])||0;
    if(granted!==1){side.insertAdjacentHTML('beforeend','<p class="world-quest-error">Nie udało się dodać nagrody do ekwipunku. Spróbuj ponownie.</p>');return;}
    quest.state='completed';saveQuest();window.DBIDaily?.record('quests',1);lastSide='';updateSide(true);
   });
  }
  else if(mode==='extraNpc'){
   const npc=nearExtraNpc();const index=extraMap(player.location)?.npc.indexOf(npc)??-1;
   if(player.location==='forest'&&index>=0){side.innerHTML=forestNpcMarkup(index);side.querySelector('#forestClaim')?.addEventListener('click',()=>claimForest(index));side.querySelector('#forestClose')?.addEventListener('click',()=>{questOpen=false;lastSide='';updateSide(true)})}
   else if(player.location==='mountain'&&index===0){side.innerHTML=mountainRoshiMarkup();side.querySelector('#mountainClaim')?.addEventListener('click',claimMountainRoshi);side.querySelector('#mountainClose')?.addEventListener('click',()=>{questOpen=false;lastSide='';updateSide(true)})}
   else if(player.location==='stadium'&&index>=0){side.innerHTML=stadiumQuestMarkup(index===1);side.querySelector('#stadiumClaim')?.addEventListener('click',()=>stadiumClaim(index===1));side.querySelector('#stadiumClose')?.addEventListener('click',()=>{questOpen=false;lastSide='';updateSide(true)})}
   else{side.innerHTML='<h2>📜 '+escapeText(npc?.label||'NPC')+'</h2><p>Witaj, wojowniku!</p><button class="world-action secondary" id="extraNpcClose">Zamknij</button>';side.querySelector('#extraNpcClose').onclick=()=>{questOpen=false;lastSide='';updateSide(true)}};
  }
  else if(mode==='extra'){
   const map=extraMap(player.location);side.innerHTML='<h2>🌍 '+escapeText(map.name)+'</h2><p>Nowa lokacja. Zwiedzaj teren, rozmawiaj z NPC i odwiedź miejsca walki.</p>'+(map.mobs?'<p>Podejdź do oznaczenia „Moby”, aby wybrać przeciwników.</p>':player.location==='stadium'?'<p>Trybuny blokują przejście. Dostępna jest wyłącznie centralna strefa areny.</p>':'<p>Możesz swobodnie eksplorować lokację.</p>');
  }
  else if(mode==='krillin'){
   side.innerHTML=krillinQuestMarkup();
   const inspect=side.querySelector('.krillin-inspect');
   if(inspect){const pop=inspect.querySelector('.krillin-inspect-pop');for(const ev of ['mouseenter','focus'])inspect.addEventListener(ev,()=>{pop.style.display='block'});for(const ev of ['mouseleave','blur'])inspect.addEventListener(ev,()=>{pop.style.display='none'});}
   side.querySelector('#krillinFight')?.addEventListener('click',()=>{if(window.DBISpiritual?.isActive())return;
    if(krillinQuest.state!=='available'||window.DBIStoryCombat?.isRunning())return;
    window.DBIStoryCombat?.open({characterId:id,playerName:document.querySelector('#name')?.textContent||'Wojownik',playerRace:'Wojownik',opponentName:'Krillin',opponentStats:krillinStats,onFinish:(result)=>{
     if(result==='win'&&krillinQuest.state==='available'){krillinQuest.state='won';saveKrillinQuest();}
     lastSide='';updateSide(true);
    }});
   });
   side.querySelector('#krillinClaim')?.addEventListener('click',()=>{
    if(krillinQuest.state!=='won')return;
    // Zapis nagrody w stanie questa przed przyznaniem chroni przed ponownym odebraniem.
    krillinQuest.state='completed';saveKrillinQuest();
    const count=window.DBIWorldInventory?.grant(['quest-white-headband'])||0;
    if(count!==1){krillinQuest.state='won';saveKrillinQuest();side.insertAdjacentHTML('beforeend','<p class="world-quest-error">Nie udało się dodać nagrody. Spróbuj ponownie.</p>');return;}
    window.DBIDaily?.record('quests',1);lastSide='';updateSide(true);
   });
   side.querySelector('#krillinClose')?.addEventListener('click',()=>{questOpen=false;lastSide='';updateSide(true)});
  }
  else if(mode==='islandQuest'){
   side.innerHTML=islandQuestMarkup();
   side.querySelector('#islandQuestAccept')?.addEventListener('click',()=>{if(islandQuest.state!=='available')return;islandQuest.state='accepted';islandQuest.kills=0;saveIslandQuest();updateSide(true)});
   side.querySelector('#islandQuestClaim')?.addEventListener('click',()=>{if(islandQuest.state!=='accepted'||islandQuest.kills<20)return;islandQuest.state='completed';saveIslandQuest();window.DBIDaily?.record('quests',1);updateSide(true)});

   side.querySelector('#masterKrillinAccept')?.addEventListener('click',()=>{masterKrillin='accepted';saveStage(masterKrillinKey,masterKrillin);lastSide='';updateSide(true)});
   side.querySelector('#masterKrillinClaim')?.addEventListener('click',()=>{
    if(masterKrillin!=='accepted'||!masterKrillinReady())return;
    if(!window.DBIWorldInventory?.grantMasterStats?.('master-krillin-v1')){side.insertAdjacentHTML('beforeend','<p class="world-quest-error">Nie udało się zapisać nagrody. Spróbuj ponownie.</p>');return;}
    masterKrillin='completed';saveStage(masterKrillinKey,masterKrillin);window.DBIDaily?.record('quests',1);lastSide='';updateSide(true);
   });
   side.querySelector('#masterCampAccept')?.addEventListener('click',()=>{if(masterKrillin!=='completed')return;masterCamp='accepted';saveStage(masterCampKey,masterCamp);lastSide='';updateSide(true)});
   side.querySelector('#masterCampTravel')?.addEventListener('click',()=>{if(masterKrillin!=='completed'||masterCamp!=='accepted'||characterLevel()<5)return;window.DBIDaily?.record('quests',1);goToForest()});
   side.querySelector('#worldIslandQuestClose')?.addEventListener('click',()=>{questOpen=false;lastSide='';updateSide(true)});
  }
  else if(mode==='island'){
   side.innerHTML='<h2>🏝️ Wyspa Genialnego Żółwia</h2><p>Dotarłeś na wyspę wielkiego mistrza. Poznaj okolicę: dom mistrza, palmy, pomost i plac treningowy.</p><p>Przy domku mistrza naciśnij E, aby przyjąć zadanie. Podejdź do kukły treningowej, aby walczyć z uczniami mistrza (poziom 3).</p>';
  }
  else if(mode==='running'){side.innerHTML='<h2>⚔️ Trwa walka</h2><p>Walka trwa również po ukryciu jej okna lub przejściu do innej zakładki. Maksymalny czas: 12 godzin.</p><div class="world-side-actions"><button class="world-action" id="worldShowBattle">Otwórz okno walki</button></div>';side.querySelector('#worldShowBattle').onclick=()=>{showBattle()}}
  else if(mode==='finished'){side.innerHTML='<h2>🎒 Walka zakończona</h2><p>Odbierz łupy: zaznaczone sprzedasz, pozostałe trafią do ekwipunku.</p><button class="world-action" id="worldShowBattle">Otwórz wyniki walki</button>';side.querySelector('button').onclick=()=>{showBattle()}}
  else if(mode==='tent'){
   side.innerHTML='<h2>'+(extraMap(player.location)?'⚔️ '+extraMap(player.location).name:player.location==='island'?'🥋 Plac treningowy mistrza':'⛺ EXPowisko — trening')+'</h2><p>Wybierz od 1 do 3 przeciwników. Kliknij ⓘ, aby zobaczyć możliwy drop.</p><div id="worldCount">Wybrano: '+selected.size+' / 3</div><div class="world-mobs">'+currentMobs().map(m=>'<div class="world-mob '+(selected.has(m.id)?'selected':'')+'"><button type="button" class="world-mob-select" data-mob="'+m.id+'" aria-pressed="'+selected.has(m.id)+'"><span>'+m.name+'</span></button><span class="world-mob-level">Poziom '+m.level+'</span><button type="button" class="world-mob-info" data-info="'+m.id+'" title="Możliwy drop" aria-label="Możliwy drop: '+m.name+', poziom '+m.level+'">ⓘ</button></div>').join('')+'</div><div class="world-side-actions"><button class="world-action" id="worldFight" '+(!selected.size?'disabled':'')+'>⚔️ Walcz</button></div>';
   side.querySelectorAll('[data-mob]').forEach(button=>button.onclick=()=>{const i=Number(button.dataset.mob);if(selected.has(i))selected.delete(i);else if(selected.size<3)selected.add(i);updateSide(true)});
   side.querySelector('.world-mobs').scrollTop=previousScroll;
   side.querySelectorAll('[data-info]').forEach(button=>button.onclick=()=>showDropInfo(Number(button.dataset.info)));
   side.querySelector('#worldFight').onclick=beginBattle;
  }else side.innerHTML='<h2>🌍 Błękitna Laguna</h2><p>Wejdź postacią na namiot oznaczony „EXPowisko”, aby zobaczyć 15 potworów. Podejdź do Opiekuna Laguny i naciśnij E, aby porozmawiać.</p>';
 }
 function showDropInfo(i){
  const mob=currentMobs()[i];if(!mob)return;
  const drops=(window.DBIWorldInventory?.choices()||[]).filter(d=>d.id!=='quest-turtle-stone');
  const shade=document.createElement('div');shade.className='world-drop-backdrop';
  const turtleDrop=battle?.location==='forest'&&mob.name==='Dzikie zwierzę'||player.location==='forest'&&mob.name==='Dzikie zwierzę';
  shade.innerHTML='<section class="world-drop-dialog" role="dialog" aria-modal="true" aria-label="Możliwy drop"><div class="world-drop-heading"><h3>ⓘ '+escapeText(mob.name)+' · poziom '+mob.level+'</h3><button type="button" class="world-action secondary" data-close>✕</button></div><p>Możliwe przedmioty (wspólna pula: 22%):</p>'+ (turtleDrop?'<p><img src="assets/items/kamien-zolwia.png" alt="" style="width:34px;height:34px;vertical-align:middle"> Kamień Żółwia — 70% za pokonanie dzikiego zwierzęcia.</p>':'')+'<p><div class="world-drop-items">'+(drops.length?drops.map(d=>'<div class="world-drop-item" title="'+escapeText(d.name)+'"><span>'+escapeText(d.icon||'🎒')+'</span><small>'+escapeText(d.name)+'</small></div>').join(''):'<p>Brak zdefiniowanych przedmiotów w katalogu.</p>')+'</div></section>';
  container.appendChild(shade);
  const close=()=>shade.remove();shade.querySelector('[data-close]').onclick=close;shade.addEventListener('pointerdown',e=>{if(e.target===shade)close()});
 }
 function beginBattle(){
  if(window.DBISpiritual?.isActive())return;
  if(!selected.size||battle?.status==='running')return;
  const now=Date.now();
  const ch=hero();
  const mobList=currentMobs();
  battle={location:player.location,combatVersion:2,status:'running',started:now,updated:now,round:0,kills:0,gold:0,exp:0,totalDamage:0,loot:[],log:[],
   enemies:[...selected].map(i=>({id:i,level:mobList[i].level,name:mobList[i].name,hp:mobHp(mobList[i].level),max:mobHp(mobList[i].level),nextAttack:now+mobInterval(mobList[i].level)})),
   hp:ch.maxHp??10,maxHp:ch.maxHp??10,ki:ch.maxKi??5,maxKi:ch.maxKi??5,
   nextHeroAttack:now+500,nextRegen:now+REGEN_MS,heroHits:0,heroDamageTaken:0};
  selected.clear();sellSelection.clear();keys.clear();uiBattle=null;persistBattle();updateSide(true);showBattle();
 }
 function appendLog(line){battle.log.unshift('['+new Date().toLocaleTimeString('pl-PL')+'] '+line);battle.log.length=Math.min(80,battle.log.length)}
 function tickBattle(){
  if(!battle||battle.status!=='running')return;
  const now=Date.now(),until=Math.min(now,battle.started+MAX_MS);
  const drops=(window.DBIWorldInventory?.choices()||[]).filter(d=>d.id!=='quest-turtle-stone');
  let iterations=0;
  // Zdarzenia są rozliczane chronologicznie: atak postaci, niezależne ataki mobów, regeneracja.
  // Limit chroni przeglądarkę po długiej nieobecności, bez pomijania zdarzeń.
  while(battle.status==='running'&&iterations++<150000){
   const next=Math.min(battle.nextHeroAttack,battle.nextRegen,...battle.enemies.filter(e=>e.hp>0).map(e=>e.nextAttack));
   if(next>until)break;
   if(battle.nextRegen<=next){
    const regen=regenAmount();
    battle.hp=num(Math.min(battle.maxHp,battle.hp+regen.hp));
    battle.ki=num(Math.min(battle.maxKi,battle.ki+regen.ki));
    battle.nextRegen+=REGEN_MS;
   }
   if(battle.nextHeroAttack<=next){
    const living=battle.enemies.filter(e=>e.hp>0);
    if(!living.length){
     // Cała grupa odradza się jednocześnie, nigdy pojedynczo.
     for(const e of battle.enemies){e.hp=e.max;e.rewarded=false;e.nextAttack=next+mobInterval(e.level);}
     battle.respawnGeneration=(battle.respawnGeneration||0)+1;
     if(until-next<10000)appendLog('Cała grupa odrodziła się z pełnym HP.');
    }else{
     battle.round++;
     // Jedno uderzenie postaci trafia WSZYSTKIE żywe potwory równocześnie.
     for(const target of living){
      const damage=dealt(Number(hero().attack)||0,mobDef(target.level));
      const actual=Math.min(target.hp,damage);
      target.hp=num(Math.max(0,target.hp-actual));
      battle.totalDamage=num((battle.totalDamage||0)+actual);
      if(until-next<10000)appendLog('Wojownik atakuje '+target.name+' za '+num(damage)+' obrażeń.');
      if(target.hp<=0&&!target.rewarded){
       target.rewarded=true;battle.kills++;if(battle.location==='island')addIslandQuestKills(1);else if(battle.location==='laguna')addQuestKills(1);else if(battle.location==='forest'&&target.name==='Dzikie zwierzę'&&roshi.stage===2){roshi.kills=Math.min(30,roshi.kills+1);saveForest();}window.DBIDaily?.record('kills',1);
       battle.gold+=Math.floor((5+target.level*3)*(1+.2*(window.DBISpiritual?.currentBonuses()?.gold||0)));
       const earned=window.DBIWorldInventory?.grantMobKills?.(1,target.level)||0;
       battle.exp=(battle.exp||0)+earned;battle.expCredited=true;
       // Niezależny rzut 70% za każde pokonane Dzikie zwierzę w Dzikim Lesie.
       if(battle.location==='forest'&&target.name==='Dzikie zwierzę'&&battle.loot.length<100&&Math.random()<(turtleAlreadyDropped?0.05:0.70)){
        battle.loot.push({id:'quest-turtle-stone',name:'Kamień Żółwia',icon:'🪨',sell:0});
        turtleAlreadyDropped=true;
        try{localStorage.setItem(turtleDropKey,'1')}catch{}
       }
       if(drops.length&&Math.random()<Math.min(1,.22+.01*(window.DBISpiritual?.currentBonuses()?.drop||0))&&battle.loot.length<100){
        const d=drops[Math.floor(Math.random()*drops.length)];
        battle.loot.push({id:d.id,name:d.name,icon:d.icon,sell:5+target.level*5});
       }
       if(until-next<10000)appendLog('Pokonano '+target.name+', +'+earned+' EXP.');
      }
     }
    }
    battle.nextHeroAttack+=heroInterval();
   }
   // Każdy żywy mob atakuje osobno, z własnym zegarem.
   for(const e of battle.enemies){
    if(e.hp<=0||e.nextAttack>next||battle.status!=='running')continue;
    const damage=dealt(mobAttack(e.level),Number(hero().defense)||0);
    battle.hp=num(Math.max(0,battle.hp-damage));
    if(damage>0){battle.heroHits=(battle.heroHits||0)+1;battle.heroDamageTaken=num((battle.heroDamageTaken||0)+damage);}
    e.nextAttack+=mobInterval(e.level);
    if(until-next<10000)appendLog(e.name+' atakuje za '+num(damage)+' obrażeń.');
    if(battle.hp<=0){
     battle.hp=0;
     finishBattle('Postać została pokonana. Walka zakończona.');
     showBattle();
     break;
    }
   }
  }
  battle.updated=until;
  if(battle.status==='running'&&now>=battle.started+MAX_MS)finishBattle('Minęło 12 godzin — walka zakończona automatycznie.');
  persistBattle();
 }
 function finishBattle(message){
  if(!battle||battle.status!=='running')return;
  battle.status='finished';battle.ended=Date.now();appendLog(message);persistBattle();updateSide(true);renderBattle(true);
 }
 function escapeText(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
 function fmtDuration(ms){const sec=Math.max(0,Math.ceil(ms/1000));return Math.floor(sec/3600)+'h '+String(Math.floor(sec%3600/60)).padStart(2,'0')+'m '+String(sec%60).padStart(2,'0')+'s'}
 function lootGroups(){
  const groups=new Map();
  battle.loot.forEach((item,index)=>{
   const key=JSON.stringify([item.id,item.sell,item.sellable]);
   if(!groups.has(key))groups.set(key,{item,indices:[]});
   groups.get(key).indices.push(index);
  });
  return [...groups.values()];
 }
 function lootTiles(summary){return battle.loot.length?lootGroups().map(({item,indices})=>{
  const locked=item.id==='quest-turtle-stone'||item.sellable===false||Number(item.sell)<=0;
  const selected=indices.every(i=>sellSelection.has(i));
  return '<button type="button" class="world-loot-tile '+(summary&&!locked?'selectable ':'')+(locked?'world-loot-unsellable ':'')+(selected&&!locked?'sell-selected':'')+'" data-loot="'+indices[0]+'" title="'+escapeText(item.name)+' ×'+indices.length+(locked?' · Nie można sprzedać':' · '+(Number(item.sell)||0)*indices.length+' złota')+'" '+(summary&&!locked?'aria-pressed="'+selected+'"':'disabled')+'><span>'+(item.id==='quest-turtle-stone'?'<img src="assets/items/kamien-zolwia.png" alt="" style="display:block;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain">':escapeText(item.icon||'🎒'))+'</span>'+(indices.length>1?'<b class="world-stack-count">×'+indices.length+'</b>':'')+'</button>';
 }).join(''):'<span class="world-muted">Na razie brak łupów.</span>'}
 // Puste sloty są przygotowane pod przyszłe efekty (np. omdlenie, trucizna).
 // Gdy mechanika statusów zostanie dodana, efekty pojawią się w tych slotach.
 function statusSlots(kind,index=0){
  return Array.from({length:6},(_,i)=>'<span class="world-status-slot" data-status-kind="'+kind+'" data-status-index="'+index+'" data-status-slot="'+i+'" title="Pusty slot efektu"></span>').join('');
 }
 function renderBattle(force=false){
  if(!battle||overlay.hidden)return;
  const running=battle.status==='running',summary=!running;
  if(!uiBattle||uiBattle.status!==battle.status||force&&uiBattle.battle!==battle){
   uiBattle={battle,status: battle.status, hp:battle.enemies.map(e=>e.hp),heroHits:battle.heroHits||0,heroDamageTaken:battle.heroDamageTaken||0,respawnGeneration:battle.respawnGeneration||0,kills:-1,lootCount:-1,logHead:null};
   if(running){
    battleEl.innerHTML=`<div class="world-battle-top"><div><div class="world-muted">${extraMap(battle.location)?extraMap(battle.location).name.toUpperCase():battle.location==='island'?'WYSPA GENIALNEGO ŻÓŁWIA · Uczniowie Mistrza':'BŁĘKITNA LAGUNA · EXPowisko'}</div><h2>⚔️ Trwająca walka</h2></div><button class="world-action secondary" id="worldHide">Ukryj okno</button></div>

    <div class="world-character-name"><strong>${escapeText(document.querySelector("#name")?.textContent?.trim() || "Postać")}</strong></div>
    <div class="world-hero-grid"><div><div class="world-vital-label"><span>Twoje HP</span><span>${num(battle.hp)}/${num(battle.maxHp)}</span></div><div class="world-health hero"><span style="width:${100*battle.hp/battle.maxHp}%"></span><div class="world-damage-layer"></div></div><div class="world-status-slots" aria-label="Statusy postaci">${statusSlots("hero")}</div></div><div><div class="world-vital-label"><span>Twoje KI</span><span>${num(battle.ki)}/${num(battle.maxKi)}</span></div><div class="world-health ki"><span style="width:${100*battle.ki/battle.maxKi}%"></span></div></div></div>
    <div class="world-enemies" style="--enemy-count:${battle.enemies.length}">${battle.enemies.map((e,i)=>`<div class="world-enemy" data-enemy="${i}"><strong>${escapeText(e.name)}</strong><small>Poziom ${e.level} · <span data-hp-text>${e.hp}/${e.max}</span> HP</small><div class="world-health monster"><span class="world-hp-trail" style="width:${e.hp/e.max*100}%"></span><span class="world-hp-fill" style="width:${e.hp/e.max*100}%"></span><div class="world-damage-layer"></div></div><div class="world-status-slots" aria-label="Statusy potwora">${statusSlots("mob",i)}</div></div>`).join('')}</div>
    <div class="world-log-section"><button class="world-log-toggle" id="worldToggleLog" aria-expanded="false">⚔️ Przebieg walki <span>⌄</span></button><div class="world-log collapsed" id="worldLog"></div></div>
    <div class="world-summary-grid world-live-stats">${[['worldStatKills','POKONANE POTWORY'],['worldStatGold','ZDOBYTE ZŁOTO'],['worldStatLoot','ZDOBYTE PRZEDMIOTY'],['worldStatDamage','ZADANE OBRAŻENIA'],['worldStatDps','ŚREDNIE OBRAŻENIA/S'],['worldStatExp','ZDOBYTE DOŚWIADCZENIE']].map(([key,label])=>`<div><strong id="${key}">0</strong><small>${label}</small></div>`).join('')}</div>
    <div class="world-loot world-loot-compact"><button type="button" class="world-log-toggle world-loot-toggle" id="worldToggleLoot" aria-expanded="true">🎒 Zdobyte łupy <span>⌃</span></button><div class="world-loot-grid" id="worldLootGrid"></div><span id="worldLootCount" hidden></span></div>

    <div class="world-battle-actions"><button class="world-action" id="worldFinish">Zakończ walkę</button></div>`;
    battleEl.querySelector('#worldToggleLoot').onclick=()=>{const grid=battleEl.querySelector('#worldLootGrid');const collapsed=grid.classList.toggle('collapsed');battleEl.querySelector('#worldToggleLoot').setAttribute('aria-expanded',String(!collapsed));battleEl.querySelector('#worldToggleLoot span').textContent=collapsed?'⌄':'⌃'};
    battleEl.querySelector('#worldFinish').onclick=()=>finishBattle('Wojownik zakończył walkę.');
    battleEl.querySelector('#worldToggleLog').onclick=()=>{const el=battleEl.querySelector('#worldLog'),hidden=el.classList.toggle('collapsed');battleEl.querySelector('#worldToggleLog').setAttribute('aria-expanded',String(!hidden));battleEl.querySelector('#worldToggleLog span').textContent=hidden?'⌄':'⌃'};
   }else{
    const elapsed=Math.max(1,((battle.ended||Date.now())-battle.started)/1000),num=x=>Math.round(x||0).toLocaleString('pl-PL');
    battleEl.innerHTML=`<div class="world-battle-top"><div><div class="world-muted">${extraMap(battle.location)?extraMap(battle.location).name.toUpperCase():battle.location==='island'?'WYSPA GENIALNEGO ŻÓŁWIA · Uczniowie Mistrza':'BŁĘKITNA LAGUNA · EXPowisko'}</div><h2>Walka zakończona!</h2></div><button class="world-action secondary" id="worldHide">Ukryj okno</button></div>
    <div class="world-summary-grid">${[[num(battle.kills),'POKONANE POTWORY'],[num(battle.gold),'ZŁOTO'],[num(battle.loot.length),'PRZEDMIOTY'],[num(battle.totalDamage),'ZADANE OBRAŻENIA'],[num((battle.totalDamage||0)/elapsed)+'/s','ŚR. DPS'],[num(battle.exp||0),'ZDOBYTE EXP']].map(([v,l])=>`<div><strong>${v}</strong><small>${l}</small></div>`).join('')}</div>
    <div class="world-loot"><div class="world-loot-header"><h3>🎒 Zdobyty łup</h3><div class="world-loot-shortcuts"><button class="world-action secondary" id="worldKeepAll">Zostaw wszystko</button><button class="world-action secondary" id="worldSellAll">Sprzedaj wszystko</button></div></div><p class="world-muted">Kliknij kafelek, żeby zaznaczyć przedmiot do sprzedaży. Kliknij ponownie, aby go zachować.</p><div class="world-loot-grid" id="worldLootGrid"></div><p id="worldSaleSummary"></p></div>
    <div class="world-battle-actions"><button class="world-action" id="worldCollect">Odbierz i sprzedaj</button></div><p class="world-result" id="worldResult" role="status"></p>`;
    battleEl.querySelector('#worldKeepAll').onclick=()=>{sellSelection.clear();syncLootSelection()};
    battleEl.querySelector('#worldSellAll').onclick=()=>{battle.loot.forEach((item,i)=>{if(item.id!=='quest-turtle-stone'&&item.sellable!==false&&Number(item.sell)>0)sellSelection.add(i)});syncLootSelection()};
    battleEl.querySelector('#worldCollect').onclick=collectBattle;
   }
   battleEl.querySelector('#worldHide').onclick=hideBattle;
  }
  if(summary){renderLootSelection();return}
  const elapsedSeconds=Math.max(1,(Date.now()-battle.started)/1000);
  const stats={worldStatKills:battle.kills,worldStatGold:battle.gold,worldStatLoot:battle.loot.length,worldStatDamage:battle.totalDamage||0,worldStatDps:Math.round((battle.totalDamage||0)/elapsedSeconds),worldStatExp:battle.exp||0};
  for(const [key,value] of Object.entries(stats)){const el=battleEl.querySelector('#'+key);if(el)el.textContent=Number(value).toLocaleString('pl-PL')}
  const now=Date.now();
  const heroHp=battleEl.querySelector('.world-health.hero');
  const heroKi=battleEl.querySelector('.world-health.ki');
  const hpLabel=heroHp?.previousElementSibling?.querySelector('span:last-child');
  const kiLabel=heroKi?.previousElementSibling?.querySelector('span:last-child');
  if(heroHp){heroHp.querySelector('span').style.width=(100*battle.hp/battle.maxHp)+'%';if(hpLabel)hpLabel.textContent=num(battle.hp)+'/'+num(battle.maxHp);}
  if(heroKi){heroKi.querySelector('span').style.width=(battle.maxKi?100*battle.ki/battle.maxKi:0)+'%';if(kiLabel)kiLabel.textContent=num(battle.ki)+'/'+num(battle.maxKi);}
  // Ten sam czerwony, unoszący się numer co nad HP potwora.
  // Licznik obrażeń nie ginie, gdy regeneracja HP nastąpi pomiędzy klatkami.
  if(heroHp && (battle.heroHits||0)>uiBattle.heroHits){
   const damage=num((battle.heroDamageTaken||0)-uiBattle.heroDamageTaken);
   if(damage>0){const number=document.createElement('span');number.className='world-damage';number.textContent='-'+damage;heroHp.querySelector('.world-damage-layer').appendChild(number);setTimeout(()=>number.remove(),900);}
  }
  uiBattle.heroHits=battle.heroHits||0;
  uiBattle.heroDamageTaken=battle.heroDamageTaken||0;

  const respawnChanged=(battle.respawnGeneration||0)!==uiBattle.respawnGeneration;
  battle.enemies.forEach((e,i)=>{
   const card=battleEl.querySelector('[data-enemy="'+i+'"]');if(!card)return;
   const prev=uiBattle.hp[i],pct=100*e.hp/e.max;
   const fill=card.querySelector('.world-hp-fill'),trail=card.querySelector('.world-hp-trail');
   if(respawnChanged||e.hp>prev){fill.style.transition='none';trail.style.transition='none';fill.style.width=pct+'%';trail.style.width=pct+'%';requestAnimationFrame(()=>requestAnimationFrame(()=>{fill.style.transition='';trail.style.transition=''}));}
   else if(e.hp<prev){const dmg=prev-e.hp;fill.style.width=pct+'%';trail.style.width=pct+'%';const number=document.createElement('span');number.className='world-damage';number.textContent='-'+num(dmg);card.querySelector('.world-damage-layer').appendChild(number);setTimeout(()=>number.remove(),900);}
   card.querySelector('[data-hp-text]').textContent=num(e.hp)+'/'+num(e.max);uiBattle.hp[i]=e.hp;
  });
  uiBattle.respawnGeneration=battle.respawnGeneration||0;
  if(uiBattle.logHead!==battle.log[0]){const log=battleEl.querySelector('#worldLog');const wasAtTop=log.scrollTop<20;log.replaceChildren(...battle.log.slice(0,70).map(line=>{const div=document.createElement('div');div.textContent=line;return div}));if(wasAtTop)log.scrollTop=0;uiBattle.logHead=battle.log[0]}
  if(uiBattle.lootCount!==battle.loot.length){battleEl.querySelector('#worldLootGrid').innerHTML=lootTiles(false);battleEl.querySelector('#worldLootCount').textContent='('+battle.loot.length+')';uiBattle.lootCount=battle.loot.length}
 }
 function updateLootSummary(){
  if(!battle||battle.status!=='finished')return;
  const sum=battle.loot.reduce((acc,item,i)=>acc+(sellSelection.has(i)?item.sell:0),0);
  const label=battleEl.querySelector('#worldSaleSummary');
  if(label)label.textContent='Do sprzedaży: '+sellSelection.size+' przedmiotów · '+sum+' złota. Do ekwipunku: '+(battle.loot.length-sellSelection.size)+' przedmiotów.';
 }
 function syncLootSelection(){
  const grid=battleEl.querySelector('#worldLootGrid');if(!grid)return;
  grid.querySelectorAll('[data-loot]').forEach(button=>{
   const group=lootGroups().find(g=>g.indices[0]===Number(button.dataset.loot));
   const marked=!!group&&group.indices.every(i=>sellSelection.has(i));
   button.classList.toggle('sell-selected',marked);
   button.setAttribute('aria-pressed',String(marked));
  });
  updateLootSummary();
 }
 function renderLootSelection(){
  if(!battle||battle.status!=='finished'||overlay.hidden)return;
  const grid=battleEl.querySelector('#worldLootGrid');if(!grid)return;
  // Buduj kafelki tylko gdy lista łupów faktycznie się zmieniła.
  // Wcześniej innerHTML było odtwarzane co 120 ms, co gubiło kliknięcia.
  if(grid.dataset.lootCount!==String(battle.loot.length)){
   grid.innerHTML=lootTiles(true);
   grid.dataset.lootCount=String(battle.loot.length);
   grid.addEventListener('click',event=>{
    const button=event.target.closest('button[data-loot]');
    if(!button||!grid.contains(button)||!battle||battle.status!=='finished')return;
    const i=Number(button.dataset.loot);
    if(!Number.isInteger(i)||i<0||i>=battle.loot.length||(battle.loot[i].id==='quest-turtle-stone'||battle.loot[i].sellable===false||Number(battle.loot[i].sell)<=0))return;
    const group=lootGroups().find(g=>g.indices[0]===i);
    if(!group)return;
    const allSelected=group.indices.every(index=>sellSelection.has(index));
    group.indices.forEach(index=>allSelected?sellSelection.delete(index):sellSelection.add(index));
    syncLootSelection();
   });
  }
  syncLootSelection();
 }
 function collectBattle(){
  if(!battle||battle.status!=='finished')return;
  const sold=battle.loot.filter((_,i)=>sellSelection.has(i)),kept=battle.loot.filter((_,i)=>!sellSelection.has(i));
  const bridge=window.DBIWorldInventory;const ids=kept.map(x=>x.id);
  const result=battleEl.querySelector('#worldResult');
  if(ids.length&&!bridge?.grant){result.textContent='Nie można połączyć z ekwipunkiem. Łupy pozostają do odbioru.';return}
  // Zapis rozliczenia dopiero po sprawdzeniu dostępności ekwipunku.
  const count=bridge?.grant(ids)||0;
  if(count!==ids.length){result.textContent='Nie wszystkie przedmioty trafiły do ekwipunku. Sprawdź stan postaci.';return}
  const earned=sold.reduce((a,x)=>a+x.sell,0)+battle.gold;
  const goldKey='dboidle_gold_v1_'+String(id||'test');
  try{localStorage.setItem(goldKey,String((Number(localStorage.getItem(goldKey))||0)+earned));window.DBIRefreshWallet?.()}catch{result.textContent='Błąd zapisu złota. Nie zamykam podsumowania.';return}
  if(!battle.expCredited)bridge?.grantExp?.(battle.exp||0);
  battle=null;uiBattle=null;sellSelection.clear();localStorage.removeItem(battleKey);hideBattle();lastSide='';updateSide(true);
  side.insertAdjacentHTML('afterbegin','<p class="world-success">Odebrano '+count+' przedmiotów, sprzedano '+sold.length+'. Zysk: '+earned+' złota.</p>');
 }
 const combatTimer=setInterval(()=>{tickBattle();renderBattle()},120);
 tickBattle();updateSide(true);
 active={container,cleanup:()=>{closed=true;tickBattle();clearInterval(combatTimer);cancelAnimationFrame(raf);save();observer.disconnect();document.removeEventListener('keydown',input);document.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);}};
 raf=requestAnimationFrame(frameLoop);canvas.focus({preventScroll:true});}
 function stop(){if(active){active.cleanup();active=null}}
 window.DBIWorld={start,stop,locations:DBI_WORLD_LOCATIONS,gmTeleport};window.addEventListener('pagehide',stop);
})();
