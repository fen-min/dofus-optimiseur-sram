/**
 * OMBRE - audited 50-round MANUAL team champion, integrated into automatic
 * team optimization. Source: results/ombre-manual-50-rotations.json,
 * GitHub Actions run 41557487034.
 *
 * EXACT 50-round benchmark only: 546776 -> 560130.7 damage on the reference
 * 12-PA three-character team, 0% target resistances, melee Sram/Sacrier.
 * The 50-turn route is also an audited OPENING of a 100-turn session.
 * After T50, normal dynamic optimization resumes. The 100-turn total is
 * not guaranteed to improve. No enemy attacks, positioning or
 * summon AI are modeled. Never transplant this route onto edited builds.
 */
import {INITIAL_BUILDS,CLASSES,normalizeBuild} from "./classes.js?v=3.90";
import {prepareBuildSpells} from "./build-damage.js?v=3.90";
import {eligible,castSpell,endTurn} from "./engine.js?v=3.90";
import {sacrierCastAboveFloor,sacrierHealthAboveFloor} from "./sacrier-safety.js?v=3.32";

const classes=["sacrieur","ecaflip","sram"];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const selected=(ctx,s)=>s?.isWeapon===true||ctx.settings.variants?.[s.variantGroup]===s.name;

export const TEAM_FIFTY_AUDITED=Object.freeze({
 sacrieur: [
  ["Furie","Furie","Carnage","Assaut"],
  ["Carnage","Furie","Furie","Assaut"],
  ["Carnage","Manthache","Furie"],
  ["Carnage","Furie","Manthache"],
  ["Carnage","Furie","Furie","Assaut"],
  ["Carnage","Manthache","Furie"],
  ["Carnage","Furie","Manthache"],
  ["Carnage","Furie","Furie","Assaut"],
  ["Carnage","Furie","Manthache"],
  ["Carnage","Manthache","Furie"],
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Carnage","Furie","Manthache"],
  ["Carnage","Furie","Manthache"],
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Carnage","Furie","Manthache"],
  ["Furie","Furie","Assaut","Désolation"],
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Carnage","Furie","Manthache"],
  ["Carnage","Furie","Manthache"],
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Carnage","Manthache","Furie"],
  ["Furie","Furie","Assaut","Désolation"],
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Carnage","Furie","Manthache"],
  ["Carnage","Furie","Manthache"],
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Carnage","Manthache","Furie"],
  ["Furie","Furie","Assaut","Désolation"],
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Carnage","Furie","Manthache"],
  ["Carnage","Furie","Manthache"],
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Carnage","Manthache","Furie"],
  ["Furie","Furie","Assaut","Désolation"],
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Carnage","Furie","Manthache"],
  ["Carnage","Furie","Manthache"],
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Carnage","Manthache","Furie"],
  ["Furie","Furie","Assaut","Désolation"],
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Carnage","Furie","Manthache"],
  ["Carnage","Furie","Manthache"],
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Carnage","Manthache","Furie"],
  ["Furie","Furie","Assaut","Désolation"],
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Carnage","Furie","Manthache"],
  ["Carnage","Furie","Manthache"],
  ["Manthache","Furie","Carnage"],
 ],
 ecaflip: [
  ["Griffe Invocatrice","Yams","Griffe Joueuse","Sceptre du Roi Joueur"],
  ["Griffe Joueuse","Kraps","Infortune"],
  ["Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
  ["Kraps","Pile ou Face","Sceptre du Roi Joueur","Infortune"],
  ["Griffe Invocatrice","Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur"],
  ["Kraps","Pile ou Face","Sceptre du Roi Joueur","Infortune"],
  ["Kraps","Pile ou Face","Sceptre du Roi Joueur","Infortune"],
  ["Kraps","Pile ou Face","Sceptre du Roi Joueur","Infortune"],
  ["Griffe Invocatrice","Griffe Joueuse","Pile ou Face","Pile ou Face","Kraps"],
  ["Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur","Infortune"],
  ["Griffe Joueuse","Kraps","Infortune"],
  ["Griffe Joueuse","Sceptre du Roi Joueur","Infortune"],
  ["Pile ou Face","Griffe Joueuse","Yams","Infortune"],
  ["Kraps","Pile ou Face","Sceptre du Roi Joueur","Infortune"],
  ["Kraps","Pile ou Face","Sceptre du Roi Joueur","Infortune"],
  ["Griffe Joueuse","Kraps","Infortune"],
  ["Griffe Joueuse","Yams","Pile ou Face","Infortune"],
  ["Kraps","Pile ou Face","Sceptre du Roi Joueur","Infortune"],
  ["Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
  ["Kraps","Pile ou Face","Sceptre du Roi Joueur","Infortune"],
  ["Griffe Joueuse","Kraps","Infortune"],
  ["Griffe Joueuse","Yams","Pile ou Face","Infortune"],
  ["Kraps","Pile ou Face","Sceptre du Roi Joueur","Infortune"],
  ["Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
  ["Kraps","Pile ou Face","Sceptre du Roi Joueur","Infortune"],
  ["Griffe Joueuse","Kraps","Infortune"],
  ["Griffe Joueuse","Yams","Pile ou Face","Infortune"],
  ["Kraps","Pile ou Face","Sceptre du Roi Joueur","Infortune"],
  ["Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
  ["Kraps","Pile ou Face","Sceptre du Roi Joueur","Infortune"],
  ["Griffe Joueuse","Kraps","Infortune"],
  ["Griffe Joueuse","Yams","Pile ou Face","Infortune"],
  ["Kraps","Pile ou Face","Sceptre du Roi Joueur","Infortune"],
  ["Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
  ["Kraps","Pile ou Face","Sceptre du Roi Joueur","Infortune"],
  ["Griffe Joueuse","Kraps","Infortune"],
  ["Griffe Joueuse","Yams","Pile ou Face","Infortune"],
  ["Kraps","Pile ou Face","Sceptre du Roi Joueur","Infortune"],
  ["Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
  ["Kraps","Pile ou Face","Sceptre du Roi Joueur","Infortune"],
  ["Griffe Joueuse","Kraps","Infortune"],
  ["Griffe Joueuse","Yams","Pile ou Face","Infortune"],
  ["Kraps","Pile ou Face","Sceptre du Roi Joueur","Infortune"],
  ["Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
  ["Kraps","Pile ou Face","Sceptre du Roi Joueur","Infortune"],
  ["Griffe Joueuse","Kraps","Infortune"],
  ["Griffe Joueuse","Yams","Pile ou Face","Infortune"],
  ["Griffe Joueuse","Kraps","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur"],
  ["Kraps","Pile ou Face","Sceptre du Roi Joueur","Infortune"],
  ["Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur","Infortune"],
 ],
 sram: [
  ["Arnaque","Injection Toxique","Arsenic"],
  ["Fourvoiement","Fourvoiement","Épidémie"],
  ["Truanderie","Arnaque","Arnaque","Arsenic"],
  ["Fourvoiement","Fourvoiement","Épidémie"],
  ["Truanderie","Arnaque","Arnaque","Arsenic"],
  ["Injection Toxique","Arnaque","Épidémie"],
  ["Manigance","Arnaque","Arsenic","Épidémie"],
  ["Fourvoiement","Fourvoiement","Épidémie"],
  ["Truanderie","Arnaque","Arnaque","Arsenic"],
  ["Fourvoiement","Fourvoiement","Épidémie"],
  ["Injection Toxique","Arsenic","Épidémie"],
  ["Manigance","Arnaque","Arnaque","Épidémie"],
  ["Truanderie","Arsenic","Arnaque","Arnaque"],
  ["Manigance","Arnaque","Arnaque","Épidémie"],
  ["Épidémie","Fourvoiement","Fourvoiement"],
  ["Injection Toxique","Arsenic","Épidémie"],
  ["Manigance","Arnaque","Arnaque","Épidémie"],
  ["Truanderie","Arsenic","Arnaque","Arnaque"],
  ["Épidémie","Fourvoiement","Fourvoiement"],
  ["Manigance","Arsenic","Épidémie","Arnaque"],
  ["Arnaque","Injection Toxique","Épidémie"],
  ["Truanderie","Arsenic","Arnaque","Arnaque"],
  ["Fourvoiement","Fourvoiement","Épidémie"],
  ["Truanderie","Arsenic","Arnaque","Arnaque"],
  ["Épidémie","Fourvoiement","Fourvoiement"],
  ["Injection Toxique","Arsenic","Épidémie"],
  ["Manigance","Arnaque","Arnaque","Épidémie"],
  ["Truanderie","Arsenic","Arnaque","Arnaque"],
  ["Épidémie","Fourvoiement","Fourvoiement"],
  ["Manigance","Arsenic","Épidémie","Arnaque"],
  ["Arnaque","Injection Toxique","Épidémie"],
  ["Truanderie","Arsenic","Arnaque","Arnaque"],
  ["Fourvoiement","Fourvoiement","Épidémie"],
  ["Truanderie","Arsenic","Arnaque","Arnaque"],
  ["Épidémie","Fourvoiement","Fourvoiement"],
  ["Injection Toxique","Arsenic","Épidémie"],
  ["Manigance","Arnaque","Arnaque","Épidémie"],
  ["Truanderie","Arsenic","Arnaque","Arnaque"],
  ["Épidémie","Fourvoiement","Fourvoiement"],
  ["Manigance","Arsenic","Épidémie","Arnaque"],
  ["Arnaque","Injection Toxique","Épidémie"],
  ["Truanderie","Arsenic","Arnaque","Arnaque"],
  ["Fourvoiement","Fourvoiement","Épidémie"],
  ["Truanderie","Arsenic","Arnaque","Arnaque"],
  ["Épidémie","Fourvoiement","Fourvoiement"],
  ["Injection Toxique","Arsenic","Épidémie"],
  ["Manigance","Arnaque","Arnaque","Épidémie"],
  ["Truanderie","Arsenic","Arnaque","Arnaque"],
  ["Épidémie","Fourvoiement","Fourvoiement"],
  ["Fourvoiement","Fourvoiement","Épidémie"],
 ]
});

const referenceBuild=cls=>{
 const from=INITIAL_BUILDS.find(b=>b.classId===cls);
 if(!from)return null;
 const build=normalizeBuild(from);
 if(cls==="sacrieur"||cls==="sram")build.distance=1;
 return build;
};
/** Called once when starting a NEW automatic team combat. */
export function chooseTeamFiftyPlan(contexts,target,strategy){
 if(strategy?.mode!=="long"||strategy.minHpPercent!==50||
  target?.turns<50||target?.turns>100||target?.hp!==1_000_000_000_000||
  target?.criticals!==true||
  Object.values(target.resistances||{}).some(v=>Number(v)!==0)||
  !Array.isArray(contexts)||contexts.length!==3)return null;
 const byClass=new Map(contexts.map(c=>[c.settings?.classId,c]));
 if(byClass.size!==3||classes.some(c=>!byClass.has(c)))return null;
 for(const cls of classes){
  const ctx=byClass.get(cls),ref=referenceBuild(cls);
  if(!ref||ctx.build.id!==ref.id||ctx.build.character!==ref.character||
    ctx.settings.ap!==12||ctx.settings.turns!==target.turns||
    ctx.settings.distance!==ref.distance||
    ctx.settings.criticals!==true||
    !same(ctx.settings.variants,ref.variants)||
    !same(ctx.spells,prepareBuildSpells(ref,CLASSES[cls])))return null;
  if(cls==="sacrieur"&&(
    ctx.settings.sacrierStartingHpPercent!==100||
    ctx.settings.sacrierMaxHp!==ref.stats.hitPoints||
    !ctx.settings.sacrierHealthSimulation))return null;
  if(cls==="ecaflip"&&(
    ctx.settings.dofusTurquoise!==true||
    !same(ctx.settings.ecaflipStats,ref.stats)))return null;
 }
 return {id:"team-audited-fifty-v1",enabled:true,rounds:50,
  referenceDamage:546776,expectedDamage:560130.7,minHpPercent:50};
}
/** Choose only current actor actions, never commit future turns or grant DPS. */
export function teamFiftyCurrentPlan(entry,plan,strategy){
 if(!plan?.enabled||plan.id!=="team-audited-fifty-v1"||
  strategy?.mode!=="long"||strategy.minHpPercent!==50||
  entry.currentPA!==12)return null;
 const cls=entry.ctx.settings.classId,now=entry.state.turn;
 const names=TEAM_FIFTY_AUDITED[cls]?.[now-1];
 if(!names||now<1||now>50)return null;
 const equipped=new Map(entry.ctx.spells.filter(s=>selected(entry.ctx,s))
  .map(s=>[s.name,s]));
 let state=entry.state;
 const actions=[];
 for(const name of names){
  const spell=equipped.get(name);
  if(!spell||!eligible(spell,state,entry.ctx.settings))return null;
  const next=castSpell(state,spell,entry.ctx.settings);
  if(cls==="sacrieur"&&!sacrierCastAboveFloor(state,spell,next,50))
   return null;
  state=next;
  actions.push({id:spell.id});
 }
 if(cls==="sacrieur"&&
   !sacrierHealthAboveFloor(endTurn(state,entry.ctx.settings),50))
  return null;
 return {actions,settings:entry.ctx.settings,auditedFifty:true,
  label:"DPS équipe · rotation manuelle validée 50 tours (PV Sacrieur ≥50 %)"};
}
