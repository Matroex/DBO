const round=(n:number)=>Math.round(n*100000)/100000;
export function regeneration(level:number,guildRegen:number,hpPct:number,kiPct:number){
 if(![level,guildRegen,hpPct,kiPct].every(Number.isFinite))throw Error('Invalid regeneration');
 const m=1+Math.floor(Math.max(1,level)/100);
 return {hp:(m+guildRegen)*(1+hpPct/100),ki:m*.5*(1+kiPct/100)};
}
export interface Vitals {hp:number;ki:number;maxHp:number;maxKi:number}
export function applyRegeneration(v:Vitals,amount:{hp:number;ki:number}){
 v.hp=round(Math.min(v.maxHp,v.hp+amount.hp));v.ki=round(Math.min(v.maxKi,v.ki+amount.ki));
}
export interface BleedingEnemy {hp:number;bleedTicks:number;bleedDamage:number;nextBleedAt:number|null}
export function startBleed(e:BleedingEnemy,at:number){
 if(e.hp<=0||e.nextBleedAt!==null)return false;
 e.bleedTicks=10;e.bleedDamage=e.hp*.01;e.nextBleedAt=at+1000;return true;
}
export function tickBleed(e:BleedingEnemy,at:number){
 if(e.hp<=0||e.nextBleedAt===null||e.nextBleedAt>at)return 0;
 const damage=Math.min(e.hp,e.bleedDamage);e.hp=round(Math.max(0,e.hp-damage));
 e.bleedTicks--;e.nextBleedAt=e.bleedTicks>0?e.nextBleedAt+1000:null;return damage;
}
export interface BeanState extends Vitals {nextGreenAt:number;greenUntil:number}
export interface BeanOptions {green?:boolean;greenMinutes?:number;red?:boolean;redAt?:number;blue?:boolean;blueAt?:number}
export function autoBeans(v:BeanState,at:number,o:BeanOptions,consume:(color:'green'|'red'|'blue')=>boolean){
 const used:string[]=[];
 if(v.hp<=0)return used;
 if(o.green===true&&at>=v.nextGreenAt){
  if(at>=v.greenUntil&&consume('green')){v.greenUntil=at+600000;v.nextGreenAt=at+(o.greenMinutes||10)*60000;used.push('green');}
  else v.nextGreenAt=at+10000;
 }
 if(o.red!==false&&v.hp<=((o.redAt??80)/100)*v.maxHp&&consume('red')){v.hp=round(Math.min(v.maxHp,v.hp+.1*v.maxHp));used.push('red');}
 if(o.blue!==false&&v.maxKi>0&&v.ki<=((o.blueAt??40)/100)*v.maxKi&&consume('blue')){v.ki=v.maxKi;used.push('blue');}
 return used;
}
