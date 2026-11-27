window.DBIContent=(()=>{
 function key(){
  const pack=window.DBI_GM_WORLD_DATA;
  return 'dboidle_gm_content_v1'+(pack?.gmContent?':'+pack.revision:'');
 }
 function read(){
  try{
   const local=JSON.parse(localStorage.getItem(key()));
   if(local)return local;
  }catch{}
  return structuredClone(window.DBI_GM_WORLD_DATA?.gmContent||{});
 }
 function save(change){
  return window.DBILocalPost.lock(()=>{
   if(!window.DBIGmAccess?.hasSession())throw Error('Zaloguj się jako Game Master.');
   const data=read();
   const writes=change(data)||[];
   window.DBILocalPost.write([...writes,[key(),data]]);
  });
 }
 const reward=(id,chance=1,qty=1)=>({id,chance,qty});
 const chests={
  'skrzynia-lesnego-wojownika':[reward('george',100)],
  'quest-starter-gift':['starter-blue-kimono','starter-red-staff','starter-white-belt','starter-black-boots','senzu-bean-bag'].map(id=>reward(id,100,id==='senzu-bean-bag'?2:1)),
  'senzu-bean-bag':[['red',600],['blue',100],['purple',50],['green',50]].map(([kind,qty])=>reward('zen-bean-'+kind,100,qty))
 };
 function normalDrops(location,name){
  const rows=['zen-bean-red','zen-bean-blue','dragon-ball-dust'];
  if((location==='centralForest'&&name==='Leśny Wojownik')||['forest','mountain','mountainLake'].includes(location))rows.push('quest-turtle-stone','small-dragon-balls');
  if(location==='centralForest'&&name==='Leśny Wojownik')rows.push('ruda-kowalstwa');
  if(location==='mountainLake')rows.push('dragon-radar');
  if(location==='highTowerForest')rows.push('small-dragon-balls','red-ribbon-badge');
  return rows.map(id=>reward(id));
 }
 const races=[['saiyan','Saiyan'],['ziemianin','Ziemianin'],['demon-mrozu','Demon Mrozu'],['nameczanin','Nameczanin'],['majin','Majin']];
 const chiPairs={
  1:['smith-chi-1','czarna-chi'],
  100:['chi-ciala-100','chi-duszy-100'],
  250:['chi-ciala-250','chi-duszy-250'],
  500:['chi-ciala-500','chi-duszy-500']
 };
 function raceId(value){
  const id=String(value??'').trim().toLowerCase().replace(/\s+/g,'-');
  if(id==='człowiek')return 'ziemianin';
  return ['sayan','saiyanin','sayanin'].includes(id)?'saiyan':id;
 }
 function validMaterials(rows,hasItem){
  return Array.isArray(rows)&&rows.length<=30&&new Set(rows.map(row=>row?.id)).size===rows.length&&
   rows.every(row=>row&&hasItem(row.id)&&Number.isSafeInteger(row.count)&&row.count>=1&&row.count<=4000);
 }
 const embeddedImage=value=>typeof value==='string'&&value.length<=400000&&/^data:image\/(?:png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
 return {read,save,chests,normalDrops,races,chiPairs,raceId,validMaterials,embeddedImage};
})();
