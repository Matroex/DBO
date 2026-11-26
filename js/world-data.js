// Data only: the JSON is parsed, never evaluated as JavaScript.
(function(){
 function accept(text){
  const p=JSON.parse(text);
  if(!p||p.version!==1||!Array.isArray(p.maps)||!Array.isArray(p.quests))throw Error('Nieprawidłowy format danych świata.');
  window.DBI_GM_WORLD_DATA=p;
 }
 try{
  const preview=document.getElementById('dbi-world-preview-data');
  if(preview){accept(preview.textContent);window.DBI_GM_PREVIEW=true;return;}
  // Browsers block file:// JSON requests. Local GM publication remains available.
  if(!/^https?:$/.test(location.protocol))return;
  // Load before the existing synchronous world initialization, without changing script order.
  const req=new XMLHttpRequest();
  req.open('GET','data/gm-world-published.json?v='+Date.now(),false);
  req.send();
  if(req.status===404)return; // Older installations still use the legacy data script.
  if(req.status!==200)throw Error('HTTP '+req.status);
  accept(req.responseText);
 }catch(e){
  console.error('Nie udało się wczytać publikacji JSON:',e);
  window.DBI_GM_WORLD_LOAD_ERROR=String(e.message||e);
 }
})();
