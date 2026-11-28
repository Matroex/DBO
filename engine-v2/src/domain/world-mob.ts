export interface WorldMobRules {strengthPerLevel:number;lagunaStrengthPerLevel:number;speedPerLevel:number;endurancePerLevel:number;attackPerStrength:number;defensePerEndurance:number;hpPerLevel:number;hpBonusThreshold:number;hpBonus:number;goldPerLevel:number}
export function worldMobStats(r:WorldMobRules,mapId:string,level:number){
 if(!Number.isSafeInteger(level)||level<1||Object.values(r).some(n=>!Number.isFinite(n)||n<0))throw Error('Invalid mob rules or level');
 const strength=level*(mapId==='laguna'?r.lagunaStrengthPerLevel:r.strengthPerLevel),speed=level*r.speedPerLevel,endurance=level*r.endurancePerLevel;
 return {strength,speed,endurance,intelligence:0,ki:0,power:0,attack:strength*r.attackPerStrength,defense:endurance*r.defensePerEndurance,hp:level*r.hpPerLevel+(level>=r.hpBonusThreshold?r.hpBonus:0),gold:level*r.goldPerLevel};
}
