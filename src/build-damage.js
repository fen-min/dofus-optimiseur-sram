/**
 * Active-build damage rows.
 *
 * DofusBook 20072789-db/objets: reference Sacrieur equipment (23 Oct 2026).
 * The accompanying spell catalog contains PRECOMPUTED damage for that equipment.
 * Reconstruct unbuffed integer spell bases from those rows once, then evaluate
 * them against the CURRENT active character's stats, not the reference equipment.
 *
 * Formula per single line (normal or critical):
 *   floor((floor(base * (100 + elementalStat + power) / 100)
 *          + fixedElementDamage + (critical ? criticalDamage : 0))
 *         * (1 + spellDamagePercent / 100))
 *
 * Source fields are explicitly observed in the user's DofusBook screenshot;
 * source matches all 60 elemental rows (normal and critical) in the catalog.
 * Effects with unknown additional lines/conditional rules remain approximate.
 */
import {SACRIER_CATALOG} from "./sacrier-catalog.js";
import {equippedWeaponSpell} from "./weapons.js?v=3.22";
import {prepareEcaflipSpellDamage} from "./ecaflip-spells.js?v=3.24";

export const SACRIER_DOFUSBOOK_GEAR_STATS={
 agility:1368,chance:410,strength:100,intelligence:100,power:160,critical:-44,
 flatDamage:{Air:172,Eau:82,Terre:25,Feu:25,Neutre:25},
 criticalDamage:25,spellDamagePercent:0
};
const ATTR={Air:"agility",Eau:"chance",Terre:"strength",Feu:"intelligence",Neutre:"strength"};
const FIELDS=["min","max","critMin","critMax","summonBase"];

function complete(stats,element){
 const att=ATTR[element];
 return !!att&&Number.isFinite(stats?.[att])&&Number.isFinite(stats?.power)
  &&Number.isFinite(stats?.flatDamage?.[element])
  &&Number.isFinite(stats?.criticalDamage)
  &&Number.isFinite(stats?.spellDamagePercent);
}
function calculatedLine(base,element,critical,stats){
 const characteristic=stats[ATTR[element]];
 const scaling=(100+characteristic+stats.power)/100;
 const fixed=stats.flatDamage[element]+(critical?stats.criticalDamage:0);
 const spellMultiplier=1+stats.spellDamagePercent/100;
 return Math.max(0,Math.floor((Math.floor(base*scaling+1e-9)+fixed)*spellMultiplier+1e-9));
}
function recoverBase(row,element,critical){
 const source=SACRIER_DOFUSBOOK_GEAR_STATS;
 const scaling=(100+source[ATTR[element]]+source.power)/100;
 const fixed=source.flatDamage[element]+(critical?source.criticalDamage:0);
 const inferred=Math.round((row-fixed)/scaling);
 // Reject the reconstruction if the source DofusBook line does not match.
 return inferred>=0&&calculatedLine(inferred,element,critical,source)===row?inferred:null;
}
/**
 * A fresh spell array is returned. The class's DofusBook catalog stays intact.
 * Manual spell calibration takes precedence over automatic stat scaling unless
 * the stored calibration merely copies the original source DofusBook row (old
 * OMBRE versions stored the whole catalog as a "calibration").
 */
export function prepareBuildSpells(build,cls){
 const edits=build?.calibration||{},stats=build?.stats;
 const classSpells=cls.spells.map(original=>{
  const spell=cls.id==="ecaflip"?prepareEcaflipSpellDamage(original,stats):
   {...original,status:JSON.parse(JSON.stringify(original.status||{}))};
  if(cls.id==="sacrieur"&&!spell.nonDirect&&spell.element&&complete(stats,spell.element)){
   const e=spell.element,sourceRows=[original.min,original.max,original.critMin,original.critMax];
   const inferred=sourceRows.map((row,i)=>recoverBase(row,e,i>=2));
   if(inferred.every(n=>n!==null)){
    [spell.min,spell.max,spell.critMin,spell.critMax]=inferred.map((n,i)=>calculatedLine(n,e,i>=2,stats));
    spell.baseDamage=(inferred[0]+inferred[1])/2;
    // A spell's source critChance is the underlying probability after
    // DofusBook's reference critical modifier. Undo that modifier before
    // applying the current build's modifier. DOFUS has a 5% minimum chance.
    const catalog=SACRIER_CATALOG.find(x=>x.id===spell.id);
    if(Number.isFinite(stats.critical)&&Number.isFinite(catalog?.critChance))
     spell.critChance=Math.max(.05,Math.min(1,
      (catalog.critChance+stats.critical-SACRIER_DOFUSBOOK_GEAR_STATS.critical)/100));
    spell.damageSource="active-build-stats";
   }
  }
  const edit=edits[spell.id];
  if(edit){
   for(const key of FIELDS){
    if(!Number.isFinite(edit[key])||edit[key]<0)continue;
    // Old saved "Calibrer" copied all DofusBook values: they must not
    // hide stat-based recalculation after migrating an existing player build.
    if(spell.damageSource==="active-build-stats"&&
       key!=="summonBase"&&edit[key]===original[key])continue;
    spell[key]=edit[key];
    if(spell.damageSource==="active-build-stats"&&key!=="summonBase")
     spell.damageSource="manual-override";
   }
   if(spell.status.buff&&edit.buff){
    for(const key of ["value","duration"])
     if(Number.isFinite(edit.buff[key])&&edit.buff[key]>=0)spell.status.buff[key]=edit.buff[key];
   }
  }
  return spell;
 });
 const equipped=equippedWeaponSpell(build);
 return equipped?[...classSpells,equipped]:classSpells;
}
