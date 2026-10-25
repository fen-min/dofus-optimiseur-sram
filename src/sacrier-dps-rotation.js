/**
 * Manual-audit-inspired Sacrieur DPS lines.
 *
 * The 3-round and 10-round discoveries are CANDIDATES, never fabricated
 * damage or a forced combat log. Every proposed spell and future cast runs
 * through eligible/castSpell/endTurn with the real Sacrier HP-floor rule.
 *
 * Known audited 12 AP motifs at 50% HP:
 * - short opening: Pacte, Furie x2, Assaut x2
 * - sustained attack: Furie x2, Desolation, Assaut
 * - Pacte refresh: Pacte, Furie x2, Assaut x2
 * Long horizon may postpone the first Pacte to T2.
 */
import {eligible,castSpell,endTurn} from "./engine.js?v=3.26";
import {sacrierCastAboveFloor,sacrierHealthAboveFloor} from "./sacrier-safety.js?v=3.32";

export const SACRIER_AUDITED_LINES=Object.freeze({
 attack:["Furie","Furie","Désolation","Assaut"],
 pact:["Pacte de Sang","Furie","Furie","Assaut","Assaut"]
});
const selected=(ctx,s)=>s.isWeapon||ctx.settings.variants?.[s.variantGroup]===s.name;
const hasPact=s=>(s.buffs||[]).some(b=>b.until>=s.turn&&
 (b.key==="Pacte de Sang"||b.key?.startsWith("Pacte de Sang:")));
function pactEquipped(ctx){
 return ctx.settings.classId==="sacrieur"&&ctx.spells.some(s=>
  s.name==="Pacte de Sang"&&selected(ctx,s)&&
  s.status?.buff?.stat==="Puissance"&&s.status.buff.value>=75);
}
function replayNames(seed,ctx,names,hpMin){
 let state=seed;
 for(const name of names){
  const spell=ctx.spells.find(s=>s.name===name&&selected(ctx,s));
  if(!spell||!eligible(spell,state,ctx.settings))return null;
  const next=castSpell(state,spell,ctx.settings);
  if(!sacrierCastAboveFloor(state,spell,next,hpMin))return null;
  state=next;
 }
 return state;
}
function candidateNames(seed,forcePact=false){
 return !hasPact(seed)&&forcePact?
  SACRIER_AUDITED_LINES.pact:SACRIER_AUDITED_LINES.attack;
}
function evaluateLine(entry,names,horizon,minHpPercent){
 const {ctx}=entry;
 let state=replayNames(entry.state,ctx,names,minHpPercent);
 if(!state)return null;
 const opening=state;
 state=endTurn(state,ctx.settings);
 if(!sacrierHealthAboveFloor(state,minHpPercent))return null;
 const firstTurnTotal=state.total-entry.state.total;
 for(let i=1;i<horizon;i++){
  // Pacte expires naturally after three rounds; refresh only when absent.
  const sequence=candidateNames(state,!hasPact(state));
  state=replayNames(state,ctx,sequence,minHpPercent);
  if(!state)return null;
  state=endTurn(state,ctx.settings);
  if(!sacrierHealthAboveFloor(state,minHpPercent))return null;
 }
 return {actions:names.map(name=>({id:ctx.spells.find(s=>s.name===name&&selected(ctx,s)).id})),
  total:state.total-entry.state.total,firstTurnTotal,
  label:"Rotation Sacrieur testée · Pacte / Furie / Désolation"};
}
/**
 * Do not apply reference 12 PA combos to different equipment, PA, spell
 * variants, or a timeline where cooldown/HP makes them illegal.
 * Compare the exact multi-round predicted damage of the two known openings,
 * plus the current auto plan; fall back to the generic optimizer when none
 * fits. Only the NEXT turn is executed by the caller.
 */
export function planSacrierAuditedDps(entry,strategy,autoPlan=null){
 const {ctx,state}=entry;
 if(!pactEquipped(ctx)||!state.sacrierHealth||entry.currentPA!==12||
    strategy.mode!=="long"||strategy.minHpPercent<50)return null;
 const floor=strategy.minHpPercent;
 const horizon=Math.min(strategy.horizon,ctx.settings.turns-state.turn+1);
 if(horizon<=0)return null;
 // Equipping Pacte does not imply that every build must use this pattern:
 // the simulator rejects unavailable casts and unsafe HP histories.
 const variants=[
  candidateNames(state,false),
  candidateNames(state,true)
 ];
 if(autoPlan?.actions?.length){
  const names=autoPlan.actions.map(a=>ctx.spells.find(s=>String(s.id)===String(a.id))?.name);
  if(names.every(Boolean))variants.push(names);
 }
 let winner=null;
 for(const sequence of variants){
  const trial=evaluateLine(entry,sequence,horizon,floor);
  if(trial&&(!winner||trial.total>winner.total+.001))winner=trial;
 }
 if(!winner)return null;
 return {actions:winner.actions,label:winner.label,settings:ctx.settings,
  forecastTotal:Math.round(winner.total*10)/10};
}
