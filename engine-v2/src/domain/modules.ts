export const modules = [
  'character', 'combat', 'world', 'inventory', 'crafting', 'quest',
  'training', 'economy', 'guild', 'event', 'transformation', 'dungeon'
] as const;
export type ModuleName = typeof modules[number];
export function moduleStatus(): Record<ModuleName, 'planned'> {
  return Object.fromEntries(modules.map(name => [name, 'planned'])) as Record<ModuleName, 'planned'>;
}
