/* JEDYNE źródło definicji przedmiotów. Edycje GM zapisują się lokalnie; eksport JSON daje kopię katalogu. */
const DBI_DEFAULT_ITEMS=[
{id:'stroj-001',name:'Strój treningowy szkoły żółwia',slot:'stroj',icon:'🥋',image:'assets/items/stroj-treningowy-szkoly-zolwia.png',attack:0,defense:0,ki:0,trainingBaseBonusPercent:1,description:'+1% do bazowej wartości treningu'},
];
const DBI_SLOTS=[['Opaska','opaska',3,1,1],['Chi','chi',6,1,1],['Broń','bron',2,3,2],['Naszyjnik','naszyjnik',3,2,1],['Kolczyki','kolczyki',4,2,1],['Symbol','symbol',6,2,1],['Zbroja','zbroja',3,3,2],['Strój treningowy','stroj',6,3,2],['Pierścień','pierscien',2,5,1],['Pas','pas',3,5,1],['Rękawice','rekawice',4,5,1],['Esencja','esencja',6,5,1],['Energia Ki','energia',1,6,1],['Buty','buty',3,6,1],['Scouter','scouter',6,6,1]];
const DBI_KEY='dbi_catalog_v08';
function dbiLoadCatalog(){try{const data=JSON.parse(localStorage.getItem(DBI_KEY));if(Array.isArray(data))return data;}catch(e){}return structuredClone(DBI_DEFAULT_ITEMS)}
function dbiSaveCatalog(items){localStorage.setItem(DBI_KEY,JSON.stringify(items))}
