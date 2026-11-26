window.DBIMarket=(()=>{
 const key='dboidle_market_v1';
 const maxPrice=999999999999,maxCount=4000,historyLimit=100;
 const post=window.DBILocalPost;
 const goldKey=id=>'dboidle_gold_v1_'+id;
 const gold=id=>Number(post.read(goldKey(id),0));
 const fee=price=>Math.ceil(price/10);
 const read=()=>post.read(key,{offers:[],history:{}});
 let database;
 function connect(){
  database??=new Promise((resolve,reject)=>{
   const request=indexedDB.open('dboidle-market',1);
   request.onupgradeneeded=()=>request.result.createObjectStore('market');
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error);
  }).catch(error=>{database=undefined;throw error});
  return database;
 }
 // IndexedDB serializes market mutations across tabs. The local mirror feeds the UI
 // and is written with the existing inventory and wallet transaction.
 function transact(operation){
  return post.lock(async()=>{
   const db=await connect();
   return new Promise((resolve,reject)=>{
    const tx=db.transaction('market','readwrite'),store=tx.objectStore('market');
    const request=store.get('state');
    let result,failure,originals=[];
    request.onsuccess=()=>{
     try{
      const state=request.result??read();
      const change=operation(state),writes=[...change.writes,[key,state]];
      const previous=writes.map(([name])=>[name,localStorage.getItem(name)]);
      store.put(state,'state');
      post.write(writes);
      originals=previous;
      result=change.offer;
     }catch(error){failure=error;tx.abort()}
    };
    tx.oncomplete=()=>resolve(result);
    tx.onabort=()=>{
     try{
      for(const [name,value] of originals){
       if(value===null)localStorage.removeItem(name);
       else localStorage.setItem(name,value);
      }
     }finally{reject(failure||tx.error||Error('Nie udało się zapisać transakcji.'))}
    };
   });
  });
 }
 function tradeable(item){
  const slot=String(item?.slot||'').toLowerCase();
  return !!item&&!item.id.startsWith('quest-')&&!['quest','questitem','fabularny'].includes(slot)&&!item.questItem&&item.tradeable!==false;
 }
 function checkActor(actor){
  const session=JSON.parse(sessionStorage.getItem('dboidle_demo_session_v1')||'null');
  const active=JSON.parse(sessionStorage.getItem('dboidle_active_character_v1')||'null');
  if(!actor?.id||actor.id!==active?.id||active.account!==session?.name?.toLowerCase())throw Error('Wybierz aktywną postać.');
 }
 function history(state,id,entry){
  state.history[id]=[entry,...(state.history[id]||[])].slice(0,historyLimit);
 }
 function removeInventory(id,ref,count){
  const invKey=post.inventoryKey(id),posKey=post.positionsKey(id);
  const items=post.read(invKey,[]),layout=post.read(posKey,null);
  const positions=items.map((value,i)=>layout?.items?.[i]===value?layout.positions?.[i]??null:null);
  let remaining=count;
  for(let i=items.length-1;i>=0&&remaining;i--){
   if(items[i]!==ref)continue;
   items.splice(i,1);positions.splice(i,1);remaining--;
  }
  if(remaining)throw Error('W ekwipunku brakuje wybranej liczby przedmiotów.');
  return [[invKey,items],[posKey,{items,positions}]];
 }
 function list(actor,ref,count,price,itemByRef){
  return transact(state=>{
   checkActor(actor);
   if(!Number.isSafeInteger(count)||count<1||count>maxCount)throw Error('Podaj prawidłową liczbę sztuk.');
   if(!Number.isSafeInteger(price)||price<1||price>maxPrice)throw Error('Podaj prawidłową cenę w złocie.');
   if(!tradeable(itemByRef(ref)))throw Error('Tego przedmiotu nie można wystawić. Przedmioty fabularne są zablokowane.');
   const offer={id:crypto.randomUUID?.()||crypto.getRandomValues(new Uint32Array(4)).join('-'),
    seller:actor.id,sellerName:actor.name,ref,count,price,created:Date.now()};
   state.offers.unshift(offer);
   return {offer,writes:removeInventory(actor.id,ref,count)};
  });
 }
 function settle(actor,offerId,itemByRef,cancel=false){
  return transact(state=>{
   checkActor(actor);
   const index=state.offers.findIndex(offer=>offer.id===offerId);
   if(index<0)throw Error('Oferta nie jest już dostępna.');
   const offer=state.offers[index],own=offer.seller===actor.id;
   if(cancel!==own)throw Error(cancel?'Ta oferta należy do innej postaci.':'Nie możesz kupić własnej oferty.');
   const item=itemByRef(offer.ref);
   if(!cancel&&!tradeable(item))throw Error('Ten przedmiot jest niedostępny w katalogu.');
   const writes=post.inventoryGrant(actor.id,offer.ref,offer.count,itemByRef);
   state.offers.splice(index,1);
   if(!cancel){
    const buyerBalance=gold(actor.id),sellerBalance=gold(offer.seller),commission=fee(offer.price),net=offer.price-commission;
    if(!Number.isFinite(buyerBalance)||buyerBalance<offer.price)throw Error('Masz za mało złota.');
    if(!Number.isFinite(sellerBalance)||sellerBalance+net>Number.MAX_SAFE_INTEGER)throw Error('Saldo sprzedającego przekracza limit złota.');
    writes.push([goldKey(actor.id),buyerBalance-offer.price],[goldKey(offer.seller),sellerBalance+net]);
    const sale={...offer,buyerName:actor.name,commission,net,completed:Date.now()};
    history(state,actor.id,{...sale,type:'buy'});
    history(state,offer.seller,{...sale,type:'sell'});
   }
   return {offer,writes};
  });
 }
 return {key,read,gold,fee,tradeable,list,settle,maxPrice,maxCount};
})();
