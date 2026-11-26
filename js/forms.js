/* Visual transformations share the original walk cycle and foot position. */
window.DBIForms = (() => {
 'use strict';
 const forms = [
  {id:'kaioken', name:'Kaioken', sheet:'body-kaioken', color:'#ff3c39', description:'Pulsująca czerwona aura.'},
  {id:'ssj', name:'SSJ', color:'#ffd65a', sheet:'body-ssj1', description:'Złote włosy i świetlista aura.'},
  {id:'ssj2', name:'SSJ2', color:'#ffe37a', sheet:'body-ssj2', lightning:3100, description:'Najeżone złote włosy i błękitne wyładowania.'},
  {id:'ssj3', name:'SSJ3', color:'#ffbf35', sheet:'body-ssj3', lightning:2400, description:'Długie złote włosy i rozgałęzione błyskawice.'},
  {id:'ssj4',name:'SSJ4',sheet:'body-ssj4',color:'#ff973e',ascension:true,description:'Czerwone futro, czarna grzywa i ognista aura.'},
  {id:'ssjb',name:'SSJB',sheet:'body-ssjb',color:'#24deff',ascension:true,description:'Błękitne włosy i turkusowa fala energii.'},
  {id:'ssjb-kaioken',name:'SSJB z Kaiokenem',sheet:'body-bluekai',color:'#38e5ff',outer:'#ff253d',ascension:true,description:'Błękitną energię otacza druga, czerwona aura.'},
  {id:'ultra-instinct',name:'Ultra Instynkt',sheet:'body-instinct',color:'#bacffd',ascension:true,description:'Srebrne włosy i unoszące się drobiny światła.'},
  {id:'ultra-ego',name:'Ultra Ego',sheet:'body-ego',color:'#b74dff',sparkPeriod:2300,ascension:true,description:'Ametystowe włosy i wyładowania fioletowej energii.'}
 ];
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const key = id => 'dboidle_map_form_v1_'+(id||'test');
 const chargeBody=new Image();
 chargeBody.src='assets/forms/body-kaioken.png';
 let owner, active, previous, entered, pending;
 function useCharacter(id) {
  const next=key(id);
  if(owner===next)return;
  owner=next;previous=undefined;
  let saved;try{saved=localStorage.getItem(owner)}catch{}
  active=forms.find(f=>f.id===saved);
  entered=-Infinity;pending=false;
 }
 function select(id){
  const next=forms.find(f=>f.id===id);
  if(next===active)return;
  previous=active;active=next;pending=!!active;
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
 // A short gather, enclosing energy shell, reveal, then a smaller walking aura.
 function flame(ctx, color, width, height, time, strength){
  if(height<1)return;
  ctx.save();
  ctx.globalAlpha=strength;
  const glow=ctx.createRadialGradient(0,-12,4,0,-12,height);
  glow.addColorStop(0,color+'12');glow.addColorStop(.63,color+'6e');glow.addColorStop(1,color+'00');
  ctx.translate(0,14-height*.50);ctx.scale(width/height,1);
  ctx.fillStyle=glow;ctx.fillRect(-height,-height,height*2,height*2);
  ctx.restore();
  ctx.save();ctx.globalAlpha=strength;
  ctx.beginPath();ctx.moveTo(-width*.88,11);
  for(let n=0;n<=12;n++){
   const t=n/12, ridge=Math.sin(Math.PI*t);
   const x=(t*2-1)*width;
   const tip=11-height*(.15+.85*ridge)+Math.sin(time/140+n*1.7)*3;
   ctx.quadraticCurveTo(x-width*.11,tip+height*.28,x,tip);
  }
  ctx.quadraticCurveTo(width*1.15,19,0,16);ctx.quadraticCurveTo(-width*.9,17,-width*.88,11);
  ctx.fillStyle=color+'48';ctx.strokeStyle=color+'b3';ctx.lineWidth=1.3;ctx.fill();ctx.stroke();ctx.restore();
 }
 function drawAscension(ctx,base,frame,row,time,image){
  const age=time-entered;
  const charging=!reduced.matches&&Number.isFinite(age)&&age>=0&&age<2100;
  const t=reduced.matches?0:time;
  const blue=active.color;
  const buildup=charging?Math.min(1,age/680):1;
  const release=charging?Math.max(0,1-Math.abs(age-920)/380):0;
  const shell=charging?Math.max(0,1-Math.abs(age-900)/270):0;
  const height=51+4*Math.sin(t/270)+release*14;
  ctx.save();
  if(active.outer&&(!charging||age>1140)){
   const strength=charging?Math.min(1,(age-1140)/270):.74;
   flame(ctx,active.outer,24,height+9,t+120,strength);
  }
  flame(ctx,blue,18+release*7,height*buildup,t,charging ? .88 : .51);
  if(charging&&age<800){
   ctx.save();ctx.strokeStyle=blue;ctx.lineWidth=2;
   for(let i=0;i<9;i++){
    const p=(age/490+i/9)%1, x=Math.cos(i*2.39)*(19-7*p);
    ctx.globalAlpha=Math.sin(p*Math.PI)*buildup;ctx.beginPath();
    ctx.moveTo(x,14-p*48);ctx.quadraticCurveTo(x+2,11-p*51,x+1,7-p*54);ctx.stroke();
   }
   ctx.restore();
  }
  const action=charging&&age>=240;
  const pose=age<570?0:age<830?1:age<1350?2:3;
  const lift=pose===2&&action?3*Math.sin(Math.PI*(age-830)/520):0;
  // Charge the source silhouette before revealing the new body inside the shell.
  const sourcePose=charging&&age<780;
  const sprite=sourcePose?sheet(previous):image;
  if(sprite?.naturalWidth){
   ctx.drawImage(sprite,(action?pose:frame)*96,(action?4:row)*112,96,112,-24,-34-16*50/96-lift,48,112*50/96);
  }else if(sourcePose&&action&&chargeBody.naturalWidth){
   ctx.drawImage(chargeBody,pose*96,448,96,112,-24,-34-16*50/96,48,112*50/96);
  }else ctx.drawImage(base,frame*80,row*96,80,96,-20,-34,40,50);
  if(shell>0){
   ctx.save();ctx.globalAlpha=shell;const radius=25+12*shell;
   const orb=ctx.createRadialGradient(0,-10,2,0,-10,radius);
   orb.addColorStop(0,'#ffffff');orb.addColorStop(.53,'#ffffffed');orb.addColorStop(.78,blue+'ee');orb.addColorStop(1,blue+'00');
   ctx.fillStyle=orb;ctx.fillRect(-radius,-10-radius,2*radius,2*radius);ctx.restore();
  }
  if(charging&&age>850&&age<1500){
   const f=(age-850)/650;ctx.globalAlpha=1-f;ctx.strokeStyle=blue;ctx.lineWidth=2-f;
   ctx.beginPath();ctx.ellipse(0,13,9+36*f,3+9*f,0,0,2*Math.PI);ctx.stroke();ctx.globalAlpha=1;
  }
  if(!reduced.matches){
   const period=active.sparkPeriod;
   if(period&&t%period<200)bolt(ctx,t);
   if(active.id==='ultra-instinct'){
    for(let i=0;i<6;i++){
     const f=(t/1600+i/6)%1;ctx.globalAlpha=Math.sin(f*Math.PI)*.8;
     ctx.fillStyle='#edfbff';ctx.fillRect(Math.sin(i*2.1+f*3)*20,13-f*57,1.3,2);
    }
   }
  }
  ctx.restore();
 }
 function draw(ctx,base,frame,row,time){
  if(!active)return false;
  const image=sheet(active);
  if(pending&&image?.naturalWidth){entered=time;pending=false}
  const age=time-entered;
  if(active.ascension){
   drawAscension(ctx,base,frame,row,time,image);return true;
  }
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
  ctx.strokeStyle=active.ascension?active.color:'#69adff';ctx.lineWidth=2.8;ctx.stroke();ctx.strokeStyle='#efffff';ctx.lineWidth=1;ctx.stroke();ctx.restore();
 }
 return {selector,panel,draw};
})();
