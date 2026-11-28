const blocked=new Set(['chi','symbol','stroj','stroj treningowy','esencja','scouter']);
export function standardUpgradeAllowed(slot:string):boolean{
 const normalized=slot.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 return !blocked.has(normalized);
}
