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
import {TEAM_HUNDRED_AUDITED,TEAM_HUNDRED_META} from "./team-audited-hundred-data.js?v=1";

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
/**
 * The user-supplied 49-turn battle log was replayed exactly (537298.3 damage)
 * at Sacrier distance=1 and Sram distance=1,2,3. Full 50-turn MANUAL replay
 * has also passed at all three Sram distances, producing 560130.7 damage.
 * Consequently, do not reject a perfectly legal and equally powerful
 * rotation just because the Sram build retains its default distance=3.
 * Other builds, variants, stats and PA must still match the audited models.
 */
const allowedSramDistances=new Set([1,2,3]);
function incompatibility(contexts,target,strategy){
 if(!Array.isArray(contexts)||contexts.length!==3)return "Composition différente de la référence à trois personnages.";
 const byClass=new Map(contexts.map(c=>[c.settings?.classId,c]));
 if(byClass.size!==3||classes.some(cls=>!byClass.has(cls)))
  return "Composition différente de Karuta, Matryoshka et du Sacrieur.";
 if(strategy?.mode!=="long")return "Activer la stratégie DPS longue durée.";
 if(strategy.minHpPercent!==50)return "Régler le seuil de sécurité du Sacrieur à 50 %.";
 if(target?.turns<50||target?.turns>100)return "Le combat doit prévoir au moins 50 tours (maximum 100).";
 if(target?.hp!==1_000_000_000_000)return "La cible de référence utilise des PV virtuels non limitants.";
 if(target?.criticals!==true)return "Activer les critiques probables.";
 if(Object.values(target.resistances||{}).some(v=>Number(v)!==0))
  return "La rotation a été vérifiée sur une cible à 0 % de résistances.";
 for(const cls of classes){
  const ctx=byClass.get(cls),ref=referenceBuild(cls);
  const name=ctx.build?.character||cls;
  if(!ref||ctx.build?.id!==ref.id||ctx.build?.character!==ref.character)
   return "Le personnage "+name+" n'est pas le build de référence.";
  if(ctx.settings.ap!==12)return name+" : le plan validé exige 12 PA de base.";
  if(ctx.settings.turns!==target.turns)return name+" : durée du combat différente de la cible.";
  if(!(cls==="sram"?allowedSramDistances.has(ctx.settings.distance):
   ctx.settings.distance===ref.distance))
   return name+" : distance "+ctx.settings.distance+
    " non vérifiée pour cette rotation (Sacrieur à distance 1 ; Sram à distance 1–3).";
  if(ctx.settings.criticals!==true)return name+" : activer les critiques.";
  // A player's unused variant selections must not block an otherwise
  // identical legal damage rotation. Verify EVERY spell the 50-turn route
  // actually casts, across all 50 rounds, using the current selected variant.
  // The live engine still checks PA, cooldowns and Sacrier HP each turn.
  const required=[...new Set(TEAM_FIFTY_AUDITED[cls].flat())];
  const unavailable=required.find(spellName=>{
   const spell=ctx.spells.find(x=>x.name===spellName);
   return !spell||!selected(ctx,spell);
  });
  if(unavailable)
   return name+" : le sort "+unavailable+
    " nécessaire à la rotation 50 tours n'est pas la variante sélectionnée.";
  if(!same(ctx.spells,prepareBuildSpells(ref,CLASSES[cls])))
   return name+" : caractéristiques, arme ou calibration différentes du build vérifié.";
  if(cls==="sacrieur"&&(
    ctx.settings.sacrierStartingHpPercent!==100||
    ctx.settings.sacrierMaxHp!==ref.stats.hitPoints||
    !ctx.settings.sacrierHealthSimulation))
   return "Le Sacrieur doit commencer à 100 % des PV du build de référence.";
  if(cls==="ecaflip"&&(
    ctx.settings.dofusTurquoise!==true||
    !same(ctx.settings.ecaflipStats,ref.stats)))
   return "Karuta : statistiques ou Dofus Turquoise différents du build vérifié.";
 }
 return null;
}
/** Returns an explanation only for the original three reference builds. */
export function teamFiftyDiagnostic(contexts,target,strategy){
 if(!Array.isArray(contexts)||contexts.length!==3)return null;
 const ids=new Set(contexts.map(ctx=>ctx.build?.id));
 if(classes.some(cls=>!ids.has(referenceBuild(cls)?.id)))return null;
 return incompatibility(contexts,target,strategy);
}
/** Called once when starting a NEW automatic team combat. */
export function chooseTeamFiftyPlan(contexts,target,strategy){
 if(incompatibility(contexts,target,strategy))return null;
 return {id:"team-audited-fifty-v1",enabled:true,rounds:50,
  referenceDamage:546776,expectedDamage:560130.7,minHpPercent:50};
}
/**
 * Enable the whole 100-round MANUALLY verified route ONLY on the exact
 * builds and model in which all 100 turns were replayed. In particular the
 * Sram was tested at distance 3 for this longer search. The 50-turn plan
 * remains a separate, fully preserved fallback for other reference setups.
 */
export function chooseTeamHundredPlan(contexts,target,strategy){
 // Keep the player's 50-tour objective accessible via the existing
 // « Tours anticipés » selector even while the battle can continue to T100.
 if(target?.turns!==100||strategy?.horizon!==100||
  !chooseTeamFiftyPlan(contexts,target,strategy))return null;
 const byClass=new Map(contexts.map(c=>[c.settings.classId,c]));
 if(byClass.get("sram")?.settings.distance!==3)return null;
 for(const cls of classes){
  const ctx=byClass.get(cls);
  const required=new Set(TEAM_HUNDRED_AUDITED[cls].flat());
  for(const name of required){
   const spell=ctx.spells.find(s=>s.name===name);
   if(!spell||!selected(ctx,spell))return null;
  }
 }
 return {id:"team-audited-hundred-v1",enabled:true,rounds:100,
  referenceDamage:TEAM_HUNDRED_META.baseline,
  expectedDamage:TEAM_HUNDRED_META.damage,minHpPercent:50};
}
/** Choose only current actor actions, never commit future turns or grant DPS. */
export function teamFiftyCurrentPlan(entry,plan,strategy){
 const hundred=plan?.id==="team-audited-hundred-v1";
 if(!plan?.enabled||(!hundred&&plan.id!=="team-audited-fifty-v1")||
  strategy?.mode!=="long"||strategy.minHpPercent!==50||
  entry.currentPA!==12)return null;
 const cls=entry.ctx.settings.classId,now=entry.state.turn;
 const names=(hundred?TEAM_HUNDRED_AUDITED:TEAM_FIFTY_AUDITED)[cls]?.[now-1];
 if(!names||now<1||now>(hundred?100:50))return null;
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
 return {actions,settings:entry.ctx.settings,auditedFifty:!hundred,
  auditedHundred:hundred,
  label:"DPS équipe · rotation manuelle validée "+(hundred?100:50)+
   " tours (PV Sacrieur ≥50 %)"};
}
