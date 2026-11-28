import {characterBonus,readBonus,type BonusMap} from './equipment-bonuses.js';
import type {ItemScalingRules} from './item-scaling.js';
import {resolveSignBonuses} from './signs.js';

const chanceKey='upgradeChancePct';
const discountKey='upgradeMaterialDiscount';
interface EquippedSmithItem {
  id: string;
  level: number;
  base: BonusMap;
  plans?: unknown;
  reinforced?: boolean;
}

export function resolveSmithBonuses(
  scaling: ItemScalingRules,
  signs: Readonly<Record<string,unknown>>,
  character: BonusMap,
  equipment: readonly EquippedSmithItem[]
) {
  const worn = equipment.map(item => {
    const sign = Object.hasOwn(signs,item.id) ? resolveSignBonuses(scaling,signs[item.id],item.level) : {};
    const bonuses = {...item.base,...sign};
    if (Array.isArray(item.plans)) {
      const seen=new Set<string>();
      const limit=item.reinforced?3:4;
      for (const roll of item.plans as unknown[]) {
        if (seen.size===limit) break;
        if (!Array.isArray(roll)) continue;
        const [key,value]=roll;
        if (typeof key!=='string'||typeof value!=='number'||!Number.isFinite(value)||seen.has(key)) continue;
        const max=key===chanceKey?10:key===discountKey?1:undefined;
        if (max!==undefined) {
          if (!Number.isInteger(value)||value<1||value>max) continue;
          bonuses[key]=(readBonus(bonuses,[key])??0)+value;
        }
        seen.add(key);
      }
    }
    return bonuses;
  });
  return {
    main: characterBonus([character],worn,[chanceKey]),
    mainMaterialDiscount: Math.trunc(characterBonus([character],worn,[discountKey]))
  };
}
