(()=>{'use strict';const $=id=>document.getElementById(id);const sk='dboidle_demo_session_v1';let session;try{session=JSON.parse(sessionStorage.getItem(sk)||'null')}catch{}if(!session?.name){location.replace('login.html');return}const slots=window.DBICharacterSlots,account=session.name.toLowerCase();const chars=slots.characters(account),limit=slots.limit(account);if(chars.length>=limit){location.replace('characters.html');return}const races=[['Saiyan','saiyan'],['Ziemianin','ziemianin'],['Demon Mrozu','demon-mrozu'],['Nameczanin','nameczanin'],['Majin','majin']];let selected=null;$('limit').textContent=`Postacie na koncie: ${chars.length}/${limit}`;for(const [name,file] of races){const card=document.createElement('article');card.className='race';card.tabIndex=0;card.innerHTML=`<h2>${name}</h2><div class="figure"><img src="assets/${file}.webp" alt="Wojownik rasy ${name}" draggable="false"></div><button type="button">Wybierz</button>`;const choose=()=>{selected=name;document.querySelectorAll('.race').forEach(n=>{n.classList.toggle('selected',n===card);n.querySelector('button').textContent=n===card?'Wybrano':'Wybierz'})};card.addEventListener('click',choose);card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose()}});$('races').append(card)}$('cancel').onclick=()=>location.href='characters.html';$('create').onsubmit=async e=>{e.preventDefault();const name=$('name').value.trim();if(!selected){$('error').textContent='Najpierw wybierz rasę.';return}if(name.length<3){$('error').textContent='Nazwa musi mieć co najmniej 3 znaki.';return}const submit=e.currentTarget.querySelector('[type=submit]');
if(submit.disabled)return;
submit.disabled=true;
try{
 await slots.create(account,{name,race:selected,childCode:$('child').value.trim(),stats:{strength:4,speed:5,endurance:6,intelligence:2,ki:2}});
 location.href='characters.html';
}catch(error){
 $('error').textContent=error.message;
 submit.disabled=false;
}
};
})();