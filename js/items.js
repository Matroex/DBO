/* JEDYNE źródło definicji przedmiotów. Edycje GM zapisują się lokalnie; eksport JSON daje kopię katalogu. */
const DBI_DEFAULT_ITEMS=[
{id:'stroj-001',name:'Strój treningowy szkoły żółwia',slot:'stroj',icon:'🥋',image:'assets/items/stroj-treningowy-szkoly-zolwia.png',attack:0,defense:0,ki:0,trainingBaseBonusPercent:1,description:'+1% do bazowej wartości treningu'},
];
const DBI_SLOTS=[['Opaska','opaska',3,1,1],['Chi','chi',6,1,1],['Broń','bron',2,3,2],['Naszyjnik','naszyjnik',3,2,1],['Kolczyki','kolczyki',4,2,1],['Symbol','symbol',6,2,1],['Zbroja','zbroja',3,3,2],['Strój treningowy','stroj',6,3,2],['Pierścień','pierscien',2,5,1],['Pas','pas',3,5,1],['Rękawice','rekawice',4,5,1],['Esencja','esencja',6,5,1],['Energia Ki','energia',1,6,1],['Buty','buty',3,6,1],['Scouter','scouter',6,6,1]];
const DBI_SAYAN_50_ITEMS=[
 ['opaska','Opaska Sayan','opaska','🎗️'],
 ['naszyjnik','Naszyjnik Sayan','naszyjnik','📿'],
 ['zbroja','Zbroja Sayan','zbroja','🛡️'],
 ['miecz','Miecz Sayan','bron','⚔️'],
 ['pas','Pas Sayan','pas','〰️'],
 ['pierscien','Pierścień Sayan','pierscien','💍'],
 ['rekawice','Rękawice Sayan','rekawice','🥊'],
 ['kolczyki','Kolczyki Sayan','kolczyki','💎'],
 ['buty','Buty Sayan','buty','🥾'],
].map(([key,name,slot,icon])=>({
 id:'sayan-50-'+key,name,slot,icon,image:'assets/items/sayan-50-'+key+'.png',
 requiredLevel:100,requiredRace:'saiyan',quality:'Pospolity',attack:0,defense:0,ki:0,
 ...(key==='miecz'?{techniqueAttackMin:50,techniqueAttackMax:60}:{}),
 description:'Zestaw Sayan na 100. poziom.'
}));
const DBI_SAYAN_250_ITEMS=DBI_SAYAN_50_ITEMS.map(source=>{
 const key=source.id.slice('sayan-50-'.length);
 const name=key==='rekawice'?'Naramienniki':source.name.replace(/ Sayan$/,'');
 return {...source,id:'sayan-250-'+key,name:name+' Elitarnych Sayan',
  image:'assets/items/sayan-250-'+key+'.png',requiredLevel:250,
  description:'Zestaw Elitarnych Sayan na 250. poziom.'};
});
// Nowe materiały — bez dropów, receptur i automatycznych nagród.
const DBI_NEW_MATERIALS_20261125=[
 {
  "id": "fiolka-smoczego-plynu",
  "name": "Fiolka Smoczego Płynu",
  "slot": "materiał",
  "icon": "🧪",
  "image": "assets/items/fiolka-smoczego-plynu.png",
  "quality": "Pospolity",
  "requiredLevel": 1,
  "attack": 0,
  "defense": 0,
  "ki": 0,
  "description": "Fiolka z niebieskim smoczym płynem."
 },
 {
  "id": "material-sayan",
  "name": "Materiał Sayan",
  "slot": "materiał",
  "icon": "🧵",
  "image": "assets/items/material-sayan.png",
  "quality": "Pospolity",
  "requiredLevel": 1,
  "attack": 0,
  "defense": 0,
  "ki": 0,
  "description": "Fragment materiału Sayan."
 },
 {
  "id": "nameczanska-kula",
  "name": "Nameczańska Kula",
  "slot": "materiał",
  "icon": "🟢",
  "image": "assets/items/nameczanska-kula.png",
  "quality": "Pospolity",
  "requiredLevel": 1,
  "attack": 0,
  "defense": 0,
  "ki": 0,
  "description": "Zielona kula z jedną złotą gwiazdą."
 },
 {
  "id": "dzwoneczek",
  "name": "Dzwoneczek",
  "slot": "materiał",
  "icon": "🔔",
  "image": "assets/items/dzwoneczek.png",
  "quality": "Pospolity",
  "requiredLevel": 1,
  "attack": 0,
  "defense": 0,
  "ki": 0,
  "description": "Złoty dzwoneczek."
 },
 {
  "id": "maska-kukly",
  "name": "Maska Kukły",
  "slot": "materiał",
  "icon": "🎭",
  "image": "assets/items/maska-kukly.png",
  "quality": "Pospolity",
  "requiredLevel": 1,
  "attack": 0,
  "defense": 0,
  "ki": 0,
  "description": "Biało-czerwona maska."
 },
 {
  "id": "ogon-sayan",
  "name": "Ogon Sayan",
  "slot": "materiał",
  "icon": "🐒",
  "image": "assets/items/ogon-sayan.png",
  "quality": "Pospolity",
  "requiredLevel": 1,
  "attack": 0,
  "defense": 0,
  "ki": 0,
  "description": "Zwinięty ogon Sayan."
 },
 {
  "id": "szara-fiolka",
  "name": "Szara fiolka",
  "slot": "materiał",
  "icon": "🧪",
  "image": "assets/items/szara-fiolka.png",
  "quality": "Pospolity",
  "requiredLevel": 1,
  "attack": 0,
  "defense": 0,
  "ki": 0,
  "description": "Szara fiolka z korkiem."
 },
 {
  "id": "miska-ryzu",
  "name": "Miska ryżu",
  "slot": "materiał",
  "icon": "🍚",
  "image": "assets/items/miska-ryzu.png",
  "quality": "Pospolity",
  "requiredLevel": 1,
  "attack": 0,
  "defense": 0,
  "ki": 0,
  "description": "Miska wypełniona ryżem."
 },
 {
  "id": "kawalek-ciala-buu",
  "name": "Kawałek Ciała BUU",
  "slot": "materiał",
  "icon": "🟣",
  "image": "assets/items/kawalek-ciala-buu.png",
  "quality": "Pospolity",
  "requiredLevel": 1,
  "attack": 0,
  "defense": 0,
  "ki": 0,
  "description": "Różowy fragment ciała BUU."
 },
 {
  "id": "kapsula-kosmiczna-sayan",
  "name": "Kapsuła kosmiczna Sayan",
  "slot": "materiał",
  "icon": "🚀",
  "image": "assets/items/kapsula-kosmiczna-sayan.png",
  "quality": "Pospolity",
  "requiredLevel": 1,
  "attack": 0,
  "defense": 0,
  "ki": 0,
  "description": "Kulista kapsuła kosmiczna."
 },
 {
  "id": "dna-sayan",
  "name": "DNA Sayan",
  "slot": "materiał",
  "icon": "🧬",
  "image": "assets/items/dna-sayan.png",
  "quality": "Pospolity",
  "requiredLevel": 1,
  "attack": 0,
  "defense": 0,
  "ki": 0,
  "description": "Żółto-niebieska helisa DNA."
 },
 {
  "id": "kosmiczna-plytka",
  "name": "Kosmiczna Płytka",
  "slot": "materiał",
  "icon": "🔧",
  "image": "assets/items/kosmiczna-plytka.png",
  "quality": "Pospolity",
  "requiredLevel": 1,
  "attack": 0,
  "defense": 0,
  "ki": 0,
  "description": "Płytka z obwodami elektronicznymi."
 },
 {
  "id": "czarna-kostka",
  "name": "Czarna kostka",
  "slot": "materiał",
  "icon": "⬛",
  "image": "assets/items/czarna-kostka.png",
  "quality": "Pospolity",
  "requiredLevel": 1,
  "attack": 0,
  "defense": 0,
  "ki": 0,
  "description": "Czarna kostka o kamiennej strukturze."
 },
 {
  "id": "kamienna-inskrypcja-starozytnych-sayan",
  "name": "Kamienna Inskrypcja Starożytnych Sayan",
  "slot": "materiał",
  "icon": "🪨",
  "image": "assets/items/kamienna-inskrypcja-starozytnych-sayan.png",
  "quality": "Pospolity",
  "requiredLevel": 1,
  "attack": 0,
  "defense": 0,
  "ki": 0,
  "description": "Kamienna tablica z inskrypcją."
 },
 {
  "id": "sayanska-ruda",
  "name": "Sayańska Ruda",
  "slot": "materiał",
  "icon": "🪨",
  "image": "assets/items/sayanska-ruda.png",
  "quality": "Pospolity",
  "requiredLevel": 1,
  "attack": 0,
  "defense": 0,
  "ki": 0,
  "description": "Złoto-czarna ruda."
 },
 ...[
  ['sayanska-duma','Sayańska Duma','🔥','Złoty płomień otaczający kroplę o szkarłatnej barwie.'],
  ['sayanski-metal','Sayański Metal','🟨','Sztabka złocistego metalu.'],
  ['skrawek-sayanskiej-duszy','Skrawek Sayańskiej Duszy','👤','Ciemna sylwetka otoczona niebieską aurą.'],
  ['krwisty-krysztal','Krwisty Kryształ','💎','Głęboko czerwony kryształ o błyszczących krawędziach.'],
  ['ksiezycowy-pyl','Księżycowy Pył','🌙','Srebrzysty pył zamknięty w fiolce ze znakiem półksiężyca.'],
  ['sztuczny-ksiezyc','Sztuczny Księżyc','🌕','Jasna kula otoczona promieniami energii.'],
  ['iskra-super-sayana','Iskra Super Sayana','⚡','Skupiona iskra złotej energii z rozgałęzionymi błyskawicami.']
 ].map(([id,name,icon,description])=>({
  id,name,slot:'materiał',icon,image:'assets/items/'+id+'.png',
  quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0,description
 }))
];
DBI_DEFAULT_ITEMS.push(...DBI_NEW_MATERIALS_20261125);
const DBI_ADVENTURE_MATERIALS=[
 ['skorupa-zolwia','Skorupa żółwia','🐢','Twarda, brązowa skorupa o grubych płytkach.'],
 ['swieta-woda','Święta Woda','💧','Woda przechowywana w ozdobnej fiolce z długą szyjką.'],
 ['kuchenka','Kuchenka','🍲','Lekka kuchenka polowa mieszcząca się w bagażu podróżnika.'],
 ['kapsula-przenosna','Kapsuła przenośna','💊','Kompaktowa kapsuła z przyciskiem i obudową z lekkiego stopu.'],
 ['kawalek-diamentu','Kawałek Diamentu','💎','Ostry odłamek kryształu o błękitnych refleksach.'],
 ['posazek-smoka','Posążek smoka','🐉','Jadeitowa figurka wijącego się smoka na kamiennej podstawie.'],
 ['czastki-ki','Cząstki KI','✨','Skupisko drobin skondensowanej energii KI.'],
 ['wola-weza','Wola węża','🐍','Talizman o kształcie wężowej maski z zakrzywionymi kłami.'],
 ['futro-zwierzecia','Futro zwierzęcia','🧶','Gruby płat futra z rudobrązowym włosiem.'],
 ['zolty-kiel','Żółty Kieł','🦷','Długi, zakrzywiony kieł o żółtawym zabarwieniu.'],
 ['najwyzsza-moc','Najwyższa moc','⚡','Złoty rdzeń energii otoczony iskrzącą aurą.'],
 ['czesci-androidow','Części androidów','⚙️','Fragmenty pancerza, mechanizmów i przewodów androida.'],
 ['kawalek-miecza-z','Kawałek miecza Z','🗡️','Złamany fragment legendarnej klingi z zachowaną rękojeścią.']
].map(([id,name,icon,description])=>({
 id,name,icon,description,slot:'materiał',image:'assets/items/'+id+'.png',
 quality:'Pospolity',requiredLevel:1,attack:0,defense:0,ki:0
}));
DBI_DEFAULT_ITEMS.push(...DBI_ADVENTURE_MATERIALS);
const DBI_SAIYAN_CHI=[
 ['chi-ciala-100','Chi Ciała',100],['chi-duszy-100','Chi Duszy',100],
 ['chi-ciala-250','Chi sayańskiego ciała',250],['chi-duszy-250','Chi sayańskiej duszy',250],
 ['chi-ciala-500','Chi doskonałego ciała',500],['chi-duszy-500','Chi doskonałej duszy',500]
].map(([id,name,requiredLevel])=>({
 id,name,requiredLevel,slot:'chi',requiredRace:'saiyan',icon:'✦',quality:'Pospolity',
 attack:0,defense:0,ki:0,image:'assets/items/'+id+'.png',description:'Chi wyposażane przez wojowników rasy Saiyan.'
}));
DBI_DEFAULT_ITEMS.push(...DBI_SAIYAN_CHI);

function dbiAddAdventureItems(items){
 const ids=new Set(items.map(item=>item.id));
 for(const item of [...DBI_ADVENTURE_MATERIALS,...DBI_SAIYAN_CHI])if(!ids.has(item.id))items.push({...item});
}
// Nowe jakości Pyłu smoczych kul. Odrębne ID gwarantują osobne stosy materiału.
const DBI_DRAGON_DUST_VARIANTS=[
 ['dragon-ball-dust-common','Zwyczajny','szary'],
 ['dragon-ball-dust-rare','Rzadki','zielony'],
 ['dragon-ball-dust-epic','Epicki','czarny']
].map(([id,quality,color])=>({id,name:'Pył smoczych kul',slot:'materiał',image:'assets/items/pyl-smoczych-kul-'+color+'.png',icon:'✨',quality,requiredLevel:1,attack:0,defense:0,ki:0,description:'Magiczny pył wykorzystywany do ulepszania przedmiotów.'}));
DBI_DEFAULT_ITEMS.push(...DBI_DRAGON_DUST_VARIANTS);
const DBI_KEY='dbi_catalog_v08';
function dbiLoadCatalog(){
 let items=structuredClone(DBI_DEFAULT_ITEMS);
 try{const data=JSON.parse(localStorage.getItem(DBI_KEY));if(Array.isArray(data))items=data}catch(e){}
 for(const item of DBI_SAYAN_50_ITEMS){
  const index=items.findIndex(entry=>entry.id===item.id);
  if(index<0)items.push({...item});
  else items[index]={...item,...items[index],slot:item.slot,image:item.image,requiredLevel:item.requiredLevel,requiredRace:item.requiredRace,description:items[index].description==='Zestaw Sayan na 50. poziom.'?item.description:items[index].description??item.description,...(item.id==='sayan-50-miecz'?{techniqueAttackMin:50,techniqueAttackMax:60}:{})};
 }
 for(const item of DBI_SAYAN_250_ITEMS){
  const index=items.findIndex(entry=>entry.id===item.id);
  if(index<0)items.push({...item});
  else items[index]={...item,...items[index],slot:item.slot,requiredLevel:item.requiredLevel,requiredRace:item.requiredRace};
 }
 // Uzupełnij zapisany wcześniej katalog, bez nadpisywania edycji GM.
 for(const item of DBI_NEW_MATERIALS_20261125){
  if(!items.some(entry=>entry.id===item.id))items.push({...item});
 }
 dbiAddAdventureItems(items);
 // Uzupełnia także katalogi zapisane przed dodaniem nowych jakości.
 for(const item of DBI_DRAGON_DUST_VARIANTS){
  const index=items.findIndex(entry=>entry.id===item.id);
  if(index<0)items.push({...item});
  else items[index]={...items[index],...item};
 }
 return items;
}
function dbiSaveCatalog(items){localStorage.setItem(DBI_KEY,JSON.stringify(items))}
