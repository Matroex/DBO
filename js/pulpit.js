/* DBO Idle — prywatny pulpit postaci */
(() => {
  'use strict';
  const labels = [
    ['battlePoints','Punkty walki'], ['tournaments','Wygrane turnieje'],
    ['pvpWins','Wygrane pojedynki PvP'], ['fame','Punkty sławy'],
    ['title','Tytuł'], ['bosses','Pokonane bossy'],
    ['dragonBalls','Zebrane smocze kule'], ['medals','Zdobyte medale'],
    ['achievements','Osiągnięcia']
  ];
  const escapeHtml = v => String(v).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
  const number = v => Math.max(0,Math.floor(Number(v)||0)).toLocaleString('pl-PL');

  function render(characterId, character) {
    const host = document.querySelector('#pageBody');
    if (!host || !characterId) return;
    document.querySelector('#breadcrumb').textContent = 'POSTAĆ / PULPIT';
    const key = 'dboidle_dashboard_v1_' + String(characterId);
    let stored = {};
    try { stored = JSON.parse(localStorage.getItem(key)||'{}')||{}; } catch {}
    // Wartości nieobsługiwanych jeszcze mechanik pozostają zerowe.
    const rows = labels.map(([field,label]) => {
      const value = field === 'title'
        ? (typeof stored.title === 'string' && stored.title.trim() ? stored.title.trim() : 'Brak')
        : number(stored[field]);
      return `<div class="dbi-dash-row"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`;
    }).join('');
    host.innerHTML = `<section class="dbi-dash" aria-label="Prywatny pulpit postaci">
      <div class="dbi-dash-figure">
        <div class="dbi-dash-caption">MODEL POSTACI</div>
        <div class="dbi-dash-stage">
          <canvas id="dbiDashSprite" width="240" height="280" role="img"
            aria-label="Postać — przeciągnij w lewo lub prawo, aby obrócić"></canvas>
        </div>
        <div class="dbi-dash-turn">
          <button type="button" id="dbiDashLeft" aria-label="Obróć w lewo">◀</button>
          <span id="dbiDashDirection">Przód</span>
          <button type="button" id="dbiDashRight" aria-label="Obróć w prawo">▶</button>
        </div>
        <button type="button" class="dbi-dash-change" disabled title="System zmiany wyglądu pojawi się później">Zmień wygląd</button>
        <small class="dbi-dash-hint">Przeciągnij postać, aby ją obrócić</small>
      </div>
      <div class="dbi-dash-details">
        <div class="dbi-dash-head"><span>PULPIT WOJOWNIKA</span><strong>${escapeHtml(character?.name||'Wojownik')}</strong></div>
        ${rows}
      </div>
    </section>`;
    const canvas = document.getElementById('dbiDashSprite');
    const ctx = canvas.getContext('2d');
    const sprite = new Image();
    sprite.src = 'assets/goku-walk.png'; // ten sam arkusz sprite'ów co na mapie
    // Kolejność wierszy arkusza: przód, tył, lewo, prawo.
    const directions = [{row:0,name:'Przód'},{row:3,name:'Prawo'},
      {row:1,name:'Tył'},{row:2,name:'Lewo'}];
    let direction = 0;
    function draw() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.imageSmoothingEnabled = false;
      if (sprite.complete && sprite.naturalWidth) {
        ctx.drawImage(sprite,0,directions[direction].row*96,80,96,30,12,180,252);
      } else {
        ctx.fillStyle='#d2a95c';
        ctx.font='16px sans-serif';
        ctx.textAlign='center';
        ctx.fillText('Ładowanie modelu…',120,135);
      }
      document.getElementById('dbiDashDirection').textContent = directions[direction].name;
    }
    function rotate(steps) { direction=(direction+steps+4)%4; draw(); }
    sprite.onload=draw;
    sprite.onerror=draw;
    draw();
    document.getElementById('dbiDashLeft').onclick=()=>rotate(-1);
    document.getElementById('dbiDashRight').onclick=()=>rotate(1);
    let startX=null;
    canvas.addEventListener('pointerdown', e => {
      startX=e.clientX;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointerup', e => {
      if (startX === null) return;
      const delta=e.clientX-startX;
      if (Math.abs(delta)>15) rotate(delta>0?1:-1);
      startX=null;
    });
    canvas.addEventListener('pointercancel',()=>{startX=null;});
    canvas.tabIndex=0;
    canvas.addEventListener('keydown',e=>{
      if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
        e.preventDefault();rotate(e.key==='ArrowRight'?1:-1);
      }
    });
  }
  window.DBIPulpit = {render};
})();
