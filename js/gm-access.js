window.DBIGmAccess=(()=>{
 const gmAccounts=new Set(['matroex','gostpl']);
 const maxCharacterLevel=500;
 function allowed(account){
  return typeof account==='string'&&gmAccounts.has(account.trim().toLowerCase());
 }
 function hasSession(){
  try{
   const session=JSON.parse(sessionStorage.getItem('dboidle_demo_session_v1')||'null');
   return allowed(session?.name);
  }catch{return false}
 }
 // Wywoływane w blokadzie DBILocalPost, na aktualnym zapisie postaci.
 function grantLevels(key,id,count){
  if(!hasSession())throw Error('Zaloguj się jako Game Master.');
  if(!Number.isSafeInteger(count)||count<1)throw Error('Podaj dodatnią liczbę całkowitą poziomów.');
  const post=window.DBILocalPost,characters=post.read(key,[]);
  const index=characters.findIndex(character=>character.id===id);
  if(index<0)throw Error('Nie znaleziono postaci.');
  const character=characters[index];
  const before=Math.max(1,Math.floor(Number(character.level)||1));
  if(before>=maxCharacterLevel)throw Error('Postać ma już maksymalny poziom '+maxCharacterLevel+'.');
  const next=before+Math.min(count,maxCharacterLevel-before);
  characters[index]={...character,level:next,exp:next===maxCharacterLevel?0:character.exp};
  const details='+'+(next-before)+' · '+before+' → '+next;
  post.write([[key,characters],post.log(id,character.name,'Dodano poziomy',details)]);
  return {characters,index,message:'Dodano '+(next-before)+' poz. Poziom postaci: '+next+'.'};
 }
 return {allowed,hasSession,maxCharacterLevel,grantLevels};
})();
