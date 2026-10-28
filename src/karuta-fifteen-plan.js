/**
 * Audited 15-round Karuta manual rotation (66 672.3 solo, 12 PA, crits on).
 * This is a reusable reference trajectory, not a fabricated damage bonus.
 * Only apply while the build, equipped variants AND modeled ongoing state
 * match the audited trajectory. Fall back to the generic team optimizer on
 * any divergence (cards, ally AP, cooldowns, buffs, changed stats).
 */
import {initialState,eligible,castSpell,endTurn} from "./engine.js?v=3.56";
import {ECAFLIP_KARUTA_STATS} from "./character-stats.js?v=3.20";

export const KARUTA_FIFTEEN_ROUNDS=Object.freeze([
 ["Yams","Griffe Joueuse","Kraps","Sceptre du Roi Joueur"],
 ["Yams","Infortune","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur"],
 ["Baraka","Tout ou Rien","Rekop","Yams"],
 ["Griffe Joueuse","Kraps","Infortune"],
 ["Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
 ["Baraka","Kraps","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
 ["Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
 ["Griffe Joueuse","Sceptre du Roi Joueur","Infortune"],
 ["Yams","Kraps","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
 ["Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur","Infortune"],
 ["Griffe Joueuse","Baraka","Infortune"],
 ["Griffe Joueuse","Sceptre du Roi Joueur","Infortune"],
 ["Yams","Pile ou Face","Pile ou Face","Yams","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
 ["Kraps","Kraps","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
 ["Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur","Infortune"]
]);

const selected=(ctx,spell)=>spell.isWeapon||ctx.settings.variants?.[spell.variantGroup]===spell.name;
const comparable=(state)=>JSON.stringify({
 turn:state.turn,pa:state.pa,ready:state.ready,used:state.used,
 buffs:state.buffs,ecaHand:state.ecaHand,ecaTable:state.ecaTable,
 turquoiseProcs:state.turquoiseProcs,enemyCriticalShreds:state.enemyCriticalShreds,
 dots:state.dots,charges:state.charges
});
function referenceBuild(ctx){
 if(ctx.settings.classId!=="ecaflip"||ctx.build.id!=="ecaflip-karuta-eau"||
    !ctx.settings.criticals||!ctx.settings.dofusTurquoise||ctx.settings.ap!==12)return false;
 const stats=ctx.settings.ecaflipStats||{};
 const r=ECAFLIP_KARUTA_STATS;
 if(["chance","power","critical","criticalDamage","spellDamagePercent"].some(k=>
  Number(stats[k])!==Number(r[k])))return false;
 if(Number(stats.flatDamage?.Eau)!==Number(r.flatDamage.Eau))return false;
 if(Object.values(ctx.settings.resistances||{}).some(v=>Number(v)!==0))return false;
 return true;
}
/** Return the next manually validated opening only when matching the prefix. */
export function planAuditedKarutaTurn(entry,strategy){
 const {ctx,state,currentPA}=entry;
 const now=state.turn;
 if(strategy.mode!=="long"||!referenceBuild(ctx)||currentPA!==12||
  now<1||now>KARUTA_FIFTEEN_ROUNDS.length)return null;
 let expected=initialState(ctx.settings);
 const ids=new Map(ctx.spells.filter(x=>selected(ctx,x)).map(s=>[s.name,s]));
 for(let t=1;t<=now;t++){
  // Only follow the reference plan when the ACTUAL state still matches its
  // predecessor. Do not forcibly continue after a dynamic deviation.
  if(t===now&&comparable(state)!==comparable(expected))return null;
  const actions=[];
  for(const name of KARUTA_FIFTEEN_ROUNDS[t-1]){
   const spell=ids.get(name);
   if(!spell||!eligible(spell,expected,ctx.settings))return null;
   expected=castSpell(expected,spell,ctx.settings);
   actions.push({id:spell.id});
  }
  if(t===now)return {
   actions,label:"Karuta · rotation manuelle vérifiée (15 tours)",
   settings:ctx.settings,audited:true
  };
  expected=endTurn(expected,ctx.settings);
 }
 return null;
}
