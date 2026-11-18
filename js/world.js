/* DBOidle v2.1 — Błękitna Laguna, samodzielna mapa canvas bez bibliotek. */
(()=>{'use strict';
const SIZE=200,TILE=32,WORLD=SIZE*TILE,SPAWN={x:100.5*TILE,y:100.5*TILE};
const NPC={x:105.5*TILE,y:100.5*TILE};
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
function character(ctx,x,y,dir,walking,time,npc=false){ctx.save();ctx.translate(Math.round(x),Math.round(y));const step=walking?Math.sin(time*.014)*3:0;
 ctx.fillStyle='#14241c88';ctx.beginPath();ctx.ellipse(0,9,12,5,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=npc?'#6b5a9d':'#293b69';ctx.fillRect(-8,-5,16,15);ctx.fillStyle=npc?'#b5a4db':'#d77b42';ctx.fillRect(-9,-4,18,8);
 ctx.fillStyle='#222c3c';ctx.fillRect(-7,9,5,7+step);ctx.fillRect(3,9,5,7-step);
 ctx.fillStyle='#f0c4a0';ctx.fillRect(-7,-19,14,14);
 ctx.fillStyle=npc?'#c6e5e5':'#e0b45e';ctx.fillRect(-9,-22,18,6);ctx.fillRect(-7,-25,6,5);ctx.fillRect(2,-27,7,7);
 if(dir==='left'||dir==='right'){ctx.fillStyle='#222';ctx.fillRect(dir==='left'?-6:4,-14,2,2)}else if(dir==='down'){ctx.fillStyle='#222';ctx.fillRect(-4,-14,2,2);ctx.fillRect(3,-14,2,2)}
 ctx.restore();}
function start(container,id){stop();const key='dboidle_world_v1_'+String(id||'test');let saved;try{saved=JSON.parse(localStorage.getItem(key)||'null')}catch{}
 const player={x:SPAWN.x,y:SPAWN.y,dir:'down'};
 if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)&&!blocked(saved.x,saved.y)){player.x=clamp(saved.x,20,WORLD-20);player.y=clamp(saved.y,20,WORLD-20);player.dir=['up','down','left','right'].includes(saved.dir)?saved.dir:'down';}
 container.innerHTML=`<div class="world-grid"><section class="world-shell"><div class="world-toolbar"><strong>🌿 BŁĘKITNA LAGUNA</strong><span id="worldCoords">Pozycja: —</span></div><div class="world-frame"><canvas id="worldCanvas" tabindex="0" aria-label="Mapa gry, WASD i strzałki"></canvas><div class="world-prompt" id="worldPrompt" hidden>Naciśnij E, aby porozmawiać z Opiekunem Laguny</div></div><div class="world-help">WASD / strzałki — ruch. Wejdź na namiot, aby wybrać potwory. Podejdź do Opiekuna Laguny i naciśnij E, aby rozpocząć misję.</div></section><aside id="worldSide" class="world-side"><h2>🌍 Błękitna Laguna</h2><p>Znajdź namiot treningowy na mapie. Po wejściu na niego zobaczysz listę 15 przeciwników. Walkę można ukryć i otworzyć ponownie.</p></aside></div><div id="worldOverlay" class="world-overlay" hidden><section id="worldBattle" class="world-battle world-modal"></section></div>`;
 const canvas=container.querySelector('canvas'),ctx=canvas.getContext('2d'),frame=container.querySelector('.world-frame'),prompt=container.querySelector('#worldPrompt'),coords=container.querySelector('#worldCoords');
 const keys=new Set();let raf=0,last=0,lastSave=0,camX=player.x,camY=player.y,closed=false;
 const save=()=>{try{localStorage.setItem(key,JSON.stringify(player))}catch{}};
 function resize(){const r=frame.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;}
 const observer=new ResizeObserver(resize);observer.observe(frame);resize();
 const near=()=>Math.hypot(player.x-NPC.x,player.y-NPC.y)<70;
 const questKey='dboidle_quest_laguna_v1_'+String(id||'test');
 let quest={state:'available',kills:0};
 try{const stored=JSON.parse(localStorage.getItem(questKey)||'null');if(stored&&['available','accepted','completed'].includes(stored.state))quest={state:stored.state,kills:Math.min(10,Math.max(0,Number(stored.kills)||0))};}catch{}
 const saveQuest=()=>{try{localStorage.setItem(questKey,JSON.stringify(quest))}catch{}};
 const quest2Key='dboidle_quest_laguna_belt_v1_'+String(id||'test');
 let quest2={state:'available'};
 try{const old=JSON.parse(localStorage.getItem(quest2Key)||'null');if(['available','accepted','completed'].includes(old?.state))quest2=old;}catch{}
 const saveQuest2=()=>{try{localStorage.setItem(quest2Key,JSON.stringify(quest2))}catch{}};
 let questOpen=false;
 function questMarkup(){
  if(quest.state==='completed'){
   if(quest2.state==='completed')return `<h2>📜 Opiekun Laguny</h2><p>Obie misje ukończone. Dziękuję za pomoc!</p><button class="world-action secondary" id="worldQuestClose">Zamknij</button>`;
   if(quest2.state==='available')return `<h2>📜 Opiekun Laguny — drugie zadanie</h2><p>Podobno prawdziwy wojownik poznaje się po pasie. Przynieś mi swój Biały Pas, a oddam Ci go wzmocnionego!</p><p><strong>Cel:</strong> Oddaj Biały Pas (zwykły, bez ulepszeń).</p><p><strong>Nagroda:</strong> Biały Pas +1</p><div class="world-side-actions"><button class="world-action" id="worldQuest2Accept">Akceptuj questa</button><button class="world-action secondary" id="worldQuestClose">Zamknij</button></div>`;
   const hasBelt=!!window.DBIWorldInventory?.hasWhiteBelt?.();
   return `<h2>📜 Opiekun Laguny — Biały Pas</h2><p>Przynieś mi swój Biały Pas. Może znajdować się w inwentarzu lub być założony.</p><div class="world-quest-progress ${hasBelt?'done':'pending'}">Oddaj Biały Pas ${hasBelt?'1/1':'0/1'}</div><p><strong>Nagroda:</strong> Biały Pas +1</p>${hasBelt?'<button class="world-action" id="worldQuest2Claim">Zatwierdź jako wykonanie questa</button>':''}<button class="world-action secondary" id="worldQuestClose">Zamknij</button>`;
  }
  if(quest.state==='available')return `<h2>📜 Opiekun Laguny</h2><p>Witaj, podróżniku! Spokój Błękitnej Laguny zakłócają dzikie Saibamany. Pomóż mi oczyścić okolicę, a otrzymasz upominek na dobry początek.</p><p><strong>Cel:</strong> Pokonaj 10 × Dziki Saibaman.</p><div class="world-side-actions"><button class="world-action" id="worldQuestAccept">Akceptuj questa</button><button class="world-action secondary" id="worldQuestClose">Odrzuć</button></div>`;
  const done=quest.kills>=10;
  return `<h2>📜 Opiekun Laguny — misja</h2><p>Pokonaj Saibamany w namiocie EXPowiska, a potem wróć po nagrodę.</p><div class="world-quest-progress ${done?'done':'pending'}">Zabij Saibaman ${quest.kills}/10</div><p>Nagroda: <img class="world-quest-chest" src="assets/items/upominek-startowy.png" alt="Srebrna skrzynia"> Upominek Startowy</p>${done?'<button class="world-action" id="worldQuestClaim">Zatwierdź jako wykonanie questa</button>':''}<button class="world-action secondary" id="worldQuestClose">Zamknij</button>`;
 }
 function questAction(){questOpen=true;lastSide='';updateSide(true)}
 function addQuestKills(n){if(quest.state!=='accepted'||n<=0)return;quest.kills=Math.min(10,quest.kills+n);saveQuest();if(questOpen){lastSide='';updateSide(true)}}

 const input=e=>{if(!active||active.container!==container)return;const k=e.key.toLowerCase();if(k==='e'&&near()&&battle?.status!=='running'&&overlay.hidden){e.preventDefault();questAction();return}if(k==='escape'&&!overlay.hidden){hideBattle();e.preventDefault();return}
 if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){
 if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;
 if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();keys.add(k)}
 }};
 const keyup=e=>keys.delete(e.key.toLowerCase());const blur=()=>keys.clear();
 document.addEventListener('keydown',input);document.addEventListener('keyup',keyup);window.addEventListener('blur',blur);

 function frameLoop(time){if(closed)return;const dt=Math.min((time-last)||16,40)/1000;last=time;let dx=0,dy=0;
 dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
 if(battle?.status==='running'){dx=0;dy=0;keys.clear()}
 const moving=dx!==0||dy!==0;if(moving){const len=Math.hypot(dx,dy);dx/=len;dy/=len;const speed=145*(1+(Number(window.DBIWorldInventory?.character()?.moveSpeedPct)||0)/100);const nx=player.x+dx*speed*dt,ny=player.y+dy*speed*dt;
 if(!blocked(nx,player.y))player.x=nx;if(!blocked(player.x,ny))player.y=ny;
 if(Math.abs(dx)>Math.abs(dy))player.dir=dx>0?'right':'left';else player.dir=dy>0?'down':'up';}
 const width=canvas.clientWidth,height=canvas.clientHeight;camX+=(player.x-camX)*Math.min(1,dt*8);camY+=(player.y-camY)*Math.min(1,dt*8);
 const offsetX=clamp(camX-width/2,0,Math.max(0,WORLD-width)),offsetY=clamp(camY-height/2,0,Math.max(0,WORLD-height));
 ctx.clearRect(0,0,width,height);ctx.save();ctx.translate(-Math.round(offsetX),-Math.round(offsetY));
 const minX=clamp(Math.floor(offsetX/TILE)-1,0,SIZE-1),maxX=clamp(Math.ceil((offsetX+width)/TILE)+1,0,SIZE-1),minY=clamp(Math.floor(offsetY/TILE)-1,0,SIZE-1),maxY=clamp(Math.ceil((offsetY+height)/TILE)+1,0,SIZE-1);
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)drawTile(ctx,x,y,tile(x,y));
 // Namiot treningowy, wyraźny punkt wejścia.
 ctx.fillStyle='#5d3925';ctx.fillRect(TENT.x-29,TENT.y-12,58,37);
 ctx.fillStyle='#c49a58';ctx.beginPath();ctx.moveTo(TENT.x-35,TENT.y-11);ctx.lineTo(TENT.x,TENT.y-52);ctx.lineTo(TENT.x+35,TENT.y-11);ctx.fill();
 ctx.fillStyle='#ead19c';ctx.beginPath();ctx.moveTo(TENT.x-19,TENT.y-12);ctx.lineTo(TENT.x,TENT.y-38);ctx.lineTo(TENT.x+19,TENT.y-12);ctx.fill();
 ctx.fillStyle='#272126';ctx.fillRect(TENT.x-8,TENT.y-10,16,35);
 ctx.fillStyle='#ffe0a0';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText('EXPowisko',TENT.x,TENT.y-60);
 character(ctx,NPC.x,NPC.y,'down',false,time,true);ctx.fillStyle='#ffe1a0';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText('Opiekun Laguny',NPC.x,NPC.y-38);
 character(ctx,player.x,player.y,player.dir,moving,time);ctx.restore();
 if(questOpen&&!near())questOpen=false;prompt.hidden=!near(); updateSide();coords.textContent='Pozycja: '+Math.floor(player.x/TILE)+' / '+Math.floor(player.y/TILE);
 if(time-lastSave>1500){save();lastSave=time}raf=requestAnimationFrame(frameLoop);
 }

 const side=container.querySelector('#worldSide'),battleEl=container.querySelector('#worldBattle'),overlay=container.querySelector('#worldOverlay');
 const showBattle=()=>{overlay.hidden=false;renderBattle(true)};
 const hideBattle=()=>{overlay.hidden=true;keys.clear();canvas.focus({preventScroll:true})};
 overlay.addEventListener('pointerdown',e=>{if(e.target===overlay)hideBattle()});
 const battleKey='dboidle_battle_v1_'+String(id||'test');
 const MOB_COUNT=15, MAX_MS=12*60*60*1000, ATTACK_MS=2000;
 const mobList=Array.from({length:MOB_COUNT},(_,i)=>({id:i,level:1+(i%5),name:'Dziki Saibaman'}));
 let selected=new Set(),battle=null,lastSide='none',lastRender=0,uiBattle=null;const sellSelection=new Set();
 try{const old=JSON.parse(localStorage.getItem(battleKey)||'null');if(old&&old.status&&Array.isArray(old.enemies))battle=old;}catch{}
 function persistBattle(){try{localStorage.setItem(battleKey,JSON.stringify(battle))}catch{}}
 function inTent(){return Math.abs(player.x-TENT.x)<36&&Math.abs(player.y-TENT.y)<35}
 function updateSide(force=false){
  const mode=battle&&battle.status==='running'?'running':battle&&battle.status==='finished'?'finished':questOpen?'quest':inTent()?'tent':'none';
  if(!force&&mode===lastSide)return;
  const previousList=side.querySelector('.world-mobs');
  const previousScroll=previousList?previousList.scrollTop:0;
  lastSide=mode;
  if(mode==='quest'){
   side.innerHTML=questMarkup();
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
  else if(mode==='running'){side.innerHTML='<h2>⚔️ Trwa walka</h2><p>Walka trwa również po ukryciu jej okna lub przejściu do innej zakładki. Maksymalny czas: 12 godzin.</p><div class="world-side-actions"><button class="world-action" id="worldShowBattle">Otwórz okno walki</button></div>';side.querySelector('#worldShowBattle').onclick=()=>{showBattle()}}
  else if(mode==='finished'){side.innerHTML='<h2>🎒 Walka zakończona</h2><p>Odbierz łupy: zaznaczone sprzedasz, pozostałe trafią do ekwipunku.</p><button class="world-action" id="worldShowBattle">Otwórz wyniki walki</button>';side.querySelector('button').onclick=()=>{showBattle()}}
  else if(mode==='tent'){
   side.innerHTML='<h2>⛺ EXPowisko — trening</h2><p>Wybierz od 1 do 3 przeciwników. Kliknij ⓘ, aby zobaczyć możliwy drop.</p><div id="worldCount">Wybrano: '+selected.size+' / 3</div><div class="world-mobs">'+mobList.map(m=>'<div class="world-mob '+(selected.has(m.id)?'selected':'')+'"><button type="button" class="world-mob-select" data-mob="'+m.id+'" aria-pressed="'+selected.has(m.id)+'"><span>'+m.name+'</span></button><span class="world-mob-level">Poziom '+m.level+'</span><button type="button" class="world-mob-info" data-info="'+m.id+'" title="Możliwy drop" aria-label="Możliwy drop: '+m.name+', poziom '+m.level+'">ⓘ</button></div>').join('')+'</div><div class="world-side-actions"><button class="world-action" id="worldFight" '+(!selected.size?'disabled':'')+'>⚔️ Walcz</button></div>';
   side.querySelectorAll('[data-mob]').forEach(button=>button.onclick=()=>{const i=Number(button.dataset.mob);if(selected.has(i))selected.delete(i);else if(selected.size<3)selected.add(i);updateSide(true)});
   side.querySelector('.world-mobs').scrollTop=previousScroll;
   side.querySelectorAll('[data-info]').forEach(button=>button.onclick=()=>showDropInfo(Number(button.dataset.info)));
   side.querySelector('#worldFight').onclick=beginBattle;
  }else side.innerHTML='<h2>🌍 Błękitna Laguna</h2><p>Wejdź postacią na namiot oznaczony „EXPowisko”, aby zobaczyć 15 potworów. Podejdź do Opiekuna Laguny i naciśnij E, aby porozmawiać.</p>';
 }
 function showDropInfo(i){
  const mob=mobList[i];if(!mob)return;
  const drops=window.DBIWorldInventory?.choices()||[];
  const shade=document.createElement('div');shade.className='world-drop-backdrop';
  shade.innerHTML='<section class="world-drop-dialog" role="dialog" aria-modal="true" aria-label="Możliwy drop"><div class="world-drop-heading"><h3>ⓘ '+escapeText(mob.name)+' · poziom '+mob.level+'</h3><button type="button" class="world-action secondary" data-close>✕</button></div><p>Możliwe przedmioty (testowa wspólna pula, szansa na przedmiot: 22% po pokonaniu moba):</p><div class="world-drop-items">'+(drops.length?drops.map(d=>'<div class="world-drop-item" title="'+escapeText(d.name)+'"><span>'+escapeText(d.icon||'🎒')+'</span><small>'+escapeText(d.name)+'</small></div>').join(''):'<p>Brak zdefiniowanych przedmiotów w katalogu.</p>')+'</div></section>';
  container.appendChild(shade);
  const close=()=>shade.remove();shade.querySelector('[data-close]').onclick=close;shade.addEventListener('pointerdown',e=>{if(e.target===shade)close()});
 }
 function beginBattle(){
  if(!selected.size||battle?.status==='running')return;
  const now=Date.now();
  battle={status:'running',started:now,updated:now,round:0,kills:0,gold:0,exp:0,totalDamage:0,loot:[],log:[],enemies:[...selected].map(i=>({id:i,level:mobList[i].level,name:mobList[i].name,hp:90+mobList[i].level*45,max:90+mobList[i].level*45})),hp:130,maxHp:130,ki:100,maxKi:100};
  selected.clear();sellSelection.clear();keys.clear();uiBattle=null;persistBattle();updateSide(true);showBattle();
 }
 function appendLog(line){battle.log.unshift('['+new Date().toLocaleTimeString('pl-PL')+'] '+line);battle.log.length=Math.min(80,battle.log.length)}
 function tickBattle(){
  if(!battle||battle.status!=='running')return;
  const now=Date.now(),until=Math.min(now,battle.started+MAX_MS);
  let steps=Math.min(21600,Math.max(0,Math.floor((until-battle.updated)/ATTACK_MS)));
  if(steps>0){
   const drops=window.DBIWorldInventory?.choices()||[];
   for(let n=0;n<steps;n++){
    battle.round++;
    // Jeden cykl = jednoczesny atak na wszystkich wybranych przeciwników.
    // Respawn grupowy: dopiero gdy WSZYSCY wybrani przeciwnicy mają 0 HP.
    // Odrodzenie następuje na początku kolejnego cyklu, bez podwójnego naliczania nagród.
    if(battle.enemies.length&&battle.enemies.every(e=>e.hp<=0)){
     for(const e of battle.enemies){e.hp=e.max;e.rewarded=false;}
     battle.respawnGeneration=(battle.respawnGeneration||0)+1;
     if(steps<25)appendLog('Cała grupa przeciwników odrodziła się jednocześnie z pełnym HP.');
     continue; // Cykl odrodzenia jest osobny: żadnych obrażeń w tej samej chwili.
    }
    for(const e of battle.enemies){
     if(e.hp<=0)continue; // Pokonany przeciwnik czeka na resztę grupy.
     const damage=65+Math.max(0,(window.DBIWorldInventory?.character()?.level||1)-1)*4;
     const actualDamage=Math.min(e.hp,damage);e.hp=Math.max(0,e.hp-actualDamage);battle.totalDamage=(battle.totalDamage||0)+actualDamage;
     if(steps<25)appendLog('Wojownik atakuje '+e.name+' (poz. '+e.level+') za '+damage+' obrażeń.');
    }
    for(const e of battle.enemies){
     if(e.hp>0||e.rewarded)continue;
     e.rewarded=true;
     battle.kills++;addQuestKills(1);window.DBIDaily?.record('kills',1);battle.gold+=5+e.level*3;battle.exp=(battle.exp||0)+e.level*3;
     if(drops.length&&Math.random()<.22&&battle.loot.length<100){
      const d=drops[Math.floor(Math.random()*drops.length)];battle.loot.push({id:d.id,name:d.name,icon:d.icon,sell:5+e.level*5});
     }
     if(steps<25)appendLog('Pokonano '+e.name+' (poz. '+e.level+'), +'+(5+e.level*3)+' złota.');
     // Odradzanie przy następnym cyklu pozwala pokazać animację pokonania.
    }
   }
   battle.updated+=steps*ATTACK_MS;
   if(steps>=25)appendLog('Wykonano '+steps+' cykli automatycznej walki.');
  }
  if(now>=battle.started+MAX_MS)finishBattle('Minęło 12 godzin — walka zakończona automatycznie.');
  persistBattle();
 }
 function finishBattle(message){
  if(!battle||battle.status!=='running')return;
  battle.status='finished';battle.ended=Date.now();appendLog(message);persistBattle();updateSide(true);renderBattle(true);
 }
 function escapeText(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
 function fmtDuration(ms){const sec=Math.max(0,Math.ceil(ms/1000));return Math.floor(sec/3600)+'h '+String(Math.floor(sec%3600/60)).padStart(2,'0')+'m '+String(sec%60).padStart(2,'0')+'s'}
 function lootTiles(summary){return battle.loot.length?battle.loot.map((item,i)=>'<button type="button" class="world-loot-tile '+(summary?'selectable ':'')+(sellSelection.has(i)?'sell-selected':'')+'" data-loot="'+i+'" title="'+escapeText(item.name)+' · '+item.sell+' złota" '+(summary?'aria-pressed="'+sellSelection.has(i)+'"':'disabled')+'><span>'+escapeText(item.icon||'🎒')+'</span></button>').join(''):'<span class="world-muted">Na razie brak łupów.</span>'}
 // Puste sloty są przygotowane pod przyszłe efekty (np. omdlenie, trucizna).
 // Gdy mechanika statusów zostanie dodana, efekty pojawią się w tych slotach.
 function statusSlots(kind,index=0){
  return Array.from({length:6},(_,i)=>'<span class="world-status-slot" data-status-kind="'+kind+'" data-status-index="'+index+'" data-status-slot="'+i+'" title="Pusty slot efektu"></span>').join('');
 }
 function renderBattle(force=false){
  if(!battle||overlay.hidden)return;
  const running=battle.status==='running',summary=!running;
  if(!uiBattle||uiBattle.status!==battle.status||force&&uiBattle.battle!==battle){
   uiBattle={battle,status: battle.status, hp:battle.enemies.map(e=>e.hp),respawnGeneration:battle.respawnGeneration||0,kills:-1,lootCount:-1,logHead:null};
   if(running){
    battleEl.innerHTML=`<div class="world-battle-top"><div><div class="world-muted">BŁĘKITNA LAGUNA · EXPowisko</div><h2>⚔️ Trwająca walka</h2></div><button class="world-action secondary" id="worldHide">Ukryj okno</button></div>

    <div class="world-character-name"><strong>${escapeText(document.querySelector("#name")?.textContent?.trim() || "Postać")}</strong></div>
    <div class="world-hero-grid"><div><div class="world-vital-label"><span>Twoje HP</span><span>${battle.hp}/${battle.maxHp}</span></div><div class="world-health hero"><span style="width:${100*battle.hp/battle.maxHp}%"></span></div><div class="world-status-slots" aria-label="Statusy postaci">${statusSlots("hero")}</div></div><div><div class="world-vital-label"><span>Twoje KI</span><span>${battle.ki}/${battle.maxKi}</span></div><div class="world-health ki"><span style="width:${100*battle.ki/battle.maxKi}%"></span></div></div></div>
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
    battleEl.innerHTML=`<div class="world-battle-top"><div><div class="world-muted">BŁĘKITNA LAGUNA · EXPowisko</div><h2>Walka zakończona!</h2></div><button class="world-action secondary" id="worldHide">Ukryj okno</button></div>
    <div class="world-summary-grid">${[[num(battle.kills),'POKONANE POTWORY'],[num(battle.gold),'ZŁOTO'],[num(battle.loot.length),'PRZEDMIOTY'],[num(battle.totalDamage),'ZADANE OBRAŻENIA'],[num((battle.totalDamage||0)/elapsed)+'/s','ŚR. DPS'],[num(battle.exp||0),'ZDOBYTE EXP']].map(([v,l])=>`<div><strong>${v}</strong><small>${l}</small></div>`).join('')}</div>
    <div class="world-loot"><div class="world-loot-header"><h3>🎒 Zdobyty łup</h3><div class="world-loot-shortcuts"><button class="world-action secondary" id="worldKeepAll">Zostaw wszystko</button><button class="world-action secondary" id="worldSellAll">Sprzedaj wszystko</button></div></div><p class="world-muted">Kliknij kafelek, żeby zaznaczyć przedmiot do sprzedaży. Kliknij ponownie, aby go zachować.</p><div class="world-loot-grid" id="worldLootGrid"></div><p id="worldSaleSummary"></p></div>
    <div class="world-battle-actions"><button class="world-action" id="worldCollect">Odbierz i sprzedaj</button></div><p class="world-result" id="worldResult" role="status"></p>`;
    battleEl.querySelector('#worldKeepAll').onclick=()=>{sellSelection.clear();syncLootSelection()};
    battleEl.querySelector('#worldSellAll').onclick=()=>{battle.loot.forEach((_,i)=>sellSelection.add(i));syncLootSelection()};
    battleEl.querySelector('#worldCollect').onclick=collectBattle;
   }
   battleEl.querySelector('#worldHide').onclick=hideBattle;
  }
  if(summary){renderLootSelection();return}
  const elapsedSeconds=Math.max(1,(Date.now()-battle.started)/1000);
  const stats={worldStatKills:battle.kills,worldStatGold:battle.gold,worldStatLoot:battle.loot.length,worldStatDamage:battle.totalDamage||0,worldStatDps:Math.round((battle.totalDamage||0)/elapsedSeconds),worldStatExp:battle.exp||0};
  for(const [key,value] of Object.entries(stats)){const el=battleEl.querySelector('#'+key);if(el)el.textContent=Number(value).toLocaleString('pl-PL')}
  const now=Date.now();


  const respawnChanged=(battle.respawnGeneration||0)!==uiBattle.respawnGeneration;
  battle.enemies.forEach((e,i)=>{
   const card=battleEl.querySelector('[data-enemy="'+i+'"]');if(!card)return;
   const prev=uiBattle.hp[i],pct=100*e.hp/e.max;
   const fill=card.querySelector('.world-hp-fill'),trail=card.querySelector('.world-hp-trail');
   if(respawnChanged||e.hp>prev){fill.style.transition='none';trail.style.transition='none';fill.style.width=pct+'%';trail.style.width=pct+'%';requestAnimationFrame(()=>requestAnimationFrame(()=>{fill.style.transition='';trail.style.transition=''}));}
   else if(e.hp<prev){const dmg=prev-e.hp;fill.style.width=pct+'%';trail.style.width=pct+'%';const number=document.createElement('span');number.className='world-damage';number.textContent='-'+dmg;card.querySelector('.world-damage-layer').appendChild(number);setTimeout(()=>number.remove(),900);}
   card.querySelector('[data-hp-text]').textContent=e.hp+'/'+e.max;uiBattle.hp[i]=e.hp;
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
   const marked=sellSelection.has(Number(button.dataset.loot));
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
    if(!Number.isInteger(i)||i<0||i>=battle.loot.length)return;
    if(sellSelection.has(i))sellSelection.delete(i);else sellSelection.add(i);
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
  bridge?.grantExp?.(battle.exp||0);
  battle=null;uiBattle=null;sellSelection.clear();localStorage.removeItem(battleKey);hideBattle();lastSide='';updateSide(true);
  side.insertAdjacentHTML('afterbegin','<p class="world-success">Odebrano '+count+' przedmiotów, sprzedano '+sold.length+'. Zysk: '+earned+' złota.</p>');
 }
 const combatTimer=setInterval(()=>{tickBattle();renderBattle()},120);
 tickBattle();updateSide(true);
 active={container,cleanup:()=>{closed=true;tickBattle();clearInterval(combatTimer);cancelAnimationFrame(raf);save();observer.disconnect();document.removeEventListener('keydown',input);document.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);}};
 raf=requestAnimationFrame(frameLoop);canvas.focus({preventScroll:true});}
 function stop(){if(active){active.cleanup();active=null}}
 window.DBIWorld={start,stop};window.addEventListener('pagehide',stop);
})();
