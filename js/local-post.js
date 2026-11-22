window.DBILocalPost=(()=>{
 const mailKey=id=>'dboidle_mail_v1_'+id;
 const inventoryKey=id=>'dboidle_inventory_v1_'+id;
 const positionsKey=id=>'dboidle_inventory_positions_v1_'+id;
 const historyKey='dboidle_gm_history_v1';
 function read(key,fallback){
  const value=localStorage.getItem(key);
  return value===null?fallback:JSON.parse(value);
 }
 function write(entries){
  const originals=entries.map(([key])=>[key,localStorage.getItem(key)]);
  let saved=0;
  try{
   for(const [key,value] of entries){localStorage.setItem(key,JSON.stringify(value));saved++}
  }catch(error){
   for(const [key,value] of originals.slice(0,saved).reverse()){
    if(value===null)localStorage.removeItem(key);
    else localStorage.setItem(key,value);
   }
   throw error;
  }
 }
 const inbox=id=>read(mailKey(id),[]);
 const history=()=>read(historyKey,[]);
 const log=(id,name,action,details)=>[historyKey,[{time:Date.now(),id,name,action,details},...history()].slice(0,200)];
 function inventoryGrant(id,ref,count,itemByRef){
  if(!Number.isSafeInteger(count)||count<1||count>4000)throw Error('Nieprawidłowa liczba przedmiotów.');
  const items=read(inventoryKey(id),[]);
  const layout=read(positionsKey(id),null);
  const positions=Array.isArray(layout?.items)&&Array.isArray(layout?.positions)&&layout.items.length===items.length&&layout.items.every((item,i)=>item===items[i])
   ?items.map((_,i)=>layout.positions[i]??null):items.map(()=>null);
  if(!items.includes(ref)){
   const used=Array.from({length:6},()=>new Set()),unique=new Map();
   items.forEach((value,index)=>{if(!unique.has(value))unique.set(value,index)});
   const tall=value=>['bron','zbroja','stroj'].includes(itemByRef(value)?.slot);
   const fits=(page,cell,big)=>cell>=0&&cell<60&&(!big||cell+6<60)&&!used[page].has(cell)&&(!big||!used[page].has(cell+6));
   const reserve=(page,cell,big)=>{used[page].add(cell);if(big)used[page].add(cell+6)};
   const pending=[];
   for(const [value,index] of unique){
    const pos=positions[index],big=tall(value);
    if(Number.isInteger(pos?.page)&&Number.isInteger(pos?.cell)&&used[pos.page]&&fits(pos.page,pos.cell,big))reserve(pos.page,pos.cell,big);
    else pending.push(big);
   }
   for(const big of [...pending,tall(ref)]){
    let placed=false;
    for(let page=0;page<6&&!placed;page++)for(let cell=0;cell<60;cell++){
     if(fits(page,cell,big)){reserve(page,cell,big);placed=true;break}
    }
    if(!placed)throw Error('Brak miejsca w ekwipunku.');
   }
  }
  const grants=Array(count).fill(ref);
  const combined=items.concat(grants);
  const combinedPositions=positions.concat(grants.map(()=>null));
  return [[inventoryKey(id),combined],[positionsKey(id),{items:combined,positions:combinedPositions}]];
 }
 function dispatch(id,message){
  const entry={...message,id:crypto.randomUUID?.()||crypto.getRandomValues(new Uint32Array(4)).join('-'),date:Date.now(),read:false,claimed:false};
  return [mailKey(id),[entry,...inbox(id)]];
 }
 function markRead(id,messageId){
  const entries=inbox(id);
  const item=entries.find(entry=>entry.id===messageId);
  if(item&&!item.read){item.read=true;write([[mailKey(id),entries]])}
 }
 function claim(id,messageId,itemByRef){
  const entries=inbox(id),message=entries.find(entry=>entry.id===messageId);
  if(!message?.attachment||message.claimed)return false;
  message.claimed=true;
  message.read=true;
  const {ref,count}=message.attachment;
  if(!itemByRef(ref))throw Error('Nie znaleziono przedmiotu.');
  write([...inventoryGrant(id,ref,count,itemByRef),[mailKey(id),entries]]);
  return true;
 }
 const lock=operation=>navigator.locks?navigator.locks.request('dboidle-local-gm-mail',operation):Promise.resolve().then(operation);
 return {read,write,inbox,history,log,dispatch,markRead,claim,inventoryGrant,mailKey,inventoryKey,positionsKey,lock};
})();
