import {SACRIER_AIR_REFERENCE_STATS,SRAM_AIR_REFERENCE_STATS} from "./character-stats.js?v=1.8";

// Les valeurs de catalogue sont des dégâts déjà calculés : elles servent
// uniquement à estimer les jets de base historiques, jamais de stats actives.
// Le catalogue doit à terme être remplacé par des jets de base officiels.
const ELEMENT_STAT={Air:"agility",Terre:"strength",Feu:"intelligence",Eau:"chance",Neutre:"strength"};
const OLD_SACRI_REFERENCE={...SACRIER_AIR_REFERENCE_STATS,agility:1368,
 flatDamage:{...SACRIER_AIR_REFERENCE_STATS.flatDamage,Air:172}};
const REFERENCES={sacrieur:OLD_SACRI_REFERENCE,sram:SRAM_AIR_REFERENCE_STATS};
const valid=x=>typeof x==="number"&&Number.isFinite(x);
function multiplier(stats,element){
 const stat=ELEMENT_STAT[element];
 return 1+(Number(stats[stat])||0)/100+(Number(stats.power)||0)/100;
}
function inverseDamage(value,stats,element,critical){
 const flat=Number(stats.flatDamage?.[element])||0;
 const crit=critical?(Number(stats.criticalDamage)||0):0;
 const bonus=(Number(stats.spellDamagePercent)||0)/100;
 return Math.max(0,Math.round(((value/(1+bonus))-flat-crit)/multiplier(stats,element)));
}
function forwardDamage(base,stats,element,critical){
 const flat=Number(stats.flatDamage?.[element])||0;
 const crit=critical?(Number(stats.criticalDamage)||0):0;
 const bonus=1+(Number(stats.spellDamagePercent)||0)/100;
 return Math.max(0,Math.round((base*multiplier(stats,element)+flat+crit)*bonus));
}
export function spellsForActiveBuild(classId,sourceSpells,stats){
 const reference=REFERENCES[classId];
 if(!reference) return sourceSpells.map(s=>({...s,status:structuredClone(s.status||{})}));
 if(!stats||typeof stats!=="object"||!Number.isFinite(Number(stats.power))){
  return sourceSpells.map(s=>({...s,status:structuredClone(s.status||{}),
   min:0,max:0,critMin:0,critMax:0,damageSource:"statistiques-manquantes"}));
 }
 return sourceSpells.map(original=>{
  const spell={...original,status:structuredClone(original.status||{})};
  if(spell.nonDirect||!valid(spell.min)||!valid(spell.max)||!spell.element)return spell;
  const element=spell.element;
  const minBase=inverseDamage(original.min,reference,element,false);
  const maxBase=inverseDamage(original.max,reference,element,false);
  const critMinBase=inverseDamage(original.critMin,reference,element,true);
  const critMaxBase=inverseDamage(original.critMax,reference,element,true);
  spell.min=forwardDamage(minBase,stats,element,false);
  spell.max=forwardDamage(maxBase,stats,element,false);
  spell.critMin=forwardDamage(critMinBase,stats,element,true);
  spell.critMax=forwardDamage(critMaxBase,stats,element,true);
  spell.baseDamage=(minBase+maxBase)/2;
  spell.damageSource="build-actif";
  // Les caractéristiques de référence hors Air ne sont pas toutes
  // confirmées sur la fiche historique : précision à vérifier en jeu.
  if(classId==="sacrieur"&&element!=="Air")spell.damagePrecision="estimation-jets";
  return spell;
 });
}
