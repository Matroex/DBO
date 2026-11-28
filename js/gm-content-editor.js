window.DBIGmContentEditor=(()=>{
 const stats=[['strength','Siła'],['speed','Szybkość'],['endurance','Wytrzymałość'],['intelligence','Inteligencja'],
  ['ki','KI'],['attack','Atak'],['defense','Obrona'],['hp','HP']];
 const rewards=[['level','Poziom'],['gold','Złoto'],['exp','EXP']];
 const option=(value,label)=>new Option(label,value);
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const imagePath=path=>window.DBIContent.embeddedImage(path)||(/^assets\/(?:[^/\\.]+\/)*[^/\\]+\.(?:png|webp|jpe?g|gif|svg)$/i.test(path)&&!path.includes('..'));
 const tabs=[['items','Przedmioty'],['chests','Skrzynie'],['enemies','Moby i bossowie'],['smith','Kowalstwo i ewolucje'],['upgrades','Ulepszanie'],['character','Postać'],['teleport','Teleport GM'],['maps','Kreator map i questów']];
 function navigation(active){
  return '<header class="gm-workbench-header"><h1>Panel GM</h1><a href="gm.html">Postacie i poczta</a></header>'+
   '<nav class="gm-workbench-nav" aria-label="Sekcje panelu GM">'+tabs.map(([id,label])=>'<button type="button" '+(id==='maps'?'id="gmOpenWorldCreator" ':'')+'data-gm-tab-open="'+id+'" aria-current="'+(active===id?'page':'false')+'">'+label+'</button>').join('')+
   '<button type="button" data-gm-download>Pobierz ZIP na GitHub</button></nav><p data-gm-download-status role="status" hidden></p>';
 }
 function bindNavigation(root,openTab){
  root.querySelectorAll('[data-gm-tab-open]').forEach(button=>button.onclick=()=>openTab(button.dataset.gmTabOpen));
  const download=root.querySelector('[data-gm-download]'),status=root.querySelector('[data-gm-download-status]');
  download.onclick=async()=>{
   if(!window.DBIGmAccess.hasSession())return;
   download.disabled=true;
   status.hidden=false;
   status.textContent='Przygotowywanie ZIP…';
   try{await window.DBIGMMapEditor.download(message=>{status.textContent=message})}
   catch(error){status.textContent='Nie udało się przygotować ZIP: '+error.message}
   finally{download.disabled=false}
  };
 }
 function locationSearch(select){
  const label=document.createElement('label'),input=document.createElement('input'),hint=document.createElement('small');
  input.type='search';input.placeholder='Wpisz nazwę lub ID mapy';
  label.append('Szukaj mapy',input);select.closest('label').before(label);
  select.after(hint);
  const all=[...select.options].map(o=>[o.value,o.text]);
  function filter(){
   const previous=select.value,term=input.value.trim().toLocaleLowerCase('pl');
   const matches=all.filter(([id,name])=>(id+' '+name).toLocaleLowerCase('pl').includes(term));
   select.replaceChildren(...matches.map(([id,name])=>option(id,name)));
   if(matches.some(([id])=>id===previous))select.value=previous;
   if(!matches.length)select.append(option('','Brak pasujących map'));
   hint.textContent=matches.length+' z '+all.length+' lokacji';
   const submit=select.form?.querySelector('button[type=submit],button:not([type])');
   if(submit)submit.disabled=!matches.length;
  }
  input.oninput=filter;filter();
 }
 function thumbnail(root,item){
  const fallback=document.createElement('span');
  fallback.textContent=item?.icon||'◇';
  root.replaceChildren(fallback);
  if(!imagePath(item?.image||''))return;
  const art=new Image();
  art.alt='';
  art.onload=()=>{if(root.contains(fallback))fallback.replaceWith(art)};
  art.src=item.image;
 }
 function visual(root,item){
  root.innerHTML='<div class="gm-thumbnail"></div><div class="gm-visual-text"><strong>'+escape(item.name)+'</strong>'+
   (item.detail?'<small>'+escape(item.detail)+'</small>':'')+
   (item.stats?.length?'<dl>'+item.stats.map(([label,value])=>'<div><dt>'+escape(label)+'</dt><dd>'+escape(value===''?'—':value)+'</dd></div>').join('')+'</dl>':'')+
   (item.description?'<p>'+escape(item.description)+'</p>':'')+'</div>';
  thumbnail(root.querySelector('.gm-thumbnail'),item);
 }
 const fields=definitions=>definitions.map(([id,label])=>`<label>${label}<input name="${id}" type="number" min="${['hp','level'].includes(id)?1:0}" max="999999999" step="1"></label>`).join('');
 const numbers=(form,definitions)=>Object.fromEntries(definitions.filter(([id])=>form.elements[id].value!=='').map(([id])=>[id,form.elements[id].valueAsNumber]));
 function lootEditor(form,items,initial,ownId){
  const list=form.querySelector('.gm-content-rows');
  const catalog=new Map(items.filter(item=>item.id!==ownId).map(item=>[item.id,item]));
  const summary=form.querySelector('[data-loot-summary]');
  function updateSummary(){
   const count=list.children.length;
   summary.textContent=count?count+' pozycji w tabeli':'Brak pozycji w tabeli.';
  }
  function append(row={}){
   const node=document.createElement('div');
   node.className='gm-content-row';
   node.innerHTML='<div class="gm-thumbnail"></div><label>Przedmiot<select required></select></label><label>Szansa (%)<input type="number" min="0" max="100" step="any" required></label><label>Sztuk<input type="number" min="1" max="4000" step="1" required></label><button type="button" class="ghost-button">Usuń</button>';
   const select=node.querySelector('select'),[chance,qty]=node.querySelectorAll('input');
   select.append(option('','Wybierz przedmiot'),...[...catalog].map(([id,item])=>option(id,item.name+' · '+id)));
   if(row.id&&!catalog.has(row.id))select.append(option(row.id,row.id+' · brak w katalogu'));
   select.value=row.id||'';
   chance.value=row.chance??100;qty.value=row.qty??1;
   const update=()=>thumbnail(node.querySelector('.gm-thumbnail'),catalog.get(select.value));
   select.onchange=update;update();
   node.querySelector('button').onclick=()=>{node.remove();updateSummary()};
   list.append(node);updateSummary();
  }
  initial.forEach(append);updateSummary();
  form.querySelector('[data-add-row]').onclick=()=>{append();list.lastElementChild.querySelector('select').focus()};
  return ()=>{
   const result=[...list.children].map(row=>{
    const [chance,qty]=row.querySelectorAll('input');
    return {id:row.querySelector('select').value,chance:chance.valueAsNumber,qty:qty.valueAsNumber};
   });
   if(result.some(row=>!catalog.has(row.id)))throw Error('Wybierz nagrody dostępne w katalogu.');
   if(result.length>50||result.reduce((sum,row)=>sum+row.qty,0)>4000)throw Error('Maksymalnie 50 pozycji i 4000 sztuk łącznie.');
   if(new Set(result.map(row=>row.id)).size!==result.length)throw Error('Każdy przedmiot dodaj w jednym wierszu.');
   return result;
  };
 }
 function open(root,section,api){
  if(!window.DBIGmAccess.hasSession())return;
  if(section==='smith'||section==='upgrades')return openSmith(root,api,section);
  const enemies=section==='enemies',service=window.DBIContent;
  root.innerHTML=`<div class="gm-workbench">${navigation(section)}<section class="dbi-admin gm-content"><header class="dbi-admin-head"><h2>${enemies?'Moby i bossowie':'Skrzynie'}</h2></header>
   <div class="gm-content-columns"><aside><label>Szukaj <input type="search" class="gm-content-search" placeholder="Nazwa lub ID"></label>
   <label>${enemies?'Mob lub boss':'Skrzynia'}<select class="gm-content-picker"></select></label></aside>
   <div><div class="gm-visual gm-content-preview" hidden></div><div class="gm-content-form"></div><p class="gm-content-status" role="status"></p></div></div></section></div>`;
  bindNavigation(root,destination=>{
   if(['chests','enemies','smith','upgrades'].includes(destination))open(root,destination,api);
   else if(destination==='maps')api.maps();
   else api.back(destination);
  });
  const picker=root.querySelector('.gm-content-picker'),body=root.querySelector('.gm-content-form'),status=root.querySelector('.gm-content-status');
  const search=root.querySelector('.gm-content-search'),preview=root.querySelector('.gm-content-preview');
  const loot=`<fieldset><legend>${enemies?'Tabela łupów':'Zawartość skrzyni'}</legend>
   <p>Każdy wiersz jest losowany osobno. 100% gwarantuje podaną liczbę sztuk.</p><p data-loot-summary></p><div class="gm-content-rows"></div>
   <button type="button" class="ghost-button" data-add-row>+ Dodaj pozycję</button></fieldset>`;
  const editor=window.DBIGMMapEditor;
  const entries=enemies?window.DBIWorld.gmEncounters([
   ...(editor?.readPublished().maps||[]),...(editor?.readDraft().maps||[])
  ]):[];
  const sort=items=>items.slice().sort((a,b)=>a.name.localeCompare(b.name,'pl'));
  function choices(selected=''){
   const data=service.read();
   const options=enemies?entries.map(row=>option(row.key,row.location+' · '+row.unit.name+(row.boss?' (boss)':''))):
    sort(api.items()).filter(item=>Object.hasOwn(data.chests||{},item.id)||Object.hasOwn(service.chests,item.id)||/skrzyni|chest/i.test(item.name+' '+item.id)).map(item=>option(item.id,item.name+' · '+item.id));
   const term=search.value.trim().toLocaleLowerCase('pl');
   const matches=options.filter(o=>(o.value+' '+o.text).toLocaleLowerCase('pl').includes(term)||o.value===selected);
   picker.replaceChildren(option('',enemies?'Wybierz przeciwnika':'+ Nowa skrzynia'),...matches);
   picker.value=selected;
   if(picker.selectedIndex<0)picker.value='';
  }
  function render(clear=true){
   if(clear)status.textContent='';
   const id=picker.value,data=service.read(),entry=entries.find(row=>row.key===id);
   const item=enemies?null:api.items().find(row=>row.id===id);
   preview.hidden=enemies&&!entry;
   if(enemies&&!entry){body.textContent='Wybierz przeciwnika, aby ustawić jego statystyki i łupy.';return}
   body.innerHTML=`<form>${enemies?
    '<p>Puste pola korzystają z ustawień domyślnych. Nagrody są wartościami bazowymi przed bonusami.</p><div class="gm-content-fields">'+fields([...rewards,...stats])+'</div><label class="gm-content-toggle"><input type="checkbox" name="custom"> Używaj własnej tabeli łupów</label>':
    '<div class="gm-content-fields"><label>ID skrzyni<input name="id" required maxlength="60" value="'+escape(item?.id)+'" '+(item?'readonly':'')+'></label><label>Nazwa<input name="title" required maxlength="90" value="'+escape(item?.name)+'"></label><label>Grafika w assets<input name="image" maxlength="150" value="'+escape(item?.image)+'"></label></div>'}
    ${loot}<button type="submit" class="gold-button">Zapisz zmiany</button></form>`;
   const form=body.querySelector('form');
   const change=data.enemies?.[id]||{};
   const rows=enemies?(change.drops??entry.drops):(data.chests?.[id]??service.chests[id]??[]);
   const getLoot=lootEditor(form,sort(api.items()),rows,item?.id);
   if(enemies){
    const current={...change,...change.stats};
    for(const [key] of [...rewards,...stats]){
     form.elements[key].value=current[key]??'';

    }
    const custom=form.elements.custom;
    custom.checked=Array.isArray(change.drops);
    custom.onchange=()=>{form.querySelector('fieldset').disabled=!custom.checked};
    custom.onchange();
   }
   function showPreview(){
    if(enemies){
     const defaults=window.DBIWorld.gmEncounterDefaults(entry,Number(form.elements.level.value)||entry.unit.level);
     for(const [key] of [...rewards,...stats])form.elements[key].placeholder=defaults[key]??'';
     visual(preview,{name:entry.unit.name,detail:entry.location,
      image:window.DBIWorld.mobPortrait(entry.unit.name,entry.unit.portrait),
      stats:[['Poziom',form.elements.level.value||entry.unit.level||1],['HP',form.elements.hp.value||form.elements.hp.placeholder||'wg poziomu'],
       ['Złoto',form.elements.gold.value||form.elements.gold.placeholder||'wg poziomu'],['EXP',form.elements.exp.value||form.elements.exp.placeholder||'wg poziomu']]});
    }else visual(preview,{name:form.elements.title.value||'Nowa skrzynia',icon:item?.icon||'📦',image:form.elements.image.value,detail:'Skrzynia'});
   }
   for(const field of form.querySelectorAll('input[name]'))field.addEventListener('input',showPreview);
   showPreview();
   form.onsubmit=async event=>{
    event.preventDefault();
    const submit=form.querySelector('[type=submit]');
    submit.disabled=true;
    try{
     let selection=id;
     if(enemies){
      const config={...numbers(form,rewards),stats:numbers(form,stats)};
      if(form.elements.custom.checked)config.drops=getLoot();
      await service.save(latest=>{(latest.enemies??={})[id]=config});
     }else{
      selection=form.elements.id.value.trim();
      const name=form.elements.title.value.trim(),image=form.elements.image.value.trim(),rewards=getLoot();
      if(image&&!imagePath(image)&&image!==item?.image)throw Error('Wskaż grafikę z folderu assets.');
      if(!/^[a-z0-9_-]{1,60}$/i.test(selection)||['constructor','prototype','__proto__'].includes(selection)||!name)throw Error('Podaj nazwę i poprawne ID skrzyni.');
      if(rewards.some(row=>row.id===selection))throw Error('Skrzynia nie może zawierać samej siebie.');
      let next;
      await service.save(latest=>{
       if(!item&&api.itemExists(selection))throw Error('Przedmiot o tym ID już istnieje.');
       next=api.items().slice();
       const index=next.findIndex(row=>row.id===selection);
       if(index===-1)next.push({id:selection,name,image,slot:'pozostałe',icon:'📦',quality:'Pospolity'});
       else next[index]={...next[index],name,image};
       (latest.chests??={})[selection]=rewards;
       return [api.catalogWrite(next)];
      });
      api.useCatalog(next);
     }
     if(!root.contains(form))return;
     choices(selection);render(false);
     status.textContent=enemies?'Zapisano. Jeśli mapa jest szkicem, opublikuj ją, aby użyć ustawień w grze. Dla mapy opublikowanej wejdź ponownie do świata.':'Zapisano skrzynię i jej zawartość.';
    }catch(error){status.textContent=error.message||'Nie udało się zapisać zmian.'}
    finally{submit.disabled=false}
   };
  }
  choices();render();
  picker.onchange=()=>render();
  search.oninput=()=>choices(picker.value);
 }
 function openSmith(root,api,section){
  const service=window.DBIContent;
  const upgrades=section==='upgrades';
  root.innerHTML='<div class="gm-workbench">'+navigation(section)+
   '<section class="dbi-admin gm-content"><header class="dbi-admin-head"><h2>'+(upgrades?'Ulepszanie':'Kowalstwo i ewolucje')+'</h2></header>'+
   '<div class="gm-content-fields">'+(upgrades?'<label>Docelowy poziom (+)<input data-upgrade-level type="number" min="1" max="10" step="1" value="1" required></label>':
   '<label>Rodzaj ustawień<select data-smith-mode><option value="craft">Wytwarzanie</option><option value="evolution">Ewolucja z +9 do +0</option></select></label>')+
   '<label>Przedmiot<select data-smith-item></select></label><label data-smith-race-label>Rasa<select data-smith-race></select></label></div>'+
   '<form class="gm-content-form"><div class="gm-content-fields" data-smith-fields></div>'+
   '<fieldset data-smith-materials><legend>Składniki</legend><div class="gm-content-rows"></div><button type="button" class="ghost-button" data-add-material>+ Dodaj składnik</button></fieldset>'+
   '<div class="gm-content-fields"><button type="submit" class="gold-button">Zapisz recepturę</button><button type="button" class="ghost-button" data-remove-smith>Usuń własną recepturę</button></div></form>'+
   '<p class="gm-content-status" role="status"></p></section></div>';
  bindNavigation(root,destination=>{
   if(destination===section)return;
   if(['chests','enemies','smith','upgrades'].includes(destination))open(root,destination,api);
   else if(destination==='maps')api.maps();
   else api.back(destination);
  });
  const items=api.items().slice().sort((a,b)=>a.name.localeCompare(b.name,'pl'));
  const catalog=new Map(items.map(item=>[item.id,item]));
  const chiPairs=new Map(Object.entries(service.chiPairs).map(([level,ids])=>[ids[0],{level,ids}]));
  const equipment=items.filter(api.isEquipment);
  const mode=root.querySelector('[data-smith-mode]'),item=root.querySelector('[data-smith-item]'),race=root.querySelector('[data-smith-race]');
  const level=root.querySelector('[data-upgrade-level]');
  const form=root.querySelector('form'),fieldsRoot=form.querySelector('[data-smith-fields]'),fieldset=form.querySelector('fieldset'),rows=form.querySelector('.gm-content-rows');
  const status=root.querySelector('[role=status].gm-content-status'),remove=form.querySelector('[data-remove-smith]');
  const itemOptions=list=>list.map(entry=>option(entry.id,entry.name+' · '+entry.id));
  const isEvolution=()=>mode?.value==='evolution';
  const group=()=>upgrades?'upgradeRecipes':isEvolution()?'evolutions':'craftRecipes';
  const key=()=>upgrades?race.value+':'+item.value+':'+level.valueAsNumber:isEvolution()?race.value+':'+item.value:item.value;
  const currentPair=()=>upgrades||isEvolution()?null:chiPairs.get(item.value);
  function addMaterial(row={}){
   const line=document.createElement('div');line.className='gm-content-row';
   line.innerHTML='<label>Składnik<select required></select></label><label>Liczba sztuk<input type="number" min="1" max="4000" step="1" required></label><button type="button" class="ghost-button">Usuń</button>';
   const select=line.querySelector('select');
   select.append(option('','Wybierz przedmiot'),...itemOptions(items));
   if(row.id&&!catalog.has(row.id))select.append(option(row.id,row.id+' · brak w katalogu'));
   select.value=row.id||'';
   line.querySelector('input').value=row.count??1;
   line.querySelector('button').onclick=()=>line.remove();
   rows.append(line);
  }
  function render(){
   const source=catalog.get(item.value);
   const requiredRace=service.raceId(source?.requiredRace);
   if(upgrades)level.max=api.maxUpgrade(source);
   const evolution=isEvolution(),active=source&&(!(evolution||upgrades)||race.value)&&
    (!upgrades||level.validity.valid&&(!requiredRace||race.value===requiredRace)),pair=currentPair();
   const recipes=active?service.read()[group()]:null;
   const saved=recipes?.[key()]??(pair?recipes?.[pair.ids[1]]:null);
   form.hidden=!active;
   if(upgrades&&source&&race.value&&requiredRace&&race.value!==requiredRace){
    status.textContent='Wybierz rasę przypisaną do przedmiotu.';
   }else if(upgrades&&source&&race.value&&!level.validity.valid){
    status.textContent='Wpisz poziom od +1 do +'+level.max+'.';
   }
   if(!active)return;
   if(upgrades){
    const step=api.upgradeStep(source,race.value,level.valueAsNumber);
    fieldsRoot.innerHTML='<label>Bazowa szansa powodzenia (%)<input name="chance" type="number" min="0" max="100" step="0.01" required></label>';
    form.elements.chance.value=Number(step.chance.toFixed(2));
    if(level.valueAsNumber===10&&!source.id.startsWith('earth-500-')){
     fieldsRoot.insertAdjacentHTML('beforeend','<label>Przedmiot po przekuciu (+0)<select name="target"></select></label>');
     const target=form.elements.target;
     target.required=api.maxUpgrade(source)===10;
     target.append(option('',target.required?'Wybierz przedmiot':'Brak przekucia'),...itemOptions(equipment.filter(entry=>
      entry.id!==source.id&&(!entry.requiredRace||service.raceId(entry.requiredRace)===race.value))));
     target.value=step.target||'';
    }
    rows.replaceChildren();
    step.materials.forEach(addMaterial);
    remove.disabled=!saved;
    return;
   }
   const fallback=evolution?api.defaultEvolution(race.value,item.value):null;
   fieldsRoot.innerHTML=evolution?
    '<label>Przedmiot po ewolucji<select name="target" required></select></label><label><input type="checkbox" name="customCost"> Ustaw własny koszt ewolucji</label><label>Złoto<input name="gold" type="number" min="0" max="999999999" required></label>':
    '<label>Rasa w kowalstwie<select name="race"></select></label><label>Złoto<input name="gold" type="number" min="0" max="999999999" required></label><label>Szansa powodzenia (%)<input name="chance" type="number" min="0.01" max="100" step="0.01" required></label>';
   form.elements.gold.value=saved?.gold??(evolution?0:10000);
   if(evolution){
    const target=form.elements.target;
    target.append(option('','Wybierz przedmiot'),...itemOptions(equipment.filter(entry=>entry.id!==item.value)));
    if(saved?.target&&!catalog.has(saved.target))target.append(option(saved.target,saved.target+' · brak w katalogu'));
    target.value=saved?.target||fallback||'';
    const custom=form.elements.customCost;
    custom.checked=Array.isArray(saved?.materials);
    custom.onchange=()=>{fieldset.disabled=!custom.checked;form.elements.gold.disabled=!custom.checked};
    custom.onchange();
   }else{
    const selector=form.elements.race;
    selector.append(option('','Dowolna rasa'),...service.races.map(([id,label])=>option(id,label)));
    selector.value=saved?.race??service.raceId(catalog.get(item.value).requiredRace);
    form.elements.chance.value=saved?.chance??90;
    fieldset.disabled=false;
   }
   rows.replaceChildren();
   (saved?.materials||[]).forEach(addMaterial);
   remove.disabled=!saved;
  }
  function changeMode(){
   const craftItems=items.filter(entry=>entry.slot!=='chi');
   const pairOptions=[...chiPairs.values()].filter(({ids})=>ids.every(id=>catalog.has(id))).map(({level,ids})=>
    option(ids[0],'Chi · poziom '+level+' · '+ids.map(id=>catalog.get(id).name).join(' / ')+' (50/50)'));
   const gearOnly=upgrades||isEvolution();
   item.replaceChildren(option('',gearOnly?'Wybierz wyposażenie wejściowe':'Wybierz przedmiot lub parę Chi'),...itemOptions(gearOnly?equipment:craftItems),...(gearOnly?[]:pairOptions));
   race.replaceChildren(option('','Wybierz rasę'),...service.races.map(([id,label])=>option(id,label)));
   root.querySelector('[data-smith-race-label]').hidden=!gearOnly;
   status.textContent='';render();
  }
  if(mode)mode.onchange=changeMode;
  item.onchange=race.onchange=()=>{status.textContent='';render()};
  if(upgrades){
   level.oninput=race.onchange;
   item.onchange=()=>{
    const required=service.raceId(catalog.get(item.value)?.requiredRace);
    if(required)race.value=required;
    if(Number(level.value)>api.maxUpgrade(catalog.get(item.value)))level.value='10';
    race.onchange();
   };
  }
  form.querySelector('[data-add-material]').onclick=()=>{if(rows.children.length<30)addMaterial()};
  async function update(removeEntry){
   const section=group(),id=key(),source=item.value,evolution=isEvolution(),pair=currentPair();
   const data=upgrades?{chance:form.elements.chance.valueAsNumber}:
    evolution?{target:form.elements.target.value}:{race:form.elements.race.value,chance:form.elements.chance.valueAsNumber};
   if(upgrades&&form.elements.target)data.target=form.elements.target.value;
   if(upgrades||!evolution||form.elements.customCost.checked){
    if(!upgrades)data.gold=form.elements.gold.valueAsNumber;
    data.materials=[...rows.children].map(row=>({id:row.querySelector('select').value,count:row.querySelector('input').valueAsNumber}));
   }
   try{
    if(!removeEntry){
     if(data.materials&&!service.validMaterials(data.materials,itemId=>catalog.has(itemId)&&(!(evolution||upgrades)||itemId!==source)))throw Error('Wybierz odrębne składniki z katalogu.');
     const required=service.raceId(catalog.get(evolution||upgrades&&data.target?data.target:source)?.requiredRace);
     if(required&&required!==(evolution||upgrades?race.value:data.race))throw Error('Rasa receptury musi odpowiadać rasie przedmiotu wynikowego.');
    }
    await service.save(latest=>{
     const existing=Object.assign(Object.create(null),latest[section]);
     if(pair)delete existing[pair.ids[1]];
     if(removeEntry)delete existing[id];
     else existing[id]=data;
     latest[section]=existing;
    });
    status.textContent=removeEntry?'Usunięto własną recepturę. Wbudowana receptura, jeśli istnieje, jest znów aktywna.':'Zapisano recepturę. Zostanie dołączona do ZIP-a.';
    render();
   }catch(error){status.textContent=error.message}
  }
  form.onsubmit=event=>{event.preventDefault();void update(false)};
  remove.onclick=()=>void update(true);
  changeMode();
 }
 return {open,navigation,bindNavigation,visual,imagePath,locationSearch};
})();
