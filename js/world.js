/* DBOidle v2.1 — Błękitna Laguna, samodzielna mapa canvas bez bibliotek. */
(()=>{'use strict';
const SIZE=48,TILE=32,WORLD=SIZE*TILE,SPAWN={x:22.5*TILE,y:17.2*TILE};
const NPC={x:26.2*TILE,y:17.2*TILE};
const ISLAND_SIZE=15,ISLAND_WORLD=ISLAND_SIZE*TILE;
const ISLAND_SPAWN={x:7.5*TILE,y:11.5*TILE};
const ISLAND_HOUSE={x:9.2*TILE,y:5.6*TILE};
const ISLAND_TRAINING={x:10.6*TILE,y:9.1*TILE};
const ISLAND_INTERACT_RADIUS=52;
// Krillin: nieruchomy NPC na trawie na południowo-zachodniej części wyspy.
const ISLAND_KRILLIN={x:4.35*TILE,y:11.15*TILE};
const lagunaArt=new Image();lagunaArt.src='assets/laguna-mapa.png';
const lagoonNpcSprite=new Image();lagoonNpcSprite.src='assets/opiekun-laguny.png';
const krillinSprite=new Image();krillinSprite.src='assets/krillin-npc.png';
const roshiSprite=new Image();roshiSprite.src='assets/roshi-npc.png';
const bulmaSprite=new Image();bulmaSprite.src='assets/bulma-npc.png'; const wandererSprite=new Image();wandererSprite.src='assets/wedrowiec-npc.png';
const forestBossSprite=new Image();forestBossSprite.src='assets/lesny-wojownik-boss.png';
const centralNpcSprites={};for(const [name,file] of Object.entries({'Drwal':'drwal.png','Rybak':'rybak.png','Zagubiona Kobieta':'zagubiona-kobieta.png'})){const img=new Image();img.src='assets/'+file;centralNpcSprites[name]=img;}
// Wspólny rejestr misji świata: jeden wpis tutaj automatycznie trafia do zakładki Misje.
// Nowe questy mogą używać DBIQuestRegistry.register({id, getMissions(characterId, inventory)}).
const questRegistry=window.DBIQuestRegistry||{
 entries:new Map(),
 register(definition){if(definition&&typeof definition.id==='string'&&typeof definition.getMissions==='function')this.entries.set(definition.id,definition)},
 getMissions(characterId,inventory){const missions=[];for(const definition of this.entries.values()){
  try{const entries=definition.getMissions(characterId,inventory);if(Array.isArray(entries))missions.push(...entries)}
  catch(error){console.error('Błąd rejestru misji:',definition.id,error)}
 }return missions}
};
window.DBIQuestRegistry=questRegistry;
const highTowerJourneyKey=id=>'dboidle_high_tower_journey_v1_'+String(id||'test');
function readHighTowerJourney(id){
 try{
  const saved=JSON.parse(localStorage.getItem(highTowerJourneyKey(id))||'null');
  if(saved?.stage===19&&!saved.version)return {stage:18,cleared:false};
  if(saved?.stage===20&&saved.version===2)return {stage:19,cleared:true};
  if(Number.isInteger(saved?.stage)&&saved.stage>=0&&saved.stage<=21)return {stage:saved.stage,cleared:saved.cleared===true};
 }catch{}
 return {stage:0,cleared:false};
}
const northQuestKey=(kind,id)=>'dboidle_north_'+kind+'_v1_'+String(id||'test');
const northHuntGoals=[0,100,200,500];
const northBall={id:'quest-three-star-ball',image:'assets/items/quest-three-star-ball.png'};
function readNorthQuest(kind,id){
 try{
  const state=JSON.parse(localStorage.getItem(northQuestKey(kind,id))||'null');
  if(Number.isInteger(state?.stage)&&state.stage>=0&&state.stage<=(kind==='journey'?16:5))
   return {stage:state.stage,kills:Math.max(0,Math.floor(Number(state.kills)||0)),won:state.won===true};
 }catch{}
 return {stage:0,kills:0,won:false};
}
questRegistry.register({id:'north-forester',getMissions(id){
 const {stage,kills}=readNorthQuest('hunt',id),total=northHuntGoals[stage];
 if(stage===0||stage===5)return [];
 return [{id:'north-forester',name:'Pomoc w polowaniu',location:'Północna część Lasu · Samotny leśniczy',count:total?Math.min(kills,total):1,total:total||1,description:total?'Pokonaj Wojowników gór.':'Porozmawiaj z leśniczym.',ready:'Wróć do leśniczego.'}];
}});
questRegistry.register({id:'central-forest-woodcutter',getMissions(characterId,inventory){
 let state;try{state=JSON.parse(localStorage.getItem('dboidle_central_woodcutter_v1_'+String(characterId||'test'))||'null')}catch{return []}
 const stage=Number(state?.stage)||0;
 if(stage===4){
  const journey=readHighTowerJourney(characterId);
  if(journey.stage===21){
   const {stage,kills,won}=readNorthQuest('journey',characterId);
   if(stage===16)return [];
   const total=stage===6?200:stage===15?50:1;
   const count=stage===3?Number((inventory?.countQuestItem?.(northBall.id)||0)>0):stage===6?kills:stage===15?Number(inventory?.character?.()?.level)||0:[8,10,11].includes(stage)?Number(won):1;
   const description=({3:'Znajdź i oddaj trójgwiazdkową Smoczą kulę.',6:'Pokonaj 200 Wojowników gór.',8:'Pokonaj Strażnika bramy.',10:'Pokonaj Władcę Lasu.',11:'Pokonaj Wściekłego Władcę Lasu.',15:'Osiągnij poziom 50.'})[stage]||'Kontynuuj rozmowę przy wykrzykniku.';
   return [{id:'central-forest-woodcutter',name:'Pierwsza Podróż',location:'Północna część Lasu · '+(stage<5?'Kobieta':stage>=8&&stage<=12?'Zamek władcy lasu':'Mała wioska')+' · Fabularna',count:Math.min(total,count),total,description,ready:'Kontynuuj rozmowę przy wykrzykniku.'}];
  }
  const objectives={1:'Pokonaj Żołnierza Srebrnego.',5:'Pokonaj Generała Niebieskiego.',10:'Dotrzyj na szczyt wieży.',13:'Wejdź na szczyt wieży.',15:'Wejdź na szczyt wieży.',17:'Oddaj jedną czerwoną fasolkę Zen.',18:'Osiągnij 35 poziom.',19:'Pokonaj Kryminatora.'};
  const spot=journey.stage<3?'Mundurowi':journey.stage<10||journey.stage>=17?'Namiot':'Wieża';
  const count=journey.stage===18?Number((inventory?.character?.()?.level||0)>=35):journey.stage===17?Number((inventory?.countQuestItem?.('zen-bean-red')||0)>0):Number(journey.cleared);
  return [{id:'central-forest-woodcutter',name:'Pierwsza Podróż',location:'Las Wysokiej Wieży · '+spot+' · Fabularna',count,total:1,description:objectives[journey.stage]||'Kontynuuj rozmowę przy wykrzykniku.',ready:'Kontynuuj rozmowę przy wykrzykniku.'}];
 }
 if(stage<1||stage>3)return [];
 return [{id:'central-forest-woodcutter',name:'Pierwsza Podróż',location:'Las Centralny · Drwal · Fabularna',count:stage===1?(state?.won?1:0):1,total:1,description:stage===1?'Pokonaj Żołnierza Czerwonej Wstęgi.':'Porozmawiaj z Drwalem.',ready:stage===1?'Wróć do Drwala po walce.':'Kontynuuj rozmowę z Drwalem.'}];
}});
questRegistry.register({id:'central-forest-fisherman',getMissions(characterId,inventory){
 let state;try{state=JSON.parse(localStorage.getItem('dboidle_central_fisherman_v1_'+String(characterId||'test'))||'null')}catch{return []}
 const stage=Number(state?.stage)||0;
 if(stage<1||stage>3)return [];
 const base={id:'central-forest-fisherman',name:'Zagubiona pamiątka rodzinna',location:'Las Centralny · Rybak'};
 const progress=(value,max)=>Math.max(0,Math.min(max,Math.floor(Number(value)||0)));
 if(stage===1)return [{...base,count:progress(state.kills,100),total:100,description:'Pokonaj 100 Leśnych Wojowników.',ready:'Wróć do Rybaka po Białe Rękawiczki.'}];
 if(stage===2)return [{...base,count:progress(state.bossKills,1),total:1,description:'Pokonaj Leśnego Wojownika (Boss).',ready:'Wróć do Rybaka po Skrzynię Leśnego Wojownika.'}];
 const has=Number(inventory?.countQuestItem?.('stara-pamiatka-rodzinna'))||0;
 return [{...base,count:has>0?1:0,total:1,description:'Oddaj Starą Pamiątkę Rodzinną.',ready:'Wróć do Rybaka po Białe kolczyki.'}];
}});
questRegistry.register({id:'central-forest-lost-father',getMissions(characterId,inventory){
 let state;try{state=JSON.parse(localStorage.getItem('dboidle_central_lost_father_v1_'+String(characterId||'test'))||'null')}catch{return []}
 const stage=Number(state?.stage)||0;
 if(stage!==1)return [];
 const count=Number(inventory?.countQuestItem?.('pierscien-ojca'))||0;
 return [{id:'central-forest-lost-father',name:'Zaginiony Ojciec',location:'Las Centralny · Zagubiona Kobieta',count:count>0?1:0,total:1,description:'Oddaj Pierścień Ojca.',ready:'Wróć do Zagubionej Kobiety z pierścieniem.'}];
}});
const EXTRA_MAPS={
 forest:{name:'Dziki Las',sizeX:30,sizeY:30,art:'assets/dziki-las.png',spawn:{x:14.5*TILE,y:25.5*TILE},npc:[{x:14*TILE,y:14*TILE,label:'Genialny Żółw'},{x:22*TILE,y:21*TILE,label:'Bulma'}],mobs:{x:23*TILE,y:8*TILE,label:'Moby'},mobNames:[{name:'Dzikie zwierzę',level:5},{name:'Dzikie zwierzę (Silny)',level:8},{name:'Dzikie zwierzę (Super)',level:13}]},
 mountain:{name:'Góra Króla Lasu',sizeX:20,sizeY:15,art:'assets/gora-krola-lasu.png',spawn:{x:10*TILE,y:13*TILE},npc:[{x:9*TILE,y:10*TILE,label:'Genialny Żółw'},{x:4*TILE,y:11*TILE,label:'Wędrowiec'}],mobs:{x:17*TILE,y:4*TILE,label:'Moby'},mobNames:[{name:'Zamachowiec Góry',level:20},{name:'Zamachowiec Góry (Silny)',level:25},{name:'Zamachowiec Góry (Super)',level:30}]},
 stadium:{name:'Stadion 1',sizeX:10,sizeY:10,art:'assets/stadion-1.png',spawn:{x:5*TILE,y:7*TILE},npc:[{x:5*TILE,y:5*TILE,label:'Turniej sztuk walk'},{x:5*TILE,y:2.5*TILE,label:'Wrota stadionu'}],mobs:null,mobNames:[]},
 highTowerForest:{name:'Las Wysokiej Wieży',sizeX:20,sizeY:15,art:'assets/las-wysokiej-wiezy.png',spawn:{x:10*TILE,y:11.5*TILE},npc:[],mobs:{x:17*TILE,y:13*TILE,label:'Posterunek Czerwonej Wstęgi'},mobNames:[{name:'Wojownik Czerwonej Wstęgi',level:50},{name:'Wojownik Czerwonej Wstęgi (Silny)',level:60},{name:'Wojownik Czerwonej Wstęgi (Super)',level:80}],portals:[
  {x:10*TILE,y:14.85*TILE,to:'centralForest',arrival:{x:10*TILE,y:13.25*TILE}},
  {x:10.375*TILE,y:1.2*TILE,to:'mountainLake',arrival:{x:10*TILE,y:3.2*TILE},arrivalDirection:'down'}
 ]},
 mountainLake:{name:'Północna część Lasu',sizeX:50,sizeY:30,art:'assets/jezioro-pod-gorami.png',spawn:{x:3.5*TILE,y:14.2*TILE},npc:[],
  mobs:{x:24*TILE,y:9.55*TILE,label:'Wejście do jaskini',interactionBounds:{left:-78,right:72,top:-49,bottom:23}},
  mobNames:[{name:'Wojownik gór',level:55},{name:'Wojownik gór (Silny)',level:65},{name:'Wojownik gór (Super)',level:85}],
  dungeon:{x:46.8*TILE,y:4.7*TILE,label:'Dungeon'},
  portal:{x:.95*TILE,y:14.55*TILE,to:'highTowerForest',arrival:{x:3.5*TILE,y:14.2*TILE},arrivalDirection:'right'}},
 mountainTown:{name:'Miasto pod Górami',sizeX:50,sizeY:28,art:'assets/miasto-pod-gorami.png',
  spawn:{x:4*TILE,y:4*TILE},
  npc:[
   {x:6.8*TILE,y:5.55*TILE,label:'Podróżnik',art:'assets/wedrowiec-npc.png'},
   {x:34*TILE,y:17.7*TILE,label:'Poszukiwacz skarbów',art:'assets/world/polnocna-obiekty.png',source:[206,705,233,447]}
  ],
  city:{x:42.8*TILE,y:2.15*TILE,label:'Miasto'},
  mobs:{x:43*TILE,y:23.6*TILE,label:'Ruiny pod Górami'},
  mobNames:[{name:'Strażnik ruin',level:85},{name:'Strażnik ruin (Silny)',level:90},{name:'Strażnik ruin (Super)',level:95}],
  portal:{x:48.8*TILE,y:13.55*TILE,to:'mountainLake',destinationArrival:{x:45.6*TILE,y:13*TILE,dir:'left'}}
 },
 centralForest:{name:'Las centralny',sizeX:20,sizeY:40,art:'assets/las-centralny.png',spawn:{x:10*TILE,y:36*TILE},npc:[{x:8.5*TILE,y:29.7*TILE,label:'Drwal'},{x:5.8*TILE,y:15.2*TILE,label:'Rybak'},{x:15.1*TILE,y:18.2*TILE,label:'Zagubiona Kobieta'}],mobs:{x:16.7*TILE,y:6.2*TILE,label:'Moby'},mobNames:[{name:'Leśny Wojownik',level:30},{name:'Leśny Wojownik (Silny)',level:36},{name:'Leśny Wojownik (Super)',level:41}],boss:{x:15.8*TILE,y:32.0*TILE,label:'Leśny Wojownik (Boss)'},portal:{x:10*TILE,y:1.4*TILE,to:'highTowerForest',arrival:{x:10*TILE,y:2.7*TILE}}}
};
for(const config of Object.values(EXTRA_MAPS)){
 config.image=new Image();config.image.src=config.art;
 for(const npc of config.npc){
  if(!npc.art)continue;
  npc.image=new Image();npc.image.src=npc.art;
 }
}
const northernCaveSprite=new Image();northernCaveSprite.src='assets/world/polnocna-jaskinia.png';
const northernDungeonSprite=new Image();northernDungeonSprite.src='assets/world/polnocna-wieza.png';
const northernScenerySprite=new Image();northernScenerySprite.src='assets/world/polnocna-obiekty.png';
const northernScenery=[
 {x:118,y:187,width:91,height:87,source:[76,70,533,510],label:'Mała wioska'},
 {x:1102,y:438,width:21,height:46,source:[848,110,189,413],label:'Kobieta'},
 {x:103,y:857,width:24,height:47,source:[206,705,233,447],label:'Samotny leśniczy'},
 {x:1491,y:875,width:75,height:74,source:[682,654,514,505],label:'Zamek władcy lasu'},
];
const redRibbonOutpostSprite=new Image();redRibbonOutpostSprite.src='assets/posterunek-czerwonej-wstegi.png';
const highTowerProps=[
 {file:'wysoka-wieza-mundurowi.png',x:120,y:162},
 {file:'wysoka-wieza-oboz.png',x:539,y:187},
 {file:'wysoka-wieza.png',x:320,y:281}
].map(prop=>{
 const image=new Image();
 image.src='assets/world/'+prop.file;
 return {...prop,image};
});
function drawHighTowerProps(ctx){
 for(const {image,x,y} of highTowerProps){
  if(!image.complete||!image.naturalWidth)continue;
  mapSeal(ctx,x,y,Math.min(image.naturalWidth*.4,48),"#a7c7d7");
  ctx.drawImage(image,Math.round(x-image.naturalWidth/2),y-image.naturalHeight);
 }
}
// Znaczniki questów są rysowane przez silnik, nigdy nie są częścią grafiki PNG.
// Gdy przyszły quest NPC zapisze {state:'completed'} pod tym kluczem,
// wykrzyknik automatycznie znika (bez modyfikacji grafiki mapy).
const extraNpcQuestKey=(loc,index,id)=>'dboidle_quest_extra_'+loc+'_'+index+'_v1_'+String(id||'test');
function extraNpcQuestDone(loc,index,id){
 try{return JSON.parse(localStorage.getItem(extraNpcQuestKey(loc,index,id))||'null')?.state==='completed'}catch{return false}
}
// Podstawa znacznika jest zakotwiczona w pozycji obiektu w świecie.
function mapSeal(ctx,x,y,radius,color){
 ctx.save();ctx.beginPath();ctx.ellipse(x,y,radius,radius*.32,0,0,Math.PI*2);
 ctx.fillStyle='#0c192c88';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=1.4;ctx.stroke();
 ctx.restore();
}
function mapBadge(ctx,label,x,y){
 ctx.save();
 ctx.font='600 11px Georgia, serif';
 const half=Math.ceil(ctx.measureText(label).width/2)+7;
 ctx.beginPath();
 ctx.roundRect(x-half,y-12,half*2,17,4);
 ctx.fillStyle='#0a1729ed';ctx.fill();
 ctx.strokeStyle='#c9a56d';ctx.lineWidth=1;ctx.stroke();
 ctx.fillStyle='#fff0ce';ctx.textAlign='center';ctx.textBaseline='alphabetic';
 ctx.fillText(label,x,y);ctx.restore();
}
function drawQuestMark(ctx,x,y,time){
 const cy=y-56+Math.sin(time/260)*2;
 ctx.save();ctx.translate(x,cy);ctx.rotate(Math.PI/4);
 ctx.fillStyle='#63391e';ctx.strokeStyle='#ffc45d';ctx.lineWidth=1.5;
 ctx.fillRect(-6,-6,12,12);ctx.strokeRect(-6,-6,12,12);
 ctx.rotate(-Math.PI/4);ctx.font='bold 13px Georgia';ctx.textAlign='center';
 ctx.fillStyle='#fff2c7';ctx.fillText('!',0,4);ctx.restore();
}
const extraMap=loc=>EXTRA_MAPS[loc]||null;
const mapPortals=map=>map?.portals||(map?.portal?[map.portal]:[]);
function mountainLakeBlocked(x,y){
 const entrance=y>=13.8&&y<=14.65;
 if(x<.3||x>=48.3||y<2.15||y>=27.6||(x<1.7&&!entrance))return true;
 if(x>=5.5&&x<=44.8&&y>=5.55&&y<=7.55)return true;
 // Zaokrąglone narożniki jeziora odpowiadają linii brzegu.
 const lakeLeft=13.5,lakeRight=38,lakeTop=14,lakeBottom=23.3,radius=1.3;
 if(x<lakeLeft||x>lakeRight||y<lakeTop||y>lakeBottom)return false;
 const nearestX=Math.max(lakeLeft+radius,Math.min(x,lakeRight-radius));
 const nearestY=Math.max(lakeTop+radius,Math.min(y,lakeBottom-radius));
 return Math.hypot(x-nearestX,y-nearestY)<=radius;
}
// Granice wody odczytane z grafiki terenu (1672 × 941).
const mountainTownRiver=[
 [54,711,782],[100,670,760],[150,645,734],[200,642,724],
 [250,651,740],[300,684,766],[350,711,795],[400,725,811],
 [439,724,816],[466,725,823],[505,735,827],[550,758,854],
 [600,797,898],[650,828,924],[700,832,926],[750,804,910],
 [800,753,867],[850,712,812],[885,700,781]
];
function mountainTownBlocked(x,y,map){
 const px=x*1672/(map.sizeX*TILE),py=y*941/(map.sizeY*TILE);
 if(px<66||py<63||py>875||px>=1672)return true;
 if(px>1607&&(py<441||py>466))return true;
 if(py>=439&&py<=466)return false;
 const i=mountainTownRiver.findIndex(([row])=>row>=py);
 const [y0,l0,r0]=mountainTownRiver[i-1], [y1,l1,r1]=mountainTownRiver[i];
 const blend=(py-y0)/(y1-y0);
 return px>=l0+(l1-l0)*blend&&px<=r0+(r1-r0)*blend;
}
const extraBlocked=(loc,x,y)=>{
 const map=extraMap(loc);if(!map)return true;
 if(loc==='mountainLake')return mountainLakeBlocked(x/TILE,y/TILE);
 if(loc==='mountainTown')return mountainTownBlocked(x,y,map);
 const tx=Math.floor(x/TILE),ty=Math.floor(y/TILE);
 if(tx<1||ty<1||tx>=map.sizeX-1||ty>=map.sizeY-1)return true;
 // Arena: jedynie centralne 3x3 pola są dostępne; trybuny blokują przejście.
 if(loc==='stadium')return !(tx>=4&&tx<=6&&ty>=2&&ty<=6);
 // Zablokowane krawędzie, góra, gęsty las i stałe dekoracje; szlaki pozostają otwarte.
 if(loc==='mountain'&&ty<7&&tx<14)return true;
 if(loc==='forest'&&ty<4)return true;
 // Niezależny obiekt posterunku, kolizja jego podstawy (nie całego sprite'a).
 if(loc==='highTowerForest'&&x/TILE>15.6&&x/TILE<18.4&&y/TILE>12.25&&y/TILE<13.35)return true;
 return false;
};

// Centralny rejestr lokacji: panel GM pobiera listę bez ręcznego dodawania przycisków.
const DBI_WORLD_LOCATIONS=Object.freeze([
 {id:'laguna',name:'Błękitna Laguna',spawn:{...SPAWN}},
 {id:'island',name:'Wyspa Genialnego Żółwia',spawn:{...ISLAND_SPAWN}},
 {id:'forest',name:'Dziki Las',spawn:{...EXTRA_MAPS.forest.spawn}},
 {id:'mountain',name:'Góra Króla Lasu',spawn:{...EXTRA_MAPS.mountain.spawn}},
 {id:'stadium',name:'Stadion 1',spawn:{...EXTRA_MAPS.stadium.spawn}},
 {id:'centralForest',name:'Las centralny',spawn:{...EXTRA_MAPS.centralForest.spawn}},
 {id:'highTowerForest',name:'Las Wysokiej Wieży',spawn:{...EXTRA_MAPS.highTowerForest.spawn}},
 {id:'mountainLake',name:EXTRA_MAPS.mountainLake.name,spawn:{...EXTRA_MAPS.mountainLake.spawn}},
 {id:'mountainTown',name:EXTRA_MAPS.mountainTown.name,spawn:{...EXTRA_MAPS.mountainTown.spawn}}
]);
const dungeonLimitKey=characterId=>'dboidle_high_tower_limit_v1_'+characterId;
function dungeonLimit(characterId){
 const raw=localStorage.getItem(dungeonLimitKey(characterId));
 const value=Number(raw);
 return raw!==null&&Number.isSafeInteger(value)&&value>=0?value:1;
}
function gmSetDungeonLimit(characterId,limit){
 if(!window.DBIGmAccess?.hasSession()||!characterId||!Number.isSafeInteger(limit)||limit<0)return false;
 try{localStorage.setItem(dungeonLimitKey(characterId),String(limit));return true}
 catch{return false}
}
function gmTeleport(characterId,locationId){
 const destination=DBI_WORLD_LOCATIONS.find(x=>x.id===locationId);
 if(!destination||!characterId)return {ok:false,message:'Nieznana lokacja lub brak aktywnej postaci.'};
 const battleKey='dboidle_battle_v1_'+String(characterId);
 try{const battle=JSON.parse(localStorage.getItem(battleKey)||'null');if(battle?.status==='running')return {ok:false,message:'Najpierw zakończ trwającą walkę.'};}catch{}
 const key='dboidle_world_v1_'+String(characterId);
 let state={};try{state=JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{}
 state={...state,location:destination.id,x:destination.spawn.x,y:destination.spawn.y,dir:'down'};
 if(destination.id==='mountain')state.gmMountainArrival=true;
 else delete state.gmMountainArrival;
 try{localStorage.setItem(key,JSON.stringify(state));return {ok:true,message:'Przeniesiono do: '+destination.name+'.'}}
 catch{return {ok:false,message:'Nie udało się zapisać pozycji postaci.'}}
}

const islandArt=new Image();islandArt.src='assets/wyspa-genialnego-zolwia.png';
let islandPixels=null;
islandArt.onload=()=>{const c=document.createElement('canvas');c.width=ISLAND_SIZE;c.height=ISLAND_SIZE;const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(islandArt,0,0,15,15);islandPixels=cx.getImageData(0,0,15,15).data;};
const TENT={x:6.2*TILE,y:21.2*TILE};
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
function blocked(px,py){
 // Kolizja pierwszej lokacji dopasowana do nowej mapy 48 × 32.
 const x=px/TILE,y=py/TILE;
 if(x<1.3||x>46.7||y<3.3||y>30.2)return true;
 // Nie wchodzimy do jeziora ani na postać Opiekuna.
 if(y<8.8&&(x>7&&x<41))return true;
 return Math.hypot(px-NPC.x,py-NPC.y)<23;
}
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
function mobPortrait(name){
 const key=String(name==='Dowódca piętra'?'Dowódca piętra 1':name).toLowerCase().replace(/ł/g,'l').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 return 'assets/ui/moby/'+key+'.webp';
}
function questPortrait(name){
 return '<img src="'+mobPortrait(name)+'" width="38" height="38" alt="" style="object-fit:cover;border-radius:4px;vertical-align:middle">';
}
function start(container,id){stop();const turtleDropKey='dboidle_turtle_first_drop_v1_'+String(id||'test');
 const turtleInventoryKey='dboidle_inventory_v1_'+String(id||'test');
 let turtleAlreadyDropped=false;
 try{turtleAlreadyDropped=localStorage.getItem(turtleDropKey)==='1'||JSON.parse(localStorage.getItem(turtleInventoryKey)||'[]').some(ref=>ref==='quest-turtle-stone'||ref.startsWith('quest-turtle-stone~'));}catch{}
 try{const pending=JSON.parse(localStorage.getItem('dboidle_battle_v1_'+String(id||'test'))||'null');if(pending?.loot?.some(item=>item.id==='quest-turtle-stone'))turtleAlreadyDropped=true;}catch{}
 if(turtleAlreadyDropped)try{localStorage.setItem(turtleDropKey,'1')}catch{}
 const key='dboidle_world_v1_'+String(id||'test');let saved;try{saved=JSON.parse(localStorage.getItem(key)||'null')}catch{}
 const player={x:SPAWN.x,y:SPAWN.y,dir:'down',location:'laguna'};
 if(saved&&(saved.location==='island'||extraMap(saved.location))){player.location=saved.location;const spawn=DBI_WORLD_LOCATIONS.find(l=>l.id===saved.location)?.spawn||ISLAND_SPAWN;player.x=Number.isFinite(saved.x)?saved.x:spawn.x;player.y=Number.isFinite(saved.y)?saved.y:spawn.y;player.dir=['up','down','left','right'].includes(saved.dir)?saved.dir:'down';}else if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)&&!blocked(saved.x,saved.y)){player.x=clamp(saved.x,20,WORLD-20);player.y=clamp(saved.y,20,WORLD-20);player.dir=['up','down','left','right'].includes(saved.dir)?saved.dir:'down';}
 container.innerHTML=`<div class="world-grid"><section class="world-shell"><div class="world-toolbar"><strong>🌿 BŁĘKITNA LAGUNA</strong></div><div class="world-frame"><canvas id="worldCanvas" tabindex="0" aria-label="Mapa gry, WASD i strzałki"></canvas><div class="world-prompt" id="worldPrompt" hidden>Naciśnij E, aby porozmawiać z Opiekunem Laguny</div></div><span id="worldCoords" class="map-coordinates">Pozycja: —</span><div class="world-help">WASD / strzałki — ruch. Wejdź na namiot, aby wybrać potwory. Podejdź do Opiekuna Laguny i naciśnij E, aby rozpocząć misję.</div></section><aside id="worldSide" class="world-side"><h2>🌍 Błękitna Laguna</h2><p>Znajdź namiot treningowy na mapie. Po wejściu na niego zobaczysz listę 15 przeciwników. Walkę można ukryć i otworzyć ponownie.</p></aside></div><div id="worldOverlay" class="world-overlay" hidden><section id="worldBattle" class="world-battle world-modal"></section></div>`;
 const canvas=container.querySelector('canvas'),ctx=canvas.getContext('2d'),frame=container.querySelector('.world-frame'),prompt=container.querySelector('#worldPrompt'),coords=container.querySelector('#worldCoords');
 let bannerLocation=null;
 const keys=new Set();let raf=0,last=0,lastSave=0,camX=player.x,camY=player.y,closed=false;
 const save=()=>{
  const state=player.location==='mountain'&&saved?.gmMountainArrival===true?{...player,gmMountainArrival:true}:player;
  try{localStorage.setItem(key,JSON.stringify(state))}catch{}
 };
 function setMapText(node,text){if(node.textContent!==text)node.textContent=text}
 function resize(){
  const dpr=Math.min(devicePixelRatio||1,2);
  const w=Math.max(1,Math.round(canvas.clientWidth*dpr));
  if(canvas.width!==w)canvas.width=w;
  const h=Math.max(1,Math.round(canvas.clientHeight*dpr));
  if(canvas.height!==h)canvas.height=h;
 }
 const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
 const near=()=>player.location==='laguna'&&Math.hypot(player.x-NPC.x,player.y-NPC.y)<70;
 const nearKrillin=()=>player.location==='island'&&Math.hypot(player.x-ISLAND_KRILLIN.x,player.y-ISLAND_KRILLIN.y)<55;
 const nearHouse=()=>player.location==='island'&&Math.hypot(player.x-ISLAND_HOUSE.x,player.y-ISLAND_HOUSE.y)<ISLAND_INTERACT_RADIUS;
 const nearTraining=()=>player.location==='island'&&Math.hypot(player.x-ISLAND_TRAINING.x,player.y-ISLAND_TRAINING.y)<ISLAND_INTERACT_RADIUS;
 const nearExtraMobs=()=>{
   const m=extraMap(player.location)?.mobs;
   if(!m)return false;
   if(m.interactionBounds){
    const {left,right,top,bottom}=m.interactionBounds;
    const x=player.x-m.x,y=player.y-m.y;
    return x>=left&&x<=right&&y>=top&&y<=bottom;
   }
   if(player.location==='mountain'){
    // Prostokąt namiotu wskazany na zrzucie: w oryginalnej grafice
    // x ≈ 15–18.5 kafelka, y ≈ 1.5–3.8 kafelka.
    // Używamy pozycji stóp postaci (nie pozycji napisu „Moby”).
    const tileX=player.x/TILE, tileY=player.y/TILE;
    return tileX>=14.8 && tileX<=18.6 && tileY>=1.4 && tileY<=3.9;
   }
   if(player.location==='highTowerForest')return Math.hypot(player.x-m.x,player.y-m.y)<115;
   return Math.hypot(player.x-m.x,player.y-m.y)<110;
  };
 const nearDungeon=()=>{
  const dungeon=extraMap(player.location)?.dungeon;
  return dungeon&&Math.hypot(player.x-dungeon.x,player.y-dungeon.y)<55;
 };
 const nearForestBoss=()=>player.location==='centralForest'&&!!extraMap(player.location)?.boss&&Math.hypot(player.x-extraMap(player.location).boss.x,player.y-extraMap(player.location).boss.y)<70;
 const nearPortal=()=>mapPortals(extraMap(player.location)).find(portal=>Math.hypot(player.x-portal.x,player.y-portal.y)<58);
 const portalArt=new Image();portalArt.src='assets/portal-uniwersalny.png';
 const usePortal=()=>{
  const portal=nearPortal();
  if(!portal||battle?.status==='running')return;
  const destination=extraMap(portal.to);
  if(!destination)return;
  const returnPortal=mapPortals(destination).find(candidate=>candidate.to===player.location);
  const arrival=portal.destinationArrival||returnPortal?.arrival||destination.spawn;
  player.location=portal.to;
  player.x=arrival.x;player.y=arrival.y;
  player.dir=arrival.dir||returnPortal?.arrivalDirection||(portal.to==='centralForest'?'down':'up');
  camX=player.x;camY=player.y;questOpen=false;bossOpen=false;keys.clear();lastSide='';save();updateSide(true);
 };
 const nearExtraNpc=()=>extraMap(player.location)?.npc.find(n=>Math.hypot(player.x-n.x,player.y-n.y)<55);

 // Drwal — quest fabularny, zapisywany oddzielnie dla każdej postaci.
 const woodcutterKey='dboidle_central_woodcutter_v1_'+String(id||'test');
 let woodcutter={stage:0,won:false,rewarded:false};
 try{const old=JSON.parse(localStorage.getItem(woodcutterKey)||'null');if(old&&Number.isInteger(old.stage))woodcutter={stage:clamp(old.stage,0,4),won:!!old.won,rewarded:!!old.rewarded}}catch{}
 const saveWoodcutter=()=>{try{localStorage.setItem(woodcutterKey,JSON.stringify(woodcutter))}catch{}};
 const towerQuest=readHighTowerJourney(id);
 const towerMarker=()=>woodcutter.stage===4&&towerQuest.stage<21?highTowerProps[towerQuest.stage<3?0:towerQuest.stage<10||towerQuest.stage>=17?1:2]:null;
 const nearTowerQuest=()=>{
  const marker=towerMarker();
  return player.location==='highTowerForest'&&marker&&Math.hypot(player.x-marker.x,player.y-marker.y)<55;
 };
 function updateTowerJourney(stage,cleared=false){
  const next={stage,cleared,version:3};
  try{localStorage.setItem(highTowerJourneyKey(id),JSON.stringify(next))}catch{return false}
  Object.assign(towerQuest,next);
  return true;
 }
 const questOpponentInspectStyle='<style>.stadium-stats-inspect{display:inline-flex;align-items:center;position:relative;margin-left:6px;cursor:help;vertical-align:middle;outline-offset:3px}.stadium-stats-tip{display:none;position:absolute;left:0;top:calc(100% + 6px);min-width:175px;padding:10px 13px;background:#102334;border:1px solid #ac874b;border-radius:7px;color:#eaf1f7;z-index:100;box-shadow:0 8px 22px #0009;line-height:1.7;white-space:nowrap;font-weight:normal}.stadium-stats-tip strong,.stadium-stats-tip span{display:block}.stadium-stats-inspect:hover .stadium-stats-tip,.stadium-stats-inspect:focus .stadium-stats-tip,.stadium-stats-inspect:focus-within .stadium-stats-tip{display:block}</style>';
 const journeyOpponentStyle='<style>.dbi-quest-panel>.world-mob.dbi-journey-opponent{display:flex;align-items:center;gap:8px;padding:4px 8px;box-sizing:border-box;cursor:default}.dbi-journey-opponent>strong{min-width:0;overflow-wrap:anywhere}.dbi-journey-opponent>.stadium-stats-inspect{flex:0 0 32px;min-height:32px;justify-content:center;margin-left:auto;outline-offset:0}.dbi-journey-opponent .stadium-stats-tip{left:auto;right:0;text-align:left}</style>';
 const towerEnemies={
  1:{name:'Żołnierz Srebrny',race:'Ziemianin',level:40,strength:140,speed:100,endurance:300,intelligence:80,ki:0,attack:110,defense:80,hp:700},
  5:{name:'Generał Niebieski',race:'Ziemianin',level:50,strength:200,speed:150,endurance:300,intelligence:100,ki:0,attack:120,defense:100,hp:800},
  19:{name:'Kryminator',race:'Ziemianin',level:100,strength:400,speed:600,endurance:600,intelligence:200,ki:300,attack:250,defense:150,hp:1500}
 };
 const towerClimbs={
  10:['Dotrzyj na szczyt wieży','Wchodzimy','Dotarłem','+50 do wszystkich statystyk','stats-first'],
  13:['Wejdź na szczyt wieży','Co ten kot wymyślił!?','Jestem','+10% do szybkości ataku','attack-speed'],
  15:['Wejdź na szczyt wieży','Tym razem dam mu nauczkę','Teraz dam Ci nauczkę','+50 do wszystkich statystyk','stats-last']
 };
 function towerJourneyScene(){
  const {stage,cleared}=towerQuest;
  const name=escapeText(dbiPlayerName());
  const say=(speaker,line)=>`<p><strong>${speaker}:</strong> ${line}</p>`;
  const item=(file,label)=>`<img class="world-quest-chest" src="assets/items/${file}" alt=""> ${label}`;
  const scenes=[
   ['Czego tu szukasz, mały?','Po prostu podróżuję'],
   ['Zaraz!? Czy ten wisiorek na twojej szyi to smocza kula? To chyba mój szczęśliwy dzień, będziesz musiał mi ją oddać.','Ale irytujący facet'],
   ['To nie koniec! Nie myśl sobie, jak mój generał cię dopadnie, będzie po tobie! Zobaczysz, twoje dni są policzone!!!','Ucieka…?'],
   [say('Generał Niebieski','I po co się rzucałeś, zwierzaku?')+say('Dziecko','Tatuuuuusiuuu!!')+say('Generał Niebieski','Cholerny zwierzak, miał tylko odpowiedzieć na parę pytań. Nienawidzę głupich ludzi.'),'Ej ty!'],
   [say('Generał Niebieski','Kolejny bachor? Czego tu szukasz, dziecko? Zaraz… Co masz pod koszulką? To wygląda jak smocza kula! To chyba mój szczęśliwy dzień.'),'Twój kolega też tak mówił'],
   ['Co zrobiłeś Srebrnemu? Zresztą nieważne, ten młokos tylko plątał mi się wiecznie pod nogami i niczego nie umiał zrobić dobrze. Jak zwykle wszystko muszę zrobić sam.','Kolejny dziwny facet',item('smith-upgrade-2.png','Części zamienne ×2')+'<br>+10% brakujących punktów doświadczenia','general'],
   ['Jakim cudem dziecko może posiadać tyle siły!? Może i mnie pokonałeś, ale to jeszcze nie koniec. Właśnie podjąłeś się wojny z całą Czerwoną Wstęgą, a tobą zajmie się nasz zabójca.','Kolejny ucieka?'],
   [say('Dziecko','Mój tatuś! On krwawi!')+say(name,'Wygląda na to, że zranił go tym dziwnym przedmiotem, który miał.')+say('Dziecko','Proszę, pomóż mojemu tatusiowi!')+say(name,'Ale jak?')+say('Kryminator','A cóż to… Dwa dzieciaki przysporzyły problemów generałom.')+say(name,'Czego chcesz, staruchu?')+say('Kryminator','Staruchu? Za chwilę przekonasz się o sile „starucha”.'),'Dawaj'],
   ['Walka z Kryminatorem była dla ciebie bez szans. Dwoma szybkimi ciosami powalił cię, a jego śmiertelne uderzenie zablokowała smocza kula pod ubraniem. Straciłeś na chwilę przytomność, a on poszedł szukać Generała Niebieskiego.','To bolało!','−20 pkt maksymalnego HP'],
   [say(name,'Kto to był? Prawie mnie zabił.')+say('Dziecko','Jesteś cały?')+say(name,'Można tak powiedzieć, ale obawiam się, że ten staruch tutaj wróci, a ja nie jestem w stanie go pokonać. Jest zbyt silny.')+say('Dziecko','Widzisz tę wielką wieżę? Tatuś mi zawsze mówił, że wojownicy szukający siły podejmują się wejścia na jej szczyt, a na samej górze znajdują wielką moc!'),'Czyli tam muszę się udać'],
   ['Czyli to ta wieża? Czas ruszać na szczyt.'],
   ['Witaj na szczycie mojej wieży, poszukiwaczu siły. Czego ode mnie potrzebujesz?','Szukam siły!'],
   ['W takim razie widzimy się, jak dotrzesz tutaj znowu.','Co?'],
   ['Wielki Mistrz Wieży zrzucił cię z powrotem na ziemię.'],
   ['Dotarłeś, wspaniale, więc widzimy się za chwilę.','Znowu!?'],
   ['Po raz kolejny zostałeś zrzucony.'],
   ['Wielki Mistrz i ty zaczęliście skakać po wieży i tym razem nie udało mu się cię zrzucić.'+say('Mistrz Wieży','A więc dostałeś to, po co przybyłeś.')+say(name,'Co?')+say('Mistrz Wieży','Tym razem nie udało mi się cię zrzucić. Poprzez wchodzenie na szczyt zyskałeś siłę, której szukałeś. Gratulacje. W nagrodę za upór przygotowałem dla ciebie mały upominek.'),'Wielkie dzięki!',item('torebka-fasolek-senzu.png','Torebka Fasolek ×1'),'bag'],
   [say('Dziecko','Wróciłeś!!')+say(name,'Tak i teraz jestem gotowy na tego starucha. Jak twój tata?')+say('Dziecko','Odpoczywa w namiocie, ale jego stan jest ciężki.'),'Weź to','+50 do maksymalnego HP','heal'],
   [say('Ojciec','Niesamowite, czuję, jak całe siły mi wróciły.')+say('Dziecko','Tato!!!')+say('Ojciec','To ty mnie uratowałeś, prawda?'),'Jakoś się udało'],
   [say('Kryminator','Wciąż żyjesz? Masz więcej szczęścia niż rozsądku, ale tym razem upewnię się, że uleci z ciebie całe życie.'),'Nie miałeś szans',item('quest-czerwony-kij.png','Czerwony Kij ×1'),'quest-red-staff'],
   [say('Ojciec','Udało Ci się, jesteś potwornie silny!')+say('Dziecko','Udało się! Udało!')+say('Ojciec','Mam u Ciebie ogromny dług. Jeżeli kiedyś będziesz potrzebować pomocy, nie bój się o nią poprosić.'),'Jasne']
  ];
  const [story,label,reward,grant]=scenes[stage];
  const dialogue=story.startsWith('<p>')?story:'<p>'+story+'</p>';
  const climb=towerClimbs[stage], enemy=towerEnemies[stage];
  const hasBean=(window.DBIWorldInventory?.countQuestItem('zen-bean-red')||0)>0;
  const fightGoals={1:'Pokonaj Żołnierza Srebrnego',5:'Pokonaj Generała Niebieskiego',19:'Pokonaj Kryminatora'};
  const goal=fightGoals[stage]||climb?.[0]||(stage===17?'Oddaj jedną czerwoną fasolkę Zen':stage===18?'Osiągnij 35 poziom':'');
  const blocked=(stage===17&&!hasBean)||(stage===18&&characterLevel()<35);
  const done=stage===17||stage===18?!blocked:cleared;
  const action=enemy&&!cleared?'Walcz':climb?climb[cleared?2:1]:label;
  const rewardText=climb?.[3]||reward;
  const inspect=enemy?`<div class="world-mob dbi-journey-opponent">${questPortrait(enemy.name)}<strong>${enemy.name}</strong><span class="stadium-stats-inspect" tabindex="0" aria-label="Statystyki: ${enemy.name}">🔍<span class="stadium-stats-tip" role="tooltip"><strong>${enemy.name}</strong>${[['Rasa','race'],['Poziom','level'],['Siła','strength'],['Szybkość','speed'],['Wytrzymałość','endurance'],['Inteligencja','intelligence'],['KI','ki'],['Atak','attack'],['Obrona','defense'],['HP','hp']].map(([label,key])=>`<span>${label}: ${enemy[key]}</span>`).join('')}</span></span></div>`:'';
  return {enemy,climb,grant,blocked,html:`<div class="dbi-quest-panel">${enemy?questOpponentInspectStyle+journeyOpponentStyle:''}<header class="dbi-quest-title">Pierwsza Podróż <small>Fabularna</small></header><section class="dbi-quest-story">${dialogue}</section>${inspect}${goal?`<div class="dbi-quest-goal ${done?'done':'pending'}">Wymagania: ${goal} (${done?1:0}/1)</div>`:''}${rewardText?`<div class="dbi-quest-rewards"><strong>Nagroda</strong><div class="dbi-quest-reward-item">${rewardText}</div></div>`:''}<p data-journey-error hidden role="status"></p><div class="dbi-quest-buttons"><button class="world-action" data-journey-next ${blocked?'disabled':''}>${action}</button><button class="world-action secondary" data-journey-close>Zamknij</button></div></div>`};
 }
 function dbiPlayerName(){return document.querySelector('#name')?.textContent||'Wojownik'}
 function renderTowerJourney(){
  const scene=towerJourneyScene();
  side.innerHTML=scene.html;
  const error=()=>{
   const message=side.querySelector('[data-journey-error]');
   if(message){message.hidden=false;message.textContent='Nie udało się zapisać postępu.'}
  };
  const refresh=()=>{lastSide='';updateSide(true)};
  side.querySelector('[data-journey-close]').onclick=()=>{questOpen=false;refresh()};
  side.querySelector('[data-journey-next]').onclick=()=>{
   const {stage,cleared}=towerQuest;
   if(scene.blocked||(stage===18&&characterLevel()<35))return;
   const previousMarker=towerMarker();
   const completeObjective=()=>{
    if(closed||towerQuest.stage!==stage||towerQuest.cleared)return;
    if(scene.climb&&!window.DBIWorldInventory?.grantHighTowerReward?.(scene.climb[4])){error();return}
    if(!updateTowerJourney(stage,true)){error();return}
    refresh();
   };
   if((scene.enemy||scene.climb)&&!cleared){
    if(worldTrainingActive()){worldTrainingNotice();return}
    const combat=window.DBIStoryCombat;
    if(battle?.status==='running'||combat?.isRunning?.())return;
    if(scene.climb){openTowerClimb(completeObjective);return}
    const d=scene.enemy;
    combat?.open({characterId:id,playerName:dbiPlayerName(),playerRace:'Wojownik',opponentName:d.name,
     opponentStats:{...d,maxHp:d.hp,maxKi:d.ki},onFinish:result=>{if(result==='win')completeObjective();else if(!closed)refresh()}});
    return;
   }
   const grant=stage===7?'injury':scene.grant;
   if(grant&&!window.DBIWorldInventory?.grantHighTowerReward?.(grant)){error();return}
   if(!updateTowerJourney(stage+1)){error();return}
   if(previousMarker!==towerMarker())questOpen=false;
   refresh();
  };
 }
 const northernJourney=readNorthQuest('journey',id), northernHunt=readNorthQuest('hunt',id);
 const ballSprite=new Image();ballSprite.src=northBall.image;
 const ballPosition={x:22.5*TILE,y:24.5*TILE};
 const eligibleJourney=()=>towerQuest.stage===21;
 const inventoryHas=item=>(window.DBIWorldInventory?.countQuestItem?.(item)||0)>0;
 const ballVisible=()=>eligibleJourney()&&northernJourney.stage===3&&!inventoryHas(northBall.id);
 const journeySpot=()=>eligibleJourney()&&northernJourney.stage<16?northernScenery[northernJourney.stage<5?1:northernJourney.stage>=8&&northernJourney.stage<=12?3:0]:null;
 const huntSpot=()=>northernHunt.stage<5?northernScenery[2]:null;
 const nearby=spot=>player.location==='mountainLake'&&spot&&Math.hypot(player.x-spot.x,player.y-spot.y)<55;
 const nearNorthBall=()=>ballVisible()&&nearby(ballPosition);
 const nearNorthQuest=()=>nearby(journeySpot())?'journey':nearby(huntSpot())?'hunt':'';
 function saveNorth(kind,state,change){
  const next={...state,...change};
  try{localStorage.setItem(northQuestKey(kind,id),JSON.stringify(next))}catch{return false}
  Object.assign(state,next);return true;
 }
 function countNorthernKill(target){
  if(battle.location!=='mountainLake'||!EXTRA_MAPS.mountainLake.mobNames.some(mob=>mob.name===target.name))return;
  if(eligibleJourney()&&northernJourney.stage===6&&northernJourney.kills<200)saveNorth('journey',northernJourney,{kills:northernJourney.kills+1});
  const goal=northHuntGoals[northernHunt.stage];
  if(goal&&northernHunt.kills<goal)saveNorth('hunt',northernHunt,{kills:northernHunt.kills+1});
 }
 const northernEnemies={
  8:{name:'Strażnik bramy',race:'Ziemianin',level:60,strength:200,speed:200,endurance:200,intelligence:200,ki:0,attack:100,defense:100,hp:600},
  10:{name:'Władca Lasu',race:'Ziemianin',level:50,strength:450,speed:800,endurance:800,intelligence:200,ki:400,attack:300,defense:300,hp:1000},
  11:{name:'Wściekły Władca Lasu',race:'Ziemianin',level:70,strength:500,speed:1000,endurance:1600,intelligence:200,ki:400,attack:300,defense:500,hp:1500}
 };
 function renderNorthQuest(kind){
  const journey=kind==='journey',state=journey?northernJourney:northernHunt,{stage,won}=state;
  const playerName=escapeText(dbiPlayerName().trim());
  const dialogue=(name,line)=>'<p><strong>'+name+':</strong> '+line+'</p>';
  const item=(file,name)=>'<div class="dbi-quest-reward-item"><img class="world-quest-chest" src="assets/items/'+file+'" alt=""><span>'+name+'</span></div>';
  const bag=item('torebka-fasolek-senzu.png','Torebka Fasolek Senzu ×1');
  const ball=item('quest-three-star-ball.png','Smocza kula ×1');
  const stats='+100 do wszystkich statystyk',defense='+100 do obrony';
  const scenes=journey?[
   ['Hej chłopcze! Nie widziałeś może w okolicy małej kolorowej kuli?','Niestety nie'],
   ['Zaraz, przecież masz ją na szyi, pokaż. Chwila, twoja się różni ilością gwiazdek... Ja szukam takiej z 3 gwiazdkami, a twoja ma 4.','A co się stało?'],
   ['To szczęśliwy talizman naszej wioski, ale podczas ostatniej podróży wokół jeziora gdzieś ja zgubiłam, może mógłbyś mi pomóc ją znaleźć?','Pewnie'],
   ['Ona musi gdzieś tu być, chodziłam tylko wokół jeziora.','Mam ją'],
   ['Udało Ci się niesamowite. Wróć ze mną do wioski, a wynagrodzę Cię za twój trud.','Chętnie.'],
   [dialogue('Kobieta','Co się dzieje!? Skąd takie zamieszanie w środku?')+dialogue('Wódz wioski','To z powodu ataków armii czerwonej, przez ich splądrowanie wioski i działania obrona wioski padła i teraz plądrują nasze ziemie.')+dialogue('Kobieta','To straszne'),'Może ja mogę pomóc?'],
   ['Chłopaku, pomocy nigdy zbyt wiele, ale co taki młokos jak ty może pomóc?','Załatwione',bag,'north-village-bag'],
   [dialogue('Wódz Wioski','Niewiarygodne! Sam pogromiłeś tych wszystkich bandytów, jesteś silniejszy niż wyglądasz. Wybacz moje złośliwe komentarze.')+dialogue('Doradca','Wodzu, może on będzie nam w stanie pomóc.')+dialogue('Wódz Wioski','Nie wypada pytać o takie rzeczy.')+dialogue('Doradca','Dużego wyboru nie mamy. Nie stać nas na profesjonalnego łowcę.')+dialogue('Wódz Wioski',playerName+', widzisz po ataku armii na naszą wioskę lokalny były łowca przygód, który osiadł w zamku w lesie porwał moją córkę, czy mógłbyś mi może pomóc ją odzyskać? Soficie Cię wynagrodzę.'),'Udaj się do zamku',ball],
   ['Czego tu szukasz maluszku? Jesteś zaproszony do szefa? Co ja mówię haha, Lepiej stąd spadaj, zanim dam Ci nauczkę','Zejdź mi z drogi'],
   [dialogue('Władca Lasu','Kto zakłóca spokój w moim zamku!! Co to za bachor, gdzie jest strażnik, dlaczego wpuściłeś tutaj jakiegoś dzieciaka!! Pewnie znowu się zahlał... Czego tu szukasz.'),'Przyszedłem po kobietę'],
   ['Przysłał Cię ten staruch? Musi być naprawdę zdesperowany, aby prosić o pomoc dziecko. Niech będzie, sam się tobą zajmę. Jestem byłym łowcą przygód, więc na pewno nie wyjdziesz stąd żywy.','Nie jesteś wcale taki silny',stats,'north-lord-stats'],
   ['Widzę że potrafisz parę sztuczek, ale to nie wystarczy na weterana jak ja!','Oddawaj córkę!',item('quest-corka-wodza.png','Córka wodza')+defense,'north-rescue'],
   ['Dobra już dobra! Jesteś niezwykle silny jak na swój wiek, bierz ją sobie i tak mnie tylko wkurzała','Wracamy do wioski'],
   ['Wróciłeś! Czy udało Ci się pokonać Władcę Lasu i odzyskać moją córkę?','Załatwione',ball,'north-village-ball'],
   ['Jestem Ci dozgonnie wdzięczny za pomoc! Nigdy nie zapomnę twojej pomocy, proszę to nie jest wiele, ale kiedyś pewna dziewczyna w poszukiwaniu naszego skarbu zostawiła jakieś dziwne przedmioty, myślę, że tobie się bardziej przydzadzą','Dziękuje Ci bardzo, to bardzo mi pomoże.',item('smith-scouter.png','Układ Scoutera ×1')+item('smith-ki.png','Skondensowane KI ×1')+item('ruda-kowalstwa.png','Ruda Kowalstwa ×1'),'north-village-materials'],
   ['Już wyruszasz? Szkoda, myślałem że zostaniesz z nami na dłużej, no nic. Udanej podróży pełnej przygód i jeszcze raz dziękuje.','Żegnajcie']
  ]:[
   ['Hej mały, nie zechciałbyś może trochę pomóc w polowaniu?','Chętnie'],
   ['Świetnie w takim razie zabij dla mnie trochę kłusowników','Zrobione',stats,'north-hunt-first'],
   ['Nieźle, to teraz trochę trudniej','Łatwizna',stats,'north-hunt-second'],
   ['No dobra, to teraz damy Ci coś trudniejszego','To też było proste',defense,'north-hunt-third'],
   ['Pewnie teraz czujesz się o wiele silniejszy po takim treningu. Dzięki za pomoc!','Bywaj!']
  ];
  const [story,caption,reward,grant]=scenes[stage];
  const enemy=journey?northernEnemies[stage]:null;
  const kills=journey?(stage===6?200:0):northHuntGoals[stage];
  let goal='',count=0,total=1,blocked=false;
  if(kills){goal='Pokonaj Wojowników gór';count=state.kills;total=kills;blocked=count<total}
  if(enemy){goal='Pokonaj '+enemy.name;count=Number(won)}
  if(journey&&stage===3){goal='<img class="world-quest-chest" width="26" src="'+northBall.image+'" alt=""> Oddaj Smoczą kulę';count=Number(inventoryHas(northBall.id));blocked=!count}
  if(journey&&stage===7)goal='Pokonaj Władcę Lasu';
  if(journey&&stage===13){goal='Pokonaj Władcę Lasu';count=Number(inventoryHas('quest-chief-daughter'));blocked=!count}
  if(journey&&stage===15){goal='Osiągnij poziom';total=50;count=characterLevel();blocked=count<total}
  const inspect=enemy?`<div class="world-mob dbi-journey-opponent">${questPortrait(enemy.name)}<strong>${enemy.name}</strong><span class="stadium-stats-inspect" tabindex="0" aria-label="Statystyki: ${enemy.name}">🔍<span class="stadium-stats-tip" role="tooltip">${[['Rasa','race'],['Poziom','level'],['Siła','strength'],['Szybkość','speed'],['Wytrzymałość','endurance'],['Inteligencja','intelligence'],['KI','ki'],['Atak','attack'],['Obrona','defense'],['HP','hp']].map(([label,key])=>`<span>${label}: ${enemy[key]}</span>`).join('')}</span></span></div>`:'';
  side.innerHTML=`<div class="dbi-quest-panel">${enemy?questOpponentInspectStyle+journeyOpponentStyle:''}<header class="dbi-quest-title">${journey?'Pierwsza Podróż <small>Fabularna</small>':'Pomoc w polowaniu'}</header><section class="dbi-quest-story">${story.startsWith('<p>')?story:'<p>'+story+'</p>'}</section>${inspect}${goal?`<div class="dbi-quest-goal ${count>=total?'done':'pending'}">Wymagania: ${goal} (${count}/${total})</div>`:''}${reward?`<div class="dbi-quest-rewards"><strong>Nagroda</strong><div class="dbi-quest-reward-lines">${reward}</div></div>`:''}<p data-north-error hidden role="status"></p><div class="dbi-quest-buttons"><button type="button" class="world-action" data-north-next ${blocked?'disabled':''}>${enemy&&!won?'Walcz':caption}</button><button type="button" class="world-action secondary" data-north-close>Zamknij</button></div></div>`;
  const refresh=()=>{lastSide='';updateSide(true)};
  const error=()=>{const p=side.querySelector('[data-north-error]');if(p){p.hidden=false;p.textContent='Nie udało się zapisać postępu.'}};
  side.querySelector('[data-north-close]').onclick=()=>{questOpen=false;refresh()};
  side.querySelector('[data-north-next]').onclick=()=>{
   if(blocked||state.stage!==stage||nearNorthQuest()!==kind)return;
   if(enemy&&!won){
    if(worldTrainingActive()){worldTrainingNotice();return}
    const combat=window.DBIStoryCombat;
    if(battle?.status==='running'||combat?.isRunning?.())return;
    combat?.open({characterId:id,playerName:dbiPlayerName(),playerRace:'Wojownik',opponentName:enemy.name,opponentStats:{...enemy,maxHp:enemy.hp,maxKi:enemy.ki},onFinish:result=>{
     if(closed||state.stage!==stage)return;
     if(result==='win'&&!saveNorth(kind,state,{won:true})){error();return}
     refresh();
    }});
    return;
   }
   const previous=journeySpot();
   const rewardId=journey&&stage===3?'north-return-ball':grant;
   if(rewardId&&!window.DBIWorldInventory?.grantHighTowerReward?.(rewardId)){error();return}
   if(!saveNorth(kind,state,{stage:stage+1,kills:0,won:false})){error();return}
   if(journey&&stage===15){
    const destination=EXTRA_MAPS.mountainTown.spawn;
    Object.assign(player,{location:'mountainTown',x:destination.x,y:destination.y,dir:'right'});
    camX=player.x;camY=player.y;keys.clear();save();
   }
   if(journey?previous!==journeySpot():!huntSpot())questOpen=false;
   refresh();
  };
 }
 const dungeonLevel=50, dungeonTitle='Dungeon - Wyzwanie Wysokiej Wieży';
 const dungeonChest={id:'high-tower-chest',name:'Skrzynia Wysokiej Wieży',image:'assets/items/skrzynia-lesnego-wojownika.png',sell:0,sellable:false};
 const hiddenMobDropRate=0.00001;
 const hiddenMobDrops=[
  {id:'reinforcement-plans',name:'Plany wzmocnień',image:'assets/items/plany-wzmocnien.png',sell:0,sellable:false},
  {id:'addition-chip',name:'Czip dodania',image:'assets/items/czip-dodania.png',sell:0,sellable:false}
 ];
 function rollHiddenMobLoot(){
  if(characterLevel()<100)return [];
  return hiddenMobDrops.filter(()=>Math.random()<hiddenMobDropRate).map(item=>({...item}));
 }
 const dungeonMobDropRate=.01;
 function rollDungeonMobLoot(){
  return [
   ['dragon-ball-dust','Pył smoczych kul','pyl-smoczych-kul.png'],
   ['smith-stroj','Włókno Treningowe','smith-stroj.png'],
   ['dragon-radar','Radar Kul','radar-kul.png'],
   ['quest-turtle-stone','Kamień Żółwia','kamien-zolwia.png'],
   ['small-dragon-balls','Małe Smocze Kule','male-smocze-kule.png'],
   ['smith-quality-common','Moduł Zwykły','smith-quality-common.png'],
   [window.DBIWorldInventory?.smithOreId?.()||'ruda-kowalstwa','Ruda Kowalstwa','ruda-kowalstwa.png'],
   ['smith-ki','Skondensowane KI','smith-ki.png']
  ].filter(()=>dropRoll(dungeonMobDropRate)).map(([id,name,image])=>({id,name,image:'assets/items/'+image,sell:0,sellable:false}));
 }
 const dungeonPendingKey='dboidle_high_tower_pending_v1_'+String(id||'test');
 const dungeonDayKey='dboidle_high_tower_entry_day_v1_'+String(id||'test');
 function dungeonEntries(){
  const raw=localStorage.getItem(dungeonDayKey),day=bossDay(Date.now());
  let used=raw===day?1:0;
  if(raw?.startsWith('{')){
   try{
    const saved=JSON.parse(raw);
    if(saved?.day===day&&Number.isSafeInteger(saved.used)&&saved.used>=0)used=saved.used;
   }catch{}
  }
  return {day,used,limit:dungeonLimit(String(id||'test'))};
 }
 const dungeonHasEntry=()=>{const {used,limit}=dungeonEntries();return used<limit};
 function dungeonEntryLabel(){
  const {used,limit}=dungeonEntries();
  const left=Math.max(0,limit-used);
  return 'Wejścia dzisiaj '+left+'/'+limit+(left===0&&limit>0?' · odnowienie o północy':'');
 }
 function reserveDungeonEntry(){
  const {day,used,limit}=dungeonEntries();
  if(used>=limit)return false;
  try{localStorage.setItem(dungeonDayKey,JSON.stringify({day,used:used+1}));return true}
  catch{return false}
 }
 const dungeonPending=()=>localStorage.getItem(dungeonPendingKey)==='1';
 function claimDungeonChest(){
  if(!dungeonPending())return;
  try{
   if(window.DBIWorldInventory?.grant?.([dungeonChest.id])!==1)return 'Brak miejsca na Skrzynię Wysokiej Wieży. Zwolnij miejsce i odbierz ją przy wejściu.';
   localStorage.removeItem(dungeonPendingKey);
   return 'Odebrano Skrzynię Wysokiej Wieży.';
  }catch{return 'Nie udało się zapisać odbioru skrzyni.'}
 }
 function canEnterDungeon(){
  return nearDungeon()&&characterLevel()>=dungeonLevel&&dungeonHasEntry()&&!dungeonPending()&&!closeDungeon&&!worldTrainingActive()&&!battle&&overlay.hidden;
 }
 let closeDungeon;
 function openDungeon(){
  if(!canEnterDungeon())return;
  const dialog=document.createElement('dialog');
  dialog.style.cssText='width:min(900px,96vw);max-height:95vh;box-sizing:border-box;background:#102536;color:#f4e4ba;border:2px solid #c89c47;border-radius:10px;padding:12px';
  dialog.innerHTML='<button type="button" class="world-action secondary" data-dungeon-close autofocus>Wróć na mapę</button><iframe title="Dungeon - Wyzwanie Wysokiej Wieży" src="dungeons/wieza-pieciu-straznikow.html" style="display:block;width:100%;height:min(720px,78vh);border:0;margin-top:8px"></iframe>';
  const iframe=dialog.querySelector('iframe');
  const previousFocus=document.activeElement;
  const ch=hero();
  const stats={hp:ch.maxHp,ki:ch.maxKi,attack:ch.mobAttack??ch.attack,defense:ch.defense,
   technique:window.DBITechniqueCombat?.power?.(50,'pvm')??(50+(Number(ch.techniqueAttackPvm)||0)+(Number(ch.techniqueKi)||0)*.01),
   speed:ch.speed,attackSpeed:ch.attackSpeedPct};
  let completed=false;
  const rewardedGuards=new Set();
  const onMessage=e=>{
   if(e.source!==iframe.contentWindow)return;
   if(e.data==='dboidle:close-dungeon')closeDungeon?.();
   if(e.data?.type==='dboidle:dungeon-guard-defeated'&&!completed){
    const {floor,slot}=e.data;
    if(!Number.isInteger(floor)||floor<0||floor>=5||!Number.isInteger(slot)||slot<0||slot>=floor+3)return;
    const guard=String(floor)+':'+slot;
    if(rewardedGuards.has(guard))return;
    rewardedGuards.add(guard);
    const loot=[...rollDungeonMobLoot(),...rollHiddenMobLoot()];
    if(loot.length){
     const granted=window.DBIWorldInventory?.grant?.(loot.map(item=>item.id))===loot.length;
     const message=granted?'Zdobyty łup: '+loot.map(item=>item.name).join(', '):'Nie udało się zapisać łupu.';
     iframe.contentWindow.postMessage({type:'dboidle:dungeon-loot',message},'*');
    }
   }
   if(e.data==='dboidle:dungeon-won'&&!completed){
    try{
     localStorage.setItem(dungeonPendingKey,'1');
     completed=true;
     const message=claimDungeonChest();
     iframe.contentWindow.postMessage({type:'dboidle:dungeon-result',message},'*');
    }catch{
     iframe.contentWindow.postMessage({type:'dboidle:dungeon-result',message:'Nie udało się zapisać nagrody.'},'*');
    }
   }
  };
  closeDungeon=()=>{
   window.removeEventListener('message',onMessage);
   dialog.remove();
   closeDungeon=null;
   keys.clear();
   if(!closed)updateSide(true);
   if(previousFocus?.isConnected&&!closed)previousFocus.focus({preventScroll:true});
  };
  keys.clear();
  document.body.appendChild(dialog);
  dialog.querySelector('[data-dungeon-close]').onclick=closeDungeon;
  dialog.addEventListener('cancel',e=>{e.preventDefault();closeDungeon?.()});
  window.addEventListener('message',onMessage);
  iframe.addEventListener('load',()=>{if(closeDungeon&&dialog.open){iframe.contentWindow.postMessage({type:'dboidle:dungeon-stats',stats},'*');iframe.focus()}},{once:true});
  dialog.showModal();
  if(!reserveDungeonEntry())closeDungeon();
 }
 let closeTowerClimb;
 function openTowerClimb(onSummit){
  if(closeTowerClimb)return;
  const dialog=document.createElement('dialog');
  dialog.style.cssText='width:min(440px,96vw);max-height:95vh;overflow:auto;box-sizing:border-box;background:#102536;color:#f4e4ba;border:2px solid #c89c47;border-radius:10px;padding:14px;text-align:center';
  dialog.innerHTML='<h2>Wspinaczka na wieżę</h2><p>Przytrzymaj ↑ lub W, żeby się wspinać. Użyj ← i → lub A i D, żeby omijać ptaki.</p><canvas width="320" height="360" aria-label="Wieża i ptaki" style="max-width:100%;max-height:48vh;background:#92d4ea;border-radius:6px"></canvas><p data-climb-status aria-live="polite">Wysokość: 0%</p><div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap"><button class="world-action" style="touch-action:none" data-climb-key="left">← Lewo</button><button class="world-action" style="touch-action:none" data-climb-key="up">↑ Wspinaj się</button><button class="world-action" style="touch-action:none" data-climb-key="right">Prawo →</button></div><button class="world-action secondary" data-climb-close>Wróć na mapę</button>';
  document.body.appendChild(dialog);
  const canvas=dialog.querySelector('canvas'),ctx=canvas.getContext('2d'),status=dialog.querySelector('[data-climb-status]');
  const summit=1400, held=new Set(), pointers=new Map();
  const keyMap={ArrowUp:'up',w:'up',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'};
  const birds=Array.from({length:7},(_,i)=>({height:170+i*175,phase:i*.43,speed:95+i*12,direction:i%2?1:-1}));
  let x=160,height=0,time=0,last=0,frame,recovery=0,lastStatus='';
  const down=e=>{const key=keyMap[e.key]||keyMap[e.key.toLowerCase()];if(key){e.preventDefault();e.stopPropagation();held.add(key)}};
  const up=e=>{const key=keyMap[e.key]||keyMap[e.key.toLowerCase()];if(key){e.preventDefault();e.stopPropagation();held.delete(key)}};
  const clear=()=>{held.clear();pointers.clear()};
  closeTowerClimb=()=>{
   cancelAnimationFrame(frame);window.removeEventListener('blur',clear);dialog.remove();
   closeTowerClimb=null;keys.clear();
  };
  dialog.addEventListener('keydown',down);
  dialog.addEventListener('keyup',up);
  dialog.addEventListener('cancel',e=>{e.preventDefault();closeTowerClimb()});
  dialog.querySelector('[data-climb-close]').onclick=closeTowerClimb;
  for(const button of dialog.querySelectorAll('[data-climb-key]')){
   button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);pointers.set(e.pointerId,button.dataset.climbKey)};
   button.onpointerup=button.onpointercancel=button.onlostpointercapture=e=>pointers.delete(e.pointerId);
  }
  const pressed=key=>held.has(key)||[...pointers.values()].includes(key);
  window.addEventListener('blur',clear);
  keys.clear();dialog.showModal();
  function climbFrame(now){
   const dt=last?Math.min((now-last)/1000,.04):0;
   last=now;time+=dt;
   if(time>=recovery){
    x=clamp(x+(Number(pressed('right'))-Number(pressed('left')))*130*dt,102,218);
    if(pressed('up'))height=Math.min(summit,height+105*dt);
   }
   const positions=birds.map(bird=>{
    const offset=((time*bird.speed+bird.phase*320)%392)-36;
    return {...bird,x:bird.direction===1?offset:320-offset};
   });
   if(positions.some(bird=>Math.abs(bird.x-x)<20&&Math.abs(bird.height-height)<16)){
    height=0;x=160;recovery=time+.45;clear();
   }
   if(height>=summit){closeTowerClimb();onSummit();return}
   const camera=clamp(height-125,0,summit-280), y=h=>canvas.height-32-(h-camera);
   ctx.fillStyle='#93cde5';ctx.fillRect(0,0,320,360);
   ctx.fillStyle='#b19c76';ctx.fillRect(84,y(summit),152,summit);
   ctx.fillStyle='#755a42';ctx.fillRect(90,y(summit),6,summit);ctx.fillRect(224,y(summit),6,summit);
   for(let h=0;h<=summit;h+=24){ctx.fillStyle=h%48?'#9a805c':'#856c50';ctx.fillRect(96,y(h),128,3)}
   ctx.fillStyle='#476635';ctx.fillRect(0,y(0)+9,320,40);
   ctx.fillStyle='#f6d280';ctx.fillRect(66,y(summit),188,10);
   for(const bird of positions){
    const by=y(bird.height), wing=Math.sin(time*16)*6;
    ctx.strokeStyle='#293240';ctx.lineWidth=3;ctx.beginPath();
    ctx.moveTo(bird.x-12,by+wing);ctx.lineTo(bird.x,by);ctx.lineTo(bird.x+12,by+wing);ctx.stroke();
    ctx.fillStyle='#293240';ctx.fillRect(bird.x-4,by-2,8,5);
   }
   character(ctx,x,y(height)+15,'up',pressed('up'),now);
   const message=time<recovery?'Ptak cię strącił. Wracasz na dół.':'Wysokość: '+Math.floor(height/summit*100)+'%';
   if(message!==lastStatus){status.textContent=message;lastStatus=message}
   frame=requestAnimationFrame(climbFrame);
  }
  frame=requestAnimationFrame(climbFrame);
 }

 const soldierStats={name:'Żołnierz Czerwonej Wstęgi',race:'Ziemianin',level:30,strength:100,speed:75,endurance:150,intelligence:50,ki:0,baseAttack:50,baseDefense:15,attack:100,defense:30,hp:500};
 function woodcutterMarkup(){
  const title='<h2>📜 Pierwsza podróż <small style="font-size:.65em;font-weight:400;opacity:.8">fabularna</small></h2>';
  const close='<button class="world-action secondary" id="woodcutterClose">Zamknij</button>';
  const action=(label,enabled=true)=>'<button class="world-action" id="woodcutterNext" '+(enabled?'':'disabled')+'>'+label+'</button>';
  if(woodcutter.stage===0)return title+'<p>Ej młody, pomóż mi! Szybko</p>'+action('Kogoś Atakują!')+close;
  if(woodcutter.stage===1)return title+'<p>Cholera pomóż mi, ten cholerny żołnierz za chwile mnie zabije!</p><div class="world-woodcutter-enemy"><div class="world-mob" style="display:flex;align-items:center;gap:8px;padding-left:8px;padding-right:8px"><strong>Żołnierz Czerwonej Wstęgi</strong><span class="world-mob-stats-wrap" style="margin-left:auto"><button type="button" class="world-mob-stats-trigger" id="woodcutterStats" aria-label="Statystyki żołnierza">🔍</button></span></div></div><div class="world-quest-progress '+(woodcutter.won?'done':'pending')+'"><strong>Wymogi:</strong> Pokonaj Żołnierza Czerwonej Wstęgi ('+(woodcutter.won?'1':'0')+'/1)</div>'+action(woodcutter.won?'Spadaj stąd!':'Walcz')+close;
  if(woodcutter.stage===2)return title+'<p>Cholera ta cholerna Armia! Próbuje podbić cały świat i całkiem dobrze im to idzie, muszę Ci podziękować za pomoc, może to niewiele ale powinno Ci to trochę pomóc w życiu.</p><p><strong>Nagroda:</strong> Smocze monety ×5</p>'+action('Jest ich więcej?')+close;
  if(woodcutter.stage===3)return title+'<p>Tak, widziałem jak szli w kierunku wysokiej wieży, to na północ stąd</p>'+action('Dzięki')+close;
  return title+'<p>Dziękuję za pomoc!</p>'+close;
 }
 function woodcutterNext(){
  if(woodcutter.stage===0){woodcutter.stage=1;saveWoodcutter()}
  else if(woodcutter.stage===1){if(!woodcutter.won){beginSoldierBattle();return}woodcutter.stage=2;saveWoodcutter()}
  else if(woodcutter.stage===2){
   if(!woodcutter.rewarded){
    try{const key='dboidle_dragon_wallet_v1_'+String(id||'test');const wallet=JSON.parse(localStorage.getItem(key)||'{}')||{};wallet.coins=Math.max(0,Number(wallet.coins)||0)+5;localStorage.setItem(key,JSON.stringify(wallet));woodcutter.rewarded=true;saveWoodcutter();window.DBIRefreshWallet?.()}catch{side.insertAdjacentHTML('beforeend','<p class="world-quest-error">Nie udało się przyznać Smoczych Monet.</p>');return}
   }
   woodcutter.stage=3;saveWoodcutter();
  }else if(woodcutter.stage===3){woodcutter.stage=4;saveWoodcutter();questOpen=false;window.DBIDaily?.record('quests',1)}
  lastSide='';updateSide(true);
 }
 // Rybak — wieloetapowa opowieść, zapisywana osobno dla każdej postaci.
 const fatherKey='dboidle_central_lost_father_v1_'+String(id||'test');
 let father={stage:0,rewarded:false};
 try{const saved=JSON.parse(localStorage.getItem(fatherKey)||'null');if(saved&&Number.isInteger(saved.stage))father={stage:clamp(saved.stage,0,3),rewarded:!!saved.rewarded}}catch{}
 const saveFather=()=>{try{localStorage.setItem(fatherKey,JSON.stringify(father))}catch{}};
 function fatherMarkup(){
  const title='<h2>📜 Zaginiony Ojciec</h2>';
  const close='<button class="world-action secondary" id="fatherClose">Zamknij</button>';
  const action=label=>'<button class="world-action" id="fatherNext">'+label+'</button>';
  const has=(window.DBIWorldInventory?.countQuestItem?.('pierscien-ojca')||0)>0;
  if(father.stage===0)return title+'<p>Hej ty tam, nie widziałeś może starszego mężczyzny z siwym zarostem i włosami?</p>'+action('Nikogo nie widziałem')+close;
  if(father.stage===1)return title+'<p>Boże, mój ojciec kilka dni temu wyszedł na polowanie dzików w lesie i nadal nie wrócił do domu, nie mogę przestać myśleć, że coś mu się stało. Jeżeli zauważysz kogoś pasującego do mojego rysopisu, proszę powiedz mu, że go szukam.</p><div class="world-quest-progress '+(has?'done':'pending')+'"><strong>Wymagania:</strong> <img src="assets/items/pierscien-ojca.png" alt="" style="width:24px;height:24px;object-fit:contain;vertical-align:middle;margin:0 5px 0 8px"> Oddaj Pierścień Ojca ('+(has?'1':'0')+'/1)</div>'+action(has?'Niestety, twój ojciec...':'Jasne')+close;
  if(father.stage===2)return title+'<p>O nie!!!! Ci przeklęci bandyci, co on im zrobił. Nie mogę uwierzyć, że odzyskałeś chociaż jego pierścień ślubny... Dziękuje Ci, mam nadzieję, że to wynagrodzi Ci twój trud</p><p><strong>Nagroda:</strong> Pył smoczych kul ×5</p>'+action('Przykro mi.')+close;
  return title+'<p>Zadanie ukończone.</p>'+close;
 }
 function fatherNext(){
  if(father.stage===0){father.stage=1;saveFather()}
  else if(father.stage===1){
   if((window.DBIWorldInventory?.countQuestItem?.('pierscien-ojca')||0)<1){questOpen=false;lastSide='';updateSide(true);return}
   if(!window.DBIWorldInventory?.consumeQuestItem?.('pierscien-ojca',1)){side.insertAdjacentHTML('beforeend','<p class="world-quest-error">Nie udało się oddać pierścienia.</p>');return}
   father.stage=2;saveFather();
  }else if(father.stage===2){
   if(!father.rewarded){
    if(window.DBIWorldInventory?.grant?.(Array(5).fill('dragon-ball-dust'))!==5){side.insertAdjacentHTML('beforeend','<p class="world-quest-error">Brak miejsca w ekwipunku na nagrodę.</p>');return}
    father.rewarded=true;saveFather();
   }
   father.stage=3;saveFather();questOpen=false;window.DBIDaily?.record('quests',1);
  }
  lastSide='';updateSide(true);
 }
 const fishermanKey='dboidle_central_fisherman_v1_'+String(id||'test');
 let fisherman={stage:0,kills:0,bossKills:0};
 try{const old=JSON.parse(localStorage.getItem(fishermanKey)||'null');if(old&&Number.isInteger(old.stage))fisherman={stage:clamp(old.stage,0,4),kills:clamp(Math.floor(Number(old.kills)||0),0,100),bossKills:clamp(Math.floor(Number(old.bossKills)||0),0,1)}}catch{}
 const saveFisherman=()=>{try{localStorage.setItem(fishermanKey,JSON.stringify(fisherman))}catch{}};
 function fishermanMarkup(){
  const title='<h2>📜 Zagubiona pamiątka rodzinna</h2>';
  const close='<button class="world-action secondary" id="fishermanClose">Zamknij</button>';
  const action=(label,enabled=true)=>'<button class="world-action" id="fishermanNext" '+(enabled?'':'disabled')+'>'+label+'</button>';
  const goal=(label,done)=>'<div class="world-quest-progress '+(done?'done':'pending')+'"><strong>Wymagania:</strong> '+label+'</div>';
  const reward=(name,img)=>'<p><strong>Nagroda:</strong> <img class="world-quest-chest" src="'+img+'" alt="" style="width:35px;height:35px;object-fit:contain"> '+name+' ×1</p>';
  if(fisherman.stage===0)return title+'<p>Heeeeeeej!! Młodzieńcze, podejdź tutaj na chwilę!</p>'+action('O co chodzi?')+close;
  if(fisherman.stage===1)return title+'<p>Słuchaj, nie zechciałbyś mi może pomóc? Potrzebuje kogoś kto mógłby rozwiązać problem z tutejszymi kłusownikami. Przez ich leśne hałasy płoszą mi ryby, jeżeli przywołasz ich dla mnie do porządku, soficie Cię wynagrodzę.</p>'+goal('Pokonaj Leśny wojownik ('+fisherman.kills+'/100)',fisherman.kills>=100)+reward('Białe Rękawiczki','assets/items/biale-rekawiczki.png')+action('Załatwione!',fisherman.kills>=100)+close;
  if(fisherman.stage===2)return title+'<p>Jesteś naprawdę silny! Te głupie pół mózgi męczą każde żywe stworzenie w tym lesie od lat, a ty załatwiłeś ich całkiem sprawnie. Będę miał do Ciebie jeszcze jedną prośbę jeśli jesteś chętny. Jeżeli pokonasz ich przywódcę, może całkowicie wyniosą się z tego Lasu.</p>'+goal('Pokonaj Leśny Wojownik (Boss) ('+fisherman.bossKills+'/1)',fisherman.bossKills>=1)+reward('Skrzynia Leśnego Wojownika','assets/items/skrzynia-lesnego-wojownika.png')+action('Nie był taki silny.',fisherman.bossKills>=1)+close;
  if(fisherman.stage===3){const has=window.DBIWorldInventory?.countQuestItem?.('stara-pamiatka-rodzinna')||0;return title+'<p>Niesamowite!! Jesteś bohaterem tego lasu!! Wyglądasz na kogoś kto podróżuje po świecie. Wiem, że sporo od Ciebie chciałem, ale jeśli miałbyś jeszcze chęci, aby wysłuchać mojej ostatniej prośby to może w przyszłości nie będziesz żałował, że mnie nie wysłuchałeś.</p><p>Lata temu pewien łotrzyk ukradł mi bezcenną pamiątkę rodzinną. Jeśli podczas swoich podróży wpadła by jakimś cudem w twoje ręce to wynagrodzę Cię za jej zwrot.</p>'+goal('Oddaj Stara Pamiątka rodzinna ('+(has>=1?1:0)+'/1)',has>=1)+reward('Białe kolczyki','assets/items/biale-kolczyki.png')+action('To chyba należy do Ciebie.',has>=1)+close;}
  return title+'<p>To ty!! Bardzo się zmieniłeś od naszego ostatniego spotkania i przybrałeś trochę mięśni, ale nie jesteś tutaj po wspomnienia. Jeszcze raz dziękuje za zwrot tej bezcennej pamiątki.</p>'+action('Żegnaj')+close;
 }
 function fishermanNext(){
  if(fisherman.stage===0){fisherman.stage=1;saveFisherman();}
  else if(fisherman.stage===1&&fisherman.kills>=100){
   if(window.DBIWorldInventory?.grant?.(['white-gloves'])!==1)return fishermanError('Nie udało się przyznać Białych Rękawiczek. Przedmiot musi być dostępny w ekwipunku.');
   fisherman.stage=2;saveFisherman();
  }else if(fisherman.stage===2&&fisherman.bossKills>=1){
   if(window.DBIWorldInventory?.grant?.(['skrzynia-lesnego-wojownika'])!==1)return fishermanError('Nie udało się przyznać skrzyni.');
   fisherman.stage=3;saveFisherman();
  }else if(fisherman.stage===3&&window.DBIWorldInventory?.countQuestItem?.('stara-pamiatka-rodzinna')>=1){
   // Oddanie przedmiotu musi być atomowe; nie usuwamy go ręcznie z localStorage.
   if(window.DBIWorldInventory?.exchangeQuestItem?.('stara-pamiatka-rodzinna','biale-kolczyki')!==true)return fishermanError('Oddanie pamiątki wymaga podłączenia obsługi wymiany przedmiotów.');
   fisherman.stage=4;saveFisherman();
  }else if(fisherman.stage===4){questOpen=false;}
  lastSide='';updateSide(true);
 }
 function fishermanError(message){side.insertAdjacentHTML('beforeend','<p class="world-quest-error">'+message+'</p>')}
 const questKey='dboidle_quest_laguna_v1_'+String(id||'test');
 let quest={state:'available',kills:0};
 try{const stored=JSON.parse(localStorage.getItem(questKey)||'null');if(stored&&['available','accepted','completed'].includes(stored.state))quest={state:stored.state,kills:Math.min(10,Math.max(0,Number(stored.kills)||0))};}catch{}
 const saveQuest=()=>{try{localStorage.setItem(questKey,JSON.stringify(quest))}catch{}};
 const quest2Key='dboidle_quest_laguna_belt_v1_'+String(id||'test');
 let quest2={state:'available'};
 try{const old=JSON.parse(localStorage.getItem(quest2Key)||'null');if(['available','accepted','dialog','completed'].includes(old?.state))quest2=old;}catch{}
 const saveQuest2=()=>{try{localStorage.setItem(quest2Key,JSON.stringify(quest2))}catch{}};
 const krillinQuestKey='dboidle_quest_island_krillin_v1_'+String(id||'test');
 let krillinQuest={state:'available'};
 try{const old=JSON.parse(localStorage.getItem(krillinQuestKey)||'null');if(['available','won','completed'].includes(old?.state))krillinQuest=old;}catch{}
 const saveKrillinQuest=()=>{try{localStorage.setItem(krillinQuestKey,JSON.stringify(krillinQuest))}catch{}};
 const krillinQuestCompleted=()=>krillinQuest.state==='completed';
 const krillinStats={level:3,race:'Człowiek',strength:4,speed:3,endurance:8,intelligence:2,ki:5,attack:4,defense:Math.round(8*.1),maxHp:20,maxKi:5,power:4+3+8+2+5};
 function krillinQuestMarkup(){
  if(krillinQuest.state==='completed')return '<h2>📜 Krillin</h2><p>Dziękuję za wspólny trening! Jeszcze kiedyś się spotkamy.</p><button class="world-action secondary" id="krillinClose">Zamknij</button>';
  if(krillinQuest.state==='won')return `<h2>📜 Krillin</h2><p>Wow, jesteś silniejszy niż myślałem.<br>Wybacz mi moje zachowanie, nie wiedziałem że przysłał Cię mistrz<br>Przyjmij to w ramach rekompensaty</p><p><strong>Nagroda:</strong> <img class="world-quest-chest" src="assets/items/biala-opaska.png" alt="Biała Opaska"> Biała Opaska ×1</p><div class="world-side-actions"><button class="world-action" id="krillinClaim">Zakończ</button></div>`;
  return `<h2>📜 Krillin</h2><p>Dlaczego przerywasz mi w treningu dzieciaku!<br>Wiesz kim jestem? Najzdolniejszym uczniem żółwiego pustelnika!<br>Lepiej się przygotuj, bo zamierzam dać Ci małą nauczkę<br>Za twoje nietaktowne zachowania</p><div class="world-quest-section"><strong>Przeciwnik:</strong> <strong style="color:#f0646c">Krillin</strong> <span class="krillin-inspect" tabindex="0" aria-label="Podgląd statystyk Krillina" style="display:inline-block;position:relative;cursor:help;color:#e9c36b">🔍<span class="krillin-inspect-pop" role="tooltip" style="display:none;position:absolute;top:calc(100% + 8px);left:0;min-width:205px;padding:12px;border:1px solid #ac874b;border-radius:8px;background:#102334;color:#eaf1f7;z-index:10;box-shadow:0 10px 30px #000a;line-height:1.65">Krillin<br>Poziom ${krillinStats.level}<br>Rasa: ${krillinStats.race}<br>Siła: ${krillinStats.strength}<br>Szybkość: ${krillinStats.speed}<br>Wytrzymałość: ${krillinStats.endurance}<br>Inteligencja: ${krillinStats.intelligence}<br>KI: ${krillinStats.ki}<br>Moc: ${krillinStats.power}<br>Obrona: ${krillinStats.defense}<br>HP: ${krillinStats.maxHp}</span>
</span></div><div class="world-side-actions"><button class="world-action" id="krillinFight">⚔ Walcz</button><button class="world-action secondary" id="krillinClose">Zamknij</button></div>`;
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
   return '<h2>📜 Samotna podróż</h2><p>Czas wyruszyć w samotną podróż i zwiększyć swoje możliwości, aby przy następnym spotkaniu pokazać wszystkim kto jest najsilniejszym wojownikiem.</p><p data-stadium-won="'+(hasBelt?'true':'false')+'"><strong>Wymagania:</strong> Oddaj Pas Chwały ('+(hasBelt?'1':'0')+'/1)</p>'+button('Ruszam.',!hasBelt)+close;
  }
  if(stage===0)return '<h2>📜 Genialny Żółw — turniej</h2>'+say('Genialny Żółw','Jesteśmy na miejscu, teraz już wszystko zależy od was, ja wam bardziej pomóc nie mogę, nauczyłem was wszystkiego co potrafiłem. Na koniec mam dla was nagrodę i honor reprezentowania mojej szkoły. O to kimono szkoły żółwia, noście je dumnie. Powodzenia!!')+'<p><strong>Nagroda:</strong> Strój treningowy szkoły żółwia +0 ×1</p>'+button('Dziękujemy!')+close;
  if(stage>=1&&stage<=3){
   const f=stadiumFighters[stage-1],won=!!stadiumQuest.wins[f.name];
   const intro=stage===1?'Wraz z Krillinem udaliście się do szatni, przebraliście i udaliście się na eliminację. Eliminacje były dziecinnie proste po treningu u starego pustelnika, więc nie odczuliście zbytnio zagrożenia, a finałową walkę widzieliście między sobą. Czas na twoją pierwszą ćwierćfinałową walkę, twoim przeciwnikiem będzie olbrzymi smok Giran.':stage===2?'Teraz czas na półfinał, zmierzysz się w nim z wojownikiem o ciemnej karnacji niezbyt lubianej przez ogół społeczeństwa, a twoim przeciwnikiem będzie Nam!':`Czas na wielki finał turnieju, zmierzy się w nim ${playerName} i Jackie Chun, który od początku tego turnieju zaskakiwał swoją siłą!`;
   const stats=`<span class="stadium-stats-tip" role="tooltip"><strong>${escapeText(f.name)}</strong><span>Siła: ${f.strength}</span><span>Szybkość: ${f.speed}</span><span>Wytrzymałość: ${f.endurance}</span><span>Inteligencja: ${f.intelligence}</span><span>KI: ${f.ki}</span></span>`;
   const inspect=`<span class="stadium-stats-inspect" tabindex="0" aria-label="Statystyki ${escapeText(f.name)}" title="Najedź, aby zobaczyć statystyki">🔍${stats}</span>`;
   const inspectStyle=questOpponentInspectStyle;
   return inspectStyle+'<h2>🏆 Światowy turniej sztuk walk</h2><p>'+intro+'</p><p data-stadium-won="'+(won?'true':'false')+'"><strong>Wymagania:</strong> Pokonaj '+f.name+inspect+'</p>'+(stage===3?'<p><strong>Nagroda:</strong> Pas Chwały +0 ×1</p>':'')+button(won?['Udało się!','Było blisko','UDAŁO MI SIĘ!!!'][stage-1]:'⚔ Walcz')+close;
  }
  if(stage===4)return '<h2>📜 Po turnieju</h2>'+say('Genialny Żółw','Wspaniale Ci poszło, to były świetne pojedynki, wiedziałem, że masz talent i będziesz silnym wojownikiem, co teraz zamierzasz?')+say(playerName,'Było tu dużo silnych wojowników, myślę, że daleka droga przede mną, aby wygrywać w turnieju. Wyruszę na samotną podróż i spotkamy się tutaj za trzy lata wraz z następnym światowym turniejem sztuk walk. Do zobaczenia!')+button('Czas wyruszać.')+close;
  return '<h2>🏆 Turniej ukończony</h2><p>Udaj się do wrót stadionu, aby rozpocząć samotną podróż.</p>'+close;
 }
 function stadiumClaim(atGate){
  const st=stadiumQuest.stage;
  if(atGate){if(st!==5||!(window.DBIWorldInventory?.consumeQuestItem?.('quest-glory-belt',1)))return;stadiumQuest.stage=6;const dest=EXTRA_MAPS.centralForest.spawn;player.location='centralForest';player.x=dest.x;player.y=dest.y;player.dir='up';camX=player.x;camY=player.y;questOpen=false;keys.clear();}
  else if(st===0){if(window.DBIWorldInventory?.grant?.(['stroj-001'])!==1)return;stadiumQuest.stage=1;}
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
 if(mountainRoshi.stage>=4&&player.location==='mountain'&&saved?.gmMountainArrival!==true){const dest=EXTRA_MAPS.stadium.spawn;player.location='stadium';player.x=dest.x;player.y=dest.y;player.dir='down';camX=player.x;camY=player.y;save();}
 function mountainRoshiMarkup(){
  const close='<button class="world-action secondary" id="mountainClose">Zamknij</button>';
  const title='<h2>📜 Genialny Żółw — Góra Króla Lasu</h2>';
  const say=(speaker,words)=>`<p><strong>${speaker}:</strong> ${words}</p>`;
  const button=(caption,ready=true)=>`<button class="world-action" id="mountainClaim" ${ready?'':'disabled'}>${caption}</button>`;
  const lvl=characterLevel();
  switch(mountainRoshi.stage){
   case 0:return title+say('Genialny Żółw','Jesteśmy na miejscu, to góra króla i stoi cała w płomieniach. To straszne')+say('Król Gór','O wielki Mistrzu, przybyłeś! Jaki jestem uradowany, a któż to Ci towarzyszy.')+say('Genialny Żółw','To moi uczniowie, przygotowuje ich do najbliższego turnieju sztuk walk, ale to chyba teraz najmniejsza istotna sprawa.')+say('Król Gór','Tak! Mistrzu, proszę, czy możesz ugasić ten wielki ogień?!')+say('Genialny Żółw','Nie obiecuje, ale zrobię co w mojej mocy! Odsuńcie się.')+`<p><strong>Wymagania:</strong> Osiągnij poziom 20 (${lvl}/20)</p>`+button('Tak jest!',lvl>=20)+close;
   case 1:return title+say('Genialny Żółw','Kaaa-Meeee-Haaa-Meee- HAAAAA!')+'<p><strong>Nagroda:</strong> +50 do statystyki KI</p>'+button('Wow!!')+close;
   case 2:return title+say('Genialny Żółw','I po problemie, to wszystko było całkiem wymęczający spektatklem')+say('Król Gór','O wielki Mistrzu! Jestem Ci dozgonnie wdzięczny, nie wiem co bym zrobił gdyby moja Góra spłonęła.')+say('Genialny Żółw','To żaden problem')+say(escapeText(window.DBIWorldInventory?.character?.()?.name||'Wojownik'),'Co to było!? Nauczysz mnie tego mistrzu?')+say('Genialny Żółw','To nie takie proste, ale jeżeli bardzo chcesz, to mogę Ci pokazać podstawy.')+'<p><strong>Nagroda:</strong> <img class="world-quest-chest" src="assets/techniques/fala_uderzeniowa_1.png" alt="Fala Uderzeniowa" style="width:35px;height:35px;object-fit:contain;flex:none"><span>Technika Fala Uderzeniowa</span></p>'+button('Z chęcią zobaczę podstawy')+close;
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
 // Fabularny Wędrowiec — osobny stan zadania przypisany do postaci.
 const wandererKey='dboidle_mountain_wanderer_v1_'+String(id||'test');
 let wandererQuest={state:'available',kills:0};
 try{const data=JSON.parse(localStorage.getItem(wandererKey)||'null');if(data&&['available','accepted','completed','bean-available','bean-accepted','bean-completed'].includes(data.state))wandererQuest={state:data.state,kills:Math.max(0,Math.min(50,Math.floor(Number(data.kills)||0)))}}catch{}
 const saveWanderer=()=>localStorage.setItem(wandererKey,JSON.stringify(wandererQuest));
 // Zgodność ze starszą wersją questa: 'completed' oznacza odebraną pierwszą
 // nagrodę, nie koniec całej historii. Nie cofamy postępu testowych postaci.
 const wandererRewards=window.DBIWorldInventory;
 if(wandererRewards?.hasWandererDefenseReward?.() && wandererQuest.state!=='bean-completed'){
  wandererQuest.state='bean-completed';wandererQuest.kills=50;saveWanderer();
 }else if((wandererQuest.state==='completed'||wandererRewards?.hasWandererStatsReward?.())
          && !['bean-available','bean-accepted','bean-completed'].includes(wandererQuest.state)){
  wandererQuest.state='bean-available';wandererQuest.kills=50;saveWanderer();
 }

 function wandererMarkup(){
  const title='<h2>📜 Wędrowiec — Góra Króla Lasu</h2>';
  const close='<button class="world-action secondary" id="wandererClose">Zamknij</button>';
  if(wandererQuest.state==='bean-completed')return title+'<p><strong>Wędrowiec:</strong> Dziękuję Ci za pomoc. Moja żona odzyska siły, a moje błogosławieństwo niech Cię chroni!</p>'+close;
  if(wandererQuest.state==='bean-available'||wandererQuest.state==='bean-accepted'){
   const beans=window.DBIWorldInventory?.countQuestItem?.('zen-bean-red')||0;
   const story='<p><strong>Wędrowiec:</strong> Świetnie Ci poszło, myślę że wioska będzie teraz bezpieczna, ale mam jeszcze jedną prośbę do Ciebie, czy miałbyś może jedną fasolkę? W wiosce czeka na mnie chora żona, a ja nigdzie nie mogę zdobyć tych fasolek? Jeżeli zdobyłbyś dla mnie jedną, pobłogosławię twojego ducha i na pewno nie pożałujesz.</p>';
   const progress='<div class="world-quest-progress '+(beans>=1?'done':'pending')+'"><strong>Wymagania:</strong> Oddaj Czerwoną Fasolkę Zen '+Math.min(1,beans)+'/1</div>';
   const reward='<div class="world-quest-reward"><strong>Nagroda:</strong> +50 do obrony</div>';
   const button=wandererQuest.state==='bean-available'?'<button class="world-action" id="wandererBeanAccept">Bardzo proszę.</button>':`<button class="world-action" id="wandererBeanClaim" ${beans>=1?'':'disabled'}>Oddaj fasolkę</button>`;
   return title+story+progress+reward+button+close;
  }
  const story='<p><strong>Wędrowiec:</strong> Witaj młodzieńcze, wyglądasz mi na kogoś naprawdę silnego, mógłbym Cię prosić o małą przysługę? Niedaleko góry znajduje się obóz zamachowców. Gnębią wioskę nieopodal góry, z której pochodzę. Mógłbyś dać im porządną nauczkę? Oczywiście sowicie Cię wynagrodzę za pomoc i pokażę parę sztuczek, których nauczyłem się podczas swojego długiego życia.</p>';
  const count=wandererQuest.kills;
  const progress='<div class="world-quest-progress '+(count>=50?'done':'pending')+'"><strong>Wymagania:</strong> Pokonaj Zamachowca Góry '+count+'/50</div>';
  const reward='<div class="world-quest-reward"><strong>Nagroda:</strong> +50 do wszystkich statystyk</div>';
  const button=wandererQuest.state==='available'?'<button class="world-action" id="wandererAccept">Przyjmij zadanie</button>':`<button class="world-action" id="wandererClaim" ${count>=50?'':'disabled'}>Odbierz nagrodę</button>`;
  return title+story+progress+reward+button+close;
 }
 function acceptWanderer(){if(wandererQuest.state!=='available')return;wandererQuest.state='accepted';saveWanderer();lastSide='';updateSide(true)}
 function claimWanderer(){
  if(wandererQuest.state!=='accepted'||wandererQuest.kills<50)return;
  if(window.DBIWorldInventory?.grantWandererStats?.()!==true)return;
  wandererQuest.state='bean-available';saveWanderer();window.DBIDaily?.record('quests',1);lastSide='';updateSide(true);
 }
 function acceptWandererBean(){if(wandererQuest.state!=='bean-available')return;wandererQuest.state='bean-accepted';saveWanderer();lastSide='';updateSide(true)}
 function claimWandererBean(){
  if(wandererQuest.state!=='bean-accepted'||(window.DBIWorldInventory?.countQuestItem?.('zen-bean-red')||0)<1)return;
  if(window.DBIWorldInventory?.grantWandererDefense?.()!==true){side.insertAdjacentHTML('beforeend','<p class="world-quest-error">Nie udało się oddać fasolki. Spróbuj ponownie.</p>');return;}
  wandererQuest.state='bean-completed';saveWanderer();window.DBIDaily?.record('quests',1);lastSide='';updateSide(true);
 }
 const forestRoshiKey='dboidle_forest_roshi_v1_'+String(id||'test');
 const forestBulmaKey='dboidle_forest_bulma_v1_'+String(id||'test');
 const readForest=(key,initial)=>{try{return {...initial,...JSON.parse(localStorage.getItem(key)||'{}')}}catch{return {...initial}}};
 let roshi=readForest(forestRoshiKey,{stage:0,kills:0}),bulma=readForest(forestBulmaKey,{stage:0});
 const saveForest=()=>{localStorage.setItem(forestRoshiKey,JSON.stringify(roshi));localStorage.setItem(forestBulmaKey,JSON.stringify(bulma))};
 const itemCount=(key)=>window.DBIWorldInventory?.countQuestItem?.(key)||0;
 const spiritPoint=()=>window.DBISpiritual?.hasEarnedPoint?.()===true;
 function forestNpcMarkup(index){
  const close='<button class="world-action secondary" id="forestClose">Zamknij</button>';
  if(index===0){
   const heading='<h2>📜 Genialny Żółw</h2>';
   const progress=(label,done)=>`<div class="world-quest-progress ${done?'done':'pending'}">${label}</div>`;
   const reward=(label,image='')=>`<div class="world-quest-reward"><strong>Nagroda:</strong><div class="dbi-quest-reward-lines"><div class="dbi-quest-reward-item">${image?`<img class="world-quest-chest" src="${image}" alt="" onerror="this.style.display='none'">`:''}<span>${label}</span></div></div></div>`;
   const action=(label,enabled)=>`<button class="world-action" id="forestClaim" ${enabled?'':'disabled'}>${label}</button>${close}`;
   if(roshi.stage===0){
    const stones=itemCount('quest-turtle-stone');
    return heading+'<p>Jesteśmy na miejscu, tutaj przygotuję Cię do przyszłego turnieju walki. Będziesz trenował wraz z Krillinem, zaczniemy od sprawdzenia jak radzicie sobie w terenie.</p><p><em>*Genialny Żółw podniósł kamień, napisał na nim symbol swojej szkoły, po czym rzucił w głąb wielkiego lasu*</em></p><p>Ten, który przyniesie mi ten kamień będzie mógł zjeść kolację, powodzenia!</p>'+progress(`Kamień Żółwia ${stones}/1`,stones>=1)+action('Oddaj',stones>=1);
   }
   if(roshi.stage===1){
    const ready=spiritPoint();
    return heading+'<p>Świetnie wam poszło, teraz musimy trochę popracować nad waszym duchem. Usiądźcie i skupcie się nad energią w waszym wnętrzu.</p>'+progress('Wymagania: Zdobądź jeden punkt rozwoju ducha '+(ready?'1/1':'0/1'),ready)+action('Gotowe!',ready);
   }
   if(roshi.stage===2){
    const staffReady=itemCount('starter-red-staff')>=1;
    const killsReady=roshi.kills>=30;
    const requirements=`<div class="world-quest-progress ${killsReady&&staffReady?'done':'pending'}" style="display:flex;flex-direction:column;align-items:stretch;gap:8px">`+
     `<div style="display:flex;align-items:center;gap:8px;min-height:26px;color:${killsReady?'#8df0ad':'#ff93a5'}"><span>Wymagania: Pokonaj dzikie zwierzę ${Math.min(30,roshi.kills)}/30</span></div>`+
     `<div style="display:flex;align-items:center;gap:8px;min-height:26px;padding-left:96px;box-sizing:border-box;color:${staffReady?'#8df0ad':'#ff93a5'}"><img src="assets/items/magiczny-czerwony-kij.png" alt="" style="width:24px;height:24px;object-fit:contain;flex:none"><span>Oddaj Magiczny czerwony kij ${staffReady?'1/1':'0/1'}</span></div></div>`;
    return heading+'<p>Macie talent chłopacy, ostatnio doszły mnie słuchy, że dzikie zwierzęta grasują w okolicy, to będzie dla was bardzo dobry trening, pozbądźcie się ich!</p>'+requirements+reward('Czerwony Magiczny Kij +4 ×1','assets/items/magiczny-czerwony-kij.png')+action('Zrobione!',killsReady&&staffReady);
   }
   if(roshi.stage===3){
    const lvl=characterLevel();
    return heading+'<p>Doszły do mnie złe wieści, góra króla gór stoi w płomieniach, musimy udać się na ratunek!</p>'+progress(`Poziom ${lvl} / 10`,lvl>=10)+reward('Biały amulet ×1','assets/items/bialy-amulet.png')+action('Ruszajmy!',lvl>=10);
   }
   return heading+'<p>Ruszajmy na Górę Króla Lasu!</p>'+close;
  }
  if(bulma.stage===0)return `<h2>📜 Bulma</h2><p>Cześć chłopaczku! Nie chciałbyś mi trochę pomóc?</p><button class="world-action" id="forestClaim">Pewnie!</button>${close}`;
  if(bulma.stage===1){
    const count=itemCount('small-dragon-balls');
    return `<h2>📜 Bulma</h2><p>Wspaniale, widzisz szukam smoczych kul spełniających życzenia. Pomógłbyś mi je znaleźć? Wynagrodzę Cię naprawdę porządnie, jeśli Ci się uda.</p><div class="world-quest-progress ${count>=7?'done':'pending'}">Oddaj Małe Smocze Kule ${count}/7</div><button class="world-action" id="forestClaim" ${count>=7?'':'disabled'}>Proszę!</button>${close}`;
   }
  if(bulma.stage===2)return `<h2>📜 Bulma</h2><p>Wow, zebrałeś wszystkie, jesteś niesamowity! Jestem Bulma i mam nadzieję, że nasza współpraca nie skończy się dzisiaj! W nagrodę dam Ci specjalną kapsułę, która przyda Ci się później. Na razie!</p><div class="world-bulma-rewards"><strong>Nagroda:</strong><div class="world-bulma-reward"><img src="assets/items/specjalna-kapsula-cc.png" alt="" loading="lazy"> <span>Specjalna Kapsuła CC ×1</span></div><div class="world-bulma-reward"><img src="assets/items/bialy-pierscien.png" alt="" loading="lazy"> <span>Biały Pierścień ×1</span></div></div><button class="world-action" id="forestClaim">Dzięki...</button>${close}`;
  return `<h2>📜 Bulma</h2><p>Do zobaczenia!</p>${close}`;
 }
 if(!document.getElementById('world-bulma-rewards-style')){
  const style=document.createElement('style');style.id='world-bulma-rewards-style';
  style.textContent='.world-bulma-rewards{display:grid;grid-template-columns:max-content 1fr;align-items:start;gap:8px 14px;margin:14px 0;padding:12px;border:1px solid #8d6a2e;border-radius:5px;background:rgba(10,21,31,.65)}.world-bulma-rewards>strong{grid-row:1 / span 2;color:#f4c86b;padding-top:9px}.world-bulma-reward{display:flex;align-items:center;gap:10px;min-height:36px}.world-bulma-reward img{width:34px;height:34px;object-fit:contain;flex:none}';
  document.head.appendChild(style);
 }
 function claimForest(index){
  const inv=window.DBIWorldInventory;
  if(index===0){
   if(roshi.stage===0){if(!inv?.consumeQuestItem?.('quest-turtle-stone',1))return;roshi.stage=1}
   else if(roshi.stage===1){if(!spiritPoint())return;roshi.stage=2}
   else if(roshi.stage===2){if(roshi.kills<30||itemCount('starter-red-staff')<1)return;if(!inv?.consumeQuestItem?.('starter-red-staff',1))return;if(inv?.grant?.(['starter-red-staff~4'])!==1){inv?.grant?.(['starter-red-staff']);return;}roshi.stage=3}
   else if(roshi.stage===3){if(characterLevel()<10||inv?.grant?.(['white-amulet'])!==1)return;roshi.stage=4;const d=EXTRA_MAPS.mountain.spawn;player.location='mountain';player.x=d.x;player.y=d.y;camX=player.x;camY=player.y;questOpen=false;save()}
  }else{
   if(bulma.stage===0)bulma.stage=1;
   else if(bulma.stage===1){if(!inv?.consumeQuestItem?.('small-dragon-balls',7))return;bulma.stage=2}
   else if(bulma.stage===2){if(inv?.grant?.(['special-cc-capsule','white-ring'])!==2)return;bulma.stage=3}
  }
  saveForest();window.DBIDaily?.record('quests',1);lastSide='';updateSide(true);
 }
 function addIslandQuestKills(n){if(islandQuest.state!=='accepted'||n<=0)return;islandQuest.kills=Math.min(20,islandQuest.kills+n);saveIslandQuest();if(questOpen){lastSide='';updateSide(true)}}
 function islandQuestMarkup(){
  const intro='<div class="world-quest-header"><h2>📜 Wielki Mistrz</h2></div>';
  const close='<button class="world-action secondary" id="worldIslandQuestClose">Zamknij</button>';
  if(islandQuest.state!=='completed'){
   const progress=islandQuest.kills;
   const story='<p>Witaj na mojej wyspie, młody wojowniku! Sama siła nie wystarczy, aby zostać prawdziwym mistrzem. Udowodnij swoją wytrwałość w walce z moimi uczniami.</p>';
   const objective='<div class="world-quest-progress '+(progress>=20?'done':'pending')+'">Pokonaj uczniów mistrza '+progress+'/20</div>';
   const footer=islandQuest.state==='available'?'<button class="world-action" id="islandQuestAccept">Akceptuj zadanie</button>':islandQuest.state==='accepted'&&progress>=20?'<button class="world-action" id="islandQuestClaim">Zatwierdź wykonanie</button>':'<p class="world-muted">Pokonuj uczniów na placu treningowym, a potem wróć do domku.</p>';
   return intro+story+objective+'<div class="world-quest-footer">'+footer+close+'</div>';
  }
  if(masterKrillin!=='completed'){
   const ready=masterKrillinReady();
   return intro+'<p>Całkiem nieźle Ci poszło, ale nadal nie jestem przekonany do twoich umiejętności.<br>Nad wodą trenuje mój najzdolniejszy uczeń.<br>Jeśli przetrwasz z nim sparing, to przyjmę Cię jako ucznia.</p>'+
    '<div class="world-quest-progress '+(ready?'done':'pending')+'">Krillin: '+(ready?'pokonany':'niepokonany')+'</div><p><strong>Nagroda:</strong> +20 do wszystkich statystyk</p>'+
    '<div class="world-quest-footer">'+(masterKrillin==='available'?'<button class="world-action" id="masterKrillinAccept">Akceptuj zadanie</button>':ready?'<button class="world-action" id="masterKrillinClaim">Zakończ zadanie</button>':'<p class="world-muted">Pokonaj Krillina i wróć do mistrza.</p>')+close+'</div>';
  }
  const ready=characterLevel()>=5;
  return intro+'<p>Masz potencjał, zdecydowanie teraz to widzę, chętnie udam się z tobą<br>na obóz treningowy, gdzie przygotuję Ciebie oraz Krillina do najbliższego<br>światowego turnieju sztuk walk, chodźcie za mną.</p>'+
   '<div class="world-quest-progress '+(ready?'done':'pending')+'">Poziom '+characterLevel()+' / 5</div>'+
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
 let bossOpen=false;
 if(!document.getElementById('dbi-quest-layout-style')){
  const questStyle=document.createElement('style');questStyle.id='dbi-quest-layout-style';questStyle.textContent='\n/* Sp\u00f3jny, ozdobny interfejs quest\u00f3w inspirowany zaakceptowan\u0105 wizualizacj\u0105. */\n.world-side:has(>.dbi-quest-panel){background:radial-gradient(ellipse at 100% 0%,#133343 0%,#081724 65%,#07121e 100%)!important;border:2px solid #a98035!important;box-shadow:inset 0 0 0 2px #142c3d,0 8px 28px #0008!important;padding:13px!important}\n.dbi-quest-panel{display:flex;flex-direction:column;gap:13px;color:#e5e9e6;font:inherit;min-height:0}\n.dbi-quest-title{position:relative;background:linear-gradient(180deg,#073f9b,#061b63 70%,#071443);border:2px solid #d6a74e;border-radius:5px;padding:14px 16px;color:#ffe3a0;font-weight:700;font-size:1.15em;box-shadow:inset 0 0 0 2px #152b60,0 3px 10px #0008;text-shadow:0 2px 2px #000}\n.dbi-quest-title:before,.dbi-quest-title:after{content:\'\u25c6\';position:absolute;top:4px;color:#e7b759;font-size:12px}\n.dbi-quest-title:before{left:5px}.dbi-quest-title:after{right:5px}\n.dbi-quest-story{position:relative;background:radial-gradient(ellipse at 85% 85%,#104349,#062b31 65%,#062126);border:1px solid #18b9a4;border-radius:6px;padding:18px 15px;min-height:138px;line-height:1.7;box-sizing:border-box;box-shadow:inset 0 0 18px #0005;color:#e8eeee}\n.dbi-quest-story p{margin:0 0 11px}.dbi-quest-story p:last-child{margin-bottom:0}\n.dbi-quest-panel>.world-quest-progress,.dbi-quest-goal{margin:0!important;background:linear-gradient(90deg,#123b2b,#0c352d)!important;border:1px solid #47d979!important;border-radius:5px!important;padding:13px 14px!important;box-sizing:border-box;color:#83f3a5!important;font-weight:700;box-shadow:inset 0 0 12px #0006}\n.dbi-quest-panel>.world-quest-progress.pending,.dbi-quest-panel>.dbi-quest-goal.pending{background:linear-gradient(90deg,#411820,#2c1019)!important;border-color:#ff5362!important;color:#ff8a92!important;text-shadow:0 0 8px #ff334477;box-shadow:inset 0 0 12px #0006,0 0 9px #fa405533!important}\n.dbi-quest-panel>.world-quest-progress.done,.dbi-quest-panel>.dbi-quest-goal.done{background:linear-gradient(90deg,#123b2b,#0c352d)!important;border-color:#47d979!important;color:#83f3a5!important;text-shadow:0 0 7px #47d97955}\n.dbi-quest-rewards{background:linear-gradient(110deg,#15212a,#101c25);border:1px solid #b58a45;border-radius:6px;padding:16px 14px;display:grid;grid-template-columns:max-content minmax(0,1fr);gap:14px;align-items:center;box-shadow:inset 0 0 14px #0005}\n.dbi-quest-panel .world-quest-reward{background:linear-gradient(110deg,#15212a,#101c25);border:1px solid #b58a45;border-radius:6px;padding:16px 14px;display:grid;grid-template-columns:max-content minmax(0,1fr);gap:14px;align-items:center;box-shadow:inset 0 0 14px #0005}.dbi-quest-panel .world-quest-reward>strong{font-weight:700;color:#f4cb75;border-right:1px solid #916c3d;padding-right:13px;align-self:stretch;display:flex;align-items:center}.dbi-quest-rewards>strong{font-weight:700;color:#f4cb75;border-right:1px solid #916c3d;padding-right:13px;align-self:stretch;display:flex;align-items:center}\n.dbi-quest-reward-lines{display:flex;flex-direction:column;gap:9px;min-width:0}\n.dbi-quest-reward-item{display:flex;align-items:center;gap:10px;min-height:30px;color:#f2e7d0}\n.dbi-quest-reward-item .world-quest-chest{flex:none;width:35px;height:35px;object-fit:contain}\n.dbi-quest-reward-stat{padding-left:0}\n.dbi-quest-buttons{display:flex;flex-direction:column;gap:9px;margin-top:4px}\n.dbi-quest-buttons>.world-action{display:block;width:100%;margin:0!important;box-sizing:border-box;min-height:46px;border:1px solid #e7bc60!important;border-radius:5px!important;background:linear-gradient(#a87a2e,#725017)!important;color:#fff4dc!important;font-weight:700!important;box-shadow:inset 0 1px #ffdc8280,0 2px 5px #0008}\n.dbi-quest-buttons>.world-action.secondary{border-color:#5ca2bc!important;background:linear-gradient(#16435a,#0b2b42)!important;color:#f1f5f7!important;box-shadow:inset 0 1px #80c7df44,0 2px 5px #0008}\n.dbi-quest-buttons>.world-action:hover{filter:brightness(1.15)}\n.dbi-quest-panel .world-quest-section{margin:8px 0}\n@media(max-width:480px){.dbi-quest-story{min-height:95px;padding:13px}.dbi-quest-rewards{gap:8px;padding:10px}.dbi-quest-title{padding:12px}}\n';document.head.appendChild(questStyle);
 }
 function formatQuestMarkup(html){
  // Jeden układ dla każdego etapu i każdego NPC, bez zmiany identyfikatorów przycisków.
  if(html.includes('class="dbi-quest-panel"'))return html;
  const root=document.createElement('div');root.innerHTML=html;
  const title=root.querySelector('h2');
  if(!title)return html;
  const heading=title.innerHTML;title.remove();
  const buttons=[...root.querySelectorAll('button.world-action')];
  buttons.forEach(b=>b.remove());
  root.querySelectorAll('.world-side-actions').forEach(n=>{if(!n.textContent.trim())n.remove()});
  const rewards=[];
  for(const p of [...root.querySelectorAll('p')]){
   const st=p.querySelector('strong');
   if(st&&/^Nagroda\s*:/i.test(st.textContent.trim())){
    st.remove();rewards.push(p.innerHTML.trim());p.remove();
   }
  }
  const goals=[];
  for(const p of [...root.querySelectorAll('p')]){
   const st=p.querySelector('strong');
   if(st&&/^Cel\s*:/i.test(st.textContent.trim())){
    goals.push(p.innerHTML);p.remove();
   }
  }
  // Wymagania z dawnych dialogów (np. Góra Króla Lasu) przenosimy
  // do osobnego kafelka postępu, poza polem tekstowym.
  for(const p of [...root.querySelectorAll('p')]){
   const st=p.querySelector('strong');
   if(st&&/^Wymagani(?:a|e)\s*:/i.test(st.textContent.trim())){
    // Dla wymagania poziomu 20 zachowaj nagłówek „Wymagania:”.
    if(!/Osiągnij poziom 20\s*\(/i.test(p.textContent))st.remove();
    const label=p.textContent.trim();
    const match=label.match(/\((\d+)\s*\/\s*(\d+)\)/);
    const done=p.dataset.stadiumWon==='true'||(!!match&&Number(match[1])>=Number(match[2]));
    const node=document.createElement('div');
    node.className='world-quest-progress '+(done?'done':'pending');
    // Zachowaj element lupy i jej tooltip zamiast spłaszczać HTML do tekstu.
    node.append(...p.childNodes);
    p.replaceWith(node);
   }
  }
  const progress=[...root.querySelectorAll('.world-quest-progress')];
  for(const n of progress){
   if(n.classList.contains('done')||n.classList.contains('pending'))continue;
   const label=n.textContent||'';
   const fraction=label.match(/(\d+)\s*\/\s*(\d+)/);
   const completed= fraction ? Number(fraction[1])>=Number(fraction[2]) : /pokonany|wykonan[ey]|ukończon[ey]|✓/i.test(label)&&!/niepokonany/i.test(label);
   n.classList.add(completed?'done':'pending');
  }
  progress.forEach(n=>n.remove());
  // Nagrody Genialnego Żółwia również wyjmujemy z tekstu rozmowy.
  const forestRewards=[...root.querySelectorAll('.world-quest-reward')];
  forestRewards.forEach(n=>n.remove());
  // Nagrody Bulmy są osobnym kafelkiem, poza panelem dialogu.
  const bulmaRewards=root.querySelector('.world-bulma-rewards');
  if(bulmaRewards)bulmaRewards.remove();
  const woodcutterEnemy=root.querySelector('.world-woodcutter-enemy');
  if(woodcutterEnemy)woodcutterEnemy.remove();
  const content=root.innerHTML.trim();
  return '<div class="dbi-quest-panel"><header class="dbi-quest-title">'+heading+'</header>'+
   (content?'<section class="dbi-quest-story">'+content+'</section>':'')+
   (woodcutterEnemy?woodcutterEnemy.outerHTML:'')+
   (bulmaRewards?bulmaRewards.outerHTML:'')+
   goals.map(g=>'<section class="dbi-quest-goal">'+g+'</section>').join('')+
   progress.map(n=>n.outerHTML).join('')+
   forestRewards.map(n=>n.outerHTML).join('')+
   (rewards.length?'<section class="dbi-quest-rewards"><strong>Nagroda:</strong><div class="dbi-quest-reward-lines">'+rewards.map(r=>'<div class="dbi-quest-reward-item">'+r+'</div>').join('')+'</div></section>':'')+
   (buttons.length?'<div class="dbi-quest-buttons">'+buttons.map(b=>b.outerHTML).join('')+'</div>':'')+'</div>';
 }
 function questMarkup(){
  if(quest.state==='completed'){
   if(quest2.state==='dialog')return `<h2>📜 Opiekun Laguny — ulepszanie</h2><p>Ten pas jest zdecydowanie lepszy od tego co mi dałeś, pewnie zastanawiasz się jak to zrobiłem?</p><p>To dosyć proste, potrzebujesz tylko odpowiednich przedmiotów i będziesz też mógł robić takie cuda.</p><p>Jak będziesz chciał sam popróbować swoich sił w tej kwestii musisz wejść w ulepszanie.</p><p><strong>Wzmocnienia → Ulepszanie</strong></p><p>Masz też trochę potrzebnego przedmiotu do takich zabaw.</p><p><strong>Nagroda:</strong> <img class="world-quest-chest" src="assets/items/male-smocze-kule.png" alt="" loading="lazy"> Małe Smocze Kule ×7</p><div class="world-side-actions"><button class="world-action" id="worldQuest2DialogDone">Świetnie!</button></div>`;
   if(quest2.state==='completed')return `<h2>📜 Opiekun Laguny — podróż do mistrza</h2><p>Widzę w tobie ukryty talent i wykonałeś wszystkie moje zadania, zabiorę Cię do wielkiego mistrza, który pozwoli Ci rozwinąć twój talent!</p><div class="world-side-actions"><button class="world-action" id="worldTravelAccept">Akceptuj — podróż na wyspę</button><button class="world-action secondary" id="worldQuestClose">Zamknij</button></div>`;
   if(quest2.state==='available')return `<h2>📜 Opiekun Laguny — drugie zadanie</h2><p>Podobno prawdziwy wojownik poznaje się po pasie. Przynieś mi swój Biały Pas, a oddam Ci go wzmocnionego!</p><div class="world-quest-progress pending"><strong>Wymagania:</strong> Oddaj biały Pas 0/1</div><p><strong>Nagroda:</strong> <img class="world-quest-chest" src="assets/items/bialy-pas.png" alt="" loading="lazy"> Biały Pas +1</p><div class="world-side-actions"><button class="world-action" id="worldQuest2Accept">Akceptuj questa</button><button class="world-action secondary" id="worldQuestClose">Zamknij</button></div>`;
   const hasBelt=!!window.DBIWorldInventory?.hasWhiteBelt?.();
   return `<h2>📜 Opiekun Laguny — Biały Pas</h2><p>Przynieś mi swój Biały Pas. Może znajdować się w inwentarzu lub być założony.</p><div class="world-quest-progress ${hasBelt?'done':'pending'}"><strong>Wymagania:</strong> Oddaj biały Pas ${hasBelt?'1/1':'0/1'}</div><p><strong>Nagroda:</strong> <img class="world-quest-chest" src="assets/items/bialy-pas.png" alt="" loading="lazy"> Biały Pas +1</p>${hasBelt?'<button class="world-action" id="worldQuest2Claim">Zatwierdź jako wykonanie questa</button>':''}<button class="world-action secondary" id="worldQuestClose">Zamknij</button>`;
  }
  if(quest.state==='available')return `<h2>📜 Opiekun Laguny</h2><p>Witaj, podróżniku! Spokój Błękitnej Laguny zakłócają dzikie kukły treningowe. Pomóż mi oczyścić okolicę, a otrzymasz upominek na dobry początek.</p><div class="world-quest-progress pending">Wymagania: Pokonaj Kukła treningowa 0/10</div><div class="world-side-actions"><button class="world-action" id="worldQuestAccept">Akceptuj questa</button><button class="world-action secondary" id="worldQuestClose">Odrzuć</button></div>`;
  const done=quest.kills>=10;
  return `<div class="dbi-quest-panel"><header class="dbi-quest-title">📜 Opiekun Laguny — misja</header><section class="dbi-quest-story">Pokonaj kukły treningowe w namiocie EXPowiska, a potem wróć po nagrodę.</section><div class="world-quest-progress ${done?'done':'pending'}">Wymagania: Pokonaj Kukła treningowa ${Math.min(10,quest.kills)}/10</div><section class="dbi-quest-rewards"><strong>Nagroda:</strong><div class="dbi-quest-reward-lines"><div class="dbi-quest-reward-item"><img class="world-quest-chest" src="assets/items/upominek-startowy.png" alt="Upominek Startowy"><span>Upominek Startowy</span></div><div class="dbi-quest-reward-item dbi-quest-reward-stat">+10 do wszystkich statystyk.</div></div></section><div class="dbi-quest-buttons">${done?'<button class="world-action" id="worldQuestClaim">Zatwierdź jako wykonanie questa</button>':''}<button class="world-action secondary" id="worldQuestClose">Zamknij</button></div></div>`;
 }
 // Blokada akcji w Świecie podczas aktywnego treningu Ciała, Duszy lub Rozwoju Duchowego.
 function worldTrainingActive(){
  try{
   const data=JSON.parse(localStorage.getItem('dboidle_training_v1_'+String(id||'test'))||'{}');
   if(Object.values(data).some(session=>Number(session?.endsAt)>Date.now()))return true;
  }catch{}
  try{
   const data=JSON.parse(localStorage.getItem('dboidle_spiritual_v1_'+String(id||'test'))||'{}');
   if(Number(data?.session?.end)>Date.now())return true;
  }catch{}
  return !!window.DBISpiritual?.isActive?.();
 }
 function worldTrainingNotice(){
  let notice=side.querySelector('#worldTrainingNotice');
  if(!notice){
   notice=document.createElement('p');
   notice.id='worldTrainingNotice';
   notice.setAttribute('role','status');
   notice.className='world-success';
   side.prepend(notice);
  }
  notice.textContent='Postać trenuje. Ruch, walka i interakcje z NPC są zablokowane do zakończenia treningu.';
 }
 function questAction(){if(worldTrainingActive()){worldTrainingNotice();return;}questOpen=true;lastSide='';updateSide(true)}
 function addQuestKills(n){if(quest.state!=='accepted'||n<=0)return;quest.kills=Math.min(10,quest.kills+n);saveQuest();if(questOpen){lastSide='';updateSide(true)}}

 const input=e=>{if(closeTowerClimb||closeDungeon)return;if(worldTrainingActive()){keys.clear();if(['e','w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()))e.preventDefault();return;}if(!active||active.container!==container)return;const k=e.key.toLowerCase();if(k==='e'&&!e.repeat&&battle?.status!=='running'&&overlay.hidden){
   if(nearPortal()){e.preventDefault();usePortal();return}
   if(nearDungeon()){e.preventDefault();side.querySelector('[data-dungeon-enter]')?.focus();return}
   if(nearForestBoss()){e.preventDefault();bossOpen=true;questOpen=false;lastSide='';updateSide(true);return}
   if(nearNorthBall()){
    e.preventDefault();
    if(window.DBIWorldInventory?.grantHighTowerReward?.('north-pickup-ball')){
     questOpen=false;lastSide='';updateSide(true);
     side.insertAdjacentHTML('afterbegin','<p class="world-success">Podniesiono trójgwiazdkową Smoczą kulę.</p>');
    }
    return;
   }
   if(nearNorthQuest()||nearTowerQuest()||nearExtraNpc()){e.preventDefault();questOpen=true;lastSide='';updateSide(true);return}
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
 if(battle?.status==='running'||worldTrainingActive()){dx=0;dy=0;keys.clear()}
 const moving=dx!==0||dy!==0;if(moving){const len=Math.hypot(dx,dy);dx/=len;dy/=len;const speed=145*(1+(Number(window.DBIWorldInventory?.character()?.moveSpeedPct)||0)/100);const nx=player.x+dx*speed*dt,ny=player.y+dy*speed*dt;
 const collision=(x,y)=>player.location==='island'?islandBlocked(x,y):extraMap(player.location)?extraBlocked(player.location,x,y):blocked(x,y);
 if(!collision(nx,player.y))player.x=nx;if(!collision(player.x,ny))player.y=ny;
 if(Math.abs(dx)>Math.abs(dy))player.dir=dx>0?'right':'left';else player.dir=dy>0?'down':'up';}
 const width=canvas.clientWidth,height=canvas.clientHeight;camX+=(player.x-camX)*Math.min(1,dt*8);camY+=(player.y-camY)*Math.min(1,dt*8);
 const onIsland=player.location==='island';frame.classList.toggle('world-island',onIsland);
 const currentExtra=extraMap(player.location);const worldSize=currentExtra?currentExtra.sizeX*TILE:onIsland?ISLAND_WORLD:WORLD;const worldHeight=currentExtra?currentExtra.sizeY*TILE:onIsland?ISLAND_WORLD:32*TILE;
 // Stadion 10×10: powiększamy cały świat (teren i bohatera), nie wklejamy małej miniatury na zielone tło.
 const viewScale=player.location==='stadium'?Math.min(width/worldSize,height/worldHeight):1;
 const visibleWidth=width/viewScale,visibleHeight=height/viewScale;
 const offsetX=(onIsland||currentExtra||player.location==='laguna')&&visibleWidth>=worldSize?-(visibleWidth-worldSize)/2:clamp(camX-visibleWidth/2,0,Math.max(0,worldSize-visibleWidth)),offsetY=(onIsland||currentExtra||player.location==='laguna')&&visibleHeight>=worldHeight?-(visibleHeight-worldHeight)/2:clamp(camY-visibleHeight/2,0,Math.max(0,worldHeight-visibleHeight));
 if(!width||!height){raf=requestAnimationFrame(frameLoop);return}
 ctx.resetTransform();
 ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.setTransform(canvas.width/width,0,0,canvas.height/height,0,0);
 if(onIsland||currentExtra){ctx.fillStyle=currentExtra?'#18372c':'#087eb2';ctx.fillRect(0,0,width,height)}
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.scale(viewScale,viewScale);ctx.translate(-Math.round(offsetX),-Math.round(offsetY));
 if(currentExtra){
  ctx.beginPath();ctx.rect(0,0,worldSize,worldHeight);ctx.clip();
 }
 if(currentExtra){
  const map=currentExtra;
  if(map.image.complete&&map.image.naturalWidth)ctx.drawImage(map.image,0,0,map.sizeX*TILE,map.sizeY*TILE);
  else{ctx.fillStyle='#365d39';ctx.fillRect(0,0,map.sizeX*TILE,map.sizeY*TILE);}
  for(const p of mapPortals(map)){
   mapSeal(ctx,p.x,p.y,25,"#89cfe7");
   const t=time/1000, pulse=0.88+0.09*Math.sin(t*2.1);
   ctx.save();ctx.globalAlpha=pulse;
   if(portalArt.complete&&portalArt.naturalWidth)ctx.drawImage(portalArt,p.x-29,p.y-66,58,72);
   else{ctx.strokeStyle='#eac979';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y-7,20,7,0,0,Math.PI*2);ctx.stroke()}
   // Drobne, niezależnie poruszające się iskry oraz spiralna energia.
   for(let i=0;i<9;i++){
    const phase=(i*0.61803398875+t*0.23)%1;
    const a=t*1.45+i*2.39996;
    const x=p.x+Math.cos(a)*((1-phase)*11+3), y=p.y-8-phase*51;
    const radius=0.8+(1-phase)*0.85;
    ctx.globalAlpha=(0.25+0.65*Math.sin(Math.PI*phase))*pulse;
    ctx.fillStyle=i%3===0?'#a5d8ff':'#ffe7a0';ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
   }
   ctx.globalAlpha=0.18+0.12*Math.sin(t*2.5);
   ctx.strokeStyle='#d6e9ff';ctx.lineWidth=1.1;ctx.beginPath();
   for(let i=0;i<=22;i++){const f=i/22, a=t*1.2+f*Math.PI*3.5;
    const x=p.x+Math.cos(a)*(12-f*7),y=p.y-9-f*47;
    if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y)}
   ctx.stroke();ctx.restore();
  }
  ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#071725';ctx.fillStyle='#ffe4a3';
  for(const [index,n] of map.npc.entries()){
   if(player.location==='stadium')continue; // Stadion: znaczniki rysowane na końcu, nad postacią.
   mapSeal(ctx,n.x,n.y,17,"#f0c579");
   const sprite=n.image||(player.location==='centralForest'?centralNpcSprites[n.label]:(player.location==='forest'||player.location==='mountain'||player.location==='stadium')?(n.label==='Genialny Żółw'?roshiSprite:n.label==='Bulma'?bulmaSprite:n.label==='Wędrowiec'?wandererSprite:null):null);
   if(sprite&&sprite.complete&&sprite.naturalWidth){
    if(n.source)ctx.drawImage(sprite,...n.source,n.x-13,n.y-49,26,49);
    else ctx.drawImage(sprite,n.x-17,n.y-49,34,49);
   }
   else character(ctx,n.x,n.y,'down',false,time,true);
   mapBadge(ctx,n.label,n.x,n.y-55);
   if(player.location==='centralForest'&&index===0&&woodcutter.stage<4)drawQuestMark(ctx,n.x,n.y-12,time);
   if(player.location==='centralForest'&&index===1&&fisherman.stage<4)drawQuestMark(ctx,n.x,n.y-12,time);
   if(player.location==='centralForest'&&index===2&&father.stage<3)drawQuestMark(ctx,n.x,n.y-12,time);
   if(player.location!=='centralForest'&&!n.art&&(player.location==='forest'?(index===0?roshi.stage<4:bulma.stage<3):player.location==='mountain'?(index===0?mountainRoshi.stage<4:wandererQuest.state!=='bean-completed'):player.location==='stadium'?(index===0?stadiumQuest.stage<5:stadiumQuest.stage===5):!extraNpcQuestDone(player.location,index,id)))drawQuestMark(ctx,n.x,n.y-12,time);
  }
  if(player.location==='mountainLake'&&northernScenerySprite.complete&&northernScenerySprite.naturalWidth){
   for(const {x,y,width,height,source,label} of northernScenery){
    mapSeal(ctx,x,y,width*.46,"#9fc9d3");
    ctx.drawImage(northernScenerySprite,...source,x-width/2,y-height,width,height);
    mapBadge(ctx,label,x,y-height-7);
    const prop=northernScenery.find(entry=>entry.label===label);
    if(prop===journeySpot()||prop===huntSpot())drawQuestMark(ctx,x,y-height+27,time);
   }
  }
  if(player.location==='mountainLake'&&ballVisible()&&ballSprite.complete&&ballSprite.naturalWidth){
   ctx.drawImage(ballSprite,ballPosition.x-12,ballPosition.y-24,24,24);
  }
  if(map.city){const {x,y,label}=map.city;mapBadge(ctx,label,x,y);}
  if(map.dungeon&&northernDungeonSprite.complete&&northernDungeonSprite.naturalWidth){
   const {x,y,label}=map.dungeon;
   ctx.drawImage(northernDungeonSprite,320,77,558,1165,x-17,y-72,34,72);
   mapBadge(ctx,label,x,y-79);
  }
  if(map.mobs){
   if(player.location==='highTowerForest'){
    drawHighTowerProps(ctx);
    const marker=towerMarker();
    if(marker)drawQuestMark(ctx,marker.x,marker.y-(marker.image.naturalHeight||60)+40,time);
    // Posterunek jest osobnym obiektem rysowanym na mapie, nie częścią tła.
    if(redRibbonOutpostSprite.complete&&redRibbonOutpostSprite.naturalWidth)ctx.drawImage(redRibbonOutpostSprite,map.mobs.x-51,map.mobs.y-98,102,100);
    mapBadge(ctx,'⚔ Moby',map.mobs.x,map.mobs.y-105);
   }else if(player.location==='mountainLake'){
    const {x,y}=map.mobs;
    if(northernCaveSprite.complete&&northernCaveSprite.naturalWidth)ctx.drawImage(northernCaveSprite,170,169,1432,561,x-38,y-30,76,30);
    mapBadge(ctx,'⚔ Moby',x,y-36);
   }else{
    const markerY=map.mobs.y-(map.city?111:28);
    mapBadge(ctx,'⚔ Moby',map.mobs.x,markerY);
   }
  }
  // Boss ma fizyczny sprite na mapie. Walka z bossem zostanie dodana po ustaleniu zasad.
  if(map.boss){
   const b=map.boss;
   if(forestBossSprite.complete&&forestBossSprite.naturalWidth)ctx.drawImage(forestBossSprite,b.x-26,b.y-66,52,66);
   mapBadge(ctx,b.label,b.x,b.y-72);
  }
 }else if(onIsland){
  if(islandArt.complete&&islandArt.naturalWidth)ctx.drawImage(islandArt,0,0,ISLAND_WORLD,ISLAND_WORLD);
  else{ctx.fillStyle='#157da9';ctx.fillRect(0,0,ISLAND_WORLD,ISLAND_WORLD);ctx.fillStyle='#4b9a45';ctx.beginPath();ctx.ellipse(240,240,170,170,0,0,Math.PI*2);ctx.fill();}
   // Statyczny sprite Krillina: jedna poza, bez animacji i obracania.
   mapSeal(ctx,ISLAND_KRILLIN.x,ISLAND_KRILLIN.y,17,"#f0c579");
   if(krillinSprite.complete&&krillinSprite.naturalWidth){ctx.drawImage(krillinSprite,ISLAND_KRILLIN.x-17,ISLAND_KRILLIN.y-45,34,45)}
   if(!krillinQuestCompleted())drawQuestMark(ctx,ISLAND_KRILLIN.x,ISLAND_KRILLIN.y-22,time);
   ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#071725';ctx.fillStyle='#ffe4a3';
   mapBadge(ctx,'Krillin',ISLAND_KRILLIN.x,ISLAND_KRILLIN.y-49);
   // Znaczniki miejsc interakcji na wyspie (nie modyfikują grafiki terenu).
   ctx.font='bold 12px Segoe UI, sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#071725';ctx.fillStyle='#ffe4a3';
   // Jeden animowany wykrzyknik przy domku, dopóki linia zadań mistrza jest aktywna.
   // Po przejściu do Dzikiego Lasu (masterCamp='completed') znacznik znika.
   if(masterCamp!=='completed')drawQuestMark(ctx,ISLAND_HOUSE.x+49,ISLAND_HOUSE.y+7,time);
   const houseQuestLabel='📜 Quest';
    mapBadge(ctx,houseQuestLabel,ISLAND_HOUSE.x,ISLAND_HOUSE.y-25);
   mapBadge(ctx,'⚔ Moby',ISLAND_TRAINING.x,ISLAND_TRAINING.y-26);
  }else{
  if(lagunaArt.complete&&lagunaArt.naturalWidth)ctx.drawImage(lagunaArt,0,0,WORLD,32*TILE);
  else{const minX=clamp(Math.floor(offsetX/TILE)-1,0,SIZE-1),maxX=clamp(Math.ceil((offsetX+width)/TILE)+1,0,SIZE-1),minY=clamp(Math.floor(offsetY/TILE)-1,0,31),maxY=clamp(Math.ceil((offsetY+height)/TILE)+1,0,31);for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)drawTile(ctx,x,y,'grass');}
  // NPC i znaczniki są osobnymi elementami, nie są wtopione w tło mapy.
  mapSeal(ctx,NPC.x,NPC.y,20,"#f0c579");
  if(lagoonNpcSprite.complete&&lagoonNpcSprite.naturalWidth)ctx.drawImage(lagoonNpcSprite,NPC.x-23,NPC.y-59,46,62);
  else character(ctx,NPC.x,NPC.y,'down',false,time,true);
  ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#101b23';ctx.fillStyle='#ffe1a0';mapBadge(ctx,'Opiekun Laguny',NPC.x,NPC.y-63);
  if(quest.state!=='completed'||quest2.state!=='completed')drawQuestMark(ctx,NPC.x,NPC.y-35,time);
 }
 character(ctx,player.x,player.y,player.dir,moving,time);
 // Stadion: przed zakończeniem turnieju znacznik pozostaje na środku areny.
 // Po zakończeniu (etap 5) znika ze środka i pojawia się przy bramie.
 if(player.location==='stadium'){
  if(stadiumQuest.stage<5){
   drawQuestMark(ctx,EXTRA_MAPS.stadium.npc[0].x,EXTRA_MAPS.stadium.npc[0].y+45,time);
  }else if(stadiumQuest.stage===5){
   drawQuestMark(ctx,EXTRA_MAPS.stadium.npc[1].x,EXTRA_MAPS.stadium.npc[1].y+18,time);
  }
 }
 ctx.restore();
 if(questOpen&&!(near()||nearHouse()||nearKrillin()||nearExtraNpc()||nearTowerQuest()||nearNorthQuest()))questOpen=false;
 if(bossOpen&&!nearForestBoss())bossOpen=false;
  prompt.hidden=!(nearNorthBall()||nearNorthQuest()||nearDungeon()||nearPortal()||near()||nearHouse()||nearKrillin()||nearExtraNpc()||nearForestBoss()||nearTowerQuest());
  if(!prompt.hidden)prompt.textContent=nearNorthBall()?'Naciśnij E, aby podnieść Smoczą kulę':nearNorthQuest()?'Naciśnij E, aby porozmawiać':nearDungeon()?'Dungeon · E — wybór wejścia':nearPortal()?'Naciśnij E, aby przejść do: '+(extraMap(nearPortal().to)?.name||'następna lokacja'):nearForestBoss()?'Naciśnij E, aby zmierzyć się z Leśnym Wojownikiem (Boss)':nearKrillin()?'Naciśnij E, aby porozmawiać z Krillinem':nearTowerQuest()?'Naciśnij E, aby kontynuować Pierwszą Podróż':nearExtraNpc()?'Naciśnij E, aby porozmawiać: '+nearExtraNpc().label:nearHouse()?'Naciśnij E, aby porozmawiać z Wielkim Mistrzem':'Naciśnij E, aby porozmawiać z Opiekunem Laguny';
 if(bannerLocation!==player.location){
  bannerLocation=player.location;
  const art=currentExtra?.image||(onIsland?islandArt:lagunaArt);
  container.querySelector('.world-grid').style.setProperty('--region-art','url("'+art.src+'")');
 }
 setMapText(container.querySelector('.world-toolbar strong'),currentExtra?currentExtra.name:onIsland?'Wyspa Genialnego Żółwia':'Błękitna Laguna');
 setMapText(container.querySelector('.world-help'),currentExtra?'WASD / strzałki — ruch. Przy portalu naciśnij E, aby zmienić lokację. NPC: E — rozmowa.':onIsland?'WASD / strzałki — ruch. Krillin: E — rozmowa. Domek mistrza: E — quest. Kukła treningowa — uczniowie LVL 3. Woda jest nieprzechodnia.':'WASD / strzałki — ruch. Wejdź na namiot, aby wybrać potwory. Podejdź do Opiekuna Laguny i naciśnij E, aby rozpocząć misję.');
 updateSide();setMapText(coords,'Pozycja: '+Math.floor(player.x/TILE)+' / '+Math.floor(player.y/TILE));

 if(time-lastSave>1500){save();lastSave=time}raf=requestAnimationFrame(frameLoop);
 }

 const side=container.querySelector('#worldSide'),battleEl=container.querySelector('#worldBattle'),overlay=container.querySelector('#worldOverlay');
 // Wersja gry w prawym dolnym rogu panelu świata; bez ingerencji w mechaniki.
 const versionLabel=document.createElement('div');
 versionLabel.className='dbi-world-version';
 versionLabel.textContent='Aktualna wersja gry: Beta 1.1';
 container.querySelector('.world-grid').appendChild(versionLabel);
 fetch('version.json',{cache:'no-store'}).then(response=>{
  if(!response.ok)throw new Error('Brak pliku wersji');
  return response.json();
 }).then(data=>{
  if(typeof data.version==='string'&&/^Beta [0-9]+(?:\.[0-9]+)*$/.test(data.version)){
   versionLabel.textContent='Aktualna wersja gry: '+data.version;
  }
 }).catch(()=>{});

 // Blokuj wyłącznie działania zmieniające stan gry; mapa i podglądy pozostają aktywne.
 side.addEventListener('click',event=>{
  if(!worldTrainingActive())return;
  const btn=event.target.closest('button');
  if(!btn||!side.contains(btn))return;
  const action=btn.id||'';
  if(!(/(Accept|Claim|Fight|Travel|Battle|Done|Complete|Start|Enter|Attack|Train)$/i.test(action)||action==='worldFight'||action==='worldQuest2DialogDone'))return;
  event.preventDefault();event.stopImmediatePropagation();
  worldTrainingNotice();
 },true);

 const showBattle=()=>{overlay.hidden=false;renderBattle(true)};
 const hideBattle=()=>{overlay.hidden=true;if(uiBattle?.defeatUntil)uiBattle=null;keys.clear();canvas.focus({preventScroll:true})};
 overlay.addEventListener('pointerdown',e=>{if(e.target===overlay)hideBattle()});
 const battleKey='dboidle_battle_v1_'+String(id||'test');
 const MOB_COUNT=15, MAX_MS=12*60*60*1000, REGEN_MS=5000;
 const baseMobStats={strength:4,speed:2,endurance:3,intelligence:0,ki:0,power:0};
 const mobStats=level=>Object.fromEntries(Object.entries(baseMobStats).map(([k,v])=>[k,k==='strength'&&player.location==='laguna'?0:v*level]));
 const mobStatsTooltip=mob=>{
  if(mob.name==='Leśny Wojownik (Boss)')return 'Siła: 800 | Szybkość: 900 | Wytrzymałość: 700 | Inteligencja: 450 | KI: 100 | Atak: 650 | Obrona: 220 | HP: 6000';
  const st=mobStats(mob.level),round=v=>Math.round(Number(v)||0);
  return 'Siła: '+round(st.strength)+' | Szybkość: '+round(st.speed)+' | Wytrzymałość: '+round(st.endurance)+' | Inteligencja: '+round(st.intelligence)+' | KI: '+round(st.ki)+' | Atak: '+round(st.strength*.5)+' | Obrona: '+round(st.endurance*.1)+' | HP: '+round(mobHp(mob.level));
 };
 const forestBossStats={strength:800,speed:900,endurance:700,intelligence:450,ki:100,baseAttack:250,baseDefense:150,attack:650,defense:220,hp:6000};
 const mobHp=lvl=>lvl>=100?lvl*5+5000:lvl*5;
 const interval=speed=>Math.max(1500,3000-Math.max(0,Number(speed)||0)*.01);
 const bossInterval=speed=>Math.max(1500,2000-Math.max(0,Number(speed)||0)*.01);
 const num=v=>Math.round((Number(v)||0)*100000)/100000;
 const hero=()=>window.DBIWorldInventory?.character?.()||{};
 // Procenty ze Znaków pobierane na bieżąco z wyposażonego Symbolu.
 const signBonus=key=>Math.max(0,Number(window.DBIEquippedSignCombatBonus?.(key))||0);
 const spiritBonus=key=>Math.max(0,Number(window.DBISpiritual?.currentBonuses?.()?.[key])||0);
 const gearBonus=(...keys)=>Number(window.DBIWorldInventory?.bonus?.(...keys))||0;
 const dropChance=baseChance=>Math.min(1,Math.max(0,baseChance+(gearBonus('dropChancePct')+gearBonus('chipDropChancePct')+spiritBonus('drop'))/100));
 const dropRoll=baseChance=>Math.random()<dropChance(baseChance);
 const commonMobDropChance=.01;
 const smallDragonBallsDrop={id:'small-dragon-balls',name:'Małe Smocze Kule',image:'assets/items/male-smocze-kule.png',icon:'🟠',sell:0,sellable:false};
 const redRibbonDrops=[
  smallDragonBallsDrop,
  {id:'red-ribbon-badge',name:'Odznaka Armii Czerwonej Wstęgi',image:'assets/items/odznaka-czerwonej-wstegi.png',icon:'🎖️',sell:0,sellable:false}
 ];
 const northernCaveDrops=[
  smallDragonBallsDrop,
  {id:'quest-turtle-stone',name:'Kamień Żółwia',image:'assets/items/kamien-zolwia.png',icon:'🪨',sell:0,sellable:false},
  {id:'dragon-radar',name:'Radar Kul',image:'assets/items/radar-kul.png',icon:'📡',sell:0,sellable:false}
 ];
 const regionalDrops={highTowerForest:redRibbonDrops,mountainLake:northernCaveDrops};
 const bonusMobDrops=(location,name)=>regionalDrops[location]&&extraMap(location)?.mobNames.some(mob=>mob.name===name)?regionalDrops[location]:[];
 const formatDropChance=baseChance=>(dropChance(baseChance)*100).toLocaleString('pl-PL',{maximumFractionDigits:2})+'%';
 const smithOreChance=()=>.01+(Number(window.DBIWorldInventory?.smithDropBonus?.())||0)/100;
 const skills=()=>window.DBIWorldInventory?.skillBonuses?.()||{};
 const monsterGold=(base,mob=false)=>num(base*(1+(gearBonus('goldBonusPct','battleGoldBonusPct')+20*spiritBonus('gold')+(mob?(skills().mobGold||0)+gearBonus('mobGoldPct'):0))/100));

 const mobDef=level=>mobStats(level).endurance*.1;
 const mobAttack=level=>mobStats(level).strength*.5;
 const heroInterval=at=>{
  const ch=hero(),green=at<Number(window.DBIZen?.expiry?.('green'))&&at>=Number(window.DBIZen?.expiry?.('green'))-600000;
  return Math.max(100,interval(ch.speed)/(1+Math.max(0,(Number(ch.attackSpeedPct)||0)+(green?100:0))/100));
 };
 const bossVictoryKey='dboidle_forest_boss_victory_v1_'+String(id||'test');
 const bossWait=()=>Math.max(0,(Number(localStorage.getItem(bossVictoryKey))||0)+Math.max(0,30-spiritBonus('boss')-gearBonus('bossRespawnMinutes'))*60000-Date.now());
 const bossDailyKey='dboidle_forest_boss_wins_daily_v1_'+String(id||'test');
 const bossDailyLimit=3;
 function bossDay(now){
  const date=new Date(now);
  return [date.getFullYear(),date.getMonth()+1,date.getDate()].join('-');
 }
 function bossWinsToday(now=Date.now()){
  const day=bossDay(now);
  let saved;
  try{saved=JSON.parse(localStorage.getItem(bossDailyKey)||'null')}catch{}
  const lastWin=Number(localStorage.getItem(bossVictoryKey))||0;
  const legacyWin=!saved&&lastWin>0&&bossDay(lastWin)===day?1:0;
  const used=saved?.day===day?Math.max(0,Math.min(bossDailyLimit,Math.floor(Number(saved.used)||0))):legacyWin;
  return {day,used};
 }
 const canFightBoss=()=>bossWait()===0&&bossWinsToday().used<bossDailyLimit;
 let bossClockSecond=-1;
 function updateBossCountdown(force=false){
  const button=side.querySelector('#forestBossFight');
  if(!button)return;
  const second=Math.floor(Date.now()/1000);
  if(!force&&second===bossClockSecond)return;
  bossClockSecond=second;
  const left=Math.ceil(bossWait()/1000);
  const minutes=String(Math.floor(left/60)).padStart(2,'0');
  const seconds=String(left%60).padStart(2,'0');
  const remaining=bossDailyLimit-bossWinsToday().used;
  const counter=side.querySelector('#forestBossAttempts');
  const counterLabel=`Pozostałe zwycięstwa dzisiaj: ${remaining}/${bossDailyLimit} · reset o 00:00`;
  if(counter&&counter.textContent!==counterLabel)counter.textContent=counterLabel;
  const label=!remaining?'Dzienny limit zwycięstw wykorzystany':left?`Boss odrodzi się za ${minutes}:${seconds}`:'⚔️ Walcz';
  if(button.textContent!==label)button.textContent=label;
  button.disabled=left>0||remaining===0;
 }
 const enemyStatFactor=()=>1-Math.min(100,Math.max(0,gearBonus('enemyStatsReductionPct')))/100;
 const mobInterval=level=>interval(mobStats(level).speed*enemyStatFactor());
 const regenAmount=()=>{const multiplier=1+Math.floor(Math.max(1,Number(hero().level)||1)/100);return {hp:multiplier*(1+gearBonus('hpRegenPct')/100),ki:multiplier*.5*(1+gearBonus('kiRegenPct')/100)}};
 
 const lagunaMobs=Array.from({length:MOB_COUNT},(_,i)=>({id:i,level:1,name:'Kukła Treningowa'}));
 const islandMobs=Array.from({length:MOB_COUNT},(_,i)=>({id:i,level:3,name:'Uczeń Mistrza'}));
 const extraMobs={};for(const [loc,map] of Object.entries(EXTRA_MAPS))extraMobs[loc]=map.mobNames.length?Array.from({length:MOB_COUNT},(_,i)=>({id:i,...map.mobNames[i%map.mobNames.length]})):[];
 const currentMobs=()=>extraMap(player.location)?extraMobs[player.location]:player.location==='island'?islandMobs:lagunaMobs;
 let selected=new Set(),battle=null,lastSide='none',lastRender=0,uiBattle=null;const sellSelection=new Set();
 try{
  const old=JSON.parse(localStorage.getItem(battleKey)||'null');
  if(old&&old.status&&Array.isArray(old.enemies)){
   battle=old;
   if(battle.boss&&battle.status==='running'){for(const enemy of battle.enemies){const damageAlreadyTaken=Math.max(0,(Number(enemy.max)||0)-(Number(enemy.hp)||0));enemy.max=forestBossStats.hp;enemy.hp=Math.max(0,forestBossStats.hp-damageAlreadyTaken)}}
   if(!battle.combatVersion){
    const ch=hero();
    battle.maxHp=ch.maxHp??50;battle.hp=battle.maxHp;
    battle.maxKi=ch.maxKi??100;battle.ki=battle.maxKi;
    battle.enemies.forEach(e=>{e.max=mobHp(e.level);e.hp=e.max;e.nextAttack=Date.now()+mobInterval(e.level);e.rewarded=false;});
    battle.nextHeroAttack=Date.now()+heroInterval(Date.now());battle.nextRegen=Date.now()+REGEN_MS;
    battle.updated=Date.now();battle.combatVersion=2;
    battle.log=Array.isArray(battle.log)?battle.log:[];
   }
  }
 }catch{}
 function persistBattle(){try{localStorage.setItem(battleKey,JSON.stringify(battle))}catch{}}
 function inTent(){return player.location==='laguna'&&Math.abs(player.x-TENT.x)<36&&Math.abs(player.y-TENT.y)<35}
 function inTraining(){return nearTraining()||nearExtraMobs()}
 // Zasilany pełnym snapshotem postaci z bieżącego serwera; x/y to numery pól.
 let presence=[];
 let lastPresenceTile='';
 function setNearbyPlayers(players){
  if(!Array.isArray(players))return;
  presence=players.filter(p=>p&&p.id!=null&&typeof p.name==='string'&&typeof p.location==='string'&&Number.isInteger(p.x)&&Number.isInteger(p.y));
  lastPresenceTile='';
 }
 function regionOverview(){
  const x=Math.floor(player.x/TILE),y=Math.floor(player.y/TILE);
  const title=DBI_WORLD_LOCATIONS.find(loc=>loc.id===player.location)?.name||'Świat';
  const occupants=new Map([[String(id),dbiPlayerName()+' (Ty)']]);
  for(const entry of presence){
   if(entry.location===player.location&&entry.x===x&&entry.y===y&&String(entry.id)!==String(id))occupants.set(String(entry.id),entry.name);
  }
  return '<header class="region-cover"><h2>'+escapeText(title)+'</h2></header><section class="region-register"><h3>Gracze na polu ('+x+', '+y+')</h3><ul>'+Array.from(occupants.values(),name=>'<li><span class="region-icon" aria-hidden="true">♟</span><strong>'+escapeText(name)+'</strong></li>').join('')+'</ul></section>';
 }
 function updateSide(force=false){
  const mode=battle&&battle.status==='running'?'running':battle&&battle.status==='finished'?'finished':extraMap(player.location)?(bossOpen&&nearForestBoss()?'forestBoss':questOpen&&nearNorthQuest()?'northQuest':questOpen&&nearTowerQuest()?'towerJourney':questOpen&&nearExtraNpc()?'extraNpc':nearDungeon()?'dungeon':inTraining()?'tent':'extra'):player.location==='island'?(questOpen&&nearKrillin()?'krillin':questOpen&&nearHouse()?'islandQuest':inTraining()?'tent':'island'):questOpen?'quest':inTent()?'tent':'none';
  if(mode==='extra'||mode==='island'||mode==='none'){
   const tileKey=player.location+'/'+Math.floor(player.x/TILE)+'/'+Math.floor(player.y/TILE);
   if(lastPresenceTile!==tileKey){force=true;lastPresenceTile=tileKey}
  }
  if(!force&&mode===lastSide&&side.dataset.region===player.location){
   if(mode==='dungeon'){
    const disabled=!canEnterDungeon();
    for(const button of side.querySelectorAll('[data-dungeon-enter],[data-dungeon-auto]'))button.disabled=disabled;
    const limit=side.querySelector('[data-dungeon-limit]');
    if(limit){const label=dungeonEntryLabel();if(limit.textContent!==label)limit.textContent=label}
   }
   return;
  }
  const previousList=side.querySelector('.world-mobs');
  const previousScroll=previousList?previousList.scrollTop:0;
  lastSide=mode;
  side.dataset.region=player.location;
  side.dataset.view=mode;
  if(mode==='northQuest'){renderNorthQuest(nearNorthQuest());return}
  if(mode==='towerJourney'){renderTowerJourney();return}
  if(mode==='forestBoss'){
   const boss={name:'Leśny Wojownik (Boss)',level:120};
   side.innerHTML='<div class="dbi-quest-panel"><header class="dbi-quest-title">Leśny Wojownik (Boss) — Poziom 120</header><section class="dbi-quest-story"><p>Najpotężniejszy wojownik z wszystkich Leśnych Wojowników!</p><p>Walka z nim jest ryzykowna, ale nagroda jest równie potężna.</p></section><div class="world-quest-progress done"><div class="world-mobs"><div class="world-mob selected"><span class="world-mob-select" aria-selected="true">'+questPortrait(boss.name)+' Leśny Wojownik (Boss)</span><span class="world-mob-level">Poziom 120</span><span class="world-mob-stats-wrap"><button type="button" class="world-mob-stats-trigger" id="forestBossStats" aria-label="Statystyki bossa">🔍</button></span><button type="button" class="world-mob-info" id="forestBossLoot" title="Możliwy drop" aria-label="Możliwy drop bossa">ⓘ</button></div></div></div><p id="forestBossAttempts"></p><div class="dbi-quest-buttons"><button class="world-action" id="forestBossFight">⚔️ Walcz</button><button class="world-action secondary" id="forestBossClose">Zamknij</button></div></div>';
   const trigger=side.querySelector('#forestBossStats');let tip=null;
   const hide=()=>{if(tip){tip.remove();tip=null}};
   const show=()=>{hide();tip=document.createElement('div');tip.className='world-mob-stats-tip';tip.textContent=mobStatsTooltip(boss).split(' | ').join('\n');tip.style.cssText='display:block;white-space:pre-line;position:fixed;z-index:2147483647;padding:10px 14px;max-width:250px;pointer-events:none';document.body.appendChild(tip);const r=trigger.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(window.innerWidth-260,r.left-210))+'px';tip.style.top=Math.max(8,Math.min(window.innerHeight-tip.offsetHeight-8,r.top))+'px'};
   trigger.addEventListener('mouseenter',show);trigger.addEventListener('mouseleave',hide);trigger.addEventListener('focus',show);trigger.addEventListener('blur',hide);trigger.addEventListener('click',()=>tip?hide():show());
   side.querySelector('#forestBossLoot').onclick=()=>{const shade=document.createElement('div');shade.className='world-drop-backdrop';shade.innerHTML='<section class="world-drop-dialog" role="dialog" aria-modal="true"><div class="world-drop-heading"><h3>ⓘ Leśny Wojownik (Boss) · poziom 120</h3><button class="world-action secondary" data-close>✕</button></div><p>Możliwe przedmioty:</p><div class="world-drop-items"><div class="world-drop-item"><img src="assets/items/skrzynia-lesnego-wojownika.png" alt="" style="width:42px;height:42px;object-fit:contain"><small>Skrzynia Leśnego Wojownika — 100%</small></div></div></section>';container.appendChild(shade);shade.querySelector('[data-close]').onclick=()=>shade.remove();shade.addEventListener('pointerdown',e=>{if(e.target===shade)shade.remove()})};
   side.querySelector('#forestBossFight').onclick=()=>{hide();if(canFightBoss())openPvePreparation(true)};
   updateBossCountdown(true);
   side.querySelector('#forestBossClose').onclick=()=>{hide();bossOpen=false;lastSide='';updateSide(true)};
  }
  else if(mode==='quest'){
   side.innerHTML=formatQuestMarkup(questMarkup());
   side.querySelector('#worldTravelAccept')?.addEventListener('click',travelToIsland);
   side.querySelector('#worldQuestClose')?.addEventListener('click',()=>{questOpen=false;lastSide='';updateSide(true)});
   side.querySelector('#worldQuestAccept')?.addEventListener('click',()=>{quest.state='accepted';quest.kills=0;saveQuest();lastSide='';updateSide(true)});
   side.querySelector('#worldQuest2Accept')?.addEventListener('click',()=>{if(quest.state!=='completed')return;quest2.state='accepted';saveQuest2();lastSide='';updateSide(true)});
   side.querySelector('#worldQuest2Claim')?.addEventListener('click',()=>{
    if(quest.state!=='completed'||quest2.state!=='accepted')return;
    if(!window.DBIWorldInventory?.exchangeWhiteBelt?.()){lastSide='';updateSide(true);return;}
    quest2.state='dialog';saveQuest2();window.DBIDaily?.record('quests',1);lastSide='';updateSide(true);
   });
   side.querySelector('#worldQuest2DialogDone')?.addEventListener('click',()=>{
    if(quest2.state!=='dialog')return;
    const reward=Array(7).fill('small-dragon-balls');
    const granted=window.DBIWorldInventory?.grant(reward)||0;
    if(granted!==7){side.insertAdjacentHTML('beforeend','<p class="world-quest-error">Nie udało się dodać nagrody. Zwolnij miejsce w ekwipunku i spróbuj ponownie.</p>');return;}
    quest2.state='completed';saveQuest2();lastSide='';updateSide(true);
   });
   side.querySelector('#worldQuestClaim')?.addEventListener('click',()=>{
    if(quest.state!=='accepted'||quest.kills<10)return;
    const granted=window.DBIWorldInventory?.grantTrainingDummyQuestReward?.()===true;
    if(!granted){side.insertAdjacentHTML('beforeend','<p class="world-quest-error">Nie udało się dodać nagrody do ekwipunku. Spróbuj ponownie.</p>');return;}
    quest.state='completed';saveQuest();window.DBIDaily?.record('quests',1);lastSide='';updateSide(true);
   });
  }
  else if(mode==='extraNpc'){
   const npc=nearExtraNpc();const index=extraMap(player.location)?.npc.indexOf(npc)??-1;
   if(player.location==='forest'&&index>=0){side.innerHTML=formatQuestMarkup(forestNpcMarkup(index));side.querySelector('#forestClaim')?.addEventListener('click',()=>claimForest(index));side.querySelector('#forestClose')?.addEventListener('click',()=>{questOpen=false;lastSide='';updateSide(true)})}
   else if(player.location==='mountain'&&index===0){side.innerHTML=formatQuestMarkup(mountainRoshiMarkup());side.querySelector('#mountainClaim')?.addEventListener('click',claimMountainRoshi);side.querySelector('#mountainClose')?.addEventListener('click',()=>{questOpen=false;lastSide='';updateSide(true)})}
   else if(player.location==='mountain'&&index===1){side.innerHTML=formatQuestMarkup(wandererMarkup());side.querySelector('#wandererAccept')?.addEventListener('click',acceptWanderer);side.querySelector('#wandererClaim')?.addEventListener('click',claimWanderer);side.querySelector('#wandererBeanAccept')?.addEventListener('click',acceptWandererBean);side.querySelector('#wandererBeanClaim')?.addEventListener('click',claimWandererBean);side.querySelector('#wandererClose')?.addEventListener('click',()=>{questOpen=false;lastSide='';updateSide(true)})}
   else if(player.location==='centralForest'&&index===0){
    side.innerHTML=formatQuestMarkup(woodcutterMarkup());
    side.querySelector('#woodcutterNext')?.addEventListener('click',woodcutterNext);
    side.querySelector('#woodcutterClose')?.addEventListener('click',()=>{questOpen=false;lastSide='';updateSide(true)});
    const trigger=side.querySelector('#woodcutterStats');
    if(trigger){
     let tip=null;
     const hide=()=>{if(tip){tip.remove();tip=null}};
     const show=()=>{
      hide();
      const d=soldierStats;
      const lines=[d.name,'Rasa: '+d.race,'Poziom: '+d.level,'Siła: '+d.strength,'Szybkość: '+d.speed,'Wytrzymałość: '+d.endurance,'Inteligencja: '+d.intelligence,'KI: '+d.ki,'Atak: '+d.attack,'Obrona: '+d.defense,'HP: '+d.hp];
      tip=document.createElement('div');tip.className='world-mob-stats-tip';
      lines.forEach(line=>{const el=document.createElement('div');el.textContent=line;el.style.cssText='white-space:nowrap;line-height:1.65';tip.appendChild(el)});
      tip.style.cssText='display:block;position:fixed;z-index:2147483647;left:0;top:0;width:max-content;min-width:160px;max-width:calc(100vw - 16px);padding:10px 14px;pointer-events:none';
      document.body.appendChild(tip);
      const rect=trigger.getBoundingClientRect(),size=tip.getBoundingClientRect();
      tip.style.left=Math.max(8,Math.min(window.innerWidth-size.width-8,rect.left-size.width-10>=8?rect.left-size.width-10:rect.right+10))+'px';
      tip.style.top=Math.max(8,Math.min(window.innerHeight-size.height-8,rect.top+(rect.height-size.height)/2))+'px';
     };
     trigger.addEventListener('mouseenter',show);trigger.addEventListener('mouseleave',hide);
     trigger.addEventListener('focus',show);trigger.addEventListener('blur',hide);
    }
   }
   else if(player.location==='centralForest'&&index===1){side.innerHTML=formatQuestMarkup(fishermanMarkup());side.querySelector('#fishermanNext')?.addEventListener('click',fishermanNext);side.querySelector('#fishermanClose')?.addEventListener('click',()=>{questOpen=false;lastSide='';updateSide(true)})}
   else if(player.location==='centralForest'&&index===2){side.innerHTML=formatQuestMarkup(fatherMarkup());side.querySelector('#fatherNext')?.addEventListener('click',fatherNext);side.querySelector('#fatherClose')?.addEventListener('click',()=>{questOpen=false;lastSide='';updateSide(true)})}
   else if(player.location==='stadium'&&index>=0){side.innerHTML=formatQuestMarkup(stadiumQuestMarkup(index===1));side.querySelector('#stadiumClaim')?.addEventListener('click',()=>stadiumClaim(index===1));side.querySelector('#stadiumClose')?.addEventListener('click',()=>{questOpen=false;lastSide='';updateSide(true)})}
   else{side.innerHTML='<h2>📜 '+escapeText(npc?.label||'NPC')+'</h2><p>Witaj, wojowniku!</p><button class="world-action secondary" id="extraNpcClose">Zamknij</button>';side.querySelector('#extraNpcClose').onclick=()=>{questOpen=false;lastSide='';updateSide(true)}};
  }
  else if(mode==='dungeon'){
   const eligible=characterLevel()>=dungeonLevel;
   const disabled=canEnterDungeon()?'':' disabled';
   side.innerHTML=`<div class="dbi-quest-panel"><header class="dbi-quest-title">${dungeonTitle}</header>
    <section class="dbi-quest-story" aria-label="Opis"><p>Przed tobą stoi wieża, z której dobiegają dziwne odgłosy. Teraz stoisz przed wyzwaniem: zbadać to czy nie?</p></section>
    <div class="dbi-quest-goal ${eligible?'done':'pending'}">Wymagania: Posiadaj 50</div>
    <div class="dbi-quest-rewards"><strong>Nagrody</strong><div class="dbi-quest-reward-item"><img class="world-quest-chest" src="${dungeonChest.image}" alt="">${dungeonChest.name}</div></div>
    <p data-dungeon-limit>${dungeonEntryLabel()}</p>
    <div class="dbi-quest-buttons"><button type="button" class="world-action" data-dungeon-enter${disabled}>Wejdź</button><button type="button" class="world-action secondary" data-dungeon-auto${disabled}>Przejdź automatycznie</button>
    ${dungeonPending()?'<button type="button" class="world-action" data-dungeon-claim>Odbierz skrzynię</button>':''}</div><p role="status" data-dungeon-status hidden></p></div>`;
   side.querySelector('[data-dungeon-enter]').onclick=openDungeon;
   side.querySelector('[data-dungeon-auto]').onclick=()=>{if(canEnterDungeon())openPvePreparation(false,true)};
   const claim=side.querySelector('[data-dungeon-claim]');
   if(claim)claim.onclick=()=>{
    const message=claimDungeonChest();updateSide(true);
    const status=side.querySelector('[data-dungeon-status]');
    if(status&&message){status.hidden=false;status.textContent=message}
   };
   return;
  }
  else if(mode==='extra'){
   side.innerHTML=regionOverview();
  }
  else if(mode==='krillin'){
   side.innerHTML=formatQuestMarkup(krillinQuestMarkup());
   const inspect=side.querySelector('.krillin-inspect');
   if(inspect){
    const pop=inspect.querySelector('.krillin-inspect-pop');
    const show=()=>{
     // Przeniesienie dymka poza panel zapobiega ucinaniu go przez overflow.
     document.body.appendChild(pop);
     pop.style.position='fixed';pop.style.display='block';pop.style.zIndex='99999';
     pop.style.top='0px';pop.style.left='0px';
     const rect=inspect.getBoundingClientRect();
     const width=pop.getBoundingClientRect().width;
     const height=pop.getBoundingClientRect().height;
     const x=Math.max(8,Math.min(rect.left,window.innerWidth-width-8));
     const y=Math.max(8,Math.min(rect.bottom+8,window.innerHeight-height-8));
     pop.style.left=x+'px';pop.style.top=y+'px';
    };
    const hide=()=>{pop.style.display='none';if(pop.parentNode===document.body)inspect.appendChild(pop)};
    for(const ev of ['mouseenter','focus'])inspect.addEventListener(ev,show);
    for(const ev of ['mouseleave','blur'])inspect.addEventListener(ev,hide);
   }
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
   side.innerHTML=formatQuestMarkup(islandQuestMarkup());
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
   side.innerHTML=regionOverview();
  }
  else if(mode==='running'){side.innerHTML='<h2>⚔️ Trwa walka</h2><p>Walka trwa również po ukryciu jej okna lub przejściu do innej zakładki. Maksymalny czas: 12 godzin.</p><div class="world-side-actions"><button class="world-action" id="worldShowBattle">Otwórz okno walki</button></div>';side.querySelector('#worldShowBattle').onclick=()=>{showBattle()}}
  else if(mode==='finished'){side.innerHTML='<h2>🎒 Walka zakończona</h2><p>Odbierz zdobyte złoto i doświadczenie. Z mobów mogą wypaść Czerwona i Niebieska Fasolka Zen oraz Pył smoczych kul.</p><button class="world-action" id="worldShowBattle">Otwórz wyniki walki</button>';side.querySelector('button').onclick=()=>{showBattle()}}
  else if(mode==='tent'){
   const location=extraMap(player.location);
   const cave=player.location==='mountainLake';
   const title=cave?'Jaskinia':location?.mobs?.label==='Moby'?location.name:location?.mobs?.label||(player.location==='island'?'Plac treningowy mistrza':'Namiot treningowy');
   const description=cave?'Górska jaskinia, w której trenują potężni wojownicy. Zmierz się z nimi i zdobądź łupy oraz doświadczenie.':'Wybierz od jednego do trzech przeciwników do walki.';
   side.innerHTML='<h2 class="encounter-heading">'+escapeText(title)+'</h2><p>'+description+'</p><div id="worldCount">Wybrano: '+selected.size+' / 3</div><div class="world-mobs">'+currentMobs().map((m,index)=>{
    const art='<img src="'+mobPortrait(m.name)+'" alt="">';
    return '<div class="world-mob '+(selected.has(m.id)?'selected':'')+'"><button type="button" class="world-mob-select" data-mob="'+m.id+'" aria-pressed="'+selected.has(m.id)+'"><span class="encounter-portrait">'+art+'</span><span class="encounter-name">'+escapeText(m.name)+'<small>Poz. '+m.level+'</small></span></button><span class="world-mob-stats-wrap"><button type="button" class="world-mob-stats-trigger" aria-label="Statystyki '+escapeText(m.name)+'" data-stats="'+escapeText(mobStatsTooltip(m))+'">🔍</button></span><button type="button" class="world-mob-info" data-info="'+m.id+'" title="Możliwy drop" aria-label="Możliwy drop: '+m.name+', poziom '+m.level+'">ⓘ</button></div>';
   }).join('')+'</div><div class="world-side-actions"><button class="world-action" id="worldFight" '+(!selected.size?'disabled':'')+'>⚔　Walcz</button></div>';
   side.querySelectorAll('[data-mob]').forEach(button=>button.onclick=()=>{const i=Number(button.dataset.mob);if(selected.has(i))selected.delete(i);else if(selected.size<3)selected.add(i);updateSide(true)});
   // Dymek poza przewijanym panelem: nie przycina go overflow listy potworów.
   side.querySelectorAll('.world-mob-stats-trigger').forEach(trigger=>{
    let floating=null;
    const hide=()=>{if(floating){floating.remove();floating=null}};
    const show=()=>{
     hide();
     const stats=trigger.dataset.stats;
     if(!stats)return;
     floating=document.createElement('div');
     floating.className='world-mob-stats-tip';
     const entries=stats.split(' | ');
     entries.forEach(entry=>{
      const line=document.createElement('div');
      line.textContent=entry;
      line.style.cssText='display:block;white-space:nowrap;line-height:1.65';
      floating.appendChild(line);
     });
     floating.style.cssText='display:block;position:fixed;z-index:2147483647;right:auto;bottom:auto;left:0;top:0;width:max-content;min-width:160px;max-width:calc(100vw - 16px);padding:10px 14px;pointer-events:none;';
     document.body.appendChild(floating);
     const rect=trigger.getBoundingClientRect();
     const size=floating.getBoundingClientRect();
     const left=Math.max(8,Math.min(window.innerWidth-size.width-8,rect.left-size.width-10>=8?rect.left-size.width-10:rect.right+10));
     const top=Math.max(8,Math.min(window.innerHeight-size.height-8,rect.top+(rect.height-size.height)/2));
     floating.style.left=left+'px';
     floating.style.top=Math.max(8,top)+'px';
    };
    trigger.addEventListener('mouseenter',show);
    trigger.addEventListener('mouseleave',hide);
    trigger.addEventListener('focus',show);
    trigger.addEventListener('blur',hide);
    trigger.addEventListener('click',event=>{event.stopPropagation();if(floating)hide();else show()});
   });
   side.querySelector('.world-mobs').scrollTop=previousScroll;
   side.querySelectorAll('[data-info]').forEach(button=>button.onclick=()=>showDropInfo(Number(button.dataset.info)));
   side.querySelector('#worldFight').onclick=()=>openPvePreparation(false);
  }else side.innerHTML=regionOverview();
 }
 function showDropInfo(i){
  const mob=currentMobs()[i];if(!mob)return;
  const commonChance=formatDropChance(commonMobDropChance);
  const shade=document.createElement('div');shade.className='world-drop-backdrop';
  shade.innerHTML='<section class="world-drop-dialog" role="dialog" aria-modal="true" aria-label="Możliwy drop"><div class="world-drop-heading"><h3>ⓘ '+escapeText(mob.name)+' · poziom '+mob.level+'</h3><button type="button" class="world-action secondary" data-close>✕</button></div><p>Możliwe przedmioty:</p><div class="world-drop-items">'+
   '<div class="world-drop-item"><img src="assets/items/fasolka-zen-red.png" alt="" style="width:42px;height:42px;object-fit:contain"><small>Czerwona Fasolka Zen — '+commonChance+'</small></div>'+
   '<div class="world-drop-item"><img src="assets/items/fasolka-zen-blue.png" alt="" style="width:42px;height:42px;object-fit:contain"><small>Niebieska Fasolka Zen — '+commonChance+'</small></div>'+
   '<div class="world-drop-item"><img src="assets/items/pyl-smoczych-kul.png" alt="" style="width:42px;height:42px;object-fit:contain"><small>Pył smoczych kul — '+commonChance+'</small></div>'+
   (player.location==='centralForest'&&mob.name==='Leśny Wojownik'?'<div class="world-drop-item"><img src="assets/items/ruda-kowalstwa.png" alt="" style="width:42px;height:42px;object-fit:contain"><small>Ruda Kowalstwa — '+formatDropChance(smithOreChance())+'</small></div><div class="world-drop-item"><img src="assets/items/kamien-zolwia.png" alt="" style="width:42px;height:42px;object-fit:contain"><small>Kamień Żółwia — '+commonChance+'</small></div><div class="world-drop-item"><img src="assets/items/male-smocze-kule.png" alt="" style="width:42px;height:42px;object-fit:contain"><small>Małe Smocze Kule — '+commonChance+'</small></div>':'')+
   (['forest','mountain'].includes(player.location)?'<div class="world-drop-item"><img src="assets/items/kamien-zolwia.png" alt="" style="width:42px;height:42px;object-fit:contain"><small>Kamień Żółwia — '+commonChance+'</small></div><div class="world-drop-item"><img src="assets/items/male-smocze-kule.png" alt="" style="width:42px;height:42px;object-fit:contain"><small>Małe Smocze Kule — '+commonChance+'</small></div>':'')+
   bonusMobDrops(player.location,mob.name).map(item=>`<div class="world-drop-item"><img src="${item.image}" alt="" style="width:42px;height:42px;object-fit:contain"><small>${item.name} — ${commonChance}</small></div>`).join('')+
   '</div></section>';
  container.appendChild(shade);
  const close=()=>shade.remove();shade.querySelector('[data-close]').onclick=close;shade.addEventListener('pointerdown',e=>{if(e.target===shade)close()});
 }
 function beginSoldierBattle(){
  if(worldTrainingActive()){worldTrainingNotice();return}
  if(battle?.status==='running'||window.DBIStoryCombat?.isRunning?.()||woodcutter.stage!==1||woodcutter.won)return;
  // Walki fabularne używają tego samego systemu turowego co turniej na Stadionie 1.
  const combat=window.DBIStoryCombat;
  if(typeof combat?.open!=='function')return;
  const d=soldierStats;
  combat.open({
   characterId:id,
   playerName:document.querySelector('#name')?.textContent||'Wojownik',
   playerRace:'Wojownik',
   opponentName:d.name,
   opponentStats:{
    level:d.level,race:d.race,strength:d.strength,speed:d.speed,
    endurance:d.endurance,intelligence:d.intelligence,ki:d.ki,
    attack:d.attack,defense:d.defense,maxHp:d.hp,maxKi:d.ki
   },
   onFinish:(result)=>{
    if(result==='win'){woodcutter.won=true;saveWoodcutter()}
    lastSide='';updateSide(true);
   }
  });
 }
 const pveSettingsKey='dboidle_pve_settings_v1_'+String(id||'test');
 function pveSettings(){let s={};try{s=JSON.parse(localStorage.getItem(pveSettingsKey)||'{}')||{}}catch{}return {red:s.red!==false,blue:s.blue!==false,green:s.green===true,greenMinutes:[10,20,30,40,50,60].includes(Number(s.greenMinutes))?Number(s.greenMinutes):10,redAt:Math.max(1,Math.min(100,Number(s.redAt)||50)),blueAt:Math.max(1,Math.min(100,Number(s.blueAt)||40)),techniques:Array.isArray(s.techniques)?s.techniques:null}}
 function openPvePreparation(isBoss,isDungeon=false){
  if(worldTrainingActive()){worldTrainingNotice();return}
  if(battle?.status==='running')return;
  const previous=pveSettings(),available=window.DBIWorldTechniques?.()||[];
  const backdrop=document.createElement('div');backdrop.className='world-prep-backdrop';
  const knownEnabled=t=>!Array.isArray(previous.techniques)||previous.techniques.includes(t.id);
  backdrop.innerHTML=`<section class="world-prep-dialog" role="dialog" aria-modal="true" aria-label="Przygotowanie do walki"><header><h2>⚔️ Przygotowanie do walki</h2><button type="button" data-prep-close aria-label="Zamknij">✕</button></header><h3>Techniki</h3><p>Kliknij ikonę, aby wyłączyć lub włączyć technikę. Fala Uderzeniowa: odnowienie 20 sekund, koszt 100 KI.</p><div class="world-prep-techs">${available.length?available.map(t=>`<button type="button" class="world-prep-tech-icon ${knownEnabled(t)?'':'is-disabled'}" data-prep-tech="${escapeText(t.id)}" aria-pressed="${knownEnabled(t)}" title="${escapeText(t.name)}"><img src="${escapeText(t.image)}" alt="${escapeText(t.name)}"></button>`).join(''):'<p>Nie masz jeszcze odblokowanych technik.</p>'}</div><h3>Przedmioty użytkowe</h3>
  ${[['red','Czerwona Fasolka Zen','HP',previous.redAt,previous.red],['blue','Niebieska Fasolka Zen','KI',previous.blueAt,previous.blue]].map(([color,name,stat,value,enabled])=>`<div class="world-prep-bean"><button type="button" class="world-prep-bean-icon ${enabled?'':'is-disabled'}" data-prep-toggle="${color}" aria-pressed="${enabled}" title="Kliknij, aby włączyć lub wyłączyć: ${name}"><img src="assets/items/fasolka-zen-${color}.png" alt="${name}"></button><span>${name} — użyj przy ${stat} ≤</span><div class="world-prep-slider"><input type="range" data-prep-${color}at min="1" max="100" step="1" value="${value}" aria-label="Próg ${stat} w procentach"><output data-prep-value="${color}">${value}%</output></div></div>`).join('')}
  <div class="world-prep-bean"><button type="button" class="world-prep-bean-icon ${previous.green?'':'is-disabled'}" data-prep-toggle="green" aria-pressed="${previous.green}" title="Kliknij, aby włączyć lub wyłączyć zieloną fasolkę"><img src="assets/items/fasolka-zen-green.png" alt="Zielona Fasolka Zen"></button><span>Zielona Fasolka Zen — używaj co <strong id="worldGreenMinutes">${previous.greenMinutes} min</strong><small style="display:block">+100% szybkości ataku na 10 minut</small></span><div class="world-prep-slider"><input type="range" data-prep-greenminutes min="10" max="60" step="10" value="${previous.greenMinutes}" aria-label="Odstęp używania zielonej fasolki"><output data-prep-value="green">${previous.greenMinutes} min</output></div></div>
  <footer><button type="button" class="world-action secondary" data-prep-close>Anuluj</button><button type="button" class="world-action" data-prep-start>⚔️ Walcz</button></footer></section>`;
  container.appendChild(backdrop);
  const close=()=>backdrop.remove();backdrop.querySelectorAll('[data-prep-close]').forEach(b=>b.onclick=close);backdrop.addEventListener('pointerdown',e=>{if(e.target===backdrop)close()});
  backdrop.querySelectorAll('[data-prep-tech],[data-prep-toggle]').forEach(button=>button.addEventListener('click',()=>{
   const active=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(active));button.classList.toggle('is-disabled',!active);
  }));
  const updateSliderFill=input=>{
   const min=Number(input.min)||0,max=Number(input.max)||100,value=Number(input.value)||0;
   const percent=Math.max(0,Math.min(100,(value-min)/(max-min||1)*100));
   input.style.setProperty('--world-slider-progress',percent+'%');
  };
  backdrop.querySelectorAll('.world-prep-slider input').forEach(input=>{
   updateSliderFill(input);
   input.addEventListener('input',()=>{
   const type=input.dataset.prepGreenminutes!==undefined?'green':input.dataset.prepRedat!==undefined?'red':'blue';
   const label=String(input.value)+(type==='green'?' min':'%');backdrop.querySelector(`[data-prep-value="${type}"]`).textContent=label;
   if(type==='green')backdrop.querySelector('#worldGreenMinutes').textContent=label;
   updateSliderFill(input);
   });
  });
  backdrop.querySelector('[data-prep-start]').onclick=()=>{
   const val=sel=>Math.max(1,Math.min(100,Math.trunc(Number(backdrop.querySelector(sel).value)||1)));
   const enabled=color=>backdrop.querySelector(`[data-prep-toggle="${color}"]`).getAttribute('aria-pressed')==='true';
   const s={red:enabled('red'),blue:enabled('blue'),green:enabled('green'),greenMinutes:Number(backdrop.querySelector('[data-prep-greenminutes]').value),redAt:val('[data-prep-redat]'),blueAt:val('[data-prep-blueat]'),techniques:[...backdrop.querySelectorAll('[data-prep-tech][aria-pressed="true"]')].map(x=>x.dataset.prepTech)};
   localStorage.setItem(pveSettingsKey,JSON.stringify(s));close();if(isBoss)beginBossBattle();else beginBattle(isDungeon);
  };
 }
 function beginBossBattle(){
  if(worldTrainingActive()){worldTrainingNotice();return}
  if(battle?.status==='running'||!canFightBoss())return;
  const now=Date.now(),ch=hero(),level=120,name='Leśny Wojownik (Boss)';
  const nextBattle={location:'centralForest',boss:true,combatVersion:2,status:'running',started:now,updated:now,round:0,kills:0,gold:0,exp:0,totalDamage:0,loot:[],log:[],enemies:[{id:0,level,name,hp:forestBossStats.hp,max:forestBossStats.hp,nextAttack:now+bossInterval(forestBossStats.speed*enemyStatFactor())}],hp:ch.maxHp??50,maxHp:ch.maxHp??50,ki:ch.maxKi??100,maxKi:ch.maxKi??100,nextHeroAttack:now+500,nextRegen:now+REGEN_MS,nextZenUse:now+1000,heroHits:0,heroDamageTaken:0,pveOptions:pveSettings(),nextWaveAt:now,nextGreenAt:now};
  try{localStorage.setItem(battleKey,JSON.stringify(nextBattle))}
  catch{
   const counter=side.querySelector('#forestBossAttempts');
   if(counter)counter.textContent='Nie udało się zapisać walki.';
   return;
  }
  battle=nextBattle;
  bossOpen=false;sellSelection.clear();keys.clear();uiBattle=null;updateSide(true);showBattle();
 }
 function dungeonEnemy(stage,now){
  const floor=Math.floor(stage/3), slot=stage%3;
  const level=50+floor*5+slot*3;
  const name=['Rycerz wieży','Rycerz elity','Dowódca piętra'][slot];
  const hp=mobHp(level)*(slot===2?1.65:1);
  return {id:stage,name,level,hp,max:hp,nextAttack:now+mobInterval(level)};
 }
 const dungeonStages=Array.from({length:5},(_,floor)=>Array.from({length:4+floor},(_,wave)=>({
  floor,wave,boss:wave===3+floor
 }))).flat();
 function dungeonWave(stage,now){
  const {floor,wave,boss}=dungeonStages[stage];
  return Array.from({length:boss?1:3},(_,slot)=>{
   const level=50+floor*5+(boss?8:slot*2);
   const name=boss?'Dowódca piętra '+(floor+1):['Rycerz wieży','Rycerz elity','Strażnik wieży'][slot];
   const hp=Math.round(mobHp(level)*(boss?2:1));
   return {id:stage*3+slot,level,name,hp,max:hp,dungeonBoss:boss,nextAttack:now+mobInterval(level)};
  });
 }
 function beginBattle(isDungeon=false){
  if(worldTrainingActive()){worldTrainingNotice();return;}
  if(isDungeon?!canEnterDungeon():!selected.size||battle?.status==='running')return;
  const now=Date.now();
  const ch=hero();
  const mobList=currentMobs();
  const nextBattle={location:player.location,combatVersion:2,status:'running',started:now,updated:now,round:0,kills:0,gold:0,exp:0,totalDamage:0,loot:[],log:[],
   enemies:isDungeon?dungeonWave(0,now):[...selected].map(i=>({id:i,level:mobList[i].level,name:mobList[i].name,hp:mobHp(mobList[i].level),max:mobHp(mobList[i].level),nextAttack:now+mobInterval(mobList[i].level)})),
   hp:ch.maxHp??50,maxHp:ch.maxHp??50,ki:ch.maxKi??100,maxKi:ch.maxKi??100,
   nextHeroAttack:now+500,nextRegen:now+REGEN_MS,nextZenUse:now+1000,heroHits:0,heroDamageTaken:0,pveOptions:pveSettings(),nextWaveAt:now,nextGreenAt:now};
  if(isDungeon){
   nextBattle.dungeonStage=0;nextBattle.dungeonLayout=2;
   const previousEntry=localStorage.getItem(dungeonDayKey);
   if(!reserveDungeonEntry())return;
   try{localStorage.setItem(battleKey,JSON.stringify(nextBattle))}
   catch{
    try{
     if(previousEntry===null)localStorage.removeItem(dungeonDayKey);
     else localStorage.setItem(dungeonDayKey,previousEntry);
    }catch{}
    return;
   }
  }
  battle=nextBattle;
  selected.clear();sellSelection.clear();keys.clear();uiBattle=null;persistBattle();updateSide(true);showBattle();
 }
 function appendLog(line){battle.log.unshift('['+new Date().toLocaleTimeString('pl-PL')+'] '+line);battle.log.length=Math.min(80,battle.log.length)}
 function rewardDefeat(target,next,until){
  if(target.hp>0||target.rewarded)return;
  if(battle.dungeonStage!=null){
   target.rewarded=true;battle.kills++;
   const boss=target.dungeonBoss===true||(battle.dungeonLayout!==2&&battle.dungeonStage%3===2);
   if(!boss)battle.loot.push(...rollDungeonMobLoot(),...rollHiddenMobLoot());
   if(battle.enemies.some(enemy=>enemy.hp>0||!enemy.rewarded))return;
   const staged=battle.dungeonLayout===2;
   if(battle.dungeonStage===(staged?dungeonStages.length-1:14)){
    battle.loot.push({...dungeonChest});
    finishBattle('Wyzwanie Wysokiej Wieży ukończone.');
    showBattle();
    return;
   }
   animateDefeatedGroup();
   battle.dungeonStage++;
   battle.enemies=staged?dungeonWave(battle.dungeonStage,next):[dungeonEnemy(battle.dungeonStage,next)];
   const stage=staged?dungeonStages[battle.dungeonStage]:null;
   if(stage?stage.wave===0:battle.dungeonStage%3===0)appendLog('Rozpoczyna się piętro '+((stage?.floor??Math.floor(battle.dungeonStage/3))+1)+' / 5.');
   return;
  }
  if(battle.boss){
   const wins=bossWinsToday(next);
   if(wins.used>=bossDailyLimit){finishBattle('Dzienny limit zwycięstw wykorzystany.');return}
   try{localStorage.setItem(bossDailyKey,JSON.stringify({...wins,used:wins.used+1}))}
   catch{finishBattle('Nie udało się zapisać zwycięstwa.');return}
  }
       target.rewarded=true;battle.kills++;if(!battle.storySoldier){window.DBIPulpit?.add?.(id,battle.boss?'bosses':'battlePoints',battle.boss?1:1+spiritBonus('battlePoints')+gearBonus('battlePointsBonus'));}if(battle.storySoldier){woodcutter.won=true;saveWoodcutter();finishBattle('Pokonano Żołnierza Czerwonej Wstęgi!');return;}if(battle.boss&&target.name==='Leśny Wojownik (Boss)'&&fisherman.stage===2){fisherman.bossKills=1;saveFisherman();}if(battle.location==='centralForest'&&['Leśny Wojownik','Leśny Wojownik (Silny)','Leśny Wojownik (Super)'].includes(target.name)&&fisherman.stage===1){fisherman.kills=Math.min(100,fisherman.kills+1);saveFisherman();}if(battle.location==='mountain'&&['Zamachowiec Góry','Zamachowiec Góry (Silny)','Zamachowiec Góry (Super)'].includes(target.name)&&wandererQuest.state==='accepted'){wandererQuest.kills=Math.min(50,wandererQuest.kills+1);saveWanderer();}if(battle.location==='island')addIslandQuestKills(1);else if(battle.location==='laguna')addQuestKills(1);else if(battle.location==='forest'&&['Dzikie zwierzę','Dzikie zwierzę (Silny)','Dzikie zwierzę (Super)'].includes(target.name)&&roshi.stage===2){roshi.kills=Math.min(30,roshi.kills+1);saveForest();}window.DBIDaily?.record('kills',1);
       if(battle.boss){
        battle.gold+=monsterGold(1000);
        battle.exp=(battle.exp||0)+(window.DBIWorldInventory?.grantExp?.(10000,true)||0);
        battle.expCredited=true;
        const bossLoot={id:'skrzynia-lesnego-wojownika',name:'Skrzynia Leśnego Wojownika',icon:'📦',sell:0,sellable:false};
        battle.loot.push(bossLoot);
        // Podwójny łup kopiuje otrzymane przedmioty, nie złoto ani EXP.
        if(Math.random()<Math.min(1,(gearBonus('doubleBossRewardsChance')+(skills().doubleBossDrop||0))/100))battle.loot.push({...bossLoot});
        localStorage.setItem(bossVictoryKey,String(next));
        finishBattle('Pokonano Leśnego Wojownika (Boss)!');return;
       }
       battle.gold+=monsterGold(target.level*5,true);
       // Drop questowy: tylko aktywny etap, maks. jeden pierścień w nieodebranym łupie.
       if(battle.location==='centralForest'&&target.name==='Leśny Wojownik (Silny)'&&father.stage===1&&
          !(window.DBIWorldInventory?.countQuestItem?.('pierscien-ojca')>0)&&
          !battle.loot.some(item=>item.id==='pierscien-ojca')&&dropRoll(0.10)){
        battle.loot.push({id:'pierscien-ojca',name:'Pierścień Ojca',icon:'💍',image:'assets/items/pierscien-ojca.png',sell:0,sellable:false});
       }
       battle.loot.push(...rollHiddenMobLoot());
       countNorthernKill(target);
       const earned=window.DBIWorldInventory?.grantMobKills?.(1,target.level,target.name)||0;
       const lootStart=battle.loot.length;
       // Niezależne losowanie po każdym zabiciu moba.
        if(dropRoll(commonMobDropChance))battle.loot.push({id:'zen-bean-red',name:'Czerwona Fasolka Zen',icon:'🔴',sell:0,sellable:false});
        if(dropRoll(commonMobDropChance))battle.loot.push({id:'zen-bean-blue',name:'Niebieska Fasolka Zen',icon:'🔵',sell:0,sellable:false});
        if(dropRoll(commonMobDropChance))battle.loot.push({id:'dragon-ball-dust',name:'Pył smoczych kul',icon:'✨',sell:0,sellable:false});
        if(battle.location==='centralForest'&&target.name==='Leśny Wojownik'){
         if(dropRoll(smithOreChance()))battle.loot.push({id:window.DBIWorldInventory?.smithOreId?.()||'ruda-kowalstwa',name:'Ruda Kowalstwa',image:'assets/items/ruda-kowalstwa.png',icon:'🪨',sell:0,sellable:false});
         if(dropRoll(commonMobDropChance))battle.loot.push({id:'quest-turtle-stone',name:'Kamień Żółwia',icon:'🪨',sell:0,sellable:false});
         if(dropRoll(commonMobDropChance))battle.loot.push({id:'small-dragon-balls',name:'Małe Smocze Kule',icon:'🟠',sell:0,sellable:false});
        }
        if(['forest','mountain'].includes(battle.location)){
         if(dropRoll(commonMobDropChance))battle.loot.push({id:'quest-turtle-stone',name:'Kamień Żółwia',icon:'🪨',sell:0,sellable:false});
         if(dropRoll(commonMobDropChance))battle.loot.push({id:'small-dragon-balls',name:'Małe Smocze Kule',icon:'🟠',sell:0,sellable:false});
        }
        for(const item of bonusMobDrops(battle.location,target.name)){
         if(dropRoll(commonMobDropChance))battle.loot.push({...item});
        }
        const doubleChance=gearBonus('doubleMobDropChance');
        if(battle.loot.length>lootStart&&doubleChance>0&&Math.random()*100<Math.min(100,doubleChance)){
         battle.loot.push(...battle.loot.slice(lootStart).map(item=>({...item})));
        }
        battle.exp=(battle.exp||0)+earned;battle.expCredited=true;
       if(until-next<10000)appendLog('Pokonano '+target.name+', +'+earned+' EXP.');
 }
 function tickBattle(){
  if(!battle||battle.status!=='running')return;
   if(!Array.isArray(battle.loot))battle.loot=[];
  const now=Date.now(),until=Math.min(now,battle.started+MAX_MS);
  if(!Number.isFinite(battle.nextZenUse))battle.nextZenUse=now+1000;
  if(!Number.isFinite(battle.nextGreenAt))battle.nextGreenAt=now;
  let iterations=0;
  // Zdarzenia są rozliczane chronologicznie: atak postaci, niezależne ataki mobów, regeneracja.
  // Limit chroni przeglądarkę po długiej nieobecności, bez pomijania zdarzeń.
  while(battle.status==='running'&&iterations++<150000){
   const next=Math.min(battle.nextHeroAttack,battle.nextRegen,battle.nextZenUse,...battle.enemies.filter(e=>e.hp>0).map(e=>Math.min(e.nextAttack,e.nextBleedAt??Infinity)));
   if(next>until)break;
   if(battle.nextRegen<=next){
    const regen=regenAmount();
    battle.hp=num(Math.min(battle.maxHp,battle.hp+regen.hp));
    battle.ki=num(Math.min(battle.maxKi,battle.ki+regen.ki));
    battle.nextRegen+=REGEN_MS;
   }
   for(const enemy of battle.enemies){
    if(enemy.hp<=0||enemy.nextBleedAt==null||enemy.nextBleedAt>next)continue;
    const damage=Math.min(enemy.hp,enemy.bleedDamage);
    enemy.hp=num(Math.max(0,enemy.hp-damage));
    battle.totalDamage=num((battle.totalDamage||0)+damage);
    enemy.bleedTicks--;
    enemy.nextBleedAt=enemy.bleedTicks>0?enemy.nextBleedAt+1000:null;
    if(until-next<10000)appendLog(enemy.name+' krwawi za '+num(damage)+' obrażeń.');
    rewardDefeat(enemy,next,until);
    if(battle.status!=='running')break;
   }
   if(battle.status!=='running')break;
   if(battle.nextHeroAttack<=next){
    const living=battle.enemies.filter(e=>e.hp>0);
    if(!living.length&&(battle.boss||battle.storySoldier)){finishBattle('Przeciwnik został pokonany.');break}
    if(!living.length){
     animateDefeatedGroup();
     // Cała grupa odradza się jednocześnie, nigdy pojedynczo.
     for(const e of battle.enemies){e.hp=e.max;e.rewarded=false;e.stunnedUntil=0;e.nextBleedAt=null;e.bleedTicks=0;e.nextAttack=next+mobInterval(e.level);}
     battle.respawnGeneration=(battle.respawnGeneration||0)+1;
     if(until-next<10000)appendLog('Cała grupa odrodziła się z pełnym HP.');
    }else{
     battle.round++;
     // Technika zastępuje normalny atak i trafia wszystkie żywe cele.
     const waveEnabled=(!Array.isArray(battle.pveOptions?.techniques)||battle.pveOptions.techniques.includes('fala_uderzeniowa'));
     const waveReady=waveEnabled&&next>=Number(battle.nextWaveAt||0)&&battle.ki>=100;
     if(waveReady){battle.ki=num(Math.max(0,battle.ki-100));battle.nextWaveAt=next+20000;if(until-next<10000)appendLog('Wojownik używa Fali Uderzeniowej (odnowienie 20 s).')}
     const attacker=hero();
     const attackPower=waveReady?(window.DBITechniqueCombat?.power?.(50,'pvm')??(50+(Number(attacker.techniqueAttackPvm)||0)+(Number(attacker.techniqueKi)||0)*.01)):Number(attacker.mobAttack??attacker.attack)||0;
     for(const target of living){
      const factor=enemyStatFactor();
      const defense=(battle.boss?forestBossStats.defense:battle.storySoldier?soldierStats.defense:mobDef(target.level)*(target.dungeonBoss?1.15:1))*factor;
      const intelligence=(battle.boss?forestBossStats.intelligence:battle.storySoldier?soldierStats.intelligence:mobStats(target.level).intelligence)*factor;
      const techniqueReduction=waveReady?(window.DBITechniqueCombat?.reduction?.(intelligence,attacker.techniqueKi)??Math.min(.5,Math.max(0,(intelligence-(Number(attacker.techniqueKi)||0))*.00001))):0;
      const baseOpponent=battle.boss?forestBossStats:battle.storySoldier?soldierStats:mobStats(target.level);
      const opponent={...baseOpponent,speed:baseOpponent.speed*factor};
      const hit=window.DBICombatHit(attackPower,defense,attacker,waveReady,techniqueReduction,opponent);
      if(hit.dodged){
       if(until-next<10000)appendLog(target.name+' unika ataku.');
       continue;
      }
      const damage=hit.damage*(battle.boss?1+signBonus('bossDamageBonusPct')/100:1);
      const actual=Math.min(target.hp,damage);
      target.hp=num(Math.max(0,target.hp-actual));
      battle.totalDamage=num((battle.totalDamage||0)+actual);
      if(until-next<10000)appendLog('Wojownik '+(waveReady?'uderza Falą Uderzeniową ':'atakuje ')+target.name+(hit.critical?' (krytyk)':'')+' za '+num(damage)+' obrażeń.');
      if(!battle.storySoldier&&target.hp>0){
       if(window.DBICombatRoll(window.DBICombatStunChance(attacker.stunChance,opponent.stunResistance))){
        target.stunnedUntil=next+3000;
        if(until-next<10000)appendLog(target.name+' zostaje ogłuszony na 3 sekundy.');
       }
       if(target.nextBleedAt==null&&window.DBICombatRoll(attacker.bleedChance)){
        target.bleedTicks=10;
        target.bleedDamage=target.hp*.01;
        target.nextBleedAt=next+1000;
        if(until-next<10000)appendLog(target.name+' krwawi przez 10 sekund.');
       }
      }
      rewardDefeat(target,next,until);
      if(battle.status!=='running')break;
     }
    }
    battle.nextHeroAttack+=heroInterval(next);
   }
   // Każdy żywy mob atakuje osobno, z własnym zegarem.
   for(const e of battle.enemies){
    if(e.hp<=0||e.nextAttack>next||battle.status!=='running')continue;
    e.nextAttack+=battle.boss?bossInterval(forestBossStats.speed*enemyStatFactor()):battle.storySoldier?interval(soldierStats.speed*enemyStatFactor()):mobInterval(e.level);
    if(e.stunnedUntil>next){
     if(until-next<10000)appendLog(e.name+' pomija atak przez ogłuszenie.');
     continue;
    }
    const defender=hero();
    const factor=enemyStatFactor();
    const attack=(battle.boss?forestBossStats.attack:battle.storySoldier?soldierStats.attack:mobAttack(e.level)*(e.dungeonBoss?1.15:1))*factor;
    const baseAttacker=battle.boss?forestBossStats:battle.storySoldier?soldierStats:mobStats(e.level);
    const attacker={...baseAttacker,speed:baseAttacker.speed*factor};
    const incoming=window.DBICombatHit(attack,Number(defender.defense)||0,attacker,false,0,defender);
    if(incoming.dodged){
     if(until-next<10000)appendLog('Wojownik unika ataku: '+e.name+'.');
     continue;
    }
    const mobReduction=Math.max(0,Number(window.DBIEquippedMonsterDamageReduction?.())||0);
    const multiplier=battle.boss
     ?Math.max(.5,(1-Math.min(100,mobReduction)/100)*(1-Math.min(50,gearBonus('bossDamageReductionPct'))/100))
     :Math.max(0,1-mobReduction/100);
    const damage=incoming.damage*multiplier;
    battle.hp=num(Math.max(0,battle.hp-damage));
    if(damage>0){battle.heroHits=(battle.heroHits||0)+1;battle.heroDamageTaken=num((battle.heroDamageTaken||0)+damage);}
    if(until-next<10000)appendLog(e.name+' atakuje za '+num(damage)+' obrażeń.');
    if(battle.hp<=0){
     battle.hp=0;
     finishBattle('Postać została pokonana. Walka zakończona.');
     showBattle();
     break;
    }
   }
   // Leczenie po atakach mobów; jeden test na sekundę.
   if(battle.status==='running'&&battle.nextZenUse<=next){
    if(battle.pveOptions?.green===true&&next>=battle.nextGreenAt){
     // Użycie zielonej fasolki wywołuje ten sam bonus co ręczne użycie w ekwipunku.
     if(window.DBIWorldInventory?.autoUseGreenZen?.()===true){
      battle.nextGreenAt=next+(Number(battle.pveOptions.greenMinutes)||10)*60000;
      if(until-next<10000)appendLog('Automatycznie użyto Zielonej Fasolki Zen (+100% szybkości ataku na 10 min).');
     }else battle.nextGreenAt=next+10000;
    }

    if(battle.hp>0&&battle.pveOptions?.red!==false&&battle.hp<=((battle.pveOptions?.redAt??80)/100)*battle.maxHp&&window.DBIWorldInventory?.autoUseRedZen?.()===true){
     battle.hp=num(Math.min(battle.maxHp,battle.hp+0.1*battle.maxHp));
     if(until-next<10000)appendLog('Automatycznie użyto Czerwonej Fasolki Zen (+10% maks. HP).');
    }
    if(battle.pveOptions?.blue!==false&&battle.maxKi>0&&battle.ki<=((battle.pveOptions?.blueAt??40)/100)*battle.maxKi&&window.DBIWorldInventory?.consumeQuestItem?.('zen-bean-blue',1)===true){
     battle.ki=battle.maxKi;
     if(until-next<10000)appendLog('Automatycznie użyto Niebieskiej Fasolki Zen (pełne KI).');
    }
    battle.nextZenUse+=1000;
   }
  }
  battle.updated=until;
  if(battle.status==='running'&&now>=battle.started+MAX_MS)finishBattle('Minęło 12 godzin — walka zakończona automatycznie.');
  persistBattle();
 }
 function finishBattle(message){
  if(!battle||battle.status!=='running')return;
  animateDefeatedGroup();
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
 const legacyLootImages={
  'quest-turtle-stone':'assets/items/kamien-zolwia.png',
  'zen-bean-red':'assets/items/fasolka-zen-red.png',
  'zen-bean-blue':'assets/items/fasolka-zen-blue.png',
  'dragon-ball-dust':'assets/items/pyl-smoczych-kul.png',
  'skrzynia-lesnego-wojownika':'assets/items/skrzynia-lesnego-wojownika.png',
  'pierscien-ojca':'assets/items/pierscien-ojca.png',
  ...Object.fromEntries([...redRibbonDrops,...northernCaveDrops].map(item=>[item.id,item.image]))
 };
 function lootTiles(summary){return battle.loot.length?lootGroups().map(({item,indices})=>{
  const locked=item.id==='quest-turtle-stone'||item.sellable===false||Number(item.sell)<=0;
  const selected=indices.every(i=>sellSelection.has(i));
  const image=item.image||(item.name==='Ruda Kowalstwa'?'assets/items/ruda-kowalstwa.png':Object.hasOwn(legacyLootImages,item.id)?legacyLootImages[item.id]:null);
  const icon=image?'<img src="'+escapeText(image)+'" alt="" style="display:block;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain">':escapeText(item.icon||'🎒');
  return '<button type="button" class="world-loot-tile '+(summary&&!locked?'selectable ':'')+(locked?'world-loot-unsellable ':'')+(selected&&!locked?'sell-selected':'')+'" data-loot="'+indices[0]+'" title="'+escapeText(item.name)+' ×'+indices.length+(locked?' · Nie można sprzedać':' · '+(Number(item.sell)||0)*indices.length+' złota')+'" '+(summary&&!locked?'aria-pressed="'+selected+'"':'disabled')+'><span>'+icon+'</span>'+(indices.length>1?'<b class="world-stack-count">×'+indices.length+'</b>':'')+'</button>';
 }).join(''):'<span class="world-muted">Brak przedmiotów z mobów.</span>'}
 // Puste sloty są przygotowane pod przyszłe efekty (np. omdlenie, trucizna).
 // Gdy mechanika statusów zostanie dodana, efekty pojawią się w tych slotach.
 function statusSlots(kind,index=0){
  return Array.from({length:6},(_,i)=>'<span class="world-status-slot" data-status-kind="'+kind+'" data-status-index="'+index+'" data-status-slot="'+i+'" title="Pusty slot efektu"></span>').join('');
 }
 function updateEnemyCards(){
  const generation=battle.respawnGeneration||0;
  const respawnChanged=generation!==uiBattle.respawnGeneration;
  battle.enemies.forEach((enemy,index)=>{
   const card=battleEl.querySelector('[data-enemy="'+index+'"]');
   if(!card)return;
   const prev=uiBattle.hp[index],pct=100*enemy.hp/enemy.max;
   const fill=card.querySelector('.world-hp-fill'),trail=card.querySelector('.world-hp-trail');
   if(respawnChanged||enemy.hp>prev){
    fill.style.transition=trail.style.transition='none';
    fill.style.width=trail.style.width=pct+'%';
    requestAnimationFrame(()=>requestAnimationFrame(()=>{fill.style.transition=trail.style.transition=''}));
   }else if(enemy.hp<prev){
    fill.style.width=trail.style.width=pct+'%';
    const number=document.createElement('span');
    number.className='world-damage';
    number.textContent='-'+num(prev-enemy.hp);
    card.querySelector('.world-damage-layer').appendChild(number);
    setTimeout(()=>number.remove(),900);
   }
   card.querySelector('[data-hp-text]').textContent=num(enemy.hp)+'/'+num(enemy.max);
   uiBattle.hp[index]=enemy.hp;
  });
  uiBattle.respawnGeneration=generation;
 }
 function animateDefeatedGroup(){
  if(overlay.hidden||!uiBattle||uiBattle.battle!==battle||uiBattle.status!=='running'||
     uiBattle.dungeonStage!==battle.dungeonStage||uiBattle.respawnGeneration!==(battle.respawnGeneration||0)||
     uiBattle.defeatUntil||!battle.enemies.length||battle.enemies.some(enemy=>enemy.hp>0))return;
  const cards=battleEl.querySelector('.world-enemies');
  if(!cards)return;
  updateEnemyCards();
  cards.classList.add('world-group-defeated');
  uiBattle.defeatUntil=performance.now()+650;
 }
 function renderBattle(force=false){
   if(!document.getElementById('dbi-hero-hp-trail-style')){
    const style=document.createElement('style');style.id='dbi-hero-hp-trail-style';
    style.textContent='.world-health.hero .world-hp-trail{background:#aaa5a5;transition:width .65s cubic-bezier(.2,.7,.25,1) .16s;z-index:1}.world-health.hero .world-hp-fill{background:linear-gradient(90deg,#9c263c,#ed4762);transition:width .25s cubic-bezier(.2,.75,.2,1);z-index:2}.world-group-defeated .world-enemy{animation:world-enemy-defeated .65s ease-out both}@keyframes world-enemy-defeated{0%{box-shadow:inset 0 0 0 1px #ef7979}55%{opacity:1}100%{opacity:.45;transform:translateY(3px)}}@media(prefers-reduced-motion:reduce){.world-group-defeated .world-enemy{animation:none}}';
    document.head.appendChild(style);
   }

  if(!battle||overlay.hidden)return;
  if(uiBattle?.defeatUntil){
   const replaced=uiBattle.status!==battle.status||uiBattle.dungeonStage!==battle.dungeonStage||
    uiBattle.respawnGeneration!==(battle.respawnGeneration||0);
   if(replaced){
    if(performance.now()<uiBattle.defeatUntil)return;
    uiBattle=null;
   }
  }
  const running=battle.status==='running',summary=!running;
  if(!uiBattle||uiBattle.status!==battle.status||uiBattle.dungeonStage!==battle.dungeonStage||force&&uiBattle.battle!==battle){
   uiBattle={battle,dungeonStage:battle.dungeonStage,status: battle.status, hp:battle.enemies.map(e=>e.hp),heroHits:battle.heroHits||0,heroDamageTaken:battle.heroDamageTaken||0,heroHp:battle.hp,respawnGeneration:battle.respawnGeneration||0,kills:-1,lootCount:-1,logHead:null};
   if(running){
    battleEl.innerHTML=`<div class="world-battle-top"><div><div class="world-muted">${battle.dungeonStage!=null?'DUNGEON · Piętro '+((battle.dungeonLayout===2?dungeonStages[battle.dungeonStage].floor:Math.floor(battle.dungeonStage/3))+1)+' / 5':extraMap(battle.location)?extraMap(battle.location).name.toUpperCase():battle.location==='island'?'WYSPA GENIALNEGO ŻÓŁWIA · Uczniowie Mistrza':'BŁĘKITNA LAGUNA · EXPowisko'}</div><h2>⚔️ Trwająca walka</h2></div><button class="world-action secondary" id="worldHide">Ukryj okno</button></div>

    <div class="world-character-name"><strong>${escapeText(document.querySelector("#name")?.textContent?.trim() || "Postać")}</strong></div>
    <div class="world-hero-grid"><div><div class="world-vital-label"><span>Twoje HP</span><span>${num(battle.hp)}/${num(battle.maxHp)}</span></div><div class="world-health hero"><span class="world-hp-trail" style="width:${100*battle.hp/battle.maxHp}%"></span><span class="world-hp-fill" style="width:${100*battle.hp/battle.maxHp}%"></span><div class="world-damage-layer"></div></div><div class="world-status-slots" aria-label="Statusy postaci">${statusSlots("hero")}</div></div><div><div class="world-vital-label"><span>Twoje KI</span><span>${num(battle.ki)}/${num(battle.maxKi)}</span></div><div class="world-health ki"><span style="width:${100*battle.ki/battle.maxKi}%"></span></div></div></div>
    <div class="world-enemies" style="--enemy-count:${battle.enemies.length}">${battle.enemies.map((e,i)=>`<div class="world-enemy" data-enemy="${i}"><img class="realm-mob-face" src="${mobPortrait(e.name)}" alt=""><strong>${escapeText(e.name)}</strong><small>Poziom ${e.level} · <span data-hp-text>${e.hp}/${e.max}</span> HP</small><div class="world-health monster"><span class="world-hp-trail" style="width:${e.hp/e.max*100}%"></span><span class="world-hp-fill" style="width:${e.hp/e.max*100}%"></span><div class="world-damage-layer"></div></div><div class="world-status-slots" aria-label="Statusy potwora">${statusSlots("mob",i)}</div></div>`).join('')}</div>
    <div class="world-log-section"><button class="world-log-toggle" id="worldToggleLog" aria-expanded="false">⚔️ Przebieg walki <span>⌄</span></button><div class="world-log collapsed" id="worldLog"></div></div>
    <div class="world-technique-strip" id="worldTechniqueStrip" aria-label="Odnowienie technik"></div>
    <div class="world-summary-grid world-live-stats">${[['worldStatKills','POKONANE POTWORY'],['worldStatGold','ZDOBYTE ZŁOTO'],['worldStatLoot','ZDOBYTE PRZEDMIOTY'],['worldStatDamage','ZADANE OBRAŻENIA'],['worldStatDps','ŚREDNIE OBRAŻENIA/S'],['worldStatExp','ZDOBYTE DOŚWIADCZENIE']].map(([key,label])=>`<div><strong>${key==='worldStatGold'?'<img class="dbi-gold-icon" src="assets/ui/gold.png" alt="" width="16" height="16">':''}<span id="${key}">0</span></strong><small>${label}</small></div>`).join('')}</div>
    <div class="world-loot world-loot-compact"><button type="button" class="world-log-toggle world-loot-toggle" id="worldToggleLoot" aria-expanded="true">🎒 Zdobyte łupy <span>⌃</span></button><div class="world-loot-grid" id="worldLootGrid"></div><span id="worldLootCount" hidden></span></div>

    <div class="world-loot world-loot-compact world-active-items"><button type="button" class="world-log-toggle" id="worldToggleActive" aria-expanded="true">🫘 Przedmioty aktywne <span>⌃</span></button><div id="worldActiveItems" class="world-loot-grid"></div></div>
    <div class="world-battle-actions"><button class="world-action" id="worldFinish">Zakończ walkę</button></div>`;
    battleEl.querySelector('#worldToggleLoot').onclick=()=>{const grid=battleEl.querySelector('#worldLootGrid');const collapsed=grid.classList.toggle('collapsed');battleEl.querySelector('#worldToggleLoot').setAttribute('aria-expanded',String(!collapsed));battleEl.querySelector('#worldToggleLoot span').textContent=collapsed?'⌄':'⌃'};
    battleEl.querySelector('#worldToggleActive').onclick=()=>{
     const el=battleEl.querySelector('#worldActiveItems'),hidden=el.classList.toggle('collapsed');
     battleEl.querySelector('#worldToggleActive').setAttribute('aria-expanded',String(!hidden));
     battleEl.querySelector('#worldToggleActive span').textContent=hidden?'⌄':'⌃';
    };
    battleEl.querySelector('#worldFinish').onclick=()=>finishBattle('Wojownik zakończył walkę.');
    battleEl.querySelector('#worldToggleLog').onclick=()=>{const el=battleEl.querySelector('#worldLog'),hidden=el.classList.toggle('collapsed');battleEl.querySelector('#worldToggleLog').setAttribute('aria-expanded',String(!hidden));battleEl.querySelector('#worldToggleLog span').textContent=hidden?'⌄':'⌃'};
   }else{
    const elapsed=Math.max(1,((battle.ended||Date.now())-battle.started)/1000),num=x=>Math.round(x||0).toLocaleString('pl-PL');
    battleEl.innerHTML=`<div class="world-battle-top"><div><div class="world-muted">${extraMap(battle.location)?extraMap(battle.location).name.toUpperCase():battle.location==='island'?'WYSPA GENIALNEGO ŻÓŁWIA · Uczniowie Mistrza':'BŁĘKITNA LAGUNA · EXPowisko'}</div><h2>Walka zakończona!</h2></div><button class="world-action secondary" id="worldHide">Ukryj okno</button></div>
    <div class="world-summary-grid">${[[num(battle.kills),'POKONANE POTWORY'],[num(battle.gold),'ZŁOTO'],[num(battle.loot.length),'PRZEDMIOTY'],[num(battle.totalDamage),'ZADANE OBRAŻENIA'],[num((battle.totalDamage||0)/elapsed)+'/s','ŚR. DPS'],[num(battle.exp||0),'ZDOBYTE EXP']].map(([v,l])=>`<div><strong>${l==='ZŁOTO'?'<img class="dbi-gold-icon" src="assets/ui/gold.png" alt="" width="16" height="16">':''}${v}</strong><small>${l}</small></div>`).join('')}</div>
    <div class="world-loot"><div class="world-loot-header"><h3>🎒 Zdobyty łup</h3><div class="world-loot-shortcuts"><button class="world-action secondary" id="worldKeepAll">Zostaw wszystko</button><button class="world-action secondary" id="worldSellAll">Sprzedaj wszystko</button></div></div><p class="world-muted">Z mobów mogą wypaść Czerwona i Niebieska Fasolka Zen oraz Pył smoczych kul.</p><div class="world-loot-grid" id="worldLootGrid"></div><p id="worldSaleSummary"></p></div>
    <div class="world-battle-actions"><button class="world-action" id="worldCollect">Odbierz i sprzedaj</button></div><p class="world-result" id="worldResult" role="status"></p>`;
    battleEl.querySelector('#worldKeepAll').onclick=()=>{sellSelection.clear();syncLootSelection()};
    battleEl.querySelector('#worldSellAll').onclick=()=>{battle.loot.forEach((item,i)=>{if(item.id!=='quest-turtle-stone'&&item.sellable!==false&&Number(item.sell)>0)sellSelection.add(i)});syncLootSelection()};
    battleEl.querySelector('#worldCollect').onclick=collectBattle;
   }
   battleEl.querySelector('#worldHide').onclick=hideBattle;
  }
  if(summary){renderLootSelection();return}
  const strip=battleEl.querySelector('#worldTechniqueStrip');
  if(strip){
   const known=window.DBIWorldTechniques?.()||[];
   const chosen=known.filter(t=>!Array.isArray(battle.pveOptions?.techniques)||battle.pveOptions.techniques.includes(t.id));
   const signature=chosen.map(t=>t.id).join('|');
   if(strip.dataset.signature!==signature){
    strip.dataset.signature=signature;
    strip.innerHTML=chosen.length?chosen.map(t=>'<div class="world-technique-entry" data-technique="'+escapeText(t.id)+'" title="'+escapeText(t.name)+'"><div class="world-technique-icon"><img src="'+escapeText(t.image)+'" alt="'+escapeText(t.name)+'"><div class="world-technique-shade"></div><span class="world-technique-time" aria-label="Technika gotowa"></span></div></div>').join(''):'<span class="world-muted">Nie wybrano technik do tej walki.</span>';
   }
   strip.querySelectorAll('[data-technique]').forEach(el=>{
    const isWave=el.dataset.technique==='fala_uderzeniowa';
    const left=isWave?Math.max(0,Number(battle.nextWaveAt||0)-Date.now()):0;
    const fraction=isWave?Math.min(1,left/20000):0;
    el.querySelector('.world-technique-shade').style.height=(fraction*100)+'%';
    const time=el.querySelector('.world-technique-time');
    time.textContent=left>0?Math.ceil(left/1000)+'s':'';
    time.setAttribute('aria-label',left>0?'Odnowienie: '+Math.ceil(left/1000)+' sekund':'Technika gotowa');
   });
  }
  const active=battleEl.querySelector('#worldActiveItems');
  if(active){
   const counts=window.DBIWorldInventory?.zenCounts?.()||{};
   const zen=[['red','Czerwona Fasolka Zen','fasolka-zen-red.png'],['blue','Niebieska Fasolka Zen','fasolka-zen-blue.png'],['green','Zielona Fasolka Zen','fasolka-zen-green.png'],['purple','Fioletowa Fasolka Zen','fasolka-zen-purple.png']];
   const signature=zen.map(([id])=>counts[id]||0).join(':');
   if(active.dataset.signature!==signature){
    active.dataset.signature=signature;
    active.innerHTML=zen.filter(([id])=>Number(counts[id])>0).map(([id,name,file])=>'<div class="world-loot-tile" title="'+name+' ×'+counts[id]+'"><img src="assets/items/'+file+'" alt="'+name+'" style="width:100%;height:100%;object-fit:contain"><b class="world-stack-count">×'+counts[id]+'</b></div>').join('')||'<span class="world-muted">Brak fasolek Zen w ekwipunku.</span>';
   }
  }
  const elapsedSeconds=Math.max(1,(Date.now()-battle.started)/1000);
  const stats={worldStatKills:battle.kills,worldStatGold:battle.gold,worldStatLoot:battle.loot.length,worldStatDamage:battle.totalDamage||0,worldStatDps:Math.round((battle.totalDamage||0)/elapsedSeconds),worldStatExp:battle.exp||0};
  for(const [key,value] of Object.entries(stats)){const el=battleEl.querySelector('#'+key);if(el)el.textContent=Number(value).toLocaleString('pl-PL')}
  const now=Date.now();
  const heroHp=battleEl.querySelector('.world-health.hero');
  const heroKi=battleEl.querySelector('.world-health.ki');
  const hpLabel=heroHp?.previousElementSibling?.querySelector('span:last-child');
  const kiLabel=heroKi?.previousElementSibling?.querySelector('span:last-child');
  if(heroHp){
   const pct=100*battle.hp/battle.maxHp,prev=uiBattle.heroHp;
   const fill=heroHp.querySelector('.world-hp-fill'),trail=heroHp.querySelector('.world-hp-trail');
   if(battle.hp>prev){
    fill.style.transition='none';trail.style.transition='none';
    fill.style.width=pct+'%';trail.style.width=pct+'%';
    requestAnimationFrame(()=>requestAnimationFrame(()=>{fill.style.transition='';trail.style.transition='';}));
   }else{
    fill.style.width=pct+'%';trail.style.width=pct+'%';
   }
   uiBattle.heroHp=battle.hp;
   if(hpLabel)hpLabel.textContent=num(battle.hp)+'/'+num(battle.maxHp);
  }
  if(heroKi){heroKi.querySelector('span').style.width=(battle.maxKi?100*battle.ki/battle.maxKi:0)+'%';if(kiLabel)kiLabel.textContent=num(battle.ki)+'/'+num(battle.maxKi);}
  // Ten sam czerwony, unoszący się numer co nad HP potwora.
  // Licznik obrażeń nie ginie, gdy regeneracja HP nastąpi pomiędzy klatkami.
  if(heroHp && (battle.heroHits||0)>uiBattle.heroHits){
   const damage=num((battle.heroDamageTaken||0)-uiBattle.heroDamageTaken);
   if(damage>0){const number=document.createElement('span');number.className='world-damage';number.textContent='-'+damage;heroHp.querySelector('.world-damage-layer').appendChild(number);setTimeout(()=>number.remove(),900);}
  }
  uiBattle.heroHits=battle.heroHits||0;
  uiBattle.heroDamageTaken=battle.heroDamageTaken||0;

  updateEnemyCards();
  animateDefeatedGroup();
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
  side.insertAdjacentHTML('afterbegin','<p class="world-success">Odebrano '+count+' przedmiotów, sprzedano '+sold.length+'. Zysk: <img class="dbi-gold-icon" src="assets/ui/gold.png" alt="" width="16" height="16">'+earned+' złota.</p>');
 }
 function useZen(type){
  tickBattle();
  if(!restoreZen(battle,type))return false;
  persistBattle();
  renderBattle();
  return true;
 }
 const combatTimer=setInterval(()=>{tickBattle();renderBattle();if(bossOpen)updateBossCountdown()},120);
 tickBattle();updateSide(true);
 active={container,useZen,setNearbyPlayers,cleanup:()=>{closed=true;closeDungeon?.();closeTowerClimb?.();tickBattle();clearInterval(combatTimer);cancelAnimationFrame(raf);save();observer.disconnect();document.removeEventListener('keydown',input);document.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);}};
 raf=requestAnimationFrame(frameLoop);canvas.focus({preventScroll:true});}
 function restoreZen(battle,type){
  if(battle?.status!=='running'||battle.hp<=0)return false;
  if(type==='red'&&battle.hp<battle.maxHp)battle.hp=Math.round(Math.min(battle.maxHp,battle.hp+battle.maxHp*.1)*100000)/100000;
  else if(type==='blue'&&battle.ki<battle.maxKi)battle.ki=battle.maxKi;
  else return false;
  return true;
 }
 function useSavedZen(type,id){
  if(active)return active.useZen(type);
  const key='dboidle_battle_v1_'+String(id||'test');
  try{
   const saved=JSON.parse(localStorage.getItem(key)||'null');
   if(!restoreZen(saved,type))return false;
   localStorage.setItem(key,JSON.stringify(saved));
   return true;
  }catch{return false}
 }
 function isMobBattleRunning(characterId){
  try{
   const saved=JSON.parse(localStorage.getItem('dboidle_battle_v1_'+String(characterId||'test'))||'null');
   return saved?.status==='running'&&!saved.boss&&!saved.storySoldier;
  }catch{return false}
 }
 function stop(){if(active){active.cleanup();active=null}}
 window.DBIWorld={mobPortrait,start,stop,setNearbyPlayers(players){active?.setNearbyPlayers(players)},isMobBattleRunning,useZen:useSavedZen,locations:DBI_WORLD_LOCATIONS,gmTeleport,dungeonLimit,gmSetDungeonLimit};window.addEventListener('pagehide',stop);
})();
