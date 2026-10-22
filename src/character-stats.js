/** Statistiques relevées sur la capture du Sacrieur Air, 21/10/2026.
 * Ces valeurs décrivent le personnage EN JEU, pas nécessairement
 * l'équipement de la fiche DofusBook utilisée pour les dégâts des sorts.
 * Ne jamais additionner ces bonus aux dégâts déjà calculés sur DofusBook.
 */
export const SACRIER_AIR_REFERENCE_STATS={
 source:"capture-en-jeu-2026-10-21",
 hitPoints:4952,actionPoints:12,movementPoints:5,rangeBonus:5,
 strength:100,intelligence:100,chance:405,agility:1267,wisdom:386,
 power:160,critical:-44,summons:2,
 flatDamage:{Neutre:0,Terre:0,Feu:0,Eau:56,Air:144},
 criticalDamage:24,spellDamagePercent:1,
 resistPercent:{Neutre:29,Terre:37,Feu:37,Eau:27,Air:20},
 resistFixed:{Neutre:0,Terre:0,Feu:0,Eau:0,Air:0},
 criticalResistance:26,pushResistance:15,
 lock:141,dodge:80,apRemoval:48,mpRemoval:38,apDodge:47,mpDodge:80,
 initiative:2272,heals:80,prospecting:171
};
/** Capture Sram Air Matryoshka, 22/10/2026 (rang Omega 60).
 * Les stats sont celles du personnage en jeu. Ne pas les additionner une
 * seconde fois aux dégâts de sorts déjà calculés sur DofusBook.
 */
export const SRAM_AIR_REFERENCE_STATS={
 source:"capture-en-jeu-2026-10-22",
 hitPoints:4065,actionPoints:12,movementPoints:5,rangeBonus:5,
 strength:100,intelligence:2,chance:1,agility:1645,wisdom:430,
 power:160,critical:17,summons:4,
 flatDamage:{Neutre:0,Terre:0,Feu:0,Eau:0,Air:153},
 criticalDamage:33,spellDamagePercent:0,
 resistPercent:{Neutre:14,Terre:20,Feu:20,Eau:24,Air:27},
 resistFixed:{Neutre:0,Terre:0,Feu:0,Eau:0,Air:0},
 criticalResistance:32,pushResistance:43,
 lock:141,dodge:159,apRemoval:46,mpRemoval:43,apDodge:49,mpDodge:93,
 initiative:1748,heals:0,prospecting:207
};
const numericKeys=["hitPoints","actionPoints","movementPoints","rangeBonus",
 "strength","intelligence","chance","agility","wisdom","power","critical","summons",
 "criticalDamage","spellDamagePercent","criticalResistance","pushResistance",
 "lock","dodge","apRemoval","mpRemoval","apDodge","mpDodge","initiative","heals","prospecting"];
const elems=["Neutre","Terre","Feu","Eau","Air"];
const limit=(value,min,max)=>Math.max(min,Math.min(max,Number(value)));
export function sanitizeCharacterStats(input){
 if(!input||typeof input!=="object")return null;
 const stats={source:typeof input.source==="string"?input.source.slice(0,100):"manuel"};
 for(const key of numericKeys)if(Number.isFinite(+input[key])){
  const min=key==="critical"?-200:0;
  stats[key]=limit(input[key],min,100000);
 }
 for(const key of ["flatDamage","resistPercent","resistFixed"]){
  if(!input[key]||typeof input[key]!=="object")continue;
  stats[key]={};
  for(const elem of elems)if(Number.isFinite(+input[key][elem])){
   stats[key][elem]=limit(input[key][elem],key==="flatDamage"?-1000:0,key==="resistPercent"?100:100000);
  }
 }
 return stats;
}
export const CHARACTER_STAT_LABELS={
 hitPoints:"PV",actionPoints:"PA",movementPoints:"PM",rangeBonus:"Portée",
 strength:"Force",intelligence:"Intelligence",chance:"Chance",agility:"Agilité",wisdom:"Sagesse",
 power:"Puissance",critical:"Critique",summons:"Invocations",criticalDamage:"Dommages critiques",
 spellDamagePercent:"Dommages aux sorts (%)",
};
