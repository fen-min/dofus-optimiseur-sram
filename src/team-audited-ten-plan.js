/**
 * OMBRE - 10-round verified TEAM candidate for the player's three-character
 * lineup. Source audit: scripts/team-ten-manual-compare.mjs,
 * TEAM_PACTE_REQUIRED=1, GitHub Actions run 40747259127.
 *
 * IMPORTANT: no direct damage is credited by this module. The reference
 * route is submitted to the real chronological manual engine before adoption.
 * An unchanged-build, same-target replay of the user's current rotation is
 * the comparator. A different selected spell, PA, range, HP floor, or a
 * non-reproducible reference rotation returns to the generic optimizer.
 *
 * These openings are a tested 10-round improvement, not a promise of
 * global optimality over the subsequent 90 rounds.
 */
import {eligible,castSpell,endTurn,initialState} from "./engine.js?v=3.26";
import {sacrierCastAboveFloor,sacrierHealthAboveFloor} from "./sacrier-safety.js?v=3.32";

export const TEAM_TEN_AUDITED=Object.freeze({
 sacrieur:[
  ["Carnage","Furie","Furie","Assaut"],
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Carnage","Manthache","Furie"],
  ["Carnage","Manthache","Furie"],
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Carnage","Manthache","Furie"],
  ["Manthache","Carnage","Furie"],
  ["Pacte de Sang","Carnage","Furie","Furie"],
  ["Furie","Furie","Manthache"],
  ["Furie","Furie","Désolation","Assaut"]
 ],
 ecaflip:[
  ["Yams","Griffe Joueuse","Kraps","Sceptre du Roi Joueur"],
  ["Yams","Infortune","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur"],
  ["Baraka","Tout ou Rien","Rekop","Yams"],
  ["Griffe Joueuse","Kraps","Infortune"],
  ["Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
  ["Baraka","Pile ou Face","Infortune","Sceptre du Roi Joueur"],
  ["Griffe Joueuse","Sceptre du Roi Joueur","Infortune"],
  ["Yams","Kraps","Pile ou Face","Pile ou Face","Infortune"],
  ["Kraps","Pile ou Face","Infortune","Sceptre du Roi Joueur"],
  ["Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur","Infortune"]
 ],
 sram:[
  ["Arnaque","Injection Toxique","Arsenic"],
  ["Arnaque","Manthache","Épidémie"],
  ["Arnaque","Manthache","Épidémie"],
  ["Arnaque","Manthache","Épidémie"],
  ["Arnaque","Manthache","Épidémie"],
  ["Injection Toxique","Arsenic","Épidémie"],
  ["Arnaque","Manthache","Épidémie"],
  ["Arnaque","Manthache","Épidémie"],
  ["Arnaque","Manthache","Épidémie"],
  ["Arnaque","Manthache","Épidémie"]
 ]
});

/** Literal reconstruction of the user's current ten-round exported log. */
export const TEAM_TEN_BASELINE=Object.freeze({
 sacrieur:[
  ["Carnage","Furie","Manthache"],
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Carnage","Manthache","Furie"],
  ["Carnage","Manthache","Furie"],
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Carnage","Manthache","Furie"],
  ["Manthache","Carnage","Furie"],
  ["Pacte de Sang","Carnage","Furie","Furie"],
  ["Furie","Furie","Désolation","Assaut"],
  ["Furie","Furie","Désolation","Assaut"]
 ],
 ecaflip:[
  ["Belote","Pile ou Face","Infortune","Sceptre du Roi Joueur"],
  ["Baraka","Pile ou Face","Infortune","Sceptre du Roi Joueur"],
  ["Baraka","Pile ou Face","Infortune","Sceptre du Roi Joueur"],
  ["Kraps","Pile ou Face","Infortune","Sceptre du Roi Joueur"],
  ["Yams","Yams","Sceptre du Roi Joueur","Infortune"],
  ["Kraps","Pile ou Face","Infortune","Sceptre du Roi Joueur"],
  ["Baraka","Pile ou Face","Infortune","Sceptre du Roi Joueur"],
  ["Kraps","Pile ou Face","Infortune","Sceptre du Roi Joueur"],
  ["Yams","Yams","Sceptre du Roi Joueur","Infortune"],
  ["Kraps","Pile ou Face","Infortune","Sceptre du Roi Joueur"]
 ],
 sram:Array.from({length:10},()=>["Arnaque","Manthache","Épidémie"])
});
const classes=["sacrieur","ecaflip","sram"];
const round=x=>Math.round(Number(x)*10)/10;
const selected=(ctx,s)=>s.isWeapon===true||ctx.settings.variants?.[s.variantGroup]===s.name;

function canBuildTeam(contexts,strategy,target){
 if(strategy.mode!=="long"||strategy.horizon<10||
  !Array.isArray(contexts)||contexts.length!==3||target.turns<10)return null;
 if(strategy.minHpPercent!==50)return null;
 const map=new Map(contexts.map(ctx=>[ctx.settings.classId,ctx]));
 if(map.size!==3||classes.some(cls=>!map.has(cls)))return null;
 for(const ctx of map.values()){
  if(ctx.settings.ap!==12||ctx.settings.turns!==target.turns)return null;
  if(!ctx.build.id||!Array.isArray(ctx.spells))return null;
 }
 return map;
}
function isSafeSacriRoute(ctx,minimum){
 let state=initialState(ctx.settings);
 const equipped=new Map(ctx.spells.filter(s=>selected(ctx,s)).map(s=>[s.name,s]));
 for(const names of TEAM_TEN_AUDITED.sacrieur){
  for(const name of names){
   const sp=equipped.get(name);
   if(!sp||!eligible(sp,state,ctx.settings))return false;
   const after=castSpell(state,sp,ctx.settings);
   if(!sacrierCastAboveFloor(state,sp,after,minimum))return false;
   state=after;
  }
  state=endTurn(state,ctx.settings);
  if(!sacrierHealthAboveFloor(state,minimum))return false;
 }
 return true;
}
function replayCandidate(contexts,target,sequence,runManual){
 const byClass=new Map(contexts.map(ctx=>[ctx.settings.classId,ctx]));
 let previous=null;
 try{
  for(let t=0;t<10;t++){
   const overrides={};
   for(const cls of classes){
    const ctx=byClass.get(cls);
    const names=sequence[cls][t];
    const ids=[];
    for(const name of names){
     const spell=ctx.spells.find(s=>s.name===name&&selected(ctx,s));
     if(!spell)return null;
     ids.push(spell.id);
    }
    overrides[ctx.build.id]=ids;
   }
   previous=runManual(contexts,target,()=>{},{previous,oneRound:true,manualOverrides:overrides});
   if(previous.turns.length!==t+1)return null;
   if(previous.turns[t].actors.some(a=>!Number.isFinite(a.damage)||
     a.spent>a.availablePA+.01||
     a.actions.length!==overrides[a.id].length))return null;
  }
  return {total:round(previous.theoretical),
   byCharacter:Object.fromEntries(previous.members.map(m=>[m.character,round(m.estimated)]))};
 }catch{return null;}
}
/**
 * Called once when the user starts a NEW automatic combat.
 * It is a deterministic on-the-fly A/B replay using the actual saved builds;
 * no DPS from the reference result is borrowed or added to the live state.
 */
export function chooseTeamTenOpening(contexts,target,strategy,runManual){
 const lineup=canBuildTeam(contexts,strategy,target);
 if(!lineup)return null;
 if(!isSafeSacriRoute(lineup.get("sacrieur"),strategy.minHpPercent))return null;
 const baseline=replayCandidate(contexts,target,TEAM_TEN_BASELINE,runManual);
 const audited=replayCandidate(contexts,target,TEAM_TEN_AUDITED,runManual);
 if(!baseline||!audited||audited.total<=baseline.total+.01)return null;
 return {id:"audited-team-ten-pacte-v1",enabled:true,
  baseline:baseline.total,projected:audited.total,
  projectedGain:round(audited.total-baseline.total),
  minHpPercent:strategy.minHpPercent,rounds:10};
}
/** Read only one actor's CURRENT turn; all later turns remain uncommitted. */
export function teamTenCurrentPlan(entry,teamPlan,strategy){
 if(!teamPlan?.enabled||teamPlan.id!=="audited-team-ten-pacte-v1"||
   strategy.mode!=="long"||strategy.minHpPercent!==teamPlan.minHpPercent)return null;
 const cls=entry.ctx.settings.classId,now=entry.state.turn;
 const names=TEAM_TEN_AUDITED[cls]?.[now-1];
 if(!names||entry.currentPA!==12)return null;
 let state=entry.state;
 const actions=[];
 for(const name of names){
  const spell=entry.ctx.spells.find(s=>s.name===name&&selected(entry.ctx,s));
  if(!spell||!eligible(spell,state,entry.ctx.settings))return null;
  const next=castSpell(state,spell,entry.ctx.settings);
  if(cls==="sacrieur"&&
   !sacrierCastAboveFloor(state,spell,next,strategy.minHpPercent))return null;
  state=next;
  actions.push({id:spell.id});
 }
 if(cls==="sacrieur"&&
   !sacrierHealthAboveFloor(endTurn(state,entry.ctx.settings),strategy.minHpPercent))
  return null;
 return {actions,settings:entry.ctx.settings,
  label:"DPS équipe vérifié · Pacte T2/T5/T8 · +"+
   teamPlan.projectedGain+" dégâts / 10 tours",auditedTeam:true};
}
