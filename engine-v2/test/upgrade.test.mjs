import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {runInNewContext} from 'node:vm';
import {quoteUpgrade, resolveUpgrade} from '../dist/domain/upgrade.js';
import {scaleItem} from '../dist/domain/item-scaling.js';

const browser = readFileSync(new URL('../../js/app.js', import.meta.url), 'utf8');
const items = readFileSync(new URL('../../js/items.js', import.meta.url), 'utf8');
const published = JSON.parse(readFileSync(new URL('../../data/gm-world-published.json', import.meta.url), 'utf8'));
const readBetween = (text, start, end) => text.slice(text.indexOf(start), text.indexOf(end));
const catalog = new Map();
let gmContent = published.gmContent;
let bonuses = {};
const legacy = runInNewContext(
  readBetween(items, 'const DBI_SAYAN_50_ITEMS=', '// Nowe materiały') +
  readBetween(browser, 'const DBI_UPGRADE_CHANCES=', 'function dbiUpgradeMaterialCount') +
  readBetween(browser, 'const DBI_REFORGE_RECIPES=', 'function dbiReforgeDestination') +
  '({dbiUpgradeRequirements, dbiUpgradeIngredients, dbiReforgeTarget, DBI_REFORGE_RECIPES, DBI_EARTH_ITEMS})',
  {
    window: {
      DBIContent: {
        read: () => gmContent,
        raceId: race => race,
        validMaterials: (rows, hasItem) => Array.isArray(rows) && rows.length <= 30 &&
          new Set(rows.map(row => row?.id)).size === rows.length &&
          rows.every(row => row && hasItem(row.id) && Number.isSafeInteger(row.count) && row.count >= 1 && row.count <= 4000)
      },
      DBISpiritual: {currentBonuses: () => ({upgrade: bonuses.spiritual})}
    },
    catalog: {find: predicate => [...catalog.values()].find(predicate)},
    itemById: id => catalog.get(id),
    dbiGuildBonus: () => ({smith: bonuses.guild ?? 0}),
    dbiSkillBonuses: () => ({upgrade: bonuses.smithRank ?? 0, materialDiscount: Number(bonuses.smithRank >= 6)}),
    dbiSmithCheckpointBonus: () => bonuses.smithCheckpoint ?? 0,
    dbiMainBonus: key => key === 'upgradeChancePct' ? bonuses.main ?? 0 : bonuses.mainMaterialDiscount ?? 0
  }
);

function register(id, slot = 'bron', requiredRace) {
  catalog.set(id, {id, name: id, slot, requiredRace, quality: 0, base: {attack: 5, critChance: 1}});
}
for (const [race, recipes] of Object.entries(legacy.DBI_REFORGE_RECIPES)) {
  for (const [from, to] of Object.entries(recipes)) {
    if (!catalog.has(from)) register(from);
    register(to, 'bron', race);
  }
}
for (const item of legacy.DBI_EARTH_ITEMS) {
  Object.assign(catalog.get(item.id), {name: item.name, slot: item.slot});
}
for (const [id, to] of Object.entries(legacy.DBI_REFORGE_RECIPES.ziemianin)) {
  if (!id.startsWith('earth-')) catalog.get(id).slot = catalog.get(to).slot;
}
for (const [id, to] of Object.entries(legacy.DBI_REFORGE_RECIPES.saiyan)) {
  catalog.get(to).slot = catalog.get(id).slot;
}
register('quest-turtle-stone', 'material');
register('upgrade-reforger', 'material');

function compare(id, level, race) {
  const item = catalog.get(id);
  const expected = legacy.dbiUpgradeRequirements(level, item, race);
  const quote = quoteUpgrade(id, level, {catalog, race, overrides: gmContent, bonuses});
  if (!expected) return assert.equal(quote, null, id);
  const targetId = expected.reforger ? legacy.dbiReforgeTarget(item, race) : null;
  const materials = JSON.parse(JSON.stringify(legacy.dbiUpgradeIngredients(expected)));
  assert.deepEqual(quote, {
    version: 1, chance: expected.chance, gold: expected.gold, materials,
    targetId, requiresReforge: Boolean(expected.reforger)
  }, race + ':' + id + ':' + level);
}

test('matches browser quotes for both race trees, each tier and uncapped levels', () => {
  for (const option of [{}, {guild: 3, smithRank: 6, smithCheckpoint: 2, main: 4, spiritual: 5, mainMaterialDiscount: 2}]) {
    bonuses = option;
    for (const race of ['saiyan', 'ziemianin']) {
      for (const id of catalog.keys()) {
        for (const level of [-1, ...Array.from({length: 16}, (_, level) => level), 50]) compare(id, level, race);
      }
    }
  }
});

test('honors GM precedence, empty ingredient lists, and invalid overrides', () => {
  const id = 'starter-red-staff';
  const race = 'saiyan';
  const key = race + ':' + id;
  const originalContent = gmContent;
  bonuses = {smithRank: 6};
  try {
    for (const row of [
      {chance: 33, target: null, materials: []},
      {chance: 20, target: 'sayan-50-miecz', materials: [{id: 'quest-turtle-stone', count: 3}]},
      {chance: 201, materials: []},
      {chance: 50, materials: [{id, count: 1}]},
      {chance: 50, materials: [{id: 'missing', count: 1}]}
    ]) {
      gmContent = {
        upgradeRecipes: {[key + ':10']: row},
        evolutions: {[key]: {target: 'sayan-50-miecz', gold: 23456, materials: [{id: 'upgrade-reforger', count: 8}]}}
      };
      compare(id, 9, race);
    }
    gmContent = {upgradeRecipes: {'ziemianin:earth-500-bron:10': {
      target: 'earth-250-bron', chance: 77, materials: []
    }}};
    compare('earth-500-bron', 9, 'ziemianin');
  } finally {
    gmContent = originalContent;
  }
});

const scaling = {qualityMultipliers: [1, 1.1, 1.25, 1.5, 2], flatGrowth: 1.5, percentTarget: 5, percentTargetLevel: 9, maxUpgrade: 10};
const starter = {id: 'instance', definitionId: 'starter-red-staff', quality: 2, level: 9, bagSlot: 12, inheritance: {}, attributes: {reinforced: true, plans: [1]}};

test('resolves reforge and failure, preserving instance state and charging the quote', () => {
  const context = {race: 'Sayan', catalog, bonuses: {smithRank: 1}};
  const {item, success} = resolveUpgrade(starter, context, scaling, .999);
  assert.equal(success, true);
  assert.deepEqual(item, {...starter, definitionId: 'sayan-50-miecz', level: 0, quality: 0,
    inheritance: {attack: scaleItem(scaling, {attack: 5}, 2, 9, true, true).attack / 2, critChance: 3.125}});
  const atEight = {...starter, level: 8};
  const failed = resolveUpgrade(atEight, context, scaling, .31);
  assert.equal(failed.success, false);
  assert.strictEqual(failed.item, atEight);
  assert.equal(failed.quote.gold, 45000);
  assert.deepEqual(failed.quote.materials, [
    {id: 'dragon-ball-dust', count: 1},
    {id: 'red-ribbon-badge', count: 2},
    {id: 'dragon-radar', count: 2}
  ]);
  assert.equal(resolveUpgrade(atEight, {...context, bonuses: {}}, scaling, 0), null);
  assert.equal(resolveUpgrade(starter, {...context, race: 'nameczanin'}, scaling, 0), null);
  for (const target of ['earth-100-bron', 'sayan-50-opaska']) {
    const overrides = {upgradeRecipes: {'saiyan:starter-red-staff:10': {target, chance: 100, materials: []}}};
    assert.equal(resolveUpgrade(starter, {...context, overrides}, scaling, 0), null);
  }
  for (const [id, race] of [['royal-500-miecz-krola-saiyan', 'saiyan'], ['earth-500-bron', 'ziemianin']]) {
    const upgraded = resolveUpgrade({...starter, definitionId: id, level: 10}, {...context, race}, scaling, 0);
    assert.equal(upgraded.item.level, 11);
    assert.equal(upgraded.quote.gold, 205000);
  }
});

test('blocks special slots and preserves the browser name check on source armor', () => {
  for (const [index, slot] of ['Chi', 'Symbol', 'Strój treningowy', 'Esencja', 'Scouter'].entries()) {
    const id = 'blocked-' + index;
    register(id, slot);
    assert.equal(quoteUpgrade(id, 0, {catalog, race: 'saiyan'}), null);
  }
  const earth = {catalog, race: 'Człowiek'};
  assert.equal(quoteUpgrade('starter-blue-kimono', 9, earth).targetId, 'earth-100-zbroja');
  assert.equal(quoteUpgrade('earth-100-zbroja', 0, earth), null);
});
