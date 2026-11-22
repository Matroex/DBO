window.DBIGmAccess=(()=>{
 const gmAccounts=new Set(['matroex','gostpl']);
 function allowed(account){
  return typeof account==='string'&&gmAccounts.has(account.trim().toLowerCase());
 }
 function hasSession(){
  try{
   const session=JSON.parse(sessionStorage.getItem('dboidle_demo_session_v1')||'null');
   return allowed(session?.name);
  }catch{return false}
 }
 return {allowed,hasSession};
})();
