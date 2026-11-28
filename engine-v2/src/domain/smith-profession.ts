// Legacy profession ranks require 10 × the current level to advance.
export const smithProfessionV1 = {
  maxLevel: 30,
  experiencePerLevel: 10,
  upgradeCheckpoint: {level: 20, chance: 10},
  qualityCheckpoint: {level: 30, chance: 10},
  experienceCheckpoint: {level: 15, bonus: 2},
  rewardBandLevels: [10,20],
  craftExperience: [
    {1:[2,1],100:[3,1],250:[4,2],500:[6,3]},
    {1:[1,0],100:[2,1],250:[3,1],500:[5,2]},
    {1:[0,0],100:[1,0],250:[2,1],500:[4,2]}
  ] as readonly Readonly<Partial<Record<number,ExperienceReward>>>[],
  qualityExperience: [
    [[4,2],[6,4],[8,6],[10,8]],
    [[2,0],[4,2],[6,4],[10,8]],
    [[1,0],[2,0],[5,2],[10,8]]
  ] as const
} as const;

type ExperienceReward = readonly [success: number, failure: number];
export type SmithProfessionAttempt =
  | {kind: 'craft'; tier: number; success: boolean}
  | {kind: 'quality'; tier: 0|1|2|3; success: boolean};

const maxExperience = smithProfessionV1.experiencePerLevel *
  smithProfessionV1.maxLevel * (smithProfessionV1.maxLevel - 1) / 2;

export function smithProfessionProgress(total: number) {
  const {maxLevel, experiencePerLevel, upgradeCheckpoint} = smithProfessionV1;
  if (!Number.isSafeInteger(total) || total < 0 || total > maxExperience) throw Error('Invalid smith experience');
  let level = 1;
  let experience = total;
  while (level < maxLevel && experience >= level * experiencePerLevel) {
    experience -= level * experiencePerLevel;
    level++;
  }
  return {
    total, level, experience,
    needed: level === maxLevel ? 0 : level * experiencePerLevel,
    upgradeBonus: level >= upgradeCheckpoint.level ? upgradeCheckpoint.chance : 0
  };
}

export function smithProfessionExperience(total: number, attempt: SmithProfessionAttempt) {
  const {level} = smithProfessionProgress(total);
  const {kind,tier,success} = attempt;
  if ((kind !== 'craft' && kind !== 'quality') || !Number.isSafeInteger(tier) ||
      tier < (kind === 'craft' ? 1 : 0) || (kind === 'quality' && tier > 3) || typeof success !== 'boolean') {
    throw Error('Invalid smith attempt');
  }
  const {craftExperience,qualityExperience,experienceCheckpoint,rewardBandLevels} = smithProfessionV1;
  const [middle,upper] = rewardBandLevels;
  const band = level < middle ? 0 : level < upper ? 1 : 2;
  const reward = kind === 'craft' ? craftExperience[band]?.[tier] : qualityExperience[band][tier];
  const base = reward?.[success ? 0 : 1] ?? 0;
  const bonus = base > 0 && level >= experienceCheckpoint.level ? experienceCheckpoint.bonus : 0;
  const gained = Math.min(maxExperience - total,base + bonus);
  return {gained,progress:smithProfessionProgress(total + gained)};
}
