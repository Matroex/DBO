export const contentKinds = ['starter_rules','race','item','enemy','loot_table','quest','map','npc','technique','skill','recipe','combat_rules','training_rules','event','transformation','dungeon'] as const;
export type ContentKind=typeof contentKinds[number];
export interface Definition { kind:ContentKind; id:string; data:unknown }
export function validateIdentity(kind:unknown,id:unknown):void {
 if(typeof kind!=='string'||!contentKinds.includes(kind as ContentKind)) throw Error('Unknown content kind');
 if(typeof id!=='string'||! /^[a-z0-9][a-z0-9_.:-]{0,127}$/.test(id)) throw Error('Invalid definition ID');
}
