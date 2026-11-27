(()=>{
 const post=window.DBILocalPost;
 const byId=id=>document.getElementById(id);
 if(!window.DBIGmAccess.hasSession()){byId('gmAccessNotice').hidden=false;return}
 byId('gmPage').hidden=false;
 const prefix='dboidle_characters_v1_';
 const target=byId('target'),status=byId('gmStatus'),forms=byId('gmForms');
 const statsForm=byId('stats'),grantForm=byId('grant');
 const fields=[['level','Poziom',500],['exp','EXP',Number.MAX_SAFE_INTEGER],
  ['strength','Siła'],['speed','Szybkość'],['endurance','Wytrzymałość'],['intelligence','Inteligencja'],['ki','KI'],
  ['gold','Złoto'],['dragon','Smocze Monety'],['premium','Zeni']];
 const attrs=new Set(['strength','speed','endurance','intelligence','ki']);
 function option(value,text){return new Option(text,value)}
 for(const [key,label,max=999999999999] of fields){
  const element=document.createElement('label'),input=document.createElement('input');
  element.textContent=label;
  Object.assign(input,{name:key,type:'number',required:true,min:key==='level'?1:0,max,step:1});
  element.append(input);byId('statsFields').append(element);
 }
 function characters(){
  return Object.keys(localStorage).filter(key=>key.startsWith(prefix)).flatMap(key=>{
   const list=post.read(key,[]);
   return Array.isArray(list)?list.filter(c=>c?.id&&c.name).map(c=>({key,character:c})):[];
  });
 }
 function selected(){
  return characters().find(({key,character})=>JSON.stringify([key,character.id])===target.value);
 }
 const catalog=()=>dbiLoadCatalog();
 grantForm.elements.namedItem('item').append(option('','Bez przedmiotu'));
 for(const item of catalog().slice().sort((a,b)=>a.name.localeCompare(b.name,'pl'))){
  grantForm.elements.namedItem('item').append(option(item.id,item.name+' · '+item.id));
 }
 function keys(id){return {
  gold:'dboidle_gold_v1_'+id,dragon:'dboidle_dragon_wallet_v1_'+id,premium:'dboidle_premium_v1_'+id
 }}
 function renderDetails(){
  const record=selected();
  forms.hidden=!record;
  if(!record)return;
  const c=record.character,k=keys(c.id);
  const wallet=post.read(k.dragon,{});
  for(const [name] of fields){
   const value=attrs.has(name)?c.stats?.[name]??c[name]:
    name==='gold'||name==='premium'?post.read(k[name],0):name==='dragon'?wallet.coins:c[name];
   statsForm.elements[name].value=Number.isFinite(Number(value))?Math.floor(Number(value)):name==='level'?1:0;
  }
  const counts=new Map(),definitions=new Map(catalog().map(item=>[item.id,item.name]));
  for(const ref of post.read(post.inventoryKey(c.id),[])){
   const [id,enhancement,quality]=ref.split('~');
   const label=(definitions.get(id)||id)+(enhancement? ' +'+enhancement:'')+(quality?' · '+['Pospolity','Zwyczajny','Rzadki','Epicki','Legendarny'][Number(quality.slice(1))]:'');
   counts.set(label,(counts.get(label)||0)+1);
  }
  byId('inventory').textContent=counts.size?[...counts].map(([name,count])=>name+' ×'+count).join(', '):'Ekwipunek jest pusty.';
  const history=byId('history');
  history.replaceChildren(...post.history().filter(entry=>entry.id===c.id).slice(0,20).map(entry=>{
   const li=document.createElement('li');
   li.textContent=new Date(entry.time).toLocaleString('pl-PL')+' · '+entry.action+' · '+entry.details;
   return li;
  }));
 }
 function refresh(){
  const term=byId('characterSearch').value.trim().toLocaleLowerCase('pl'),previous=target.value;
  target.replaceChildren(option('','Wybierz postać'));
  for(const {key,character} of characters()){
   const label=character.name+' · '+key.slice(prefix.length)+' · poziom '+(character.level||1);
   if(label.toLocaleLowerCase('pl').includes(term))target.append(option(JSON.stringify([key,character.id]),label));
  }
  target.value=[...target.options].some(o=>o.value===previous)?previous:'';
  renderDetails();
 }
 function submit(form,operation){
  form.addEventListener('submit',async event=>{
   event.preventDefault();
   const selection=target.value,data=new FormData(form),mode=event.submitter?.value;
   const buttons=[...form.querySelectorAll('button')];
   buttons.forEach(button=>button.disabled=true);
   try{
    await post.lock(()=>{
     if(selection!==target.value)throw Error('Wybrano inną postać.');
     const record=selected();
     if(!record)throw Error('Wybierz postać.');
     status.textContent=operation(record,data,mode);
    });
    refresh();
   }catch(error){status.textContent=error.message||'Zapis nie powiódł się.'}
   finally{buttons.forEach(button=>button.disabled=false)}
  });
 }
 submit(statsForm,({key,character},data)=>{
  const list=post.read(key,[]),k=keys(character.id),wallet=post.read(k.dragon,{});
  const updated={...character,stats:{...character.stats}};
  for(const [name] of fields){
   const n=Number(data.get(name));
   if(attrs.has(name))updated.stats[name]=n;
   else if(name==='level'||name==='exp')updated[name]=n;
  }
  wallet.coins=Number(data.get('dragon'));
  post.write([[key,list.map(c=>c.id===updated.id?updated:c)],[k.gold,Number(data.get('gold'))],
   [k.dragon,wallet],[k.premium,Number(data.get('premium'))],
   post.log(updated.id,updated.name,'Zapis postaci',fields.map(([name,label])=>label+' '+data.get(name)).join(', '))]);
  return 'Zapisano postać.';
 });
 submit(grantForm,({character},data,mode)=>{
  const item=catalog().find(entry=>entry.id===data.get('item'));
  const count=Number(data.get('count')),enhancement=Number(data.get('enhancement')),quality=data.get('quality');
  const ref=item?(quality!==''?item.id+'~'+enhancement+'~q'+quality:enhancement?item.id+'~'+enhancement:item.id):null;
  const {id,name}=character;
  if(mode==='direct'){
   if(!item)throw Error('Wybierz przedmiot.');
   post.write([...post.inventoryGrant(id,ref,count,value=>catalog().find(entry=>entry.id===value.split('~')[0])),post.log(id,name,'Dodano do ekwipunku',item.name+' ×'+count)]);
   return 'Dodano przedmiot do ekwipunku.';
  }
  const subject=String(data.get('subject')).trim(),body=String(data.get('body')).trim();
  if(!item&&!body&&!subject)throw Error('Wpisz wiadomość lub wybierz załącznik.');
  post.write([post.dispatch(id,{sender:'GM',subject:subject||'Wiadomość od GM',body,attachment:item?{ref,count}:null}),
   post.log(id,name,'Wysłano pocztą',item?item.name+' ×'+count:subject||'Wiadomość')]);
  return 'Wysłano wiadomość.';
 });
 const map=byId('gmLocation');
 for(const place of window.DBIWorld.locations.filter(loc=>loc.spawn))map.append(option(place.id,place.name));
 window.DBIGmContentEditor.locationSearch(map);
 submit(byId('teleport'),({character},data)=>{
  const result=window.DBIWorld.gmTeleport(character.id,String(data.get('location')));
  if(!result.ok)throw Error(result.message);
  post.write([post.log(character.id,character.name,'Teleportacja',result.message)]);
  return result.message;
 });
 const itemSelect=grantForm.elements.namedItem('item'),itemPreview=document.createElement('div');
 itemPreview.className='gm-visual';itemSelect.closest('label').after(itemPreview);
 const previewGrant=()=>{
  const item=catalog().find(entry=>entry.id===itemSelect.value);
  itemPreview.hidden=!item;
  if(item)window.DBIGmContentEditor.visual(itemPreview,{...item,detail:item.quality,description:item.description});
 };
 itemSelect.addEventListener('change',previewGrant);previewGrant();
 byId('characterSearch').addEventListener('input',refresh);
 target.addEventListener('change',renderDetails);
 refresh();
})();

