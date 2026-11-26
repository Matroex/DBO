/* DBO Idle — Kreator GM v4: wspólny renderer, stabilne warianty, automatyczne przejścia.
   Format terrain.version=1 oraz identyfikatory 0–9 pozostają kompatybilne. */
(()=>{'use strict';
 const TILE=32,ATLAS_TILE=64,MAX=100,COLS=8,VARIANTS=4;
 const data=[
 ['grass','Trawa',0,'grass','#5c792b'],['grass_lush','Bujna trawa',0,'grass','#3d692f'],['path','Droga',0,'path','#9a7141'],['sand','Piasek',0,'sand','#d0ae6f'],['stone','Kamienna posadzka',0,'floor','#7b8484'],['water','Woda',1,'water','#2095b0'],['forest','Gęsty las',1,'forest','#2a5223'],['rock','Skały',1,'rock','#5b635e'],['wall','Mur',1,'wall','#6a6f78'],['dirt','Ziemia',0,'path','#745437'],
 ['meadow','Jasna łąka',0,'grass','#778f3e'],['moss','Mech',0,'grass','#375634'],['dust','Sucha ścieżka',0,'path','#af8151'],['beach','Jasny piasek',0,'sand','#cfbe97'],['shallows','Turkusowa woda',1,'water','#30b3b4'],['deep_water','Głęboka woda',1,'water','#174f7d'],['forest_light','Jasny las',1,'forest','#3d6125'],['forest_dark','Ciemny las',1,'forest','#1f412f'],['canyon','Skały kanionu',1,'rock','#987051'],['cliff','Szary klif',1,'rock','#707689'],['snow','Śnieg',0,'ground','#e2e5e0'],['ice','Lód',0,'floor','#81c0cf'],['courtyard','Bruk placu',0,'floor','#9d8e77'],['red_wall','Ceglany mur',1,'wall','#9d5844'],['wood','Drewniana podłoga / most',0,'floor','#6f563b'],['city','Ciemna posadzka',0,'floor','#5b636d'],['mud','Błoto',0,'path','#53403a'],['dry_grass','Sucha trawa',0,'grass','#7f6b41'],['lava','Lawa',1,'lava','#953520'],['volcanic','Skała wulkaniczna',1,'rock','#40333c'],['temple','Płyty świątyni',0,'floor','#c9c0a3'],['metal','Metalowa podłoga',0,'floor','#517880'],
 [
  "sky",
  "Wysokie niebo",
  1,
  "sky",
  "#64ade0"
 ],
 [
  "cloud",
  "Morze chmur",
  1,
  "sky",
  "#bfdff0"
 ],
 [
  "twilight",
  "Niebo o zmierzchu",
  1,
  "sky",
  "#957ba8"
 ],
 [
  "space",
  "Głęboki kosmos",
  1,
  "sky",
  "#18283e"
 ],
 [
  "ivory",
  "Płyty z kości słoniowej",
  0,
  "palace",
  "#e1d8be"
 ],
 [
  "jade",
  "Nefrytowy chodnik",
  0,
  "palace",
  "#719d92"
 ],
 [
  "gold",
  "Złota mozaika",
  0,
  "palace",
  "#b29b6d"
 ],
 [
  "bridge",
  "Most powietrzny",
  0,
  "palace",
  "#b8aaaa"
 ],
 [
  "alienMeadow",
  "Turkusowa łąka",
  0,
  "planet",
  "#5dafa1"
 ],
 [
  "alienSoil",
  "Wrzosowa gleba",
  0,
  "planet",
  "#977b9e"
 ],
 [
  "alienLake",
  "Szmaragdowe jezioro",
  1,
  "water",
  "#35998b"
 ],
 [
  "redSand",
  "Rdzawy piach",
  0,
  "planet",
  "#c68967"
 ],
 [
  "ash",
  "Popiół",
  0,
  "planet",
  "#665c66"
 ],
 [
  "hangar",
  "Płyty hangaru",
  0,
  "tech",
  "#52697b"
 ],
 [
  "deck",
  "Pokład stacji",
  0,
  "tech",
  "#687b83"
 ],
 [
  "spirit",
  "Droga duchów",
  0,
  "palace",
  "#d3ac69"
 ],

 [
  "nmAzure",
  "Błękitna murawa",
  0,
  "namekGrass",
  "#5bada7"
 ],
 [
  "nmMint",
  "Miętowa łąka",
  0,
  "namekGrass",
  "#90c7a6"
 ],
 [
  "nmTurquoise",
  "Turkusowe zarośla",
  0,
  "namekGrass",
  "#499c91"
 ],
 [
  "nmLilac",
  "Liliowe kwiaty na łące",
  0,
  "namekGrass",
  "#69a199"
 ],
 [
  "nmReed",
  "Szuwary Namek",
  0,
  "namekGrass",
  "#79ad88"
 ],
 [
  "nmMoss",
  "Mech źródlany",
  0,
  "namekGrass",
  "#659987"
 ],
 [
  "nmShale",
  "Liliowy łupek",
  1,
  "namekRock",
  "#88789b"
 ],
 [
  "nmStrata",
  "Warstwy urwiska",
  1,
  "namekRock",
  "#997f9e"
 ],
 [
  "nmChalk",
  "Kredowy klif",
  1,
  "namekRock",
  "#b6acaf"
 ],
 [
  "nmCrag",
  "Fioletowe rumowisko",
  1,
  "namekRock",
  "#776689"
 ],
 [
  "nmTop",
  "Szczyt płaskowyżu",
  0,
  "namekGround",
  "#b5a3aa"
 ],
 [
  "nmPearl",
  "Perłowa plaża",
  0,
  "namekGround",
  "#c8c0ab"
 ],
 [
  "nmGravel",
  "Różowy żwir",
  0,
  "namekGround",
  "#b29a95"
 ],
 [
  "nmDust",
  "Ścieżka wioski",
  0,
  "namekGround",
  "#ae927b"
 ],
 [
  "nmMud",
  "Wilgotny muł",
  0,
  "namekGround",
  "#788579"
 ],
 [
  "nmFord",
  "Kamienisty bród",
  0,
  "namekGround",
  "#87aaa0"
 ],
 [
  "nmShoal",
  "Lazurowa płycizna",
  1,
  "namekWater",
  "#69cbb6"
 ],
 [
  "nmLake",
  "Jezioro jadeitowe",
  1,
  "namekWater",
  "#328c86"
 ],
 [
  "nmDeep",
  "Toń szmaragdowa",
  1,
  "namekWater",
  "#275e70"
 ],
 [
  "nmLagoon",
  "Laguna seledynowa",
  1,
  "namekWater",
  "#6bbfa0"
 ],
 [
  "nmFarm",
  "Grządki sadzonek",
  0,
  "namekGround",
  "#78684f"
 ],
 [
  "nmShell",
  "Muszlowy bruk",
  0,
  "namekGround",
  "#c2beb0"
 ],
 [
  "nmObsidian",
  "Obsydian Namek",
  1,
  "namekRock",
  "#534655"
 ],
 [
  "nmFault",
  "Pęknięcie magmowe",
  1,
  "namekRock",
  "#654b50"
 ],
 [
  "nmCinder",
  "Wypalona równina",
  0,
  "namekGround",
  "#796869"
 ],
 [
  "nmDry",
  "Wyschnięte dno",
  0,
  "namekGround",
  "#ac8f7a"
 ],
 [
  "nmCrystal",
  "Kryształowe złoże",
  1,
  "namekRock",
  "#736b93"
 ],
 [
  "nmBridge",
  "Kładka osady",
  0,
  "namekGround",
  "#91785c"
 ],
 [
  "nmRuins",
  "Ruiny przyszłości",
  0,
  "worldGround",
  "#6f7882"
 ],
 [
  "nmCircuit",
  "Podłoga laboratorium czasu",
  0,
  "worldGround",
  "#626f80"
 ],
 [
  "nmFrost",
  "Zmarzlina",
  0,
  "worldGround",
  "#a3b8c2"
 ],
 [
  "nmArena",
  "Płyty turniejowe",
  0,
  "worldGround",
  "#b7b0a7"
 ]

];
 const palette=Object.freeze(data.map(([key,name,blocked,group,color],id)=>Object.freeze({id,key,name,blocked:!!blocked,group,color})));
 const groups=[['grass','ground','Trawy i podłoże'],['path','sand','Drogi i piasek'],['water','lava','Woda i lawa'],['forest','rock','Las i góry'],['floor','wall','Budowle i podłogi'],['sky','palace','Niebo i podniebny pałac'],['planet','tech','Obce światy i technologia'],['namekGrass','namekGround','Namek · łąki i osady'],['namekWater','namekRock','Namek · jeziora i urwiska'],['worldGround',null,'Inne krainy']];
 const props=Object.freeze([
 ['tree','Drzewo',44,62],['oak','Duże drzewo',64,76],['pine','Sosna',46,64],['autumn-tree','Jesienne drzewo',52,68],['alien-tree','Obce drzewo',52,72],['rock','Kamień',34,28],['boulder','Głaz',58,48],['bush','Krzew',42,30],['blue-flowers','Niebieskie kwiaty',46,32],['red-flowers','Czerwone kwiaty',46,32],['white-flowers','Białe kwiaty',46,32],['log','Powalone drzewo',50,24],['crate','Skrzynia',36,36],['bridge','Kładka (dekoracja)',40,80],['sign','Drogowskaz',36,36]
 ].map(([key,name,width,height])=>Object.freeze({key,name,width,height,art:'assets/ui/map-editor/props/'+key+'.png'})));
 const catalog=[
 {
  "key": "catalog-0",
  "name": "Wierzba",
  "group": "Roślinność",
  "art": "assets/ui/map-editor/v46/prop-0.png",
  "width": 84,
  "height": 83
 },
 {
  "key": "catalog-1",
  "name": "Wiśnia",
  "group": "Roślinność",
  "art": "assets/ui/map-editor/v46/prop-1.png",
  "width": 81,
  "height": 80
 },
 {
  "key": "catalog-2",
  "name": "Palmy",
  "group": "Roślinność",
  "art": "assets/ui/map-editor/v46/prop-2.png",
  "width": 77,
  "height": 74
 },
 {
  "key": "catalog-3",
  "name": "Bambusy",
  "group": "Roślinność",
  "art": "assets/ui/map-editor/v46/prop-3.png",
  "width": 80,
  "height": 79
 },
 {
  "key": "catalog-4",
  "name": "Fioletowy krzew",
  "group": "Roślinność",
  "art": "assets/ui/map-editor/v46/prop-4.png",
  "width": 32,
  "height": 33
 },
 {
  "key": "catalog-5",
  "name": "Grzyby",
  "group": "Roślinność",
  "art": "assets/ui/map-editor/v46/prop-5.png",
  "width": 33,
  "height": 26
 },
 {
  "key": "catalog-6",
  "name": "Trzciny",
  "group": "Roślinność",
  "art": "assets/ui/map-editor/v46/prop-6.png",
  "width": 33,
  "height": 34
 },
 {
  "key": "catalog-7",
  "name": "Złota łąka",
  "group": "Roślinność",
  "art": "assets/ui/map-editor/v46/prop-7.png",
  "width": 33,
  "height": 32
 },
 {
  "key": "catalog-8",
  "name": "Wapienny klif",
  "group": "Góry i jaskinie",
  "art": "assets/ui/map-editor/v46/prop-8.png",
  "width": 67,
  "height": 76
 },
 {
  "key": "catalog-9",
  "name": "Płaskowyż",
  "group": "Góry i jaskinie",
  "art": "assets/ui/map-editor/v46/prop-9.png",
  "width": 73,
  "height": 80
 },
 {
  "key": "catalog-10",
  "name": "Wejście do jaskini",
  "group": "Góry i jaskinie",
  "art": "assets/ui/map-editor/v46/prop-10.png",
  "width": 94,
  "height": 83
 },
 {
  "key": "catalog-11",
  "name": "Skalne schody",
  "group": "Góry i jaskinie",
  "art": "assets/ui/map-editor/v46/prop-11.png",
  "width": 62,
  "height": 67
 },
 {
  "key": "catalog-12",
  "name": "Wodospad",
  "group": "Otoczenie",
  "art": "assets/ui/map-editor/v46/prop-12.png",
  "width": 91,
  "height": 90,
  "effect": "waterfall"
 },
 {
  "key": "catalog-13",
  "name": "Pawilon widokowy",
  "group": "Budowle",
  "art": "assets/ui/map-editor/v46/prop-13.png",
  "width": 93,
  "height": 90
 },
 {
  "key": "catalog-14",
  "name": "Kapsuła zwiadowcza",
  "group": "Budowle",
  "art": "assets/ui/map-editor/v46/prop-14.png",
  "width": 75,
  "height": 69
 },
 {
  "key": "catalog-15",
  "name": "Laboratorium",
  "group": "Budowle",
  "art": "assets/ui/map-editor/v46/prop-15.png",
  "width": 101,
  "height": 95
 },
 {
  "key": "catalog-16",
  "name": "Dym",
  "group": "Otoczenie",
  "art": "assets/ui/map-editor/v46/smoke.png",
  "width": 64,
  "height": 64,
  "effect": "smoke"
 },
 {
  "key": "catalog-17",
  "name": "Świetliki",
  "group": "Otoczenie",
  "art": "assets/ui/map-editor/v46/fireflies.png",
  "width": 64,
  "height": 64,
  "effect": "fireflies"
 },
 {
  "key": "catalog-18",
  "name": "Kręgi na wodzie",
  "group": "Otoczenie",
  "art": "assets/ui/map-editor/v46/ripple.png",
  "width": 64,
  "height": 64,
  "effect": "ripple"
 },
 {
  "key": "catalog-19",
  "name": "Zbieracz",
  "group": "NPC",
  "art": "assets/world/army/collector.png",
  "width": 39,
  "height": 46
 },
 {
  "key": "catalog-20",
  "name": "Wojownik",
  "group": "NPC",
  "art": "assets/world/army/warrior.png",
  "width": 24,
  "height": 52
 },
 {
  "key": "catalog-21",
  "name": "Nieznajomy",
  "group": "NPC",
  "art": "assets/world/frontier/man.png",
  "width": 33,
  "height": 50
 },
 {
  "key": "catalog-22",
  "name": "Handlarz",
  "group": "NPC",
  "art": "assets/world/metropolia/handlarz.png",
  "width": 30,
  "height": 50
 },
 {
  "key": "catalog-23",
  "name": "Pustelnik",
  "group": "NPC",
  "art": "assets/world/stadion-2/pustelnik.png",
  "width": 21,
  "height": 50
 },
 {
  "key": "catalog-24",
  "name": "Kwatera",
  "group": "Budowle",
  "art": "assets/world/army/hq.png",
  "width": 122,
  "height": 125
 },
 {
  "key": "catalog-25",
  "name": "Fortyfikacje",
  "group": "Budowle",
  "art": "assets/world/army/walls.png",
  "width": 382,
  "height": 145
 },
 {
  "key": "catalog-26",
  "name": "Chata",
  "group": "Budowle",
  "art": "assets/world/army/hut.png",
  "width": 70,
  "height": 65
 },
 {
  "key": "catalog-27",
  "name": "Posterunek",
  "group": "Budowle",
  "art": "assets/world/frontier/house.png",
  "width": 103,
  "height": 83
 },
 {
  "key": "catalog-28",
  "name": "Namiot",
  "group": "Budowle",
  "art": "assets/world/frontier/tent.png",
  "width": 84,
  "height": 65
 },
 {
  "key": "palac-krolewski",
  "name": "Pałac królewski",
  "group": "Budowle",
  "art": "assets/ui/map-editor/palac-krolewski.png",
  "width": 480,
  "height": 320
 },
 {
  "key": "catalog-29",
  "name": "Posiadłość",
  "group": "Miasto",
  "art": "assets/world/metropolia/posiadlosc.png",
  "width": 147,
  "height": 140
 },
 {
  "key": "catalog-30",
  "name": "Arena",
  "group": "Turniej",
  "art": "assets/world/stadion-2/arena.png",
  "width": 159,
  "height": 110
 },
 {
  "key": "catalog-31",
  "name": "Hala eliminacji",
  "group": "Turniej",
  "art": "assets/world/stadion-2/eliminacje.png",
  "width": 170,
  "height": 105
 }
];
 const realmObjects=[
 {
  "name": "Sanktuarium Zefiru",
  "key": "realm-sanktuarium-zefiru",
  "group": "Pałac w chmurach",
  "art": "assets/ui/map-editor/realm/sanktuarium-zefiru.png",
  "width": 224,
  "height": 264
 },
 {
  "name": "Pawilon boczny",
  "key": "realm-pawilon-boczny",
  "group": "Pałac w chmurach",
  "art": "assets/ui/map-editor/realm/pawilon-boczny.png",
  "width": 112,
  "height": 121
 },
 {
  "name": "Kolumna z nefrytu",
  "key": "realm-kolumna-z-nefrytu",
  "group": "Pałac w chmurach",
  "art": "assets/ui/map-editor/realm/kolumna-z-nefrytu.png",
  "width": 50,
  "height": 123
 },
 {
  "name": "Brama Słońca",
  "key": "realm-brama-slonca",
  "group": "Pałac w chmurach",
  "art": "assets/ui/map-editor/realm/brama-slonca.png",
  "width": 112,
  "height": 108
 },
 {
  "name": "Balustrada tarasu",
  "key": "realm-balustrada-tarasu",
  "group": "Pałac w chmurach",
  "art": "assets/ui/map-editor/realm/balustrada-tarasu.png",
  "width": 96,
  "height": 41
 },
 {
  "name": "Słupek balustrady",
  "key": "realm-slupek-balustrady",
  "group": "Pałac w chmurach",
  "art": "assets/ui/map-editor/realm/slupek-balustrady.png",
  "width": 26,
  "height": 60
 },
 {
  "name": "Schody z marmuru",
  "key": "realm-schody-z-marmuru",
  "group": "Pałac w chmurach",
  "art": "assets/ui/map-editor/realm/schody-z-marmuru.png",
  "width": 76,
  "height": 42
 },
 {
  "name": "Przęsło mostu",
  "key": "realm-przeslo-mostu",
  "group": "Pałac w chmurach",
  "art": "assets/ui/map-editor/realm/przeslo-mostu.png",
  "width": 62,
  "height": 123
 },
 {
  "name": "Krąg treningowy",
  "key": "realm-krag-treningowy",
  "group": "Pałac w chmurach",
  "art": "assets/ui/map-editor/realm/krag-treningowy.png",
  "width": 100,
  "height": 47
 },
 {
  "name": "Obserwatorium",
  "key": "realm-obserwatorium",
  "group": "Pałac w chmurach",
  "art": "assets/ui/map-editor/realm/obserwatorium.png",
  "width": 124,
  "height": 156
 },
 {
  "name": "Dzwon wiatru",
  "key": "realm-dzwon-wiatru",
  "group": "Pałac w chmurach",
  "art": "assets/ui/map-editor/realm/dzwon-wiatru.png",
  "width": 56,
  "height": 54
 },
 {
  "name": "Sosna tarasowa",
  "key": "realm-sosna-tarasowa",
  "group": "Pałac w chmurach",
  "art": "assets/ui/map-editor/realm/sosna-tarasowa.png",
  "width": 60,
  "height": 56
 },
 {
  "name": "Fontanna mozaikowa",
  "key": "realm-fontanna-mozaikowa",
  "group": "Pałac w chmurach",
  "art": "assets/ui/map-editor/realm/fontanna-mozaikowa.png",
  "width": 74,
  "height": 68
 },
 {
  "name": "Sfera niebieska",
  "key": "realm-sfera-niebieska",
  "group": "Pałac w chmurach",
  "art": "assets/ui/map-editor/realm/sfera-niebieska.png",
  "width": 60,
  "height": 88
 },
 {
  "name": "Spód latającej wyspy",
  "key": "realm-spod-latajacej-wyspy",
  "group": "Pałac w chmurach",
  "art": "assets/ui/map-editor/realm/spod-latajacej-wyspy.png",
  "width": 140,
  "height": 126
 },
 {
  "name": "Obłok",
  "key": "realm-oblok",
  "group": "Pałac w chmurach",
  "art": "assets/ui/map-editor/realm/oblok.png",
  "width": 105,
  "height": 67
 },
 {
  "name": "Dom muszlowy",
  "key": "realm-dom-muszlowy",
  "group": "Obca osada",
  "art": "assets/ui/map-editor/realm/dom-muszlowy.png",
  "width": 104,
  "height": 95
 },
 {
  "name": "Drzewo świetlne",
  "key": "realm-drzewo-swietlne",
  "group": "Obca osada",
  "art": "assets/ui/map-editor/realm/drzewo-swietlne.png",
  "width": 76,
  "height": 81
 },
 {
  "name": "Cysterna osady",
  "key": "realm-cysterna-osady",
  "group": "Obca osada",
  "art": "assets/ui/map-editor/realm/cysterna-osady.png",
  "width": 70,
  "height": 58
 },
 {
  "name": "Kryształ spiralny",
  "key": "realm-krysztal-spiralny",
  "group": "Obca osada",
  "art": "assets/ui/map-editor/realm/krysztal-spiralny.png",
  "width": 44,
  "height": 50
 },
 {
  "name": "Lądowisko",
  "key": "realm-ladowisko",
  "group": "Port orbitalny",
  "art": "assets/ui/map-editor/realm/ladowisko.png",
  "width": 124,
  "height": 116
 },
 {
  "name": "Kamienica orbitalna",
  "key": "realm-kamienica-orbitalna",
  "group": "Port orbitalny",
  "art": "assets/ui/map-editor/realm/kamienica-orbitalna.png",
  "width": 92,
  "height": 110
 },
 {
  "name": "Kopuła grawitacyjna",
  "key": "realm-kopula-grawitacyjna",
  "group": "Port orbitalny",
  "art": "assets/ui/map-editor/realm/kopula-grawitacyjna.png",
  "width": 120,
  "height": 108
 },
 {
  "name": "Maszt sygnałowy",
  "key": "realm-maszt-sygnalowy",
  "group": "Port orbitalny",
  "art": "assets/ui/map-editor/realm/maszt-sygnalowy.png",
  "width": 56,
  "height": 69
 },
 {
  "name": "Pawilon zawodników",
  "key": "realm-pawilon-zawodnikow",
  "group": "Turniej i miasto",
  "art": "assets/ui/map-editor/realm/pawilon-zawodnikow.png",
  "width": 115,
  "height": 103
 },
 {
  "name": "Ring z płyt",
  "key": "realm-ring-z-plyt",
  "group": "Turniej i miasto",
  "art": "assets/ui/map-editor/realm/ring-z-plyt.png",
  "width": 148,
  "height": 135
 },
 {
  "name": "Brama osady",
  "key": "realm-brama-osady",
  "group": "Turniej i miasto",
  "art": "assets/ui/map-editor/realm/brama-osady.png",
  "width": 104,
  "height": 93
 },
 {
  "name": "Trybuny",
  "key": "realm-trybuny",
  "group": "Turniej i miasto",
  "art": "assets/ui/map-editor/realm/trybuny.png",
  "width": 144,
  "height": 120
 },
 {
  "name": "Tron z bazaltu",
  "key": "realm-tron-z-bazaltu",
  "group": "Zaświaty i kosmos",
  "art": "assets/ui/map-editor/realm/tron-z-bazaltu.png",
  "width": 82,
  "height": 78
 },
 {
  "name": "Brama zaświatów",
  "key": "realm-brama-zaswiatow",
  "group": "Zaświaty i kosmos",
  "art": "assets/ui/map-editor/realm/brama-zaswiatow.png",
  "width": 135,
  "height": 135
 },
 {
  "name": "Komora odnowy",
  "key": "realm-komora-odnowy",
  "group": "Zaświaty i kosmos",
  "art": "assets/ui/map-editor/realm/komora-odnowy.png",
  "width": 58,
  "height": 51
 },
 {
  "name": "Antena orbitalna",
  "key": "realm-antena-orbitalna",
  "group": "Zaświaty i kosmos",
  "art": "assets/ui/map-editor/realm/antena-orbitalna.png",
  "width": 77,
  "height": 81
 },
 {
  "key": "realm-dom-morskiej-bryzy",
  "name": "Dom Morskiej Bryzy",
  "group": "Wyspa mistrza",
  "art": "assets/ui/map-editor/realm/dom-morskiej-bryzy.png",
  "width": 142,
  "height": 133
 },
 {
  "key": "realm-kame-house",
  "name": "Kame House",
  "group": "Wyspa mistrza",
  "art": "assets/ui/map-editor/realm/kame-house.png",
  "width": 152,
  "height": 95
 },
 {
  "key": "realm-palma-z-hamakiem",
  "name": "Palma z hamakiem",
  "group": "Wyspa mistrza",
  "art": "assets/ui/map-editor/realm/palma-z-hamakiem.png",
  "width": 86,
  "height": 85
 },
 {
  "key": "realm-pomost-rybacki",
  "name": "Pomost rybacki",
  "group": "Wyspa mistrza",
  "art": "assets/ui/map-editor/realm/pomost-rybacki.png",
  "width": 80,
  "height": 55
 },
 {
  "key": "realm-lodz-przybrzezna",
  "name": "Łódź przybrzeżna",
  "group": "Wyspa mistrza",
  "art": "assets/ui/map-editor/realm/lodz-przybrzezna.png",
  "width": 54,
  "height": 42
 },
 {
  "key": "realm-wieza-pielgrzymow",
  "name": "Wieża Pielgrzymów",
  "group": "Wieża i komnata czasu",
  "art": "assets/ui/map-editor/realm/wieza-pielgrzymow.png",
  "width": 94,
  "height": 110
 },
 {
  "key": "realm-taras-obserwatora",
  "name": "Taras obserwatora",
  "group": "Wieża i komnata czasu",
  "art": "assets/ui/map-editor/realm/taras-obserwatora.png",
  "width": 83,
  "height": 100
 },
 {
  "key": "realm-wrota-wahadel",
  "name": "Wrota wahadeł",
  "group": "Wieża i komnata czasu",
  "art": "assets/ui/map-editor/realm/wrota-wahadel.png",
  "width": 104,
  "height": 104
 },
 {
  "key": "realm-klepsydra-ciszy",
  "name": "Klepsydra ciszy",
  "group": "Wieża i komnata czasu",
  "art": "assets/ui/map-editor/realm/klepsydra-ciszy.png",
  "width": 57,
  "height": 60
 },
 {
  "key": "realm-bunkier-radarowy",
  "name": "Bunkier radarowy",
  "group": "Baza i kopalnia",
  "art": "assets/ui/map-editor/realm/bunkier-radarowy.png",
  "width": 125,
  "height": 110
 },
 {
  "key": "realm-stacja-lacznosci",
  "name": "Stacja łączności",
  "group": "Baza i kopalnia",
  "art": "assets/ui/map-editor/realm/stacja-lacznosci.png",
  "width": 94,
  "height": 86
 },
 {
  "key": "realm-wejscie-do-kopalni",
  "name": "Wejście do kopalni",
  "group": "Baza i kopalnia",
  "art": "assets/ui/map-editor/realm/wejscie-do-kopalni.png",
  "width": 100,
  "height": 83
 },
 {
  "key": "realm-wagonik-rudy",
  "name": "Wagonik rudy",
  "group": "Baza i kopalnia",
  "art": "assets/ui/map-editor/realm/wagonik-rudy.png",
  "width": 54,
  "height": 43
 },
 {
  "key": "realm-iglica-lodowa",
  "name": "Iglica lodowa",
  "group": "Góry i dojo",
  "art": "assets/ui/map-editor/realm/iglica-lodowa.png",
  "width": 95,
  "height": 103
 },
 {
  "key": "realm-gorace-zrodlo",
  "name": "Gorące źródło",
  "group": "Góry i dojo",
  "art": "assets/ui/map-editor/realm/gorace-zrodlo.png",
  "width": 88,
  "height": 78
 },
 {
  "key": "realm-dojo-granatowego-liscia",
  "name": "Dojo Granatowego Liścia",
  "group": "Góry i dojo",
  "art": "assets/ui/map-editor/realm/dojo-granatowego-liscia.png",
  "width": 142,
  "height": 129
 },
 {
  "key": "realm-gong-mistrzow",
  "name": "Gong mistrzów",
  "group": "Góry i dojo",
  "art": "assets/ui/map-editor/realm/gong-mistrzow.png",
  "width": 68,
  "height": 63
 }
];
 const palaceObjects=[
 {
  "key": "palace49-palac-jutrzenki",
  "name": "Pałac Jutrzenki",
  "width": 256,
  "height": 225,
  "art": "assets/ui/map-editor/palace49/palac-jutrzenki.png",
  "group": "Pałac w chmurach"
 },
 {
  "key": "palace49-cyprysy",
  "name": "Cyprysy w marmurze",
  "width": 86,
  "height": 88,
  "art": "assets/ui/map-editor/palace49/cyprysy.png",
  "group": "Pałac w chmurach"
 },
 {
  "key": "palace49-lampa",
  "name": "Lampa podniebna",
  "width": 36,
  "height": 135,
  "art": "assets/ui/map-editor/palace49/lampa.png",
  "group": "Pałac w chmurach"
 },
 {
  "key": "palace49-palma",
  "name": "Palma dziedzińcowa",
  "width": 48,
  "height": 60,
  "art": "assets/ui/map-editor/palace49/palma.png",
  "group": "Pałac w chmurach"
 }
];
 const spaceProps=[
 {
  "key": "space410-okret-flagowy-freezera",
  "art": "assets/ui/map-editor/space410/okret-flagowy-freezera.png",
  "name": "Okręt flagowy Freezera",
  "group": "Statki i komora grawitacyjna",
  "width": 256,
  "height": 187
 },
 {
  "key": "space410-kapsula-saiyan",
  "art": "assets/ui/map-editor/space410/kapsula-saiyan.png",
  "name": "Kapsuła Saiyan",
  "group": "Statki i komora grawitacyjna",
  "width": 78,
  "height": 82
 },
 {
  "key": "space410-otwarta-kapsula-saiyan",
  "art": "assets/ui/map-editor/space410/otwarta-kapsula-saiyan.png",
  "name": "Otwarta kapsuła Saiyan",
  "group": "Statki i komora grawitacyjna",
  "width": 84,
  "height": 74
 },
 {
  "key": "space410-statek-grawitacyjny",
  "art": "assets/ui/map-editor/space410/statek-grawitacyjny.png",
  "name": "Statek grawitacyjny",
  "group": "Statki i komora grawitacyjna",
  "width": 150,
  "height": 185
 },
 {
  "key": "space410-sterownik-grawitacji",
  "art": "assets/ui/map-editor/space410/sterownik-grawitacji.png",
  "name": "Sterownik grawitacji",
  "group": "Statki i komora grawitacyjna",
  "width": 52,
  "height": 67
 },
 {
  "key": "space410-rdzen-reaktora",
  "art": "assets/ui/map-editor/space410/rdzen-reaktora.png",
  "name": "Rdzeń reaktora",
  "group": "Statki i komora grawitacyjna",
  "width": 55,
  "height": 54
 },
 {
  "key": "space410-sluza-otwarta",
  "art": "assets/ui/map-editor/space410/sluza-otwarta.png",
  "name": "Śluza otwarta",
  "group": "Statki i komora grawitacyjna",
  "width": 85,
  "height": 61
 },
 {
  "key": "space410-sluza-zamknieta",
  "art": "assets/ui/map-editor/space410/sluza-zamknieta.png",
  "name": "Śluza zamknięta",
  "group": "Statki i komora grawitacyjna",
  "width": 85,
  "height": 63
 },
 {
  "key": "space410-iluminator",
  "art": "assets/ui/map-editor/space410/iluminator.png",
  "name": "Iluminator",
  "group": "Statki i komora grawitacyjna",
  "width": 91,
  "height": 60
 },
 {
  "key": "space410-dron-treningowy",
  "art": "assets/ui/map-editor/space410/dron-treningowy.png",
  "name": "Dron treningowy",
  "group": "Statki i komora grawitacyjna",
  "width": 36,
  "height": 32
 },
 {
  "key": "space410-pulpit-nawigacyjny",
  "art": "assets/ui/map-editor/space410/pulpit-nawigacyjny.png",
  "name": "Pulpit nawigacyjny",
  "group": "Statki i komora grawitacyjna",
  "width": 82,
  "height": 48
 },
 {
  "key": "space410-lampy-alarmowe",
  "art": "assets/ui/map-editor/space410/lampy-alarmowe.png",
  "name": "Lampy alarmowe",
  "group": "Statki i komora grawitacyjna",
  "width": 42,
  "height": 34
 },
 {
  "key": "space410-koja-pokladowa",
  "art": "assets/ui/map-editor/space410/koja-pokladowa.png",
  "name": "Koja pokładowa",
  "group": "Statki i komora grawitacyjna",
  "width": 72,
  "height": 42
 },
 {
  "key": "space410-kontener-zapasow",
  "art": "assets/ui/map-editor/space410/kontener-zapasow.png",
  "name": "Kontener zapasów",
  "group": "Statki i komora grawitacyjna",
  "width": 48,
  "height": 33
 },
 {
  "key": "space410-platforma-grawitacyjna",
  "art": "assets/ui/map-editor/space410/platforma-grawitacyjna.png",
  "name": "Platforma grawitacyjna",
  "group": "Statki i komora grawitacyjna",
  "width": 180,
  "height": 97
 },
 {
  "key": "space410-panel-scienny",
  "art": "assets/ui/map-editor/space410/panel-scienny.png",
  "name": "Panel ścienny",
  "group": "Statki i komora grawitacyjna",
  "width": 112,
  "height": 85
 }
];
 const sagaProps=[
 {
  "key": "saga411-dom-nameczanina",
  "art": "assets/ui/map-editor/sagi/dom-nameczanina.png",
  "name": "Dom Nameczanina",
  "group": "Namek · wioska i przyroda",
  "width": 100,
  "height": 73
 },
 {
  "key": "saga411-dom-rady-wioski",
  "art": "assets/ui/map-editor/sagi/dom-rady-wioski.png",
  "name": "Dom rady wioski",
  "group": "Namek · wioska i przyroda",
  "width": 140,
  "height": 116
 },
 {
  "key": "saga411-chata-na-skalnej-nodze",
  "art": "assets/ui/map-editor/sagi/chata-na-skalnej-nodze.png",
  "name": "Chata na skalnej nodze",
  "group": "Namek · wioska i przyroda",
  "width": 96,
  "height": 130
 },
 {
  "key": "saga411-siedziba-wielkiego-starszego",
  "art": "assets/ui/map-editor/sagi/siedziba-wielkiego-starszego.png",
  "name": "Siedziba Wielkiego Starszego",
  "group": "Namek · wioska i przyroda",
  "width": 173,
  "height": 169
 },
 {
  "key": "saga411-magazyn-osady",
  "art": "assets/ui/map-editor/sagi/magazyn-osady.png",
  "name": "Magazyn osady",
  "group": "Namek · wioska i przyroda",
  "width": 68,
  "height": 50
 },
 {
  "key": "saga411-brama-nameczan",
  "art": "assets/ui/map-editor/sagi/brama-nameczan.png",
  "name": "Brama Nameczan",
  "group": "Namek · wioska i przyroda",
  "width": 72,
  "height": 52
 },
 {
  "key": "saga411-zbiornik-ze-zrodlana-woda",
  "art": "assets/ui/map-editor/sagi/zbiornik-ze-zrodlana-woda.png",
  "name": "Zbiornik ze źródlaną wodą",
  "group": "Namek · wioska i przyroda",
  "width": 70,
  "height": 43
 },
 {
  "key": "saga411-sadzonki-ajisy",
  "art": "assets/ui/map-editor/sagi/sadzonki-ajisy.png",
  "name": "Sadzonki ajisy",
  "group": "Namek · wioska i przyroda",
  "width": 62,
  "height": 40
 },
 {
  "key": "saga411-drzewo-ajisa",
  "art": "assets/ui/map-editor/sagi/drzewo-ajisa.png",
  "name": "Drzewo ajisa",
  "group": "Namek · wioska i przyroda",
  "width": 54,
  "height": 125
 },
 {
  "key": "saga411-ajisa-trojkoronna",
  "art": "assets/ui/map-editor/sagi/ajisa-trojkoronna.png",
  "name": "Ajisa trójkoronna",
  "group": "Namek · wioska i przyroda",
  "width": 76,
  "height": 99
 },
 {
  "key": "saga411-zagajnik-ajisy",
  "art": "assets/ui/map-editor/sagi/zagajnik-ajisy.png",
  "name": "Zagajnik ajisy",
  "group": "Namek · wioska i przyroda",
  "width": 108,
  "height": 126
 },
 {
  "key": "saga411-liliowy-krzew",
  "art": "assets/ui/map-editor/sagi/liliowy-krzew.png",
  "name": "Liliowy krzew",
  "group": "Namek · wioska i przyroda",
  "width": 38,
  "height": 24
 },
 {
  "key": "saga411-jasny-koral-ladowy",
  "art": "assets/ui/map-editor/sagi/jasny-koral-ladowy.png",
  "name": "Jasny koral lądowy",
  "group": "Namek · wioska i przyroda",
  "width": 48,
  "height": 53
 },
 {
  "key": "saga411-mostek-wyspiarzy",
  "art": "assets/ui/map-editor/sagi/mostek-wyspiarzy.png",
  "name": "Mostek wyspiarzy",
  "group": "Namek · wioska i przyroda",
  "width": 90,
  "height": 59
 },
 {
  "key": "saga411-lodz-muszlowa",
  "art": "assets/ui/map-editor/sagi/lodz-muszlowa.png",
  "name": "Łódź muszlowa",
  "group": "Namek · wioska i przyroda",
  "width": 54,
  "height": 36
 },
 {
  "key": "saga411-nameczanskie-smocze-kule",
  "art": "assets/ui/map-editor/sagi/nameczanskie-smocze-kule.png",
  "name": "Nameczańskie smocze kule",
  "group": "Namek · wioska i przyroda",
  "width": 56,
  "height": 61
 },
 {
  "key": "saga411-wehikul-czasu-trunksa",
  "art": "assets/ui/map-editor/sagi/wehikul-czasu-trunksa.png",
  "name": "Wehikuł czasu Trunksa",
  "group": "Podróże w czasie i technika",
  "width": 125,
  "height": 134
 },
 {
  "key": "saga411-porzucony-wehikul-czasu",
  "art": "assets/ui/map-editor/sagi/porzucony-wehikul-czasu.png",
  "name": "Porzucony wehikuł czasu",
  "group": "Podróże w czasie i technika",
  "width": 130,
  "height": 137
 },
 {
  "key": "saga411-wehikul-czasu-z-otwarta-kabina",
  "art": "assets/ui/map-editor/sagi/wehikul-czasu-z-otwarta-kabina.png",
  "name": "Wehikuł czasu z otwartą kabiną",
  "group": "Podróże w czasie i technika",
  "width": 118,
  "height": 136
 },
 {
  "key": "saga411-brama-chronolaboratorium",
  "art": "assets/ui/map-editor/sagi/brama-chronolaboratorium.png",
  "name": "Brama chronolaboratorium",
  "group": "Podróże w czasie i technika",
  "width": 92,
  "height": 94
 },
 {
  "key": "saga411-fotel-pilota-czasu",
  "art": "assets/ui/map-editor/sagi/fotel-pilota-czasu.png",
  "name": "Fotel pilota czasu",
  "group": "Podróże w czasie i technika",
  "width": 42,
  "height": 39
 },
 {
  "key": "saga411-konsola-daty-i-celu",
  "art": "assets/ui/map-editor/sagi/konsola-daty-i-celu.png",
  "name": "Konsola daty i celu",
  "group": "Podróże w czasie i technika",
  "width": 66,
  "height": 59
 },
 {
  "key": "saga411-rdzen-chrononowy",
  "art": "assets/ui/map-editor/sagi/rdzen-chrononowy.png",
  "name": "Rdzeń chrononowy",
  "group": "Podróże w czasie i technika",
  "width": 50,
  "height": 49
 },
 {
  "key": "saga411-zasobnik-paliwa-wehikulu",
  "art": "assets/ui/map-editor/sagi/zasobnik-paliwa-wehikulu.png",
  "name": "Zasobnik paliwa wehikułu",
  "group": "Podróże w czasie i technika",
  "width": 32,
  "height": 44
 },
 {
  "key": "saga411-statek-nameczan",
  "art": "assets/ui/map-editor/sagi/statek-nameczan.png",
  "name": "Statek Nameczan",
  "group": "Podróże w czasie i technika",
  "width": 158,
  "height": 148
 },
 {
  "key": "saga411-fotel-lewitacyjny-imperatora",
  "art": "assets/ui/map-editor/sagi/fotel-lewitacyjny-imperatora.png",
  "name": "Fotel lewitacyjny imperatora",
  "group": "Podróże w czasie i technika",
  "width": 56,
  "height": 49
 },
 {
  "key": "saga411-generator-pola",
  "art": "assets/ui/map-editor/sagi/generator-pola.png",
  "name": "Generator pola",
  "group": "Podróże w czasie i technika",
  "width": 52,
  "height": 50
 },
 {
  "key": "saga411-modul-odwiertu",
  "art": "assets/ui/map-editor/sagi/modul-odwiertu.png",
  "name": "Moduł odwiertu",
  "group": "Podróże w czasie i technika",
  "width": 84,
  "height": 71
 },
 {
  "key": "saga411-taras-ladowania",
  "art": "assets/ui/map-editor/sagi/taras-ladowania.png",
  "name": "Taras lądowania",
  "group": "Podróże w czasie i technika",
  "width": 108,
  "height": 103
 },
 {
  "key": "saga411-kapsula-medyczna",
  "art": "assets/ui/map-editor/sagi/kapsula-medyczna.png",
  "name": "Kapsuła medyczna",
  "group": "Podróże w czasie i technika",
  "width": 53,
  "height": 55
 },
 {
  "key": "saga411-warsztat-wehikulow",
  "art": "assets/ui/map-editor/sagi/warsztat-wehikulow.png",
  "name": "Warsztat wehikułów",
  "group": "Podróże w czasie i technika",
  "width": 142,
  "height": 138
 },
 {
  "key": "saga411-wrak-silnika",
  "art": "assets/ui/map-editor/sagi/wrak-silnika.png",
  "name": "Wrak silnika",
  "group": "Podróże w czasie i technika",
  "width": 58,
  "height": 53
 },
 {
  "key": "saga411-dom-wyspiarskiego-mistrza",
  "art": "assets/ui/map-editor/sagi/dom-wyspiarskiego-mistrza.png",
  "name": "Dom wyspiarskiego mistrza",
  "group": "Budowle sag",
  "width": 112,
  "height": 125
 },
 {
  "key": "saga411-hala-mistrzostw",
  "art": "assets/ui/map-editor/sagi/hala-mistrzostw.png",
  "name": "Hala mistrzostw",
  "group": "Budowle sag",
  "width": 176,
  "height": 201
 },
 {
  "key": "saga411-plansza-turniejowa",
  "art": "assets/ui/map-editor/sagi/plansza-turniejowa.png",
  "name": "Plansza turniejowa",
  "group": "Budowle sag",
  "width": 160,
  "height": 164
 },
 {
  "key": "saga411-zniszczona-plansza",
  "art": "assets/ui/map-editor/sagi/zniszczona-plansza.png",
  "name": "Zniszczona plansza",
  "group": "Budowle sag",
  "width": 152,
  "height": 137
 },
 {
  "key": "saga411-wiezowiec-naukowcow",
  "art": "assets/ui/map-editor/sagi/wiezowiec-naukowcow.png",
  "name": "Wieżowiec naukowców",
  "group": "Budowle sag",
  "width": 100,
  "height": 126
 },
 {
  "key": "saga411-wieza-straznicza-armii",
  "art": "assets/ui/map-editor/sagi/wieza-straznicza-armii.png",
  "name": "Wieża strażnicza armii",
  "group": "Budowle sag",
  "width": 86,
  "height": 117
 },
 {
  "key": "saga411-twierdza-na-gorze-ognia",
  "art": "assets/ui/map-editor/sagi/twierdza-na-gorze-ognia.png",
  "name": "Twierdza na Górze Ognia",
  "group": "Budowle sag",
  "width": 190,
  "height": 200
 },
 {
  "key": "saga411-pustynny-dom-kapsulowy",
  "art": "assets/ui/map-editor/sagi/pustynny-dom-kapsulowy.png",
  "name": "Pustynny dom kapsułowy",
  "group": "Budowle sag",
  "width": 84,
  "height": 92
 },
 {
  "key": "saga411-gorska-pustelnia",
  "art": "assets/ui/map-editor/sagi/gorska-pustelnia.png",
  "name": "Górska pustelnia",
  "group": "Budowle sag",
  "width": 112,
  "height": 133
 },
 {
  "key": "saga411-taras-na-wiezy",
  "art": "assets/ui/map-editor/sagi/taras-na-wiezy.png",
  "name": "Taras na wieży",
  "group": "Budowle sag",
  "width": 76,
  "height": 128
 },
 {
  "key": "saga411-wielkie-drzewo-rytualne",
  "art": "assets/ui/map-editor/sagi/wielkie-drzewo-rytualne.png",
  "name": "Wielkie drzewo rytualne",
  "group": "Budowle sag",
  "width": 128,
  "height": 129
 },
 {
  "key": "saga411-iglica-krateru",
  "art": "assets/ui/map-editor/sagi/iglica-krateru.png",
  "name": "Iglica krateru",
  "group": "Budowle sag",
  "width": 78,
  "height": 90
 },
 {
  "key": "saga411-brama-astralnego-palacu",
  "art": "assets/ui/map-editor/sagi/brama-astralnego-palacu.png",
  "name": "Brama astralnego pałacu",
  "group": "Budowle sag",
  "width": 100,
  "height": 117
 },
 {
  "key": "saga411-stacja-sadu-dusz",
  "art": "assets/ui/map-editor/sagi/stacja-sadu-dusz.png",
  "name": "Stacja sądu dusz",
  "group": "Budowle sag",
  "width": 118,
  "height": 135
 },
 {
  "key": "saga411-obserwatorium-na-asteroidzie",
  "art": "assets/ui/map-editor/sagi/obserwatorium-na-asteroidzie.png",
  "name": "Obserwatorium na asteroidzie",
  "group": "Budowle sag",
  "width": 90,
  "height": 94
 },
 {
  "key": "saga411-ruina-metropolii",
  "art": "assets/ui/map-editor/sagi/ruina-metropolii.png",
  "name": "Ruina metropolii",
  "group": "Budowle sag",
  "width": 116,
  "height": 134
 }
];
 const atlas=new Image();let ready=false;const listeners=new Set(),cache=new Map();
 atlas.addEventListener('load',()=>{ready=atlas.naturalWidth===COLS*ATLAS_TILE&&atlas.naturalHeight===3328;cache.clear();for(const fn of listeners)try{fn()}catch(e){console.warn(e)}});
 atlas.src='assets/ui/map-editor/terrain-v411.png';
 const hdAtlas=new Image(),detailAtlas=new Image();let hdReady=false,detailReady=false;
 const hdMaterials=new Set([0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 25, 26, 27, 29, 30, 31, 37, 40, 41, 42, 43, 44, 45, 46, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 70, 71, 72, 73, 74, 76, 77, 78, 79]);
 const naturalGroups=new Set(['grass','ground','path','sand','forest','rock','planet','namekGrass','namekGround','namekRock']);
 const limit=(n,a,b,d)=>Number.isFinite(Number(n))?Math.max(a,Math.min(b,Math.round(Number(n)))):d;
 function settings(map){const s=map?.terrain?.visual||{};return {enabled:s.enabled!==false,transitions:s.transitions!==false,hardness:limit(s.hardness,0,3,1),variation:limit(s.variation,0,3,2),details:limit(s.details,0,3,1),organic:limit(s.organic,0,3,2)}}
 const readiness=()=>[ready,hdReady,detailReady,!!marble?.naturalWidth].join(':');
 function signal(){for(const fn of listeners)try{fn()}catch(e){console.warn(e)}}
 hdAtlas.addEventListener('load',()=>{hdReady=hdAtlas.naturalWidth===2048&&hdAtlas.naturalHeight===2560;hdCache.clear();signal()});
 detailAtlas.addEventListener('load',()=>{detailReady=detailAtlas.naturalWidth===256&&detailAtlas.naturalHeight===32;signal()});
 hdAtlas.src='assets/ui/map-editor/terrain-v452.webp';detailAtlas.src='assets/ui/map-editor/terrain-details-v452.png';
 const mod=(n,m)=>((n%m)+m)%m;
 function hdSwatch(id){return hdMaterials.has(id)?{x:((id%8)*256+96)/(2048-32)*100,y:(Math.floor(id/8)*256+96)/(2560-32)*100}:null}
 function texture(ctx,id,x,y,px=x*TILE,py=y*TILE){
  if(!hdReady||!hdMaterials.has(id)){base(ctx,id,variant(x,y,id),px,py);return;}
  ctx.drawImage(hdAtlas,(id%8)*256+mod(x,8)*TILE,Math.floor(id/8)*256+mod(y,8)*TILE,TILE,TILE,px,py,TILE,TILE);
 }
 const hash=(x,y,s=0)=>{let v=(Math.imul(x+831,0x45d9f3b)^Math.imul(y+1777,0x27d4eb2d)^Math.imul(s+41,0x165667b1))>>>0;v=Math.imul(v^(v>>>16),0x45d9f3b)>>>0;return ((v^(v>>>16))>>>0)/4294967296};
 const smooth=t=>t*t*(3-2*t);
 function noise(x,y,s=0){const a=Math.floor(x),b=Math.floor(y),u=smooth(x-a),v=smooth(y-b),p=hash(a,b,s)*(1-u)+hash(a+1,b,s)*u,q=hash(a,b+1,s)*(1-u)+hash(a+1,b+1,s)*u;return p*(1-v)+q*v}
 const hdCache=new Map();
 function natural(id){return hdMaterials.has(id)&&naturalGroups.has(palette[id]?.group)}
 // Bilinear blending on the material field at cell centers: the same field is sampled
 // on both sides of a grid edge, including diagonals, so corners are rounded rather than stepped.
 const isWater=id=>['water','namekWater'].includes(palette[id]?.group);
 const mixable=id=>natural(id)||isWater(id)&&hdMaterials.has(id);
 function mixTerrain(ctx,map,x,y,id,s){
  const cells=[];let mixed=false;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const n=getTile(map,x+dx,y+dy);cells.push(mixable(n)?n:id);if(mixable(n)&&n!==id)mixed=true}if(!mixed)return;
  const coast=cells.some(isWater)&&cells.some(n=>!isWater(n));
  const namek=cells.some(n=>palette[n]?.group.startsWith('namek')),sand=namek?59:3;
  const k='mix:'+cells.join(',')+':'+mod(x,8)+':'+mod(y,8)+':'+mod(x,32)+':'+mod(y,32)+':'+s.hardness+':'+s.organic;let c=hdCache.get(k);
  if(!c){c=canvas();const g=c.getContext('2d'),ids=[...new Set(coast?[...cells,sand]:cells)],index=new Map(ids.map((v,i)=>[v,i])),cellIds=cells.map(n=>index.get(n)),water=ids.map(isWater),sandIndex=index.get(sand),weights=new Float32Array(ids.length);
   const st=canvas(),sg=st.getContext('2d'),images=ids.map(()=>sg.createImageData(TILE,TILE)),foam=coast?sg.createImageData(TILE,TILE):null;
   const w=coast?Math.min(.65,[.92,.62,.4,.21][s.hardness]):[.92,.62,.4,.21][s.hardness];const blend=f=>smooth(Math.max(0,Math.min(1,(f-.5)/w+.5)));
   for(let j=0;j<TILE;j++)for(let i=0;i<TILE;i++){
    const gx=mod(x,32)*TILE+i+.5,gy=mod(y,32)*TILE+j+.5;
    const jitterX=(noise(gx/18,gy/18,811)-.5)*s.organic*.15+(noise(gx/5,gy/5,812)-.5)*s.organic*.05;
    const jitterY=(noise(gx/18,gy/18,813)-.5)*s.organic*.15+(noise(gx/5,gy/5,814)-.5)*s.organic*.05;
    const px=(i+.5)/TILE-.5+jitterX,py=(j+.5)/TILE-.5+jitterY;
    const bx=Math.floor(px),by=Math.floor(py),u=blend(px-bx),v=blend(py-by),q=(j*TILE+i)*4;weights.fill(0);
    for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const n=cellIds[(by+1+dy)*3+bx+1+dx],f=(dx?u:1-u)*(dy?v:1-v);weights[n]+=f;}
    if(coast){let wet=0;for(let n=0;n<ids.length;n++)if(water[n])wet+=weights[n];const bank=smooth(Math.min(1,wet*5));let add=0;for(let n=0;n<ids.length;n++)if(!water[n]&&n!==sandIndex){add+=weights[n]*bank;weights[n]*=1-bank}weights[sandIndex]+=add;
     const f=foam.data;f[q]=190;f[q+1]=234;f[q+2]=225;f[q+3]=Math.round(165*Math.max(0,1-Math.abs(wet-.56)/.15));}
    let total=0,max=0;for(let n=0;n<ids.length;n++){const alpha=Math.round(weights[n]*255);images[n].data[q+3]=alpha;total+=alpha;if(weights[n]>weights[max])max=n}images[max].data[q+3]+=255-total;
   }
   // All alpha masks are generated locally. No reading pixels from loaded images,
   // so the renderer also works with file:// and cross-origin canvas tainting.
   const work=canvas(),wg=work.getContext('2d');g.globalCompositeOperation='lighter';
   ids.forEach((n,i)=>{wg.clearRect(0,0,TILE,TILE);wg.globalCompositeOperation='source-over';texture(wg,n,x,y,0,0);sg.putImageData(images[i],0,0);wg.globalCompositeOperation='destination-in';wg.drawImage(st,0,0);g.drawImage(work,0,0);});
   g.globalCompositeOperation='source-over';if(foam){sg.putImageData(foam,0,0);g.drawImage(st,0,0)}
   if(hdCache.size>=1024)hdCache.clear();hdCache.set(k,c);
  }ctx.drawImage(c,x*TILE,y*TILE);
 }
 function hdTransitions(ctx,map,x,y,id,s){if(mixable(id))mixTerrain(ctx,map,x,y,id,s);}
 // A low-frequency deterministic light/shade field, separate from geometry and collision.
 let toneSurface;
 function tone(ctx,x,y,s){if(!s.variation)return;if(!toneSurface){toneSurface=document.createElement('canvas');toneSurface.width=toneSurface.height=512;const g=toneSurface.getContext('2d'),im=g.createImageData(512,512),d=im.data;for(let j=0;j<512;j++)for(let i=0;i<512;i++){const v=(Math.sin(i*Math.PI*2/512+j*Math.PI*4/512)+Math.sin(i*Math.PI*6/512-j*Math.PI*2/512)+Math.cos(i*Math.PI*2/512-j*Math.PI*6/512))/3;const k=(j*512+i)*4;d[k]=d[k+1]=d[k+2]=v>0?255:0;d[k+3]=Math.round(Math.abs(v)*26)}g.putImageData(im,0,0)}
  ctx.save();ctx.globalAlpha=s.variation/3;ctx.drawImage(toneSurface,mod(x,16)*TILE,mod(y,16)*TILE,TILE,TILE,x*TILE,y*TILE,TILE,TILE);ctx.restore();
 }
 function detail(ctx,map,id,x,y,s){if(!s.details||!natural(id)||palette[id].blocked)return;const t=palette[id],r=hash(x,y,id+800);if(r>[0,.055,.115,.23][s.details])return;
  // Do not place extra ground decals over a transition, a spawn, or a constructed floor.
  if(mask(map,x,y,p=>p.id!==id))return;
  const gx=x*TILE,gy=y*TILE;if(map.spawn&&Math.hypot(map.spawn.x-gx-16,map.spawn.y-gy-16)<22)return;
  const grassy=['grass','namekGrass'].includes(t.group)||t.key==='alienMeadow';const rnd=hash(x,y,id+909),u=hash(x,y,id+915);let which=grassy?(rnd<.45?0:rnd<.60?1:rnd<.70?2:rnd<.84?3:4):3;
  if(t.group==='namekGrass'&&which===0)which=1;
  const size=grassy&&which===4?15:which===3?8+Math.floor(u*5):12+Math.floor(u*4);
  if(detailReady){ctx.drawImage(detailAtlas,which*32,0,32,32,gx+3+Math.floor(hash(x,y,19)*(TILE-size-6)),gy+3+Math.floor(hash(x,y,23)*(TILE-size-6)),size,size)}
 }

 const getTile=(map,x,y)=>!map?.terrain||x<0||y<0||x>=map.sizeX||y>=map.sizeY?-1:map.terrain.tiles[y*map.sizeX+x]??0;
 function valid(map){const t=map?.terrain;return !!t&&t.version===1&&Number.isInteger(map.sizeX)&&Number.isInteger(map.sizeY)&&map.sizeX>=10&&map.sizeY>=10&&map.sizeX<=MAX&&map.sizeY<=MAX&&(!t.terrace||([t.terrace.x,t.terrace.y,t.terrace.r].every(Number.isFinite)&&t.terrace.r>0&&t.terrace.r<=3200))&&Array.isArray(t.tiles)&&t.tiles.length===map.sizeX*map.sizeY&&(!t.heights||(Array.isArray(t.heights)&&t.heights.length===t.tiles.length&&t.heights.every(v=>Number.isInteger(v)&&v>=0&&v<=4)))&&t.tiles.every(v=>Number.isInteger(v)&&v>=0&&v<palette.length)}
 function create(width,height,base=0){return {version:1,tiles:Array(width*height).fill(base),visual:settings(null)}}
 function variant(x,y,id){return ((Math.imul(x+31,73856093)^Math.imul(y+73,19349663)^Math.imul(id+1,83492791))>>>0)%VARIANTS}
 // Rows 24–35 are panoramic skies used by existing maps.
 const atlasIndex=id=>id*VARIANTS+(id>=48?96:0);
 function swatch(id){const i=atlasIndex(id);return {x:(i%COLS)/(COLS-1)*100,y:Math.floor(i/COLS)/(52-1)*100}}
 function base(ctx,id,v,x,y){if(ready){const i=atlasIndex(id)+v;ctx.drawImage(atlas,(i%COLS)*ATLAS_TILE,Math.floor(i/COLS)*ATLAS_TILE,ATLAS_TILE,ATLAS_TILE,x,y,TILE,TILE)}else{ctx.fillStyle=palette[id].color;ctx.fillRect(x,y,TILE,TILE)}}
 const dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
 const mask=(map,x,y,test)=>dirs.reduce((bits,[dx,dy],i)=>{const t=getTile(map,x+dx,y+dy);return t>=0&&test(palette[t])?bits|(1<<i):bits},0);
 const canvas=()=>{const c=document.createElement('canvas');c.width=c.height=TILE;return c};
 // Distance to the union of neighboring cells. Diagonal neighbors give rounded corners.
 function dist(bits,x,y){let min=100;for(let i=0;i<8;i++){if(!(bits&(1<<i)))continue;const [dx,dy]=dirs[i];const a=dx<0?x+.5:dx>0?TILE-x-.5:0,b=dy<0?y+.5:dy>0?TILE-y-.5:0;min=Math.min(min,Math.hypot(a,b))}return min}
 function overlay(ctx,id,v,bits,kind,px,py){if(!bits)return;const key=[id,v,bits,kind].join(':');let c=cache.get(key);
  if(!c){c=canvas();const g=c.getContext('2d');g.imageSmoothingEnabled=false;base(g,id,v,0,0);
   const stencil=canvas(),sg=stencil.getContext('2d');
   const img=sg.createImageData(TILE,TILE),d=img.data;
   for(let y=0;y<TILE;y++)for(let x=0;x<TILE;x++){const i=(y*TILE+x)*4;const grain=Math.sin(x*1.72+y*2.13+v)*.7+Math.sin(x*.45-y*.52+v)*1.4;const distance=dist(bits,x,y)+grain;
    let a=0;
    if(kind==='sand')a=distance<7?255:distance<10?Math.round(255*(10-distance)/3):0;
    else if(kind==='foam'){a=distance<1.4?230:distance<3.5?Math.round(170*(3.5-distance)/2.1):0;d[i]=181;d[i+1]=226;d[i+2]=220}
    else if(kind==='forest')a=distance<2.7?255:distance<5?Math.round(220*(5-distance)/2.3):0;
    else a=distance<1.5?220:distance<4.8?Math.round(200*(4.8-distance)/3.3):0;
    d[i+3]=Math.max(0,Math.min(255,a));
   }sg.putImageData(img,0,0);
   if(kind==='foam'){c=stencil}
   else{g.globalCompositeOperation='destination-in';g.drawImage(stencil,0,0);g.globalCompositeOperation='source-over'}
   if(cache.size>=768)cache.clear();cache.set(key,c);
  }ctx.drawImage(c,px,py);
 }
 const marble=new Image();marble.src='assets/ui/map-editor/palace49/marble.png';
 marble.addEventListener('load',()=>{for(const redraw of listeners)redraw()});
 function marbleRect(ctx,x,y,w,h){
  if(marble.complete&&marble.naturalWidth===128)ctx.drawImage(marble,x%128,y%128,w,h,x,y,w,h);
  else{ctx.fillStyle='#dae2e8';ctx.fillRect(x,y,w,h)}
 }
 function drawTerrace(ctx,map,t,px,py){
  const disk=map.terrain.terrace;
  if(!disk)return false;
  if(t.key==='ivory'){marbleRect(ctx,px,py,TILE,TILE);return true}
  if(t.key!=='gold'||Math.abs(Math.hypot(px+16-disk.x,py+16-disk.y)-disk.r)>48)return false;
  if(ready)ctx.drawImage(atlas,(px/2)%512,1536+(py/2)%256,16,16,px,py,32,32);
  else{ctx.fillStyle='#74b8e4';ctx.fillRect(px,py,TILE,TILE)}
  // Each scanline shares the same circle equation with movement at the edge.
  for(let y=py;y<py+TILE;y++){
   function span(radius,drop,color){
    const dy=y+.5-disk.y-drop;if(Math.abs(dy)>=radius)return;
    const dx=Math.sqrt(radius*radius-dy*dy);
    const left=Math.max(px,Math.ceil(disk.x-dx-.5)),right=Math.min(px+TILE,Math.ceil(disk.x+dx-.5));
    if(right<=left)return;
    if(color){ctx.fillStyle=color;ctx.fillRect(left,y,right-left,1)}
    else marbleRect(ctx,left,y,right-left,1);
   }
   span(disk.r,14,'#713c52');span(disk.r,10,'#b35956');span(disk.r,4,'#db9472');span(disk.r,0,'#cfa456');span(disk.r-3,0,null);
  }
  return true
 }
 function drawCell(ctx,map,x,y){const id=getTile(map,x,y);if(id<0)return;const t=palette[id],v=variant(x,y,id),px=x*TILE,py=y*TILE,s=settings(map),hd=s.enabled&&hdReady;if(hd)texture(ctx,id,x,y);else base(ctx,id,v,px,py);
  if(drawTerrace(ctx,map,t,px,py)&&!map.terrain.heights?.[y*map.sizeX+x])return;
  if(ready&&['sky','cloud','twilight'].includes(t.key)){
   const band=t.key==='sky'?0:t.key==='cloud'?1:2;
   ctx.drawImage(atlas,(px/2)%512,1536+band*256+(py/2)%256,TILE/2,TILE/2,px,py,TILE,TILE);
  }
  // The face lives on the air tile beneath a deck. Its collision remains air.
  if(!map.terrain.terrace&&t.group==='sky'&&palette[getTile(map,x,y-1)]?.group==='palace'){
   ctx.fillStyle='#594f64';ctx.fillRect(px,py,TILE,12);
   ctx.fillStyle='#95837f';ctx.fillRect(px+1,py+1,TILE-2,7);
   ctx.fillStyle='#c9ac73';ctx.fillRect(px,py,TILE,2);
   ctx.fillStyle='#756772';ctx.fillRect(px+6,py+9,4,6);
  }
  if(hd){if(s.transitions)hdTransitions(ctx,map,x,y,id,s);if(natural(id)){tone(ctx,x,y,s);detail(ctx,map,id,x,y,s)}}
  const level=map.terrain.heights?.[y*map.sizeX+x]||0;
  if(level){
   ctx.fillStyle='rgba(255,226,164,'+(level*.04)+')';ctx.fillRect(px,py,TILE,TILE);
   const below=y+1<map.sizeY?map.terrain.heights[(y+1)*map.sizeX+x]:0;
   if(level>below){const depth=(level-below)*5;ctx.fillStyle='#594637';ctx.fillRect(px,py+TILE-depth,TILE,depth);ctx.fillStyle='#c2ab78';ctx.fillRect(px,py+TILE-depth,TILE,2);ctx.fillStyle='#78624b';for(let j=1;j<5;j++)ctx.fillRect(px+(j*7+v)%30,py+TILE-depth+2,2,Math.max(1,depth-3))}
  }
  if(hd)return;
  const water=p=>p.group==='water'||p.group==='namekWater';
  if(t.group==='namekGrass'||t.group==='namekGround'){
   if(t.key!=='nmBridge')overlay(ctx,59,v,mask(map,x,y,water),'sand',px,py);
   if(t.group==='namekGrass')overlay(ctx,61,v,mask(map,x,y,p=>p.key==='nmDust'),'edge',px,py);
   return;
  }
  const land=p=>['grass','ground','path','sand'].includes(p.group);
  if(water(t)){overlay(ctx,id,v,mask(map,x,y,p=>!water(p)&&p.group!=='floor'&&p.key!=='nmBridge'),'foam',px,py);return}
  if(land(t)){
   if(t.group==='grass'){overlay(ctx,2,v,mask(map,x,y,p=>p.group==='path'),'edge',px,py);overlay(ctx,6,v,mask(map,x,y,p=>p.group==='forest'),'forest',px,py)}
   overlay(ctx,t.group==='sand'?id:3,v,mask(map,x,y,water),'sand',px,py);
  }
 }
 function draw(ctx,map){if(!valid(map))return false;waterCells.delete(map.terrain);ctx.imageSmoothingEnabled=false;for(let y=0;y<map.sizeY;y++)for(let x=0;x<map.sizeX;x++)drawCell(ctx,map,x,y);return true}
 function redrawNeighborhood(ctx,map,x,y){for(let cy=y-1;cy<=y+1;cy++)for(let cx=x-1;cx<=x+1;cx++)if(cx>=0&&cy>=0&&cx<map.sizeX&&cy<map.sizeY)drawCell(ctx,map,cx,cy)}
 const isBlocked=(map,x,y)=>{if(!valid(map))return false;const id=getTile(map,Math.floor(x/TILE),Math.floor(y/TILE));const disk=map.terrain.terrace;if(disk&&palette[id]?.key==='gold'&&Math.abs(Math.hypot((Math.floor(x/TILE)+.5)*TILE-disk.x,(Math.floor(y/TILE)+.5)*TILE-disk.y)-disk.r)<=48)return Math.hypot(x-disk.x,y-disk.y)>disk.r;return id<0||palette[id].blocked};
 // Coordinates are normalized so the preview and both world layers share the same animation.
 function drawEffect(ctx,kind,x,y,w,h,t){
  if(!['smoke','fireflies','ripple','waterfall'].includes(kind))return;
  ctx.save();ctx.translate(x,y);ctx.scale(w/100,h/100);
  for(let i=0;i<(kind==='waterfall'?12:5);i++){
   const phase=(t*.00038+i*.207)%1, wave=Math.sin(t*.0016+i*2);
   ctx.beginPath();
   if(kind==='smoke'){ctx.fillStyle='rgba(191,201,211,'+(.34*(1-phase))+')';ctx.arc(50+wave*9,88-phase*68,3+phase*12,0,Math.PI*2);ctx.fill()}
   if(kind==='fireflies'){ctx.fillStyle='rgba(248,255,124,'+(.5+.45*wave)+')';ctx.arc(15+i*16+wave*4,32+Math.sin(i*3+t*.001)*18,2,0,Math.PI*2);ctx.fill()}
   if(kind==='ripple'){ctx.strokeStyle='rgba(201,249,255,'+(.5*(1-phase))+')';ctx.ellipse(50,65,2+phase*43,1+phase*9,0,0,Math.PI*2);ctx.stroke()}
   if(kind==='waterfall'){ctx.fillStyle='rgba(215,250,255,'+(.28*(1-phase))+')';ctx.fillRect(38+(i*7)%23,35+phase*46,1.8,5+phase*4)}
  }ctx.restore()
 }
 const waterCells=new WeakMap();
 function drawWater(ctx,map,t){
  let cells=waterCells.get(map.terrain);
  if(!cells){cells=[];map.terrain.tiles.forEach((id,i)=>{if(['water','namekWater'].includes(palette[id]?.group)&&i%3===0)cells.push(i)});waterCells.set(map.terrain,cells)}
  ctx.save();ctx.fillStyle='rgba(189,244,249,.32)';
  for(const i of cells){const phase=t*.0015+i*4;ctx.fillRect((i%map.sizeX)*32+10+Math.sin(phase)*4,Math.floor(i/map.sizeX)*32+16,4+Math.cos(phase)*3,1)}
  ctx.restore()
 }
 const onReady=fn=>{listeners.add(fn);if(ready||hdReady)fn();return()=>listeners.delete(fn)};
 const fenceFinishes = [["dab", "Dąb miodowy"], ["czerwien", "Drewno czerwone"], ["biel", "Drewno bielone"], ["bambus", "Bambus oliwkowy"], ["bambus-jadeit", "Bambus jadeitowy"], ["granit", "Granit szary"], ["piaskowiec", "Piaskowiec złoty"], ["zelazo", "Żelazo grafitowe"], ["stal", "Stal kobaltowa"], ["miedz", "Metal miedziany"]];
 const fenceShapes = [["we", "Poziomy"], ["ns", "Pionowy"], ["ne", "Narożnik ↑→"], ["es", "Narożnik →↓"], ["sw", "Narożnik ↓←"], ["wn", "Narożnik ←↑"], ["post", "Słupek"], ["gate-we", "Przejście poziome"], ["gate-ns", "Przejście pionowe"]];

 const fenceProps = fenceFinishes.flatMap(([finish, material]) =>
  fenceShapes.map(([shape, label]) => ({
   key: 'fence-' + finish + '-' + shape,
   name: material + ' · ' + label,
   group: 'Płoty',
   width: TILE, height: TILE, snapToTile: true,
   art: 'assets/ui/map-editor/ploty/' + finish + '-' + shape + '.png'
  }))
 );
 window.DBITerrain={marble,hdAtlas,detailAtlas,settings,readiness,hdSwatch,palette,groups,props:[...props,...catalog,...realmObjects,...palaceObjects,...spaceProps,...sagaProps,...fenceProps],drawEffect,drawWater,swatch,create,valid,draw,drawCell,redrawNeighborhood,isBlocked,onReady,getTile,atlas,TILE};
})();
