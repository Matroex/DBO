import {standardUpgradeAllowed} from './upgrade-policy.js';

const recipes = [
  {chance:90, units:5, module:'common', modules:1, gold:10000},
  {chance:70, units:15, module:'rare', modules:1, gold:30000},
  {chance:40, units:30, module:'epic', modules:2, gold:100000},
  {chance:10, units:100, module:'legendary', modules:5, gold:1000000}
] as const;
const slots=new Set(['opaska','bron','naszyjnik','kolczyki','zbroja','pierscien','pas','rekawice','energia','buty']);

export function quoteQuality(definition:{slot:string;qualityIds:readonly string[]},quality:number,bonus:number) {
  if (!slots.has(definition.slot) || !standardUpgradeAllowed(definition.slot)) return null;
  const recipe = recipes[quality];
  const qualityId = definition.qualityIds[quality+1];
  if (!recipe || !qualityId) return null;
  return {
    version:1, qualityId, gold:recipe.gold, chance:Math.max(0,Math.min(100,recipe.chance+bonus)),
    materials:[
      {id:'smith-upgrade-1',count:recipe.units},
      {id:'smith-upgrade-2',count:recipe.units},
      {id:'smith-quality-'+recipe.module,count:recipe.modules}
    ]
  };
}
