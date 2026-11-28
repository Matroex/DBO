import {standardUpgradeAllowed} from './upgrade-policy.js';
import {upgradeRulesV1 as rules} from './upgrade-rules-v1.js';
import {reforge, type ReforgeDefinition, type ReforgeInstance} from './reforge.js';
import type {ItemScalingRules} from './item-scaling.js';

export interface UpgradeDefinition extends ReforgeDefinition {name: string}
interface Ingredient {id: string; count: number}
export interface UpgradeOverrides {
  upgradeRecipes?: Readonly<Record<string, {chance?: number; materials?: unknown; target?: string | null}>>;
  evolutions?: Readonly<Record<string, {gold?: number; materials?: unknown; target?: string | null}>>;
}
export interface UpgradeBonuses {
  guild?: number;
  smithRank?: number;
  smithCheckpoint?: number;
  main?: number;
  spiritual?: number;
  mainMaterialDiscount?: number;
}
export interface UpgradeQuote {
  version: 1;
  chance: number;
  gold: number;
  materials: readonly Ingredient[];
  requiresReforge: boolean;
  targetId: string | null;
}
interface UpgradeContext {
  race: string;
  catalog: ReadonlyMap<string, UpgradeDefinition>;
  overrides?: UpgradeOverrides;
  bonuses?: UpgradeBonuses;
}

function smithRank(bonuses: UpgradeBonuses): number {
  return Math.max(0, Math.min(rules.maxSmithRank, Math.trunc(bonuses.smithRank || 0)));
}

function raceId(value: string): string {
  const id = value.trim().toLowerCase().replace(/\s+/g, '-');
  if (id === 'człowiek') return 'ziemianin';
  return ['sayan', 'saiyanin', 'sayanin'].includes(id) ? 'saiyan' : id;
}

function validMaterials(rows: unknown, source: string, catalog: UpgradeContext['catalog']): rows is Ingredient[] {
  return Array.isArray(rows) && rows.length <= 30 &&
    rows.every(row => row && typeof row.id === 'string' && row.id !== source && catalog.has(row.id) &&
      Number.isSafeInteger(row.count) && row.count >= 1 && row.count <= 4000) &&
    new Set(rows.map(row => row.id)).size === rows.length;
}

export function quoteUpgrade(itemId: string, level: number, context: UpgradeContext): UpgradeQuote | null {
  const {catalog, overrides, bonuses = {}} = context;
  const item = catalog.get(itemId);
  const tier = rules.tiers.find(entry => itemId.startsWith(entry.prefix));
  const endless = Boolean(tier && !tier.reforge);
  const reforgeLevel = rules.reforgeLevel;
  if (!item || !standardUpgradeAllowed(item.slot, item.name) || !Number.isSafeInteger(level) ||
      level < 0 || level >= Number.MAX_SAFE_INTEGER || (!endless && level > reforgeLevel)) return null;

  const race = raceId(context.race);
  const key = race + ':' + itemId;
  const recipeBook = race === 'saiyan' || race === 'ziemianin' ? rules.recipes[race] : undefined;
  const defaultTarget = recipeBook && Object.hasOwn(recipeBook, itemId) ? recipeBook[itemId] : undefined;
  const evolution = level === reforgeLevel ? overrides?.evolutions?.[key] : undefined;
  const custom = overrides?.upgradeRecipes?.[key + ':' + (level + 1)];
  const targetId = custom && Object.hasOwn(custom, 'target') ? custom.target : evolution?.target ?? defaultTarget;
  const target = level === reforgeLevel && !itemId.startsWith('earth-500-') && targetId ? catalog.get(targetId) : undefined;
  const destination = target && target.id !== itemId && target.slot === item.slot &&
    standardUpgradeAllowed(target.slot) &&
    (!target.requiredRace || raceId(target.requiredRace) === race) ? target.id : null;
  const requiresReforge = level === reforgeLevel && (!endless || destination !== null);

  const rank = smithRank(bonuses);
  const bonus = (bonuses.guild ?? 0) + rank + (bonuses.smithCheckpoint ?? 0) +
    (bonuses.main ?? 0) + Math.max(0, bonuses.spiritual ?? 0);
  const baseline = rules.chances[Math.min(level, 8)]!;
  const penalty = endless ? Math.max(0, level - 8) * rules.endlessPenaltyPerStep : 0;
  const customChance = custom?.chance;
  const customMaterials = typeof customChance === 'number' && Number.isFinite(customChance) &&
    customChance >= 0 && customChance <= 100 && validMaterials(custom?.materials, itemId, catalog) ? custom.materials : null;
  const evolutionGold = evolution?.gold;
  const evolutionMaterials = requiresReforge && typeof evolutionGold === 'number' &&
    Number.isSafeInteger(evolutionGold) && evolutionGold >= 0 &&
    validMaterials(evolution?.materials, itemId, catalog) ? evolution.materials : null;
  const chance = Math.min(100, customMaterials ? customChance! + bonus : requiresReforge ? 100 :
    Math.max(endless ? rules.endlessChanceFloor : 0, baseline * (tier?.chanceFactor ?? 1) + bonus - penalty));

  const whiteSet = Object.hasOwn(rules.recipes.saiyan, itemId) && rules.recipes.saiyan[itemId]?.startsWith('sayan-50-') ||
    defaultTarget?.startsWith('earth-100-');
  const gold = evolutionMaterials ? evolutionGold! :
    tier || whiteSet ? rules.goldPerStep * ((tier?.stepOffset ?? 0) + level + 1) : 0;
  // Wallet amounts must be represented exactly even for uncapped sets.
  if (!Number.isSafeInteger(gold)) return null;
  const quote = {version: rules.version, chance, gold, requiresReforge, targetId: destination} as const;
  const overrideMaterials = customMaterials ?? evolutionMaterials;
  if (overrideMaterials) return {...quote, materials: overrideMaterials.map(({id, count}) => ({id, count}))};

  const discount = Number(rank >= rules.smithDiscountRank) + (bonuses.mainMaterialDiscount ?? 0);
  const scale = (count: number) => {
    const basic = Math.ceil(count * 1.5);
    return tier?.powder === 'common' ? basic : Math.ceil(basic * 1.25);
  };
  const late = level >= 7;
  const quantity = tier ? late ? Math.min(level - 6, 2) : Math.max(1, level - 3) :
    late ? level <= 8 ? level - 6 : 0 : Math.max(0, level - 3);
  const extras = tier ? (late ? tier.late : tier.early) : (late ? rules.white.late : rules.white.early);
  const materials: Ingredient[] = [{
    id: tier && !(requiresReforge && tier.powder === 'common') ? rules.dustId + '-' + tier.powder : rules.dustId,
    count: requiresReforge ? tier?.reforge?.dust ?? rules.white.reforgeDust : tier ? scale(1) : 1
  }];
  if (quantity && (!tier || (!requiresReforge && level >= 3))) {
    const count = Math.max(tier ? 1 : 0, (tier ? scale(quantity) : quantity) - discount);
    if (count) materials.push(...extras.map(id => ({id, count})));
  }
  if (requiresReforge) materials.push({id: rules.reforgerId, count: tier?.reforge?.reforger ?? 1});
  return {...quote, materials};
}

// The caller supplies the server roll and commits these costs and the item together.
// A failed roll still charges the quoted materials and gold.
export function resolveUpgrade(instance: ReforgeInstance, context: UpgradeContext, scaling: ItemScalingRules, roll: number) {
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw Error('Invalid upgrade roll');
  if (!context.bonuses || !smithRank(context.bonuses)) return null;
  const quote = quoteUpgrade(instance.definitionId, instance.level, context);
  if (!quote || (quote.requiresReforge && !quote.targetId)) return null;
  const success = quote.chance >= 100 || roll * 100 < quote.chance;
  if (!success) return {quote, success, item: instance};
  const target = quote.targetId ? context.catalog.get(quote.targetId) : undefined;
  const source = context.catalog.get(instance.definitionId)!;
  const item = target
    ? reforge(scaling, instance, source, {...target, requiredRace: raceId(target.requiredRace ?? '')},
      raceId(context.race), target.id)
    : {...instance, level: instance.level + 1};
  return {quote, success, item};
}
