/* DBOidle starter set: no stats until balanced. */
const DBI_STARTER_SET=[
 {id:'starter-blue-kimono',name:'Niebieskie Kimono',enhancement:0,requiredLevel:1,slot:'zbroja',icon:'🥋',image:'assets/items/niebieskie-kimono.png',quality:'Pospolity',attack:0,defense:10,ki:0,description:'Górna część stroju treningowego.'},
 {id:'starter-white-belt',name:'Biały Pas',requiredLevel:1,slot:'pas',icon:'🥋',image:'assets/items/bialy-pas.png',quality:'Pospolity',attack:0,defense:1,ki:0,description:'Biały pas do stroju treningowego.'},
 {id:'starter-black-boots',name:'Czarne Skórzane Trzewiki',requiredLevel:1,moveSpeedPct:1,slot:'buty',icon:'🥾',image:'assets/items/czarne-skorzane-trzewiki.png',quality:'Pospolity',attack:0,defense:0,ki:0,description:'Czarne skórzane trzewiki.'},
 {id:'starter-red-staff',name:'Magiczny Czerwony Kij',enhancement:0,requiredLevel:1,attackMin:20,attackMax:30,attackSpeedPct:10,slot:'bron',icon:'🪄',image:'assets/items/magiczny-czerwony-kij.png',quality:'Pospolity',attack:0,defense:0,ki:0,description:'Magiczny czerwony kij.'}
];
const dbiOriginalLoadCatalog=dbiLoadCatalog;
dbiLoadCatalog=function(){
 const current=dbiOriginalLoadCatalog();
 for(const item of DBI_STARTER_SET){const i=current.findIndex(x=>x.id===item.id);if(i<0)current.push({...item});else current[i]={...current[i],...item};}
 return current;
};
for(const item of DBI_STARTER_SET){if(!DBI_DEFAULT_ITEMS.some(x=>x.id===item.id))DBI_DEFAULT_ITEMS.push({...item});}
// Przedmioty pozostają w katalogu, ale nie są automatycznie przyznawane postaci.
