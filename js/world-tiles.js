/* Astralni Wojownicy — teren kafelkowy dla Kreatora GM v3.
 * Odrębna warstwa pod NPC, portalami i obiektami. Nie modyfikuje map PNG.
 */
(()=>{'use strict';
 const TILE=32,ATLAS_TILE=64,MAX=100;
 const palette=Object.freeze([
  {id:0,key:'grass',name:'Trawa',blocked:false},
  {id:1,key:'grass_lush',name:'Bujna trawa',blocked:false},
  {id:2,key:'path',name:'Droga',blocked:false},
  {id:3,key:'sand',name:'Piasek',blocked:false},
  {id:4,key:'stone',name:'Kamienna posadzka',blocked:false},
  {id:5,key:'water',name:'Woda',blocked:true},
  {id:6,key:'forest',name:'Gęsty las',blocked:true},
  {id:7,key:'rock',name:'Skały',blocked:true},
  {id:8,key:'wall',name:'Mur',blocked:true},
  {id:9,key:'dirt',name:'Ziemia',blocked:false}
 ]);
 const atlas=new Image();let ready=false;
 const listeners=new Set();
 atlas.addEventListener('load',()=>{ready=atlas.naturalWidth===ATLAS_TILE*palette.length;for(const fn of listeners)try{fn()}catch(e){console.warn(e)}});
 atlas.src='assets/ui/map-editor/terrain-atlas.png';
 const getTile=(map,x,y)=>{
  if(!map?.terrain||x<0||y<0||x>=map.sizeX||y>=map.sizeY)return -1;
  return map.terrain.tiles[y*map.sizeX+x]??0;
 };
 function valid(map){
  if(!map?.terrain)return false;
  const t=map.terrain;
  return t.version===1&&Number.isInteger(map.sizeX)&&Number.isInteger(map.sizeY)&&map.sizeX>=10&&map.sizeY>=10&&map.sizeX<=MAX&&map.sizeY<=MAX&&
    Array.isArray(t.tiles)&&t.tiles.length===map.sizeX*map.sizeY&&t.tiles.every(v=>Number.isInteger(v)&&v>=0&&v<palette.length);
 }
 function create(width,height,base=0){return {version:1,tiles:Array(width*height).fill(base)};}
 function drawCell(ctx,map,x,y){
  const type=getTile(map,x,y);if(type<0)return;
  const px=x*TILE,py=y*TILE;
  if(ready){ctx.drawImage(atlas,type*ATLAS_TILE,0,ATLAS_TILE,ATLAS_TILE,px,py,TILE,TILE)}
  else{ctx.fillStyle=['#478f53','#55994e','#b58b58','#dbc184','#828f96','#2f8cbc','#315e39','#757e78','#626c7b','#906d51'][type];ctx.fillRect(px,py,TILE,TILE)}
  // Miękkie krawędzie terenu: domknięcie wizualne ścieżek i wybrzeży.
  if(type===5){
   ctx.save();ctx.strokeStyle='rgba(179,233,231,.7)';ctx.lineWidth=2;
   for(const [dx,dy,x1,y1,x2,y2] of [[0,-1,0,1,TILE,1],[0,1,0,TILE-1,TILE,TILE-1],[-1,0,1,0,1,TILE],[1,0,TILE-1,0,TILE-1,TILE]]){
    const other=getTile(map,x+dx,y+dy);if(other>=0&&other!==5){ctx.beginPath();ctx.moveTo(px+x1,py+y1);ctx.lineTo(px+x2,py+y2);ctx.stroke()}
   }
   ctx.restore();
  } else if(type===2){
   const edges=[[0,-1,0,0,TILE,0],[0,1,0,TILE,TILE,TILE],[-1,0,0,0,0,TILE],[1,0,TILE,0,TILE,TILE]];
   ctx.save();ctx.strokeStyle='rgba(88,62,38,.25)';ctx.lineWidth=2;
   for(const [dx,dy,x1,y1,x2,y2] of edges){const other=getTile(map,x+dx,y+dy);if(other>=0&&other!==2){ctx.beginPath();ctx.moveTo(px+x1,py+y1);ctx.lineTo(px+x2,py+y2);ctx.stroke()}}
   ctx.restore();
  }
 }
 function draw(ctx,map){if(!valid(map))return false;for(let y=0;y<map.sizeY;y++)for(let x=0;x<map.sizeX;x++)drawCell(ctx,map,x,y);return true;}
 // Przy pojedynczej zmianie odświeżamy kafelek i bezpośrednich sąsiadów.
 function redrawNeighborhood(ctx,map,x,y){for(let cy=y-1;cy<=y+1;cy++)for(let cx=x-1;cx<=x+1;cx++)if(cx>=0&&cy>=0&&cx<map.sizeX&&cy<map.sizeY)drawCell(ctx,map,cx,cy)}
 const isBlocked=(map,x,y)=>{
  if(!valid(map))return false;
  const col=Math.floor(x/TILE),row=Math.floor(y/TILE),id=getTile(map,col,row);
  return id<0||palette[id].blocked;
 };
 const onReady=fn=>{if(ready)fn();else listeners.add(fn);return()=>listeners.delete(fn)};
 window.DBITerrain={palette,create,valid,draw,drawCell,redrawNeighborhood,isBlocked,onReady,getTile,atlas,TILE};
})();
