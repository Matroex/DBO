/* DBOidle: królewski zestaw 500 LVL. Wstaw PO items.js i starter-items.js, PRZED app.js. */
(()=>{
 const specs=[
  ['miecz-krola-saiyan','Miecz Króla Saiyan','bron','⚔️'],
  ['pancerz-krola-saiyan','Pancerz Króla Saiyan','zbroja','🛡️'],
  ['pas-krola-saiyan','Małpi Ogon Króla Saiyan','pas','〰️'],
  ['buty-krola-saiyan','Buty Króla Saiyan','buty','🥾'],
  ['rekawice-krola-saiyan','Rękawice Króla Saiyan','rekawice','🥊'],
  ['opaska-krola-saiyan','Opaska Króla Saiyan','opaska','🎗️'],
  ['naszyjnik-krola-saiyan','Naszyjnik Króla Saiyan','naszyjnik','📿'],
  ['kolczyki-krola-saiyan','Kolczyki Króla Saiyan','kolczyki','💎'],
  ['pierscien-krola-saiyan','Pierścień Króla Saiyan','pierscien','💍'],
  ['chi-krola-saiyan','Chi Króla Saiyan','chi','🔺'],
  ['znak-krola-saiyan','Znak Króla Saiyan','znak','王'],
  ['stroj-krola-saiyan','Strój Treningowy Króla Saiyan','stroj','🥋'],
  ['esencja-krola-saiyan','Esencja Króla Saiyan','esencja','💠'],
  ['scouter-krola-saiyan','Scouter Króla Saiyan','scouter','🔍']
 ];
 const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 // Wykorzystuje faktyczne identyfikatory slotów z Twojej wersji items.js.
 const resolveSlot=(wanted)=>{
  if(typeof DBI_SLOTS==='undefined')return wanted;
  const synonyms={bron:['bron','broń','weapon'],zbroja:['zbroja','pancerz'],rekawice:['rekawice','rękawice'],opaska:['opaska','glowa','głowa'],pierscien:['pierscien','pierścień'],kolczyki:['kolczyki','kolczyk'],stroj:['stroj','strój','strojtreningowy'],chi:['chi'],znak:['znak'],esencja:['esencja'],scouter:['scouter']};
  const names=synonyms[wanted]||[wanted];
  const found=DBI_SLOTS.find(([label,id])=>names.some(n=>normalize(id)===normalize(n)||normalize(label)===normalize(n)));
  return found?found[1]:wanted;
 };
 const tallSlots=new Set(['bron','zbroja','stroj']);
 const items=specs.map(([id,name,slot,icon])=>({
  id:'royal-500-'+id,name,slot:resolveSlot(slot),icon,
  width:1,height:tallSlots.has(slot)?2:1,size:tallSlots.has(slot)?2:1,
  image:'assets/items/'+id+'.png',requiredLevel:500,quality:'Legendarny',
  attack:0,defense:0,ki:0,
  description:'Zestaw Króla Saiyan · wymagany poziom 500. Statystyki do ustalenia.'
 }));
 window.DBI_ROYAL_500_ITEMS=items;
 if(typeof dbiLoadCatalog==='function'){
  const original=dbiLoadCatalog;
  dbiLoadCatalog=function(){
   const catalog=original();
   for(const item of items){const i=catalog.findIndex(x=>x.id===item.id);
    if(i<0)catalog.push({...item});
    else catalog[i]={...catalog[i],name:item.name,slot:item.slot,image:item.image,requiredLevel:500,width:item.width,height:item.height,size:item.size};
   }
   return catalog;
  };
 }
 // Dodaje przycisk testowy do panelu GM; nic nie przyznaje automatycznie.
 const attach=()=>{
  const panel=document.querySelector('.gm-layout');
  if(!panel||document.querySelector('#gmRoyal500'))return;
  const section=document.createElement('section');section.className='eq-panel';
  section.style.cssText='grid-column:1/-1;padding:16px;margin-top:12px';
  section.innerHTML='<h2>ZESTAW KRÓLA SAIYAN · 500 LVL</h2><p>14 przedmiotów. Wymagany poziom 500. Statystyki pozostają do ustalenia.</p><button id="gmRoyal500" type="button">Dodaj cały zestaw do inwentarza</button><p id="gmRoyal500Status" role="status"></p>';
  panel.append(section);
  section.querySelector('button').onclick=()=>{
   if(typeof inventory==='undefined'||typeof inventoryPlacement==='undefined'||typeof dbiSaveInventory!=='function')return;
   let added=0;
   for(const item of items){inventory.push(item.id);inventoryPlacement.push(null);added++}
   dbiSaveInventory();section.querySelector('#gmRoyal500Status').textContent='Dodano '+added+' przedmiotów do inwentarza aktywnej postaci.';
  };
 };
 window.addEventListener('DOMContentLoaded',()=>{
  const target=document.querySelector('#pageBody');if(!target)return;
  const observer=new MutationObserver(attach);observer.observe(target,{childList:true,subtree:false});attach();
 });
})();
