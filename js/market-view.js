window.DBIMarketView=(()=>{
 const market=window.DBIMarket;
 const money=n=>Number(n).toLocaleString('pl-PL',{maximumFractionDigits:2})+' złota';
 const count=n=>Number(n).toLocaleString('pl-PL');
 const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const category=(slot)=>({bron:'Broń',zbroja:'Zbroja',rekawice:'Rękawice',pierscien:'Pierścień',uzytkowy:'Użytkowy','użytkowy':'Użytkowy',stroj:'Strój',energia:'Energia KI'})[slot]||(slot?slot[0].toUpperCase()+slot.slice(1):'Przedmiot');
 function name(item){return item.name+(item.enhancement?' +'+item.enhancement:'')}
 function art(item){return item.image&&(/^assets\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:png|webp|gif|jpe?g)$/i.test(item.image)||window.DBIContent?.embeddedImage(item.image))?'<img src="'+esc(item.image)+'" alt="" loading="lazy">':esc(item.icon||'◇')}
 function open(root,api){
  let tab='browse',busy=false;
  root.innerHTML=`<section class="dbi-market">
   <header class="market-header"><div><h2>Handel</h2><p>Targ graczy</p></div><div class="market-wallet"><span>Twoje złoto</span><strong></strong></div></header>
   <nav class="market-tabs" aria-label="Targ graczy">
    <button type="button" data-market-tab="browse" aria-pressed="true">Oferty</button>
    <button type="button" data-market-tab="list" aria-pressed="false">Wystaw przedmiot</button>
    <button type="button" data-market-tab="own" aria-pressed="false">Moje oferty i historia</button>
   </nav>
   <p class="market-status" role="status"></p>
   <div class="market-body"></div>
   <dialog class="market-dialog market-confirm"><form method="dialog"><h3></h3><p></p><div><button value="cancel">Wróć</button><button value="confirm" class="market-primary">Potwierdź</button></div></form></dialog>
  </section>`;
  const host=root.querySelector('.dbi-market'),body=host.querySelector('.market-body'),status=host.querySelector('.market-status');
  const visible=()=>root.contains(host);
  const notify=message=>{status.textContent=message};
  function wallet(){host.querySelector('.market-wallet strong').textContent=money(market.gold(api.actor.id))}
  function confirm(title,detail,operation){
   const dialog=host.querySelector('.market-confirm');
   dialog.returnValue='cancel';
   dialog.querySelector('h3').textContent=title;
   dialog.querySelector('p').textContent=detail;
   dialog.addEventListener('close',()=>{if(dialog.returnValue==='confirm')run(operation)},{once:true});
   dialog.showModal();
  }
  async function run(operation,refresh=true){
   if(busy)return;
   busy=true;notify('');
   try{
    const message=await operation();
    api.refresh();
    if(visible()){if(refresh)render();notify(message)}
   }catch(error){if(visible())notify(error.message||'Nie udało się ukończyć operacji.')}
   finally{busy=false}
  }
  function bindThumbnails(parent,resolve){
   parent.querySelectorAll('[data-market-detail]').forEach(button=>{
    const item=resolve(button.dataset.marketDetail);
    if(item)api.inspect(button,item);
    button.querySelector('img')?.addEventListener('error',event=>{
     const fallback=document.createElement('span');
     fallback.textContent=item?.icon||'◇';
     event.currentTarget.replaceWith(fallback);
    },{once:true});
   });
  }
  function offerCards(rows,own){
   if(!rows.length)return '<p class="market-empty">'+(own?'Nie masz aktywnych ofert.':'Brak ofert spełniających wybrane kryteria.')+'</p>';
   return rows.map(offer=>{
    const operation=own?'Wycofaj':offer.seller===api.actor.id?'Twoja oferta':'Kup';
    const item=api.item(offer.ref);
    return `<article class="market-offer">
     <button type="button" class="market-art" data-market-detail="${esc(offer.id)}" aria-label="Szczegóły przedmiotu">${art(item||{})}</button>
     <div class="market-offer-copy"><strong>${esc(item?name(item):'Niedostępny przedmiot')}</strong>
      <small>${esc(item?.quality||category(item?.slot))} · ${count(offer.count)} szt. · ${own?'Do wypłaty '+money(offer.price-market.fee(offer.price)):esc(offer.sellerName)}</small>
     </div><div class="market-offer-actions"><strong>${money(offer.price)}</strong><button type="button" class="${own?'':'market-primary'}" data-market-order="${esc(offer.id)}" ${!own&&(!item||offer.seller===api.actor.id)?'disabled':''}>${operation}</button></div>
    </article>`;
   }).join('');
  }
  function bindOffers(parent,rows,own){
   const byId=new Map(rows.map(row=>[row.id,row]));
   bindThumbnails(parent,id=>api.item(byId.get(id)?.ref));
   parent.querySelectorAll('[data-market-order]').forEach(button=>button.onclick=()=>{
    const offer=byId.get(button.dataset.marketOrder),item=api.item(offer.ref),label=item?name(item):offer.ref;
    confirm(own?'Wycofać ofertę?':'Kupić przedmiot?',own?`${label} ×${offer.count} wróci do ekwipunku.`:
      `${label} ×${offer.count} za ${money(offer.price)}. Przedmioty trafią do ekwipunku.`,async()=>{
     await market.settle(api.actor,offer.id,api.item,own);
     return own?'Oferta wycofana. Przedmioty wróciły do ekwipunku.':'Kupiono '+label+' ×'+offer.count+'.';
    });
   });
  }
  function browse(state){
   const previous=body.querySelector('.market-filters'),saved=previous?Object.fromEntries(new FormData(previous)):{};
   body.innerHTML=`<form class="market-filters" role="search">
    <label>Szukaj <input name="query" type="search" placeholder="Przedmiot lub sprzedający"></label>
    <label>Kategoria <select name="category"><option value="">Wszystkie</option></select></label>
    <label>Sortuj <select name="sort"><option value="new">Najnowsze</option><option value="price">Najniższa cena</option><option value="highest">Najwyższa cena</option></select></label>
   </form><p class="market-results" aria-live="polite"></p><div class="market-offers"></div>`;
   const form=body.querySelector('form'),offers=body.querySelector('.market-offers'),results=body.querySelector('.market-results');
   const entries=state.offers.filter(row=>market.tradeable(api.item(row.ref)));
   const categories=[...new Set(entries.map(row=>api.item(row.ref).slot))].sort((a,b)=>category(a).localeCompare(category(b),'pl'));
   form.elements.category.append(...categories.map(slot=>new Option(category(slot),slot)));
   for(const [field,value] of Object.entries(saved))form.elements[field].value=value;
   function filter(){
    const {query,category:slot,sort}=Object.fromEntries(new FormData(form)),term=query.trim().toLocaleLowerCase('pl');
    const rows=entries.filter(row=>{const item=api.item(row.ref);return (!slot||item.slot===slot)&&
     (!term||(name(item)+' '+row.sellerName+' '+item.id).toLocaleLowerCase('pl').includes(term))});
    if(sort==='price')rows.sort((a,b)=>a.price-b.price||b.created-a.created);
    if(sort==='highest')rows.sort((a,b)=>b.price-a.price||b.created-a.created);
    results.textContent='Oferty: '+rows.length;
    offers.innerHTML=offerCards(rows,false);
    bindOffers(offers,rows,false);
   }
   form.oninput=filter;form.onsubmit=event=>event.preventDefault();
   filter();
  }
  function chooseFromInventory(selectedRef,onChoose){
   const pages=api.inventoryPages(),pageCount=Math.max(6,pages.length);
   const dialog=document.createElement('dialog');
   dialog.className='market-dialog market-inventory';
   dialog.setAttribute('aria-labelledby','market-inventory-title');
   dialog.innerHTML='<header><h3 id="market-inventory-title">Wybierz z ekwipunku</h3><button type="button" data-picker-close aria-label="Zamknij ekwipunek">✕</button></header>'+
    '<nav aria-label="Karty ekwipunku"></nav><div class="market-picker-layout"><div class="market-grid-scroll"><div class="market-inventory-grid" aria-label="Kratki ekwipunku"></div></div>'+
    '<aside class="market-picker-details" aria-live="polite"></aside></div><footer><button type="button" data-picker-cancel>Anuluj</button>'+
    '<button type="button" class="market-primary" data-picker-select disabled>Wybierz ten przedmiot</button></footer>';
   host.append(dialog);
   const nav=dialog.querySelector('nav'),grid=dialog.querySelector('.market-inventory-grid'),details=dialog.querySelector('aside');
   const choose=dialog.querySelector('[data-picker-select]');
   let highlighted=pages.flat().find(entry=>entry?.id===selectedRef),
    page=Math.max(0,pages.findIndex(entries=>entries?.includes(highlighted)));
   const tabs=['I','II','III','IV','V','VI'];
   nav.replaceChildren(...Array.from({length:pageCount},(_,i)=>{
    const button=document.createElement('button');
    button.type='button';button.textContent=tabs[i]||String(i+1);
    button.setAttribute('aria-label','Karta '+button.textContent);
    button.onclick=()=>{page=i;drawGrid()};
    return button;
   }));
   function drawDetails(){
    const selected=highlighted?.item,available=market.tradeable(selected);
    choose.disabled=!available;
    details.innerHTML=selected?'<div class="market-picker-item">'+api.details(selected)+'</div><p>'+
     (available?'Liczba w ekwipunku: '+count(highlighted.count):'Tego przedmiotu nie można wystawić.')+'</p>':
     '<p>Kliknij przedmiot w ekwipunku, aby zobaczyć jego statystyki i bonusy.</p>';
   }
   function drawGrid(){
    const entries=pages[page]||[],cells=Array.from({length:60},(_,i)=>'<span aria-hidden="true" class="market-grid-empty" style="'+position(i,false)+'"></span>');
    for(const [index,entry] of entries.entries()){
     const {item,cell,tall,count:quantity}=entry,allowed=market.tradeable(item);
     const label=item?name(item)+' · '+(item.quality||category(item.slot)):'Nieznany przedmiot';
     const quality=['Pospolity','Zwyczajny','Rzadki','Epicki','Legendarny'].indexOf(item?.quality);
     cells[cell]='<button type="button" class="market-grid-item quality-'+quality+(allowed?'':' market-grid-locked')+'" data-picker-item="'+index+'" '+
      'aria-pressed="'+(highlighted===entry)+'" style="'+position(cell,tall)+'" title="'+esc(label+(allowed?'':' · niedostępny w handlu'))+'" aria-label="'+
      esc(label+' · '+quantity+' szt.'+(allowed?'':' · niedostępny w handlu'))+'">'+art(item||{})+
      (quantity>1?'<b class="market-grid-count">×'+count(quantity)+'</b>':'')+(allowed?'':'<span class="market-grid-lock" aria-hidden="true">🔒</span>')+'</button>';
     if(tall)cells[cell+6]='';
    }
    grid.innerHTML=cells.join('');
    [...nav.children].forEach((button,i)=>button.setAttribute('aria-pressed',String(i===page)));
    grid.querySelectorAll('button').forEach(button=>button.onclick=()=>{
     highlighted=entries[Number(button.dataset.pickerItem)];
     grid.querySelectorAll('button').forEach(entry=>entry.setAttribute('aria-pressed',String(entry===button)));
     drawDetails();
    });
   }
   function position(cell,tall){return 'grid-column:'+(cell%6+1)+';grid-row:'+(Math.floor(cell/6)+1)+' / span '+(tall?2:1)}
   drawGrid();drawDetails();
   dialog.querySelector('[data-picker-close]').onclick=dialog.querySelector('[data-picker-cancel]').onclick=()=>dialog.close();
   choose.onclick=()=>{
    if(!market.tradeable(highlighted?.item))return;
    dialog.close();onChoose(highlighted);
   };
   dialog.addEventListener('close',()=>dialog.remove(),{once:true});
   dialog.showModal();
  }
  function list(){
   let selectedCount=0;
   body.innerHTML=`<div class="market-list-layout"><form class="market-list-form">
    <h3>Nowa oferta</h3><input type="hidden" name="ref"><div class="market-selected" aria-live="polite"></div><button type="button" class="market-pick-button">Wybierz przedmiot</button>
    <div class="market-list-fields"><label>Liczba sztuk<input type="number" name="qty" min="1" value="1" required></label>
     <label>Cena za całą ofertę w złocie<input type="number" name="price" min="1" max="${market.maxPrice}" step="1" required></label></div>
    <p>Przedmioty fabularne są wyłączone z handlu.</p><button class="market-primary" type="submit" disabled>Wystaw ofertę</button>
   </form><aside class="market-breakdown"><h3>Podgląd oferty</h3><div class="market-list-preview"></div>
    <dl><div><dt>Cena dla kupującego</dt><dd data-total>—</dd></div>
     <div><dt>Prowizja od sprzedaży (10%)</dt><dd data-fee>—</dd></div><div><dt>Otrzymasz po sprzedaży</dt><dd data-net>—</dd></div></dl>
    <p>Prowizja jest pobierana przy zakupie i zaokrąglana w górę do pełnej sztuki złota.</p>
   </aside></div>`;
   const form=body.querySelector('form'),preview=body.querySelector('.market-list-preview');
   const chosen=body.querySelector('.market-selected'),pick=form.querySelector('.market-pick-button');
   pick.onclick=()=>chooseFromInventory(form.elements.ref.value,entry=>{
    if(form.elements.ref.value!==entry.id)form.elements.qty.value=1;
    form.elements.ref.value=entry.id;
    selectedCount=entry.count;
    update();
   });
   function update(){
    const {ref,qty,price}=form.elements,item=api.item(ref.value),total=price.valueAsNumber;
    qty.max=Math.min(selectedCount||1,market.maxCount);
    const valid=Number.isSafeInteger(total)&&total>=1&&total<=market.maxPrice;
    body.querySelector('[data-total]').textContent=valid?money(total):'—';
    body.querySelector('[data-fee]').textContent=valid?money(market.fee(total)):'—';
    body.querySelector('[data-net]').textContent=valid?money(total-market.fee(total)):'—';
    form.querySelector('[type=submit]').disabled=!market.tradeable(item)||!valid||!qty.validity.valid;
    chosen.textContent=item?name(item)+' · '+(item.quality||category(item.slot))+' · '+count(selectedCount)+' szt. w ekwipunku':'Żaden przedmiot nie został wybrany.';
    pick.textContent=item?'Zmień przedmiot':'Wybierz przedmiot';
    if(preview.dataset.ref===ref.value)return;
    preview.dataset.ref=ref.value;
    preview.innerHTML=item?`<button class="market-art" type="button" data-market-detail="preview" aria-label="Szczegóły przedmiotu">${art(item)}</button><strong>${esc(name(item))}</strong>`:'<span>Wybierz przedmiot, aby zobaczyć ofertę.</span>';
    bindThumbnails(preview,()=>item);
   }
   form.oninput=update;update();
   form.onsubmit=event=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    const {ref,qty,price}=form.elements;
    const item=api.item(ref.value);
    if(!market.tradeable(item))return;
    const label=name(item),selected=ref.value,amount=qty.valueAsNumber,total=price.valueAsNumber;
    confirm('Wystawić ofertę?',`${label} ×${amount} za ${money(total)}. Po sprzedaży otrzymasz ${money(total-market.fee(total))}.`,async()=>{
     await market.list(api.actor,selected,amount,total,api.item);
     tab='own';
     return 'Oferta została wystawiona.';
    });
   };
  }
  function own(state){
   const rows=state.offers.filter(row=>row.seller===api.actor.id),history=state.history[api.actor.id]||[];
   body.innerHTML=`<h3>Aktywne oferty</h3><div class="market-offers">${offerCards(rows,true)}</div><h3 class="market-history-title">Historia handlu</h3>
    <div class="market-history">${history.length?history.map(entry=>{
     const item=api.item(entry.ref),selling=entry.type==='sell';
     return `<article><div><strong>${selling?'Sprzedaż':'Zakup'} · ${esc(item?name(item):'Przedmiot')} ×${count(entry.count)}</strong>
      <small>${esc(new Date(entry.completed).toLocaleString('pl-PL'))} · ${esc(selling?entry.buyerName:entry.sellerName)}${selling?' · prowizja '+money(entry.commission):''}</small></div>
      <strong>${selling?'+':'−'}${money(selling?entry.net:entry.price)}</strong></article>`;
    }).join(''):'<p class="market-empty">Brak zakończonych transakcji.</p>'}</div>`;
   bindOffers(body,rows,true);
  }
  function render(){
   wallet();
   host.querySelectorAll('[data-market-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.marketTab===tab)));
   const state=market.read();
   if(tab==='browse')browse(state);
   else if(tab==='list')list();
   else own(state);
  }
  host.querySelectorAll('[data-market-tab]').forEach(button=>button.onclick=()=>{tab=button.dataset.marketTab;notify('');render()});
  render();
  return event=>{
   if(!visible()||busy)return;
   if(event.key===market.key&&tab!=='list')render();
   else if(event.key==='dboidle_gold_v1_'+api.actor.id)wallet();
  };
 }
 return {open};
})();
