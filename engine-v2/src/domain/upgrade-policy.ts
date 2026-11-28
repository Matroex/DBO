const blocked=new Set(['chi','symbol','znak','stroj','stroj treningowy','esencja','scouter']);
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function standardUpgradeAllowed(slot:string,name=''):boolean{
 const normalizedName=normalize(name);
 return !blocked.has(normalize(slot))&&![...blocked].some(category=>normalizedName===category||normalizedName.startsWith(category+' '));
}
