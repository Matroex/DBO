// Legacy profession ranks require 10 × the current level to advance.
export const smithProfessionV1 = {
  maxLevel: 30,
  experiencePerLevel: 10,
  upgradeCheckpoint: {level: 20, chance: 10}
} as const;

export function smithProfessionProgress(total: number) {
  const {maxLevel, experiencePerLevel, upgradeCheckpoint} = smithProfessionV1;
  const maximum = experiencePerLevel * maxLevel * (maxLevel - 1) / 2;
  if (!Number.isSafeInteger(total) || total < 0 || total > maximum) throw Error('Invalid smith experience');
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
