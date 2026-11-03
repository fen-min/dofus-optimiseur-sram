/**
 * Audited 15-round Karuta manual rotation (12 PA, crits on).
 * Re-verified on 2026-11-03 after exhaustive single-spell manual
 * neighborhood tests of every modeled equipped spell:
 * 68 822.9 damage over 15 rounds with one living Kitten. A separate
 * 100-round plan casts three living Kittens by T9, reaching 495 792.4
 * damage on 100 rounds after dynamic play from T16. Both plans were
 * independently replayed through the true manual combat engine.
 * These are the best TESTED legal rotations, not a global proof.
 * Future engine changes must remeasure them rather than trusting history.
 * This is a reusable reference trajectory, not a fabricated damage bonus.
 * Only apply while the build, equipped variants AND modeled ongoing state
 * match the audited trajectory. Fall back to the generic team optimizer on
 * any divergence (cards, ally AP, cooldowns, buffs, changed stats).
 */
import {initialState,eligible,castSpell,endTurn} from "./engine.js?v=3.56";
import {ECAFLIP_KARUTA_STATS} from "./character-stats.js?v=3.20";

export const KARUTA_FIFTEEN_ROUNDS=Object.freeze([
 ["Griffe Invocatrice","Yams","Griffe Joueuse","Sceptre du Roi Joueur"],
 ["Kraps","Infortune","Pile ou Face","Pile ou Face","Yams"],
 ["Tout ou Rien","Sceptre du Roi Joueur","Rekop","Yams"],
 ["Griffe Joueuse","Kraps","Infortune"],
 ["Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
 ["Kraps","Baraka","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
 ["Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
 ["Griffe Joueuse","Sceptre du Roi Joueur","Infortune"],
 ["Kraps","Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur"],
 ["Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur","Infortune"],
 ["Griffe Joueuse","Kraps","Infortune"],
 ["Griffe Joueuse","Sceptre du Roi Joueur","Infortune"],
 ["Yams","Pile ou Face","Pile ou Face","Yams","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
 ["Kraps","Kraps","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
 ["Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur","Infortune"]
]);

/**
 * The long-combat plan pays 3 PA for kittens on T1/T5/T9, maintaining
 * +90/+180/+270 Power indefinitely as long as they survive. The actual
 * engine enforces six summon slots and THREE buff stacks independently.
 * Keep a distinct short (15-turn) plan: early extra summons are not yet
 * worth their immediate AP cost at that horizon.
 */
export const KARUTA_LONG_KITTEN_ROUNDS=Object.freeze(
 KARUTA_FIFTEEN_ROUNDS.map((row,i)=>Object.freeze(
  i===4?["Griffe Invocatrice","Griffe Joueuse",
   "Pile ou Face","Pile ou Face","Sceptre du Roi Joueur"]:
  i===8?["Pile ou Face","Pile ou Face","Griffe Invocatrice",
   "Kraps","Griffe Joueuse"]:
  row.slice()
  ))
);
const selected=(ctx,spell)=>spell.isWeapon||ctx.settings.variants?.[spell.variantGroup]===spell.name;
const comparable=(state)=>JSON.stringify({
 turn:state.turn,pa:state.pa,ready:state.ready,used:state.used,
 buffs:state.buffs,invocations:state.invocations,
 ecaHand:state.ecaHand,ecaTable:state.ecaTable,
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
 if(Number(stats.flatDamage?.Eau)!==Number(r.flatDamage.Eau)||
    Number(stats.summons)!==Number(r.summons))return false;
 if(Object.values(ctx.settings.resistances||{}).some(v=>Number(v)!==0))return false;
 return true;
}
/** Return the next manually validated opening only when matching the prefix. */
export function planAuditedKarutaTurn(entry,strategy){
 const {ctx,state,currentPA}=entry;
 const now=state.turn;
 // Target fight duration, not the lookahead knob, decides whether to
 // invest 3x3 AP into persistent summons. For targets under 30 turns,
 // keep the faster 15-turn manual reference opening.
 const rounds=ctx.settings.turns>=30?KARUTA_LONG_KITTEN_ROUNDS:
  KARUTA_FIFTEEN_ROUNDS;
 if(strategy.mode!=="long"||!referenceBuild(ctx)||currentPA!==12||
  now<1||now>rounds.length)return null;
 let expected=initialState(ctx.settings);
 const ids=new Map(ctx.spells.filter(x=>selected(ctx,x)).map(s=>[s.name,s]));
 for(let t=1;t<=now;t++){
  // Only follow the reference plan when the ACTUAL state still matches its
  // predecessor. Do not forcibly continue after a dynamic deviation.
  if(t===now&&comparable(state)!==comparable(expected))return null;
  const actions=[];
  for(const name of rounds[t-1]){
   const spell=ids.get(name);
   if(!spell||!eligible(spell,expected,ctx.settings))return null;
   expected=castSpell(expected,spell,ctx.settings);
   actions.push({id:spell.id});
  }
  if(t===now)return {
   actions,label:ctx.settings.turns>=30?
    "Karuta · 3 Chatons vivants, +270 Puissance (combat long)":
    "Karuta · Chaton vivant (combat court, 15 tours)",
   settings:ctx.settings,audited:true
  };
  expected=endTurn(expected,ctx.settings);
 }
 return null;
}
