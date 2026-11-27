window.DBICharacterSlots=(()=>{
 const baseLimit=5,maxLimit=10,cost=50;
 const charactersKey=account=>'dboidle_characters_v1_'+account;
 const limitKey=account=>'dboidle_character_slots_v1_'+account;
 const zeniKey=id=>'dboidle_premium_v1_'+id;

 function characters(account){
  try{
   const saved=JSON.parse(localStorage.getItem(charactersKey(account))||'[]');
   return Array.isArray(saved)?saved:[];
  }catch{return []}
 }
 function limit(account){
  const saved=Number(localStorage.getItem(limitKey(account)));
  return Number.isInteger(saved)?Math.min(maxLimit,Math.max(baseLimit,saved)):baseLimit;
 }
 function balance(id){
  const saved=Number(localStorage.getItem(zeniKey(id)));
  return Number.isSafeInteger(saved)&&saved>0?saved:0;
 }
 function buy(account,payerId,expectedLimit){
  return window.DBILocalPost.lock(()=>{
   const current=limit(account);
   if(current>=maxLimit)throw Error('Konto ma już 10 miejsc na postacie.');
   if(current!==expectedLimit)throw Error('Limit zmienił się w innej karcie. Sprawdź nowe dane.');
   if(!characters(account).some(character=>String(character.id)===payerId))throw Error('Wybierz postać z tego konta.');
   const zeni=balance(payerId);
   if(zeni<cost)throw Error('Wybrana postać potrzebuje co najmniej 50 Zeni.');
   window.DBILocalPost.write([[zeniKey(payerId),zeni-cost],[limitKey(account),current+1]]);
  });
 }
 function create(account,details){
  return window.DBILocalPost.lock(()=>{
   const roster=characters(account);
   if(roster.length>=limit(account))throw Error('Wykorzystano wszystkie miejsca na postacie.');
   if(roster.some(character=>character.name.toLowerCase()===details.name.toLowerCase()))throw Error('Ta nazwa jest już zajęta na tym koncie.');
   const id=globalThis.crypto?.randomUUID?.()||String(Date.now());
   window.DBILocalPost.write([[charactersKey(account),[...roster,{...details,id,level:1}]]]);
  });
 }
 return {characters,charactersKey,limit,limitKey,balance,zeniKey,buy,create,maxLimit,cost};
})();
