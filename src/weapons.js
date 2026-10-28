/**
 * Equipment attack library. Equipment's passive characteristics belong to
 * "Statistiques du build actif" and must NEVER be added a second time here.
 * This module models the offensive use of the equipped weapon only.
 */
export const WEAPONS=Object.freeze({
 "sceptre-roi-joueur":{
  id:"sceptre-roi-joueur",name:"Sceptre du Roi Joueur",
  level:200,type:"Bâton",ap:3,minRange:1,range:2,maxPerTurn:2,
  criticalChance:20,criticalBonus:10,direction:"ligne",
  huntWeapon:true,
  hits:[
   {element:"Eau",min:12,max:15,lifeSteal:false},
   {element:"Eau",min:4,max:5,lifeSteal:true}
  ],
  description:"12–15 dommages Eau et 4–5 vol de vie Eau ; zone en ligne perpendiculaire de 3 cases (zone non simulée)."
 },
 manthache:{
  id:"manthache",name:"Manthache",level:200,type:"Hache",ap:5,
  minRange:1,range:1,maxPerTurn:1,criticalChance:10,criticalBonus:8,
  direction:"diagonale",huntWeapon:true,
  hits:[
   {element:"Air",min:30,max:35,lifeSteal:false},
   {element:"Air",min:16,max:20,lifeSteal:true}
  ],
  description:"30–35 dommages Air + 16–20 vol de vie Air. Portée diagonale à vérifier en combat."
 }
});
export function normalizedWeaponId(raw){
 return typeof raw==="string"&&Object.hasOwn(WEAPONS,raw)?raw:null;
}
function hasStats(stats,element){
 const attr={Air:"agility",Terre:"strength",Feu:"intelligence",Eau:"chance",Neutre:"strength"}[element];
 return Number.isFinite(stats?.[attr])&&Number.isFinite(stats?.power)&&
  Number.isFinite(stats?.flatDamage?.[element])&&Number.isFinite(stats?.criticalDamage);
}
function weaponRowDamage(hit,stats,crit,critBonus){
 const attr={Air:"agility",Terre:"strength",Feu:"intelligence",Eau:"chance",Neutre:"strength"}[hit.element];
 const b=crit?critBonus:0;
 const multiplier=(100+stats[attr]+stats.power)/100;
 const fixed=stats.flatDamage[hit.element]+(crit?stats.criticalDamage:0);
 return {
  min:Math.max(0,Math.floor((hit.min+b)*multiplier+1e-9)+fixed),
  max:Math.max(0,Math.floor((hit.max+b)*multiplier+1e-9)+fixed)
 };
}
export function equippedWeaponSpell(build){
 const item=WEAPONS[normalizedWeaponId(build?.weapon)];
 if(!item)return null;
 const stats=build?.stats;
 const valid=item.hits.every(hit=>hasStats(stats,hit.element));
 const hits=item.hits.map(hit=>({
  ...hit,
  ...(valid?{normal:weaponRowDamage(hit,stats,false,item.criticalBonus),
   crit:weaponRowDamage(hit,stats,true,item.criticalBonus)}:{})
 }));
 // Without complete stats the attack must not use invented/old equipment rows.
 const totals=valid?["min","max"].map(key=>({
  normal:hits.reduce((sum,h)=>sum+h.normal[key],0),
  crit:hits.reduce((sum,h)=>sum+h.crit[key],0)
 })):null;
 return {
  id:"weapon:"+item.id,name:item.name,pa:item.ap,
  variantGroup:-1,isWeapon:true,nonDirect:false,isTrap:false,
  target:"enemy",minRange:item.minRange,range:item.range,lineOnly:item.direction==="ligne",los:true,
  maxPerTurn:item.maxPerTurn,perTarget:item.maxPerTurn,cooldown:0,
  element:item.hits[0].element,
  min:totals?totals[0].normal:0,max:totals?totals[1].normal:0,
  critMin:totals?totals[0].crit:0,critMax:totals?totals[1].crit:0,
  critChance:Math.min(1,Math.max(0,(item.criticalChance+(valid?(stats.critical||0):0))/100)),
  baseDamage:item.hits.reduce((n,h)=>n+(h.min+h.max)/2,0),
  weaponHits:hits,weaponCriticalBonus:item.criticalBonus,
  damageSource:valid?"active-build-weapon":"weapon-stats-missing",
  status:{},weaponType:item.type,weaponDirection:item.direction,
  utility:item.description+" Zone non simulée ; soins du vol de vie estimés sur la ligne dédiée, suivi des PV seulement pour le Sacrieur."
 };
}
