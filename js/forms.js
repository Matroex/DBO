/* Visual transformations share the original walk cycle and foot position. */
window.DBIForms = (() => {
 'use strict';
 const forms = [
  {id:'kaioken', name:'Kaioken', sheet:'body-kaioken', color:'#ff3c39', description:'Pulsująca czerwona aura.'},
  {id:'ssj', name:'SSJ', color:'#ffd65a', sheet:'body-ssj1', description:'Złote włosy i świetlista aura.'},
  {id:'ssj2', name:'SSJ2', color:'#ffe37a', sheet:'body-ssj2', lightning:3100, description:'Najeżone złote włosy i błękitne wyładowania.'},
  {id:'ssj3', name:'SSJ3', color:'#ffbf35', sheet:'body-ssj3', lightning:2400, description:'Długie złote włosy i rozgałęzione błyskawice.'}
 ];
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const key = id => 'dboidle_map_form_v1_'+(id||'test');
 let owner, active, entered, pending;
 function useCharacter(id) {
  const next=key(id);
  if(owner===next)return;
  owner=next;
  let saved;try{saved=localStorage.getItem(owner)}catch{}
  active=forms.find(f=>f.id===saved);
  entered=-Infinity;pending=false;
 }
 function select(id){
  const next=forms.find(f=>f.id===id);
  if(next===active)return;
  active=next;pending=!!active;
  try{if(active)localStorage.setItem(owner,active.id);else localStorage.removeItem(owner)}catch{}
 }
 function sheet(form){
  if(form?.sheet&&!form.image){
   form.image=new Image();
   form.image.src='assets/forms/'+form.sheet+'.png';
  }
  return form?.image;
 }
 function selector(id,canvas){
  useCharacter(id);
  const bar=document.createElement('div');
  bar.className='dbi-map-form';
  bar.setAttribute('role','group');
  bar.setAttribute('aria-label','Przemiana postaci');
  const buttons=[];
  for(const form of [{id:'',name:'Forma podstawowa',color:'#9fb5c8'},...forms]){
   const button=document.createElement('button');
   button.type='button';
   button.textContent=form.name;
   button.dataset.form=form.id;
   button.style.setProperty('--energy',form.color);
   button.setAttribute('aria-pressed',String((active?.id||'')===form.id));
   button.onclick=()=>{
    select(form.id);
    for(const item of buttons)item.setAttribute('aria-pressed',String(item===button));
    canvas.focus({preventScroll:true});
   };
   buttons.push(button);
   bar.append(button);
  }
  return bar;
 }
 function panel(host,id){
  useCharacter(id);
  const section=document.createElement('section');section.className='dbi-forms';
  section.innerHTML='<h3>Przemiany</h3><div class="dbi-form-list"></div>';
  for(const f of forms){
   const button=document.createElement('button');button.type='button';
   button.style.setProperty('--energy',f.color);
   button.innerHTML='<span class="dbi-form-portrait"></span><span><b>'+f.name+'</b><small>'+f.description+'</small></span><em></em>';
   const portrait=button.firstElementChild;
   if(f.sheet)portrait.style.backgroundImage='url("assets/forms/'+f.sheet+'.png")';
   else portrait.classList.add('base');
   button.dataset.form=f.id;
   button.onclick=()=>{select(active===f?'':f.id);refresh()};
   section.querySelector('.dbi-form-list').append(button);
  }
  function refresh(){for(const b of section.querySelectorAll('button')){
   const on=active?.id===b.dataset.form;b.setAttribute('aria-pressed',String(on));
   b.lastElementChild.textContent=on?'Cofnij przemianę':'Przemień się';
  }}
  refresh();host.append(section);
 }
 function draw(ctx,base,frame,row,time){
  if(!active)return false;
  const image=sheet(active);
  if(pending&&image?.naturalWidth){entered=time;pending=false}
  const age=time-entered;
  const duration=1600;
  const charge=!reduced.matches&&age<duration;
  const t=reduced.matches?0:time;
  const pulse=1+.055*Math.sin(t/185);
  const size=charge?1+Math.sin(Math.PI*age/duration)*.35:1;
  ctx.save();
  ctx.translate(0,-11);ctx.scale(size*pulse,size/pulse);
  const grad=ctx.createRadialGradient(0,0,6,0,0,32);
  grad.addColorStop(0,active.color+'11');grad.addColorStop(.58,active.color+'88');grad.addColorStop(1,active.color+'00');
  ctx.save();ctx.scale(.8,1.15);ctx.fillStyle=grad;ctx.fillRect(-32,-32,64,64);ctx.restore();
  ctx.beginPath();ctx.moveTo(-2,26);
  for(let i=0;i<31;i++){
   const angle=Math.PI/2+(i+1)*Math.PI*2/32;
   const tip=i%2===0?1:.8;
   ctx.lineTo(Math.cos(angle)*21*tip,Math.sin(angle)*29*tip+(i%2===0?-3+2*Math.sin(t/150+i):0));
  }
  ctx.closePath();ctx.strokeStyle=active.color+'aa';ctx.fillStyle=active.color+'25';ctx.fill();ctx.stroke();
  ctx.restore();
  if(image?.naturalWidth){
   // The fifth atlas row holds four full-body action poses, independent of walk input.
   const pose=age<380?0:age<760?1:age<1190?2:3;
   const sourceX=(charge?pose:frame)*96;
   const sourceY=(charge?4:row)*112;
   const lift=charge&&pose===2?3*Math.sin(Math.PI*(age-760)/430):0;
   ctx.drawImage(image,sourceX,sourceY,96,112,-24,-34-16*50/96-lift,48,112*50/96);
  }else ctx.drawImage(base,frame*80,row*96,80,96,-20,-34,40,50);
  if(charge){
   const p=age/duration;
   ctx.save();ctx.strokeStyle=active.color;ctx.globalAlpha=Math.sin(p*Math.PI);
   ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,12,8+27*p,2+7*p,0,0,Math.PI*2);ctx.stroke();
   for(let i=0;i<7;i++){const y=9-((p*60+i*9)%57);ctx.fillStyle=active.color;ctx.fillRect((i%2?1:-1)*(12+i),y,1.5,6)}
   ctx.restore();
  }
  const phase=Number.isFinite(entered)?age:time;
  if(active.lightning&&!reduced.matches&&phase%active.lightning<300)bolt(ctx,time);
  return true;
 }
 function bolt(ctx,time){
  ctx.save();
  const side=Math.floor(time/160)%2?1:-1;
  ctx.beginPath();ctx.moveTo(-14*side,-34);ctx.lineTo(-21*side,-22);ctx.lineTo(-16*side,-24);ctx.lineTo(-23*side,-9);
  ctx.moveTo(15*side,-13);ctx.lineTo(22*side,-4);ctx.lineTo(17*side,-5);ctx.lineTo(21*side,8);
  if(active.id==='ssj3'){ctx.moveTo(-20*side,-19);ctx.lineTo(-27*side,-16);ctx.lineTo(-24*side,-12)}
  ctx.strokeStyle='#69adff';ctx.lineWidth=2.8;ctx.stroke();ctx.strokeStyle='#efffff';ctx.lineWidth=1;ctx.stroke();ctx.restore();
 }
 return {selector,panel,draw};
})();
