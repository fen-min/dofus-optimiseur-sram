/**
 * HP-specific Sacrieur 3-turn audited openings.
 *
 * Each of these openings was independently replayed over 100 full turns at
 * 12 PA, with 10-turn lookahead, criticals on and a 0%-resist single target.
 * Strict reference guards prevent applying them to customized equipment,
 * wrong variants, AP, starting HP, or diverged HP/buff/cooldown histories.
 * This does not claim a mathematical global optimum.
 */
import {INITIAL_BUILDS,normalizeBuild,CLASSES} from "./classes.js?v=3.66";
import {prepareBuildSpells} from "./build-damage.js?v=3.24";
import {initialState,eligible,castSpell,endTurn} from "./engine.js?v=3.56";
import {sacrierCastAboveFloor,sacrierHealthAboveFloor} from "./sacrier-safety.js?v=3.32";

const F=Object.freeze(["Furie","Furie","Assaut","Désolation"]);
const CHAMPIONS=Object.freeze([
 {starting:40,floor:20,variant:"Pacte de Sang",rounds:[F,F,F]},
 {starting:60,floor:50,variant:"Mutilation",rounds:[
  ["Mutilation","Furie","Furie","Désolation"],F,F]},
 {starting:70,floor:50,variant:"Mutilation",rounds:[
  ["Mutilation","Furie","Furie","Assaut","Assaut"],F,F]},
 {starting:80,floor:50,variant:"Mutilation",rounds:[
  ["Mutilation","Furie","Furie","Assaut","Assaut"],
  ["Furie","Furie","Assaut","Fulgurance"],F]}
]);
export const SACRIER_HP_100_CHAMPIONS=CHAMPIONS;

const reference=normalizeBuild(INITIAL_BUILDS.find(b=>b.id==="sacri-air-pvm"));
const variantSlot=CLASSES.sacrieur.pairs.findIndex(p=>p.includes("Pacte de Sang"));
const spellsSignature=spells=>JSON.stringify(spells.map(s=>[
 s.id,s.name,s.pa,s.min,s.max,s.critMin,s.critMax,s.element,
 s.status,s.lifeSteal,s.maxPerTurn,s.perTarget,s.cooldown
]));
const sigByVariant=new Map(["Mutilation","Pacte de Sang"].map(variant=>{
 const b=structuredClone(reference);b.variants[variantSlot]=variant;
 return [variant,{
  variants:JSON.stringify(b.variants),
  spells:spellsSignature(prepareBuildSpells(b,CLASSES.sacrieur))
 }];
}));
const selected=(ctx,s)=>s.isWeapon===true||
 ctx.settings.variants?.[s.variantGroup]===s.name;
function referenceContext(ctx,plan){
 if(ctx?.build?.id!=="sacri-air-pvm"||ctx.settings.classId!=="sacrieur"||
    ctx.settings.ap!==12||ctx.settings.distance!==2||
    ctx.settings.sacrierMaxHp!==reference.stats.hitPoints||
    ctx.settings.sacrierStartingHpPercent!==plan.starting||
    !ctx.settings.criticals||
    Object.values(ctx.settings.resistances||{}).some(n=>Number(n)!==0))return false;
 const expected=sigByVariant.get(plan.variant);
 return JSON.stringify(ctx.settings.variants)===expected.variants&&
  spellsSignature(ctx.spells)===expected.spells;
}
function comparable(s){
 return JSON.stringify({
  turn:s.turn,pa:s.pa,ready:s.ready,used:s.used,buffs:s.buffs,
  sacrierHealth:s.sacrierHealth,berserkActive:s.berserkActive,
  mutilationStage:s.mutilationStage,dots:s.dots,charges:s.charges,
  enemyDebuff:s.enemyDebuff,total:s.total
 });
}
/** Validate every preceding action against the actual real combat state. */
export function planAuditedSacrierHpTurn(entry,strategy){
 const {ctx,state,currentPA}=entry;
 if(strategy.mode!=="long"||strategy.horizon!==10||
    currentPA!==12||state.turn<1||state.turn>3)return null;
 const plan=CHAMPIONS.find(p=>p.starting===ctx.settings.sacrierStartingHpPercent&&
  p.floor===strategy.minHpPercent&&
  ctx.settings.variants?.includes(p.variant));
 if(!plan||!referenceContext(ctx,plan))return null;
 let expected=initialState(ctx.settings);
 const spells=new Map(ctx.spells.filter(s=>selected(ctx,s)).map(s=>[s.name,s]));
 for(let t=1;t<=state.turn;t++){
  if(t===state.turn&&comparable(state)!==comparable(expected))return null;
  const actions=[];
  for(const name of plan.rounds[t-1]){
   const spell=spells.get(name);
   if(!spell||!eligible(spell,expected,ctx.settings))return null;
   const after=castSpell(expected,spell,ctx.settings);
   if(!sacrierCastAboveFloor(expected,spell,after,plan.floor))return null;
   expected=after;
   actions.push({id:spell.id});
  }
  const afterTurn=endTurn(expected,ctx.settings);
  if(!sacrierHealthAboveFloor(afterTurn,plan.floor))return null;
  if(t===state.turn)return {
   actions,label:"Sacrieur · ouverture PV validée sur 100 tours",
   settings:ctx.settings,auditedHp:true
  };
  expected=afterTurn;
 }
 return null;
}
