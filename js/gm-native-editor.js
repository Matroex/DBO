/* Native story scripts keep their identifiers and save keys. Changes are applied
   to named syntax-tree nodes, never by a global search and replace. */
(()=>{'use strict';
const questUnits={
 'laguna':'lagoonRules questMarkup addQuestKills dbiGrantTrainingDummyQuestReward',
 'krillin':'krillinStats krillinQuestMarkup DBI_KRILLIN_REWARD',
 'master':'masterRules islandQuestMarkup addIslandQuestKills dbiGrantMasterStats',
 'roshi-forest':'roshiRules forestNpcMarkup claimForest',
 'bulma':'forestNpcMarkup claimForest',
 'roshi-mountain':'mountainRoshiMarkup claimMountainRoshi dbiGrantMountainKi',
 'wanderer':'wandererRules wandererMarkup claimWanderer claimWandererBean dbiGrantWandererStats dbiGrantWandererDefense',
 'stadium':'stadiumFighters stadiumQuestMarkup stadiumClaim',
 'woodcutter':'soldierStats woodcutterMarkup woodcutterNext towerEnemies towerClimbs towerJourneyScene renderTowerJourney dbiGrantHighTowerReward northernEnemies renderNorthQuest mission:central-forest-woodcutter',
 'fisherman':'fishermanRules fishermanMarkup fishermanNext mission:central-forest-fisherman',
 'father':'fatherMarkup fatherNext mission:central-forest-lost-father',
 'north-hunt':'northHuntGoals renderNorthQuest countNorthernKill mission:north-forester',
 'town-journey':'townJourneyRules townAssassin renderTownJourney dbiClaimTownJourneyPremium mission:mountain-town-journey',
 'town-treasures':'TOWN_TREASURE_TASKS renderTownTreasures dbiClaimTownTreasure mission:mountain-town-treasures'
};
const mapUnits={
 laguna:'SPAWN SIZE NPC TENT lagunaArt.src lagoonNpcSprite.src lagunaMobs tile blocked',
 island:'ISLAND_SPAWN ISLAND_SIZE ISLAND_KRILLIN ISLAND_HOUSE ISLAND_TRAINING islandArt.src krillinSprite.src islandMobs islandBlocked',
 mountainTown:'mountainTownRiver mountainTownBlocked',mountainLake:'northernScenery northernCaveDrops mountainLakeBlocked',highTowerForest:'highTowerProps redRibbonDrops',
 centralForest:'forestBossStats boss:centralForest',forestEdge:'guardianStats boss:forestEdge'
};
const paths=['js/world.js','js/app.js'];
const parse=source=>acorn.parse(source,{ecmaVersion:'latest',allowHashBang:true});
const propName=p=>p.key?.name??p.key?.value;
function walk(node,visit,parent=null){
 if(!node||typeof node.type!=='string')return;
 if(visit(node,parent)===false)return;
 for(const v of Object.values(node))if(Array.isArray(v)){for(const child of v)walk(child,visit,node)}else if(v&&typeof v==='object')walk(v,visit,node);
}
function index(source){
 const all=new Map();
 function add(name,node){if(name&&!all.has(name))all.set(name,{start:node.start,end:node.end,type:node.type})}
 walk(parse(source),(n)=>{
  if(n.type==='VariableDeclarator'&&n.id.name&&n.init){
   add(n.id.name,n.init);
   if(['EXTRA_MAPS','bossTypes','nativePaint'].includes(n.id.name))for(const p of n.init.properties)add((n.id.name==='EXTRA_MAPS'?'map:':n.id.name==='nativePaint'?'paint:':'boss:')+propName(p),p.value);
  }
  if(n.type==='FunctionDeclaration')add(n.id.name,n);
  if(n.type==='AssignmentExpression'&&n.left.property?.name==='src'&&n.left.object?.name)add(n.left.object.name+'.src',n.right);
  if(n.type==='CallExpression'&&n.callee.object?.name==='questRegistry'&&n.callee.property?.name==='register'){
   const def=n.arguments[0];add('mission:'+def.properties.find(p=>propName(p)==='id')?.value.value,def);
  }
 });
 return all;
}
let files,loading;
async function load(refresh=false){
 if(location.protocol==='file:')throw Error('Otwórz grę przez HTTP/HTTPS (GitHub Pages lub lokalny serwer), nie przez file://.');
 if(!window.acorn)await import("./vendor/acorn.js");
 if(refresh)loading=null;
 if(!loading)loading=Promise.all(paths.map(async path=>{
  const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw Error('Nie można odczytać '+path);
  const source=await response.text();return {path,source,units:index(source)};
 })).then(result=>files=result).catch(error=>{loading=null;throw error});
 return loading;
}
function find(name){for(const file of files){const node=file.units.get(name);if(node)return {file,node}}}
const slice=(file,node)=>file.source.slice(node.start,node.end);
function build(changes){
 const output={};
 for(const [key,entry] of Object.entries(changes||{}))if(!entry||!paths.includes(entry.path)||typeof entry.base!=='string'||typeof entry.value!=='string'||!files.find(f=>f.path===entry.path)?.units.has(key))throw Error('Nieprawidłowa definicja: '+key);
 for(const file of files){
  const edits=[];
  for(const [key,entry] of Object.entries(changes||{})){
   if(entry.path!==file.path)continue;
   const node=file.units.get(key);
   if(!node)throw Error('Brak definicji '+key);
   const original=slice(file,node);if(original===entry.value)continue;
   if(original!==entry.base)throw Error('Definicja '+key+' została zmieniona w innej wersji gry. Przywróć wersję z gry i ponów edycję.');
   edits.push({...node,value:entry.value});
  }
  if(!edits.length)continue;
  edits.sort((a,b)=>b.start-a.start);
  let source=file.source,bound=source.length;
  for(const edit of edits){if(edit.end>bound)throw Error('Dwie zmiany obejmują ten sam fragment. Zapisz je w jednej definicji.');source=source.slice(0,edit.start)+edit.value+source.slice(edit.end);bound=edit.start}
  parse(source);output[file.path]=source;
 }
 return output;
}
function tree(value,type){
 const prefix=type==='FunctionDeclaration'?'':'(';const src=prefix+value+(prefix?')':'');
 return {ast:parse(src).body[0],offset:prefix.length};
}
function element(tag,text){const el=document.createElement(tag);if(text!=null)el.textContent=text;return el}
const labels={kills:'Wymagane pokonania',premium:'Waluta premium',name:'Nazwa',level:'Poziom',art:'Grafika',spawn:'Start',npc:'NPC',scenery:'Obiekty',blocked:'Kolizje',portals:'Portale',portal:'Portal',mobs:'Expowisko',mobNames:'Przeciwnicy',boss:'Boss',text:'Dialog',button:'Przycisk',reward:'Nagroda',give:'Przyznaj',take:'Oddaj',strength:'Siła',endurance:'Wytrzymałość',speed:'Szybkość',intelligence:'Inteligencja',attack:'Atak',defense:'Obrona',sizeX:'Szerokość',sizeY:'Wysokość',label:'Podpis',to:'Cel portalu',arrival:'Punkt docelowy',destinationArrival:'Punkt docelowy',gold:'Złoto'};
function fields(value,type){
 const {ast,offset}=tree(value,type),rows=[];
 function scan(n,path,parent){
  if(!n?.type)return;
  const start=n.start-offset,end=n.end-offset;
  const add=(a,b,v,kind,label)=>rows.push({start:a,end:b,value:v,kind,label:label||path.join(' › ')});
  if(n.type==='Property'){scan(n.value,[...path,labels[propName(n)]||String(propName(n))],n);return}
  if(n.type==='ArrayExpression'){n.elements.forEach((v,i)=>scan(v,[...path,String(i+1)],n));return}
  if(n.type==='VariableDeclarator'){scan(n.init,[...path,labels[n.id.name]||n.id.name],n);return}
  if(n.type==='BinaryExpression'&&n.operator==='*'&&n.right.name==='TILE'&&n.left.type==='Literal'){add(start,end,n.left.value*32,'number',path.join(' › ')+' (px)');return}
  if(n.type==='Literal'&&['number','string','boolean'].includes(typeof n.value)){
   if(typeof n.value==='string'&&n.value.includes('<')){
    // Preserve markup, attributes, control IDs and interpolation boundaries.
    const re=/(^|>)([^<>]*?)(?=<|$)/g;
    const raw=value.slice(start+1,end-1);let m;
    while((m=re.exec(raw))){const t=m[2];if(/[\p{L}\p{N}]/u.test(t)&&!t.includes('=')&&!t.includes('\\'))add(start+1+m.index+m[1].length,start+1+m.index+m[0].length,t,'html',path.join(' › ')||'Tekst');if(!m[0])re.lastIndex++}
   }else if(parent?.type!=='MemberExpression' ||parent.computed)add(start,end,n.value,typeof n.value,path.join(' › ')|| (typeof n.value==='number'?'Wartość':'Tekst'));
   return;
  }
  if(n.type==='TemplateElement'){
   const raw=n.value.raw;
   const re=/(^|>)([^<>]*?)(?=<|$)/g;let m;
   while((m=re.exec(raw))){const s=m[2];if(/[\p{L}]/u.test(s)&&!/[=\\]/.test(s))add(start+m.index+m[1].length,start+m.index+m[0].length,s,'template',path.join(' › ')||'Tekst');if(!m[0])re.lastIndex++}
   return;
  }
  for(const v of Object.values(n))if(Array.isArray(v)){for(const c of v)scan(c,path,n)}else if(v&&typeof v==='object')scan(v,path,n);
 }
 scan(ast,[],null);return rows;
}
function encode(row,v){
 if(row.kind==='number'){if(!v.trim()||!Number.isFinite(Number(v)))throw Error('Wpisz poprawną liczbę.');return String(Number(v))}
 if(row.kind==='boolean'){if(!['true','false'].includes(v))throw Error('Wpisz true albo false.');return v}
 if(row.kind==='string')return JSON.stringify(v);
 const html=v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 return html.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'\\"').replace(/`/g,'\\`').replace(/\$\{/g,'\\${').replace(/\r?\n/g,'\\n');
}
// ZIP, method STORE, UTF-8. Only files actually changed are written.
function zip(files){
 const enc=new TextEncoder(),chunks=[],central=[];let offset=0;
 function header(n){const data=new Uint8Array(n),v=new DataView(data.buffer);return {data,u16:(i,x)=>v.setUint16(i,x,true),u32:(i,x)=>v.setUint32(i,x,true)}}
 for(const [path,text] of Object.entries(files)){
  const name=enc.encode(path),bytes=enc.encode(text);let crc=-1;
  for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}crc=(crc^-1)>>>0;
  const h=header(30);h.u32(0,0x04034b50);h.u16(4,20);h.u16(6,2048);h.u16(12,33);h.u32(14,crc);h.u32(18,bytes.length);h.u32(22,bytes.length);h.u16(26,name.length);
  chunks.push(h.data,name,bytes);
  const c=header(46);c.u32(0,0x02014b50);c.u16(4,20);c.u16(6,20);c.u16(8,2048);c.u16(14,33);c.u32(16,crc);c.u32(20,bytes.length);c.u32(24,bytes.length);c.u16(28,name.length);c.u32(42,offset);central.push(c.data,name);
  offset+=30+name.length+bytes.length;
 }
 const end=header(22),count=central.length/2;end.u32(0,0x06054b50);end.u16(8,count);end.u16(10,count);end.u32(12,central.reduce((n,a)=>n+a.length,0));end.u32(16,offset);
 return new Blob([...chunks,...central,end.data],{type:'application/zip'});
}
function dataNode(node){
 if(node.type==='Literal')return node.value;
 if(node.type==='ObjectExpression')return Object.fromEntries(node.properties.map(p=>[propName(p),dataNode(p.value)]));
 if(node.type==='ArrayExpression')return node.elements.map(dataNode);
 if(node.type==='Identifier'&&node.name==='TILE')return 32;
 if(node.type==='UnaryExpression'&&node.operator==='-')return -dataNode(node.argument);
 if(node.type==='BinaryExpression'&&node.operator==='*')return dataNode(node.left)*dataNode(node.right);
 throw Error('Ta definicja zawiera logikę gry.');
}
const copy=o=>JSON.parse(JSON.stringify(o));
function mapPanel(map,save,quests=[],ui={},assignQuest){
 const box=element('section'),locations=[];
 function collect(obj,path){
  if(!obj||typeof obj!=='object')return;
  if(Number.isFinite(obj.x)&&Number.isFinite(obj.y)&&!['arrival','destinationArrival','interactionBounds'].includes(path.at(-1)))locations.push({obj,path});
  for(const [k,v] of Object.entries(obj))if(!['arrival','destinationArrival'].includes(k))collect(v,[...path,k]);
 }
 collect(map,[]);
 const pick=element('select'),visual=element('div');
 visual.className='dbi-native-canvas';
 visual.style.aspectRatio=map.sizeX+'/'+map.sizeY;
 if(/^assets\/[\w./ -]+$/.test(map.art))visual.style.backgroundImage='url("'+map.art+'")';
 locations.forEach(({obj,path},i)=>{
  const title=(obj.label||labels[path[0]]||path[0])+' · '+path.join('.');
  const opt=element('option',title);opt.value=i;pick.append(opt);
  const marker=element('button',String(i+1));marker.type='button';marker.title=title;marker.style.left=obj.x/(32*map.sizeX)*100+'%';marker.style.top=obj.y/(32*map.sizeY)*100+'%';
  marker.onclick=e=>{e.stopPropagation();pick.value=String(i);select()};visual.append(marker);
 });
 if(locations[ui.marker])pick.selectedIndex=ui.marker;
 function select(){ui.marker=pick.selectedIndex;Array.from(visual.children).forEach((el,i)=>el.classList.toggle('active',i===pick.selectedIndex))}
 pick.onchange=select;select();
 visual.onclick=e=>{const target=locations[pick.selectedIndex];if(!target)return;const rect=visual.getBoundingClientRect();
  const next=copy(map);let p=next;for(const k of target.path)p=p[k];
  p.x=Math.round((e.clientX-rect.left)*map.sizeX*32/rect.width);p.y=Math.round((e.clientY-rect.top)*map.sizeY*32/rect.height);
  save(JSON.stringify(next,null,2));
 };
 box.append(element('p','Wybierz znacznik, a następnie kliknij jego nowe miejsce na mapie.'),pick,visual);
 const actions=element('div');
 const questSelect=element('select');const no=element('option','Wybierz etap questa…');no.value='';questSelect.append(no);for(const q of quests){const opt=element('option',q.title);opt.value=q.key;questSelect.append(opt)}
 const attach=element('button','Ustaw punkt etapu przy znaczniku');attach.onclick=()=>{const t=locations[pick.selectedIndex];if(!t||!questSelect.value||!assignQuest)return;assignQuest(questSelect.value,t.obj)};if(quests.length&&assignQuest)actions.append(questSelect,attach);
 const library=element('select'),props=window.DBITerrain?.props||[];
 for(const [i,p] of props.entries()){const o=element('option',p.group+' · '+p.name);o.value=i;library.append(o)}
 const addArt=element('button','Dodaj z biblioteki');
 addArt.onclick=()=>{
  const item=props[Number(library.value)];if(!item)return;
  const next=copy(map),npc=item.group==='NPC',list=npc?'npc':'scenery',p={x:map.spawn.x,y:map.spawn.y,label:item.name,art:item.art,questId:''};
  if(npc)p.scalePct=100;else Object.assign(p,{width:item.width||64,height:item.height||64,effect:item.effect});
  (next[list]??=[]).push(p);save(JSON.stringify(next,null,2));
 };if(props.length)actions.append(library,addArt);
 const templates={npc:{x:64,y:64,label:'Nowy NPC',art:'',scalePct:100,questId:''},scenery:{x:64,y:64,width:64,height:64,label:'Nowy obiekt',art:''},portals:{x:64,y:64,to:'forest',destinationArrival:{x:64,y:64}},blocked:[32,32,64,64],mobNames:{name:'Nowy przeciwnik',level:1}};
 for(const [key,item] of Object.entries(templates)){const b=element('button','+ '+labels[key]);b.onclick=()=>{const next=copy(map);if(key==='portals'&&next.portal&&!next.portals){next.portals=[next.portal];delete next.portal}const target=key==='blocked'&&!next.blocked?'extraBlocked':key;(next[target]??=[]).push(item.x!==undefined?{...copy(item),x:map.spawn.x,y:map.spawn.y}:copy(item));save(JSON.stringify(next,null,2))};actions.append(b)}
 for(const [key,label] of [['mobs','Expowisko'],['boss','Boss']])if(!map[key]){
  const b=element('button','+ '+label);b.onclick=()=>{const next=copy(map);next[key]={...map.spawn,label,art:''};
   if(key==='boss')Object.assign(next[key],{level:1,combat:{gold:0,exp:0,stats:{hp:10},drops:[]}});
   else if(!next.mobNames.length)next.mobNames=['',' (Silny)',' (Super)'].map((suffix,i)=>({name:'Przeciwnik'+suffix,level:i+1}));
   save(JSON.stringify(next,null,2));
  };actions.append(b);
 }
 const labelInput=element('input'),artInput=element('input'),saveMarker=element('button','Zapisz nazwę i grafikę znacznika');
 labelInput.placeholder='Nazwa';artInput.placeholder='assets/...png';
 const refreshMarker=()=>{const t=locations[pick.selectedIndex],can=t&&['npc','scenery','mobs','boss','city','dungeon'].includes(t.path[0]);labelInput.disabled=artInput.disabled=saveMarker.disabled=!can;labelInput.value=t?.obj.label||'';artInput.value=t?.obj.art||'';};
 pick.addEventListener('change',refreshMarker);visual.addEventListener('click',refreshMarker);refreshMarker();
 saveMarker.onclick=()=>{const t=locations[pick.selectedIndex];if(!t)return;const next=copy(map);let p=next;for(const k of t.path)p=p[k];p.label=labelInput.value.trim();p.art=artInput.value.trim();if(p.art&&!/^assets\/[a-zA-Z0-9_\/-]+\.(?:webp|png|jpg|jpeg)$/.test(p.art)){artInput.setCustomValidity('Wpisz poprawną ścieżkę assets/...');artInput.reportValidity();artInput.setCustomValidity('');return}save(JSON.stringify(next,null,2));};
 box.append(labelInput,artInput,saveMarker,actions);return box;
}
function paintPanel(map,cells,save){
 const terrain=window.DBITerrain,box=element('section'),canvas=element('canvas'),pick=element('select'),apply=element('button','Zapisz podłoże');
 for(const [id,p] of terrain.palette.entries()){const o=element('option',p.name);o.value=id;pick.append(o)}
 const cols=Math.ceil(map.sizeX),rows=Math.ceil(map.sizeY);
 const grid={sizeX:cols,sizeY:rows,terrain:{version:1,tiles:Array(cols*rows).fill(-1)}};
 const g=canvas.getContext('2d');canvas.width=map.sizeX*32;canvas.height=map.sizeY*32;canvas.className='dbi-native-paint';
 if(/^assets\/[\w./ -]+$/.test(map.art))canvas.style.backgroundImage='url("'+map.art+'")';
 for(const [key,val] of Object.entries(cells)){const [x,y]=key.split(',').map(Number);if(terrain.palette[val])grid.terrain.tiles[y*cols+x]=val}
 function render(){g.clearRect(0,0,canvas.width,canvas.height);for(const key of Object.keys(cells)){const [x,y]=key.split(',').map(Number);terrain.drawCell(g,grid,x,y)}}
 render();terrain.onReady?.(()=>{if(canvas.isConnected)render()});let active=null,erase=false;
 function paint(e){
  const r=canvas.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)*map.sizeX/r.width),y=Math.floor((e.clientY-r.top)*map.sizeY/r.height);
  if(x<0||y<0||x>=map.sizeX||y>=map.sizeY)return;
  const key=x+','+y;if(erase)delete cells[key];else cells[key]=Number(pick.value);
  grid.terrain.tiles[y*cols+x]=erase?-1:cells[key];render();apply.disabled=false;
 }
 canvas.onpointerdown=e=>{if(e.button!==0&&e.button!==2)return;active=e.pointerId;canvas.setPointerCapture(active);erase=e.button===2;paint(e)};
 canvas.onpointermove=e=>{if(e.pointerId===active)paint(e)};canvas.onlostpointercapture=()=>active=null;
 canvas.oncontextmenu=e=>e.preventDefault();
 apply.disabled=true;apply.onclick=()=>save(JSON.stringify(cells));
 box.append(element('p','Lewy przycisk maluje wybranym materiałem. Prawy odsłania oryginalne podłoże.'),pick,canvas,apply);return box;
}
async function open({kind,id,title,map:catalogMap,pack,persist,onClose}){
 await load();
 const changes=pack.nativeEdits||{},isMap=kind==='map',mapUI={};
 const units=(isMap?['map:'+id,'paint:'+id,...(mapUnits[id]||'').split(' '),...(!['laguna','island'].includes(id)?['extraBlocked']:[])]:[...(questUnits[id.replace(/^legacy-/,'')]||'').split(' '),'updateSide','rewardDefeat','dbiActiveMissions']).filter(n=>n&&find(n));
 if(!units.length)throw Error('Nie znaleziono definicji w tej wersji gry.');
 const dlg=element('dialog');dlg.className='dbi-native-dialog';
 const bar=element('header'),close=element('button','Zamknij'),select=element('select'),status=element('p'),body=element('section');
 close.onclick=()=>dlg.close();bar.append(element('h3',title),close);status.setAttribute('role','status');
 const names={lagoonRules:'Wymagania polowania',masterRules:'Wymagania treningu',roshiRules:'Wymagania polowania',wandererRules:'Wymagania polowania',krillinStats:'Krillin · statystyki',soldierStats:'Żołnierz · statystyki',extraBlocked:'Kolizje skryptowe',SPAWN:'Start postaci',ISLAND_SPAWN:'Start postaci',NPC:'Opiekun Laguny',TENT:'Namiot',ISLAND_KRILLIN:'Krillin',ISLAND_HOUSE:'Dom mistrza',ISLAND_TRAINING:'Plac treningowy',stadiumFighters:'Uczestnicy i statystyki',towerEnemies:'Przeciwnicy na wieży',northernEnemies:'Przeciwnicy w lesie',northHuntGoals:'Liczba pokonań na kolejnych etapach',updateSide:'Obsługa interakcji na mapach (wspólna)',rewardDefeat:'Naliczanie pokonań i łupów (wspólne)',dbiActiveMissions:'Dziennik misji (wspólny)',TOWN_TREASURE_TASKS:'Etapy, dialogi i opis nagród',DBI_TOWN_TREASURE_REWARDS:'Przedmioty i przyznawane nagrody',townAssassin:'Zabójca · statystyki',townJourneyRules:'Warunki i wypłata',fishermanRules:'Wymagania polowania'};
 for(const name of units){const o=element('option',(names[name]|| (name.startsWith('map:')?'Mapa i rozmieszczenie obiektów':name.startsWith('paint:')?'Maluj podłoże':name.startsWith('mission:')?'Wpis w dzienniku':/Markup|^render|Scene/.test(name)?'Dialogi i przebieg · '+name:/Grant|Claim|claim|Next/.test(name)?'Rozliczenie etapu · '+name:name))+(changes[name]?' •':''));o.value=name;select.append(o)}
 const head=element('label','Edytowana definicja ');head.append(select);dlg.append(bar,head,status,body);document.body.append(dlg);dlg.addEventListener('close',()=>{dlg.remove();onClose?.()});dlg.showModal();
 function display(){
  body.replaceChildren();const name=select.value,{file,node}=find(name),base=slice(file,node),saved=pack.nativeEdits?.[name],source=saved?.value??base;
  function commit(value){
   try{
    const {ast}=tree(value,node.type);
    if(node.type==='FunctionDeclaration'&&ast.id?.name!==name)throw Error('Zachowaj nazwę funkcji '+name+'.');
    if(['lagoonRules','masterRules','roshiRules','wandererRules','fishermanRules','townJourneyRules'].includes(name)){
     const rules=dataNode(ast.expression);
     for(const [k,v] of Object.entries(rules))if(!Number.isSafeInteger(v)||v<(k==='premium'?0:1)||v>99999999)throw Error('Wpisz poprawną liczbę całkowitą.');
    }
    if(name.startsWith('map:')){
     const data=dataNode(ast.expression);
     if(!data.name?.trim()||![data.sizeX,data.sizeY].every(n=>Number.isFinite(n)&&Number.isInteger(n*32)&&n>0&&n<=250)||!Array.isArray(data.npc)||!Array.isArray(data.mobNames))throw Error('Sprawdź nazwę, rozmiar, listę NPC i przeciwników.');
     const inside=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=data.sizeX*32&&p.y>=0&&p.y<=data.sizeY*32;
     if(!inside(data.spawn)||[...data.npc,...(data.scenery||[]),...(data.portals||[]),data.portal,data.mobs,data.boss,data.city,data.dungeon].filter(Boolean).some(p=>!inside(p)))throw Error('Znacznik znajduje się poza mapą.');
    }
    const next={...pack.nativeEdits};
    if(value===base)delete next[name];else next[name]={path:file.path,base:saved&&saved.value!==base?saved.base:base,value};
    build(next);
    const previous=pack.nativeEdits;pack.nativeEdits=next;
    if(!persist()){pack.nativeEdits=previous;throw Error('Brak miejsca na zapis projektu.')}
    status.textContent='Zapisano w projekcie. Test i plik do wdrożenia znajdziesz w zakładce „Zapis i publikacja”.';display();
   }catch(e){status.textContent=e.message}
  }
  const restore=element('button','Przywróć definicję z gry');restore.disabled=!saved;
  restore.onclick=()=>{if(confirm('Przywrócić tę definicję z aktualnie wgranej gry?'))commit(base)};
  body.append(restore);
  if(name.startsWith('map:')){
   try{const map=dataNode(tree(source,node.type).ast.expression);body.append(mapPanel(map,commit,pack.quests.flatMap(q=>(q.steps||[]).flatMap((s,i)=>(s.mapId||q.mapId)===id?[{key:q.id+':'+i,title:q.name+' · etap '+(i+1)}]:[])),mapUI,(key,obj)=>{const [qid,i]=key.split(':'),q=pack.quests.find(q=>q.id===qid),st=q?.steps[Number(i)];if(!st)return;const old=st.point;st.point={x:obj.x,y:obj.y,label:obj.label||'Punkt fabularny'};if(!persist()){if(old)st.point=old;else delete st.point;status.textContent='Brak miejsca na zapis projektu.';return}status.textContent='Zapisano punkt etapu. Oryginalna interakcja NPC pozostaje bez zmian.';}))}catch(e){status.textContent=e.message}
  }
  if(catalogMap&&['SPAWN','NPC','TENT','ISLAND_SPAWN','ISLAND_KRILLIN','ISLAND_HOUSE','ISLAND_TRAINING'].includes(name)){
   const point=dataNode(tree(source,node.type).ast.expression),view={art:catalogMap.art,sizeX:catalogMap.sizeX,sizeY:catalogMap.sizeY,spawn:point};
   const panel=mapPanel(view,updated=>commit(JSON.stringify(JSON.parse(updated).spawn)));while(panel.children.length>3)panel.lastChild.remove();body.append(panel);
  }
  if(name.startsWith('paint:')){
   let map=catalogMap;const draftMap=pack.nativeEdits?.['map:'+id];
   if(draftMap)map=dataNode(tree(draftMap.value,'ObjectExpression').ast.expression);
   body.append(paintPanel(map,dataNode(tree(source,node.type).ast.expression),commit));return;
  }
  const rows=fields(source,node.type);const filter=element('input');filter.type='search';filter.placeholder='Szukaj tekstu, opcji lub wartości';body.append(filter);
  const form=element('form'),list=element('div'),submit=element('button','Zapisz pola');list.className='dbi-native-fields';submit.type='submit';let edits=new Map();
  function show(){
   list.replaceChildren();const query=filter.value.toLocaleLowerCase('pl');
   rows.forEach((row,i)=>{
    const val=edits.get(i)??String(row.value);
    if(!(row.label+' '+val).toLocaleLowerCase('pl').includes(query))return;
    const label=element('label',row.label),input=element(val.length>75?'textarea':'input');input.value=val;
    if(input.tagName==='INPUT'&&row.kind==='number'){input.type='number';input.step='any'}
    input.oninput=()=>{if(input.value===String(row.value))edits.delete(i);else edits.set(i,input.value);submit.disabled=!edits.size};
    label.append(input);list.append(label);
   });
  }
  filter.oninput=show;submit.disabled=true;
  form.onsubmit=e=>{e.preventDefault();try{let result=source;
   for(const [i,v] of [...edits].sort((a,b)=>rows[b[0]].start-rows[a[0]].start)){const r=rows[i];result=result.slice(0,r.start)+encode(r,v)+result.slice(r.end)}
   commit(result);
  }catch(err){status.textContent=err.message}};
  form.append(list,submit);body.append(form);show();
  const adv=element('details'),summary=element('summary','Zaawansowane · pełna definicja'),raw=element('textarea'),apply=element('button','Zapisz definicję');
  raw.value=source;raw.spellcheck=false;raw.rows=14;apply.onclick=()=>commit(raw.value);adv.append(summary,raw,apply);body.append(adv);
 }
 select.onchange=display;display();
}
function saveZip(output){
 const url=URL.createObjectURL(zip(output)),a=element('a');a.href=url;a.download='DBO-zmiany-swiata.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
async function preview(tab,output,seed=null){
 try{
  tab.sessionStorage.setItem('dboidle_gm_preview_files',JSON.stringify(output));
  if(seed){
   tab.sessionStorage.setItem('dboidle_gm_preview_writes',JSON.stringify(seed.writes));
   tab.sessionStorage.setItem('dboidle_last_page_'+seed.characterId,JSON.stringify({title:'Mapa świata',section:'ŚWIAT'}));
  }else tab.sessionStorage.removeItem('dboidle_gm_preview_writes');
  tab.opener=null;
  tab.location.replace(new URL('gm-preview.html',document.baseURI).href);
 }catch(e){tab.close();throw e}
}
function readMap(id,pack){try{const key='map:'+id,source=pack.nativeEdits?.[key]?.value;if(!source)return null;return dataNode(tree(source,'ObjectExpression').ast.expression)}catch{return null}}
window.DBINativeEditor={open,load,build,saveZip,preview,readMap};
})();
