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
 requiredLevel:50,requiredRace:'saiyan',quality:'Pospolity',attack:0,defense:0,ki:0,
 description:'Zestaw Sayan na 50. poziom.'
}));
const DBI_KEY='dbi_catalog_v08';
function dbiLoadCatalog(){
 let items=structuredClone(DBI_DEFAULT_ITEMS);
 try{const data=JSON.parse(localStorage.getItem(DBI_KEY));if(Array.isArray(data))items=data}catch(e){}
 for(const item of DBI_SAYAN_50_ITEMS){
  const index=items.findIndex(entry=>entry.id===item.id);
  if(index<0)items.push({...item});
  else items[index]={...item,...items[index],slot:item.slot,image:item.image,requiredLevel:item.requiredLevel,requiredRace:item.requiredRace};
 }
 return items;
}
function dbiSaveCatalog(items){localStorage.setItem(DBI_KEY,JSON.stringify(items))}
