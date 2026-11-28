const earthEarly = ['quest-turtle-stone', 'small-dragon-balls'] as const;
const earthLate = ['red-ribbon-badge', 'dragon-radar'] as const;
const firstReforge = {dust: 100, reforger: 5};
const secondReforge = {dust: 200, reforger: 20};

const starters = {
  'starter-red-staff': 'bron',
  'white-headband': 'opaska',
  'quest-white-headband': 'opaska',
  'white-earrings': 'kolczyki',
  'white-amulet': 'naszyjnik',
  'starter-blue-kimono': 'zbroja',
  'white-gloves': 'rekawice',
  'starter-white-belt': 'pas',
  'white-ring': 'pierscien',
  'starter-black-boots': 'buty'
};
const slots = ['bron', 'opaska', 'kolczyki', 'naszyjnik', 'zbroja', 'rekawice', 'pas', 'pierscien', 'buty'];
const saiyanSlot = (slot: string) => slot === 'bron' ? 'miecz' : slot;
const royalSlot = (slot: string) => slot === 'zbroja' ? 'pancerz' : saiyanSlot(slot);

interface Tier {
  prefix: string;
  stepOffset: number;
  chanceFactor: number;
  powder: string;
  early: readonly string[];
  late: readonly string[];
  reforge?: {dust: number; reforger: number};
}

// Source: js/app.js and js/items.js at 2e511ec. Published GM recipe maps were empty.
export const upgradeRulesV1 = {
  version: 1 as const,
  chances: [95, 90, 80, 75, 70, 65, 60, 50, 30],
  reforgeLevel: 9,
  goldPerStep: 5000,
  endlessPenaltyPerStep: 5,
  endlessChanceFloor: 1,
  smithDiscountRank: 6,
  maxSmithRank: 10,
  dustId: 'dragon-ball-dust',
  reforgerId: 'upgrade-reforger',
  white: {early: earthEarly, late: earthLate, reforgeDust: 10},
  tiers: [
    {prefix: 'sayan-50-', stepOffset: 10, chanceFactor: .9, powder: 'common',
      early: ['dna-sayan', 'ogon-sayan'], late: ['kosmiczna-plytka', 'kapsula-kosmiczna-sayan'], reforge: firstReforge},
    {prefix: 'sayan-250-', stepOffset: 20, chanceFactor: .8, powder: 'rare',
      early: ['material-sayan', 'kamienna-inskrypcja-starozytnych-sayan'], late: ['krwisty-krysztal', 'ksiezycowy-pyl', 'sztuczny-ksiezyc'], reforge: secondReforge},
    {prefix: 'royal-500-', stepOffset: 30, chanceFactor: .6, powder: 'epic',
      early: ['sayanski-metal', 'sayanska-ruda'], late: ['skrawek-sayanskiej-duszy', 'iskra-super-sayana', 'sayanska-duma']},
    {prefix: 'earth-100-', stepOffset: 10, chanceFactor: .9, powder: 'common',
      early: earthEarly, late: earthLate, reforge: firstReforge},
    {prefix: 'earth-250-', stepOffset: 20, chanceFactor: .8, powder: 'rare',
      early: earthEarly, late: earthLate, reforge: secondReforge},
    {prefix: 'earth-500-', stepOffset: 30, chanceFactor: .6, powder: 'epic',
      early: earthEarly, late: earthLate}
  ] as readonly Tier[],
  recipes: {
    saiyan: Object.fromEntries([
      ...Object.entries(starters).map(([id, slot]) => [id, 'sayan-50-' + saiyanSlot(slot)]),
      ...slots.map(slot => ['sayan-50-' + saiyanSlot(slot), 'sayan-250-' + saiyanSlot(slot)]),
      ...slots.map(slot => ['sayan-250-' + saiyanSlot(slot), 'royal-500-' + royalSlot(slot) + '-krola-saiyan'])
    ]),
    ziemianin: Object.fromEntries([
      ...Object.entries(starters).map(([id, slot]) => [id, 'earth-100-' + slot]),
      ...slots.map(slot => ['earth-100-' + slot, 'earth-250-' + slot]),
      ...slots.map(slot => ['earth-250-' + slot, 'earth-500-' + slot])
    ])
  } satisfies Record<string, Record<string, string>>
};
