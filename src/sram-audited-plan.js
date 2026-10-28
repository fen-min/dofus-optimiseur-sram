/**
 * Matryoshka Sram Air: verified MANUAL DPS reference trajectories.
 * 3 turns: 9 836.5; first 10: 31 646.7; first 15: 47 633.4;
 * 100: 318 816.6, with NO repeated Manigance during active effect.
 * Exact rotation is used only while matched with the reference build and
 * its mechanically significant battle history. Otherwise the generic
 * long-duration team optimizer chooses a new plan.
 *
 * The 100-turn continuation was heuristic and validated by manual replay,
 * not a mathematical proof of globally optimal DPS.
 */
import {initialState,eligible,castSpell,endTurn} from "./engine.js?v=3.56";

export const SRAM_AUDITED_3=Object.freeze([["Arnaque","Injection Toxique","Épidémie"],["Manigance","Arnaque","Arsenic","Épidémie"],["Fourvoiement","Fourvoiement","Épidémie"]]);
export const SRAM_AUDITED_100=Object.freeze([["Arnaque","Injection Toxique","Arsenic"],["Fourvoiement","Fourvoiement","Épidémie"],["Truanderie","Arnaque","Arnaque","Arsenic"],["Fourvoiement","Fourvoiement","Épidémie"],["Truanderie","Arnaque","Arnaque","Arsenic"],["Injection Toxique","Arnaque","Épidémie"],["Manigance","Arnaque","Arsenic","Épidémie"],["Fourvoiement","Fourvoiement","Épidémie"],["Truanderie","Arnaque","Arnaque","Arsenic"],["Fourvoiement","Fourvoiement","Épidémie"],["Injection Toxique","Arsenic","Épidémie"],["Manigance","Arnaque","Arnaque","Épidémie"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Épidémie","Fourvoiement","Fourvoiement"],["Épidémie","Fourvoiement","Fourvoiement"],["Arnaque","Injection Toxique","Arsenic"],["Manigance","Arnaque","Épidémie","Arnaque"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Épidémie","Fourvoiement","Fourvoiement"],["Manigance","Arsenic","Épidémie","Arnaque"],["Arnaque","Injection Toxique","Épidémie"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Manigance","Épidémie","Arnaque","Arnaque"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Épidémie","Fourvoiement","Fourvoiement"],["Injection Toxique","Arsenic","Épidémie"],["Manigance","Arnaque","Arnaque","Épidémie"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Épidémie","Fourvoiement","Fourvoiement"],["Manigance","Arsenic","Épidémie","Arnaque"],["Arnaque","Injection Toxique","Épidémie"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Manigance","Épidémie","Arnaque","Arnaque"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Épidémie","Fourvoiement","Fourvoiement"],["Injection Toxique","Arsenic","Épidémie"],["Manigance","Arnaque","Arnaque","Épidémie"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Épidémie","Fourvoiement","Fourvoiement"],["Manigance","Arsenic","Épidémie","Arnaque"],["Arnaque","Injection Toxique","Épidémie"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Manigance","Épidémie","Arnaque","Arnaque"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Épidémie","Fourvoiement","Fourvoiement"],["Injection Toxique","Arsenic","Épidémie"],["Manigance","Arnaque","Arnaque","Épidémie"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Épidémie","Fourvoiement","Fourvoiement"],["Manigance","Arsenic","Épidémie","Arnaque"],["Arnaque","Injection Toxique","Épidémie"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Manigance","Épidémie","Arnaque","Arnaque"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Épidémie","Fourvoiement","Fourvoiement"],["Injection Toxique","Arsenic","Épidémie"],["Manigance","Arnaque","Arnaque","Épidémie"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Épidémie","Fourvoiement","Fourvoiement"],["Manigance","Arsenic","Épidémie","Arnaque"],["Arnaque","Injection Toxique","Épidémie"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Manigance","Épidémie","Arnaque","Arnaque"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Épidémie","Fourvoiement","Fourvoiement"],["Injection Toxique","Arsenic","Épidémie"],["Manigance","Arnaque","Arnaque","Épidémie"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Épidémie","Fourvoiement","Fourvoiement"],["Manigance","Arsenic","Épidémie","Arnaque"],["Arnaque","Injection Toxique","Épidémie"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Manigance","Épidémie","Arnaque","Arnaque"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Épidémie","Fourvoiement","Fourvoiement"],["Injection Toxique","Arsenic","Épidémie"],["Manigance","Arnaque","Arnaque","Épidémie"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Épidémie","Fourvoiement","Fourvoiement"],["Manigance","Arsenic","Épidémie","Arnaque"],["Arnaque","Injection Toxique","Épidémie"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Manigance","Épidémie","Arnaque","Arnaque"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Épidémie","Fourvoiement","Fourvoiement"],["Injection Toxique","Arsenic","Épidémie"],["Manigance","Arnaque","Arnaque","Épidémie"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Épidémie","Fourvoiement","Fourvoiement"],["Manigance","Arsenic","Épidémie","Arnaque"],["Arnaque","Injection Toxique","Épidémie"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Manigance","Épidémie","Arnaque","Arnaque"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Épidémie","Fourvoiement","Fourvoiement"],["Injection Toxique","Arsenic","Épidémie"],["Manigance","Arnaque","Arnaque","Épidémie"],["Truanderie","Arsenic","Arnaque","Arnaque"],["Épidémie","Fourvoiement","Fourvoiement"],["Fourvoiement","Fourvoiement","Arnaque"]]);
const REFERENCE_SPELL_DAMAGE=Object.freeze({"Truanderie":[118,129],"Arsenic":[478,515],"Épidémie":[850,925],"Arnaque":[645,701],"Injection Toxique":[701,776],"Fourvoiement":[776,850],"Manigance":[0,0]});

const selected=(ctx,spell)=>spell.isWeapon||ctx.settings.variants?.[spell.variantGroup]===spell.name;
const hasManigance=state=>(state.buffs||[]).some(b=>
 b.until>=state.turn&&(b.key==="Manigance"||String(b.key).startsWith("Manigance:")));
const details=state=>JSON.stringify([
 state.turn,state.pa,state.used,state.ready,
 (state.buffs||[]).map(b=>[b.key,b.stat,b.amount,b.until,b.stacks]),
 Object.entries(state.dots||{}).sort(([a],[b])=>a.localeCompare(b))
  .map(([key,d])=>[key,d.name,d.left,d.phase]),
 (state.traps||[]).map(t=>[t.spell?.id,t.triggered]),
 state.charges,state.visible,state.position,
 state.concentrationExpires,(state.invocations||[]).map(x=>[x.kind,x.turn,x.charges])
]);

export function isReferenceSram(ctx){
 if(ctx.settings.classId!=="sram"||ctx.build.id!=="sram-air-pvm"||
  ctx.settings.ap!==12||!ctx.settings.criticals)return false;
 if(Object.values(ctx.settings.resistances||{}).some(r=>Number(r)!==0))return false;
 const spells=new Map(ctx.spells.filter(s=>selected(ctx,s)).map(s=>[s.name,s]));
 if(!spells.has("Manthache"))return false;
 return Object.entries(REFERENCE_SPELL_DAMAGE).every(([name,range])=>{
  const spell=spells.get(name);
  return spell&&Math.abs(spell.min-range[0])<.02&&Math.abs(spell.max-range[1])<.02;
 });
}
export function sramAuditedPlan(entry,strategy){
 const {ctx,state,currentPA}=entry;
 if(strategy.mode!=="long"||!isReferenceSram(ctx)||currentPA!==12)return null;
 const now=state.turn,limit=Math.min(Number(ctx.settings.turns)||100,Number(strategy.horizon)||100);
 const route=limit<=3?SRAM_AUDITED_3:SRAM_AUDITED_100;
 if(now<1||now>Math.min(limit,route.length))return null;
 const equipped=new Map(ctx.spells.filter(s=>selected(ctx,s)).map(s=>[s.name,s]));
 let expected=initialState(ctx.settings);
 for(let t=1;t<=now;t++){
  if(t===now&&details(expected)!==details(state))return null;
  const actions=[];
  for(const name of route[t-1]){
   const spell=equipped.get(name);
   if(!spell||!eligible(spell,expected,ctx.settings))return null;
   if(name==="Manigance"&&hasManigance(expected))return null;
   actions.push({id:spell.id});
   expected=castSpell(expected,spell,ctx.settings);
  }
  if(t===now){
   return {actions,settings:ctx.settings,
    label:"Matryoshka · rotation manuelle vérifiée ("+(limit<=3?"3":"100")+" tours)",
    audited:true};
  }
  expected=endTurn(expected,ctx.settings);
 }
 return null;
}
