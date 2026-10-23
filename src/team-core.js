/**
 * Team DPS chronological engine: actors decide at their initiative turn.
 * HP, target vulnerabilities and per-character effects persist between turns.
 */
import {CLASSES} from "./classes.js?v=3.3";
import {playSequentialTeam} from "./team-sequential.js?v=3.10";
import {DEFAULT_SETTINGS} from "./spells.js";
import {prepareBuildSpells} from "./build-damage.js?v=3.3";
import {optimize,optimizeFromState,initialState,castSpell,eligible,endTurn,cleanSettings} from "./engine.js?v=3.2";

export const TEAM_STORAGE_KEY="ombre-team-dps-v1";
export const TEAM_LIMIT=8;
export const RESIST_ELEMENTS=["Air","Terre","Feu","Eau","Neutre"];

const clamp=(value,min,max,fallback)=>{
 const n=Number(value);
 return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;
};
export function defaultTeamTarget(){
 return {hp:10000,turns:3,criticals:true,resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}};
}
export function cleanTeamTarget(raw={}){
 const defaults=defaultTeamTarget(),r=raw&&typeof raw==="object"?raw:{};
 return {hp:Math.round(clamp(r.hp,100,1000000000000,defaults.hp)),
  turns:Math.round(clamp(r.turns,1,50,defaults.turns)),
  criticals:r.criticals===undefined?true:!!r.criticals,
  resistances:Object.fromEntries(RESIST_ELEMENTS.map(element=>[
   element,Math.round(clamp(r.resistances?.[element],0,90,0))
  ]))};
}
/** Unknown initiative is not guessed: those builds appear after known values. */
export function initiativeOf(build){
 const n=build?.stats?.initiative;
 return n!==null&&n!==undefined&&n!==""&&Number.isFinite(Number(n))&&Number(n)>=0
  ?Number(n):null;
}
export function teamMembers(builds,selectedIds){
 const valid=new Map((Array.isArray(builds)?builds:[]).filter(b=>CLASSES[b.classId]).map(b=>[b.id,b]));
 const seen=new Set();
 return (Array.isArray(selectedIds)?selectedIds:[]).slice(0,TEAM_LIMIT)
  .map((id,index)=>({build:valid.get(id),index}))
  .filter(x=>x.build&&!seen.has(x.build.id)&&seen.add(x.build.id))
  .map(({build,index})=>({...build,initiative:initiativeOf(build),selectionIndex:index}))
  .sort((a,b)=> (a.initiative===null?1:0)-(b.initiative===null?1:0)||
   (b.initiative??0)-(a.initiative??0)||a.selectionIndex-b.selectionIndex);
}
/**
 * Team-only per-character choices. Keep original builds untouched.
 * The 6–20 PA interval matches the OMBRE mono-target engine.
 */
export function cleanTeamMemberOptions(build,raw={}){
 const options=raw&&typeof raw==="object"?raw:{};
 const basePA=Number(build?.ap);
 const selectedPA=options.ap===null||options.ap===undefined||options.ap===""
  ?basePA:Number(options.ap);
 const ap=Number.isInteger(selectedPA)&&selectedPA>=6&&selectedPA<=20
  ?selectedPA:Number.isInteger(basePA)&&basePA>=6&&basePA<=20?basePA:12;
 // Old manually forced buff choices are no longer used in team calculations.
 // Only a team-specific AP override survives; the build determines variants.
 return {ap};
}
export function createTeamContext(build,target,memberOptions={}){
 const cls=CLASSES[build?.classId];
 if(!cls)throw Error("Classe indisponible pour le build sélectionné.");
 const input=cleanTeamTarget(target);
 const options=cleanTeamMemberOptions(build,memberOptions);
 const variants=[...(build.variants||cls.defaultVariants)];
 const spells=prepareBuildSpells(build,cls);
 const settings=cleanSettings({...DEFAULT_SETTINGS,
   classId:cls.id,ap:options.ap,turns:input.turns,longHorizon:true,distance:build.distance,
  variantPairs:cls.pairs,variants,defaultVariants:cls.defaultVariants,
  resistance:input.resistances.Air,resistanceTerre:input.resistances.Terre,
  resistanceFeu:input.resistances.Feu,resistanceEau:input.resistances.Eau,
  resistanceNeutre:input.resistances.Neutre,
  criticals:input.criticals,beamWidth:8,refreshTimedBuffs:false,
  sacrierHealthSimulation:cls.id==="sacrieur"&&Number(build.stats?.hitPoints)>0,
  sacrierMaxHp:cls.id==="sacrieur"?Number(build.stats?.hitPoints)||0:0,
  sacrierStartingHpPercent:100,
  inLine:true,lineOfSight:true,triggerTraps:false,triggerOnPush:false,
  comploteurContact:false
 });
 return {build:{id:build.id,character:build.character,name:build.name,
  classId:build.classId,initiative:initiativeOf(build),ap:options.ap},settings,spells};
}
const round=n=>Math.round(n*10)/10;
export function assembleTeamResult(results,target){
 const conf=cleanTeamTarget(target);
 // Legacy analysis tests sometimes provide precomputed rotations with no
 // replay context. Summarize those directly; live team simulations use
 // optimizeTeamTurn/playSequentialTeam instead of this compatibility branch.
 if(results.some(entry=>!entry.ctx)){
  const members=results.map(entry=>({
   id:entry.build.id,character:entry.build.character,name:entry.build.name,
   initiative:entry.build.initiative,ap:entry.build.ap,
   strategy:entry.strategy||"historique",strategiesTested:entry.strategiesTested||0,
   chosenOpening:entry.chosenOpening||null,estimated:0,direct:0,poison:0
  }));
  let theoretical=0,direct=0,poison=0,effective=0;
  const turns=[];
  for(let i=0;i<conf.turns;i++){
   const actors=results.map((entry,j)=>{
    const turn=entry.result?.turns?.[i];
    const damage=round(Number(turn?.total)||0);
    const immediate=round(Number(turn?.immediate)||0);
    const delayed=round(Number(turn?.poison)||0);
    members[j].estimated=round(members[j].estimated+damage);
    members[j].direct=round(members[j].direct+immediate);
    members[j].poison=round(members[j].poison+delayed);
    return {id:entry.build.id,character:entry.build.character,
     initiative:entry.build.initiative,
     actions:(turn?.actions||[]).map(a=>({
      name:a.name,pa:a.pa,autoRefreshed:!!a.autoRefreshed||
       !!a.notes?.includes("Relance automatique : buff expiré")
     })),spent:turn?.spent||0,direct:immediate,poison:delayed,damage,health:turn?.sacrierEndHealth||null};
   });
   const current=round(actors.reduce((n,a)=>n+a.damage,0));
   theoretical=round(theoretical+current);
   direct=round(direct+actors.reduce((n,a)=>n+a.direct,0));
   poison=round(poison+actors.reduce((n,a)=>n+a.poison,0));
   effective=Math.min(conf.hp,theoretical);
   turns.push({number:i+1,actors,theoretical:current,
    remainingHp:round(Math.max(0,conf.hp-effective)),cappedDamage:round(effective)});
  }
  return {target:conf,members,turns,theoretical,direct,poison,
   effective:round(effective),overkill:round(Math.max(0,theoretical-conf.hp)),
   averagePerTurn:round(theoretical/conf.turns),
   warnings:["Historique de rotations précalculées : sans contexte de replay."],approximate:true};
 }
 const members=results.map(x=>({
  id:x.build.id,character:x.build.character,name:x.build.name,
  initiative:x.build.initiative,ap:x.build.ap,
  strategy:x.strategy,strategiesTested:x.strategiesTested,
  chosenOpening:x.chosenOpening||null,estimated:0,direct:0,poison:0
 }));
 const turns=[];
 let theoreticalTotal=0, directTotal=0, poisonTotal=0, effective=0;
 // Every round proceeds actor-by-actor in initiative order. Each actor's
 // engine state survives to their next turn (cooldowns, buffs, HP, poison).
 const actorsState=results.map(entry=>({
  entry,state:initialState(entry.ctx.settings),
  byId:new Map(entry.ctx.spells.map(spell=>[String(spell.id),spell]))
 }));
 for(let i=0;i<conf.turns;i++){
  const actors=[];
  for(let j=0;j<actorsState.length;j++){
   const {entry,byId}=actorsState[j],saved=actorsState[j];
   const cfg=entry.ctx.settings;
   const planned=entry.result.turns[i]?.actions||[];
   const alive=effective<conf.hp;
   if(alive){
    for(const action of planned){
     const spell=byId.get(String(action.id));
     if(!spell||!eligible(spell,saved.state,cfg))continue;
     saved.state=castSpell(saved.state,spell,cfg);
    }
   }
   saved.state=endTurn(saved.state,cfg);
   const played=saved.state.turns[i];
   const damage=alive?round(played?.total||0):0;
   const direct=alive?round(played?.immediate||0):0;
   const poison=alive?round(played?.poison||0):0;
   theoreticalTotal=round(theoreticalTotal+damage);
   directTotal=round(directTotal+direct);
   poisonTotal=round(poisonTotal+poison);
   effective=round(Math.min(conf.hp,theoreticalTotal));
   members[j].estimated=round(members[j].estimated+damage);
   members[j].direct=round(members[j].direct+direct);
   members[j].poison=round(members[j].poison+poison);
   actors.push({id:entry.build.id,character:entry.build.character,
    initiative:entry.build.initiative,
    actions:alive?(played?.actions||[]).map(a=>({
     name:a.name,pa:a.pa,autoRefreshed:!!a.notes?.includes("Relance automatique : buff expiré")
    })):[],
    spent:alive?(played?.spent||0):0,direct,poison,damage,
    health:played?.sacrierEndHealth||null});
  }
  turns.push({number:i+1,actors,
   theoretical:round(actors.reduce((sum,a)=>sum+a.damage,0)),
   remainingHp:round(Math.max(0,conf.hp-effective)),
   cappedDamage:effective});
 }
 return {target:conf,members,turns,
  theoretical:round(theoreticalTotal),direct:round(directTotal),
  poison:round(poisonTotal),effective,overkill:round(Math.max(0,theoreticalTotal-conf.hp)),
  averagePerTurn:round(theoreticalTotal/conf.turns),
  warnings:[
   "Simulation exécutée par tours complets, en ordre d'initiative. Les buffs, durées, relances et PV personnels sont conservés d'un tour au suivant.",
   "La cible possède des PV communs et les actions s'arrêtent lorsqu'elle est vaincue.",
   "Les rotations proposées restent planifiées individuellement : les buffs et vulnérabilités entre alliés ne sont pas encore partagés.",
   "Les dégâts par sort sont estimés depuis les statistiques du build actif ; jets, critiques et arrondis peuvent rester approximatifs.",
   "Pas de déplacement, attaques ennemies, soins alliés, érosion ou boucliers partagés. Optimum non garanti."
  ],approximate:true};
}
/**
 * Compare whole-rotation DPS, including the PA spent on each buff.
 * The variant-equipped non-damaging offensive buffs are possible openers,
 * but never mandatory: a normal no-maintenance rotation is always compared.
 * The underlying search is beam-limited, so the result is best *tested*, not
 * proof of the global optimum.
 */
const offensiveStats=new Set(["Puissance","Dommages","Dommages finaux","Critique","Air","Terre","Feu","Eau","Neutre"]);
export function openingBuffCandidates(ctx){
 const c=cleanSettings(ctx.settings),start=initialState(c);
 return ctx.spells.filter(spell=>
  spell.nonDirect&&spell.status?.buff&&
  offensiveStats.has(spell.status.buff.stat)&&
  Number(spell.status.buff.value)>0&&
  (spell.status.buff.untilRemoved===true||Number(spell.status.buff.duration)>0)&&
  eligible(spell,start,c)
 ).sort((a,b)=>{
  const estimate=spell=>spell.status.buff.value*
   Math.min(c.turns,spell.status.buff.untilRemoved?c.turns:spell.status.buff.duration)/Math.max(1,spell.pa);
  return estimate(b)-estimate(a);
 }).slice(0,2);
}
/**
 * Verify a proposed rotation by replaying every cast, with the real PA,
 * cooldown, turn-duration and poison calculations. Reorder only self-cast,
 * non-damaging offensive buffs; never move a damaging spell or a special
 * state-toggle like Mutilation. This repairs beam-search paths which cast
 * Pacte de Sang AFTER attacks it could have buffed.
 *
 * The change is accepted only when the complete replayed rotation deals
 * strictly more damage and every action remains legal.
 */
export function improveTeamBuffOrder(result,ctx){
 if(!result?.turns?.length)return result;
 const c=cleanSettings(ctx.settings);
 const spells=new Map(ctx.spells.map(spell=>[String(spell.id),spell]));
 const planned=result.turns.map(t=>t.actions.slice());
 if(planned.length!==c.turns)return result;
 const canMove=action=>{
  const spell=spells.get(String(action.id)),st=spell?.status;
  return !!(spell?.nonDirect&&spell.target==="self"&&st?.buff&&
   offensiveStats.has(st.buff.stat)&&Number(st.buff.value)>0&&
   !st.mutilation&&!st.move&&!st.vulnerability&&!st.poison&&
   !st.invisible&&!st.spendTrapCharges&&!spell.isTrap);
 };
 const replay=turnActions=>{
  let state=initialState(c);
  try{
   for(const actions of turnActions){
    for(const action of actions){
     const spell=spells.get(String(action.id));
     if(!spell||!eligible(spell,state,c))return null;
     state=castSpell(state,spell,c);
     // Preserve the "↻" indicator for automatic refresh actions.
     if(action.notes?.includes("Relance automatique : buff expiré"))
      state.actions[state.actions.length-1].notes.push("Relance automatique : buff expiré");
    }
    state=endTurn(state,c);
   }
  }catch{return null;}
  return {...result,total:Math.round(state.total*10)/10,
   immediate:Math.round(state.immediate*10)/10,
   poison:Math.round(state.delayed*10)/10,
   average:Math.round(state.total/c.turns*10)/10,turns:state.turns};
 };
 const baseline=replay(planned);
 if(!baseline||Math.abs(baseline.total-result.total)>0.3)return result;
 let best=result,working=planned;
 for(let turn=0;turn<working.length;turn++){
  for(let index=1;index<working[turn].length;index++){
   const action=working[turn][index];
   if(!canMove(action))continue;
   const candidate=working.map(actions=>actions.slice());
   candidate[turn].splice(index,1);
   candidate[turn].unshift(action);
   const evaluated=replay(candidate);
   if(evaluated&&evaluated.total>best.total+0.01){
    best=evaluated;working=candidate;
   }
  }
 }
 return best;
}
export function optimizeTeamMember(ctx,onProgress=()=>{}){
 const config=cleanSettings({...ctx.settings,refreshTimedBuffs:false});
 let trials=0;
 let best=null;
 const run=(strategy,settings,seed=null,chosenOpening=null)=>{
  const label=chosenOpening?"Ouverture "+chosenOpening:strategy==="maintenance"?"Entretien des buffs":"Rotation libre";
  const report=p=>onProgress({...p,scenario:label});
  const raw=seed?optimizeFromState(settings,ctx.spells,seed,report)
   :optimize(settings,ctx.spells,report);
  const result=improveTeamBuffOrder(raw,ctx);
  trials++;
  if(!best||result.total>best.result.total+0.001)
   best={result,strategy,chosenOpening};
 };
 run("libre",config);
 // Refresh if a buff has been used during the optimization. Compare the
 // full damage result before choosing this constrained maintenance strategy.
 const maintained=cleanSettings({...config,refreshTimedBuffs:true});
 if(config.turns>1 && ctx.spells.some(x=>x.status?.buff && offensiveStats.has(x.status.buff.stat)))
  run("entretien",maintained);
 for(const spell of openingBuffCandidates(ctx)){
  // A buff already used in the first turn needs no forced-opening trial:
  // the maintenance strategy evaluates its future refreshes.
  if(best.result.turns[0]?.actions.some(a=>a.id===spell.id))continue;
  const first=castSpell(initialState(maintained),spell,maintained);
  run("ouverture",maintained,first,spell.name);
 }
 return {...best,strategiesTested:trials};
}
/** Run only in team-worker, never on the UI thread.
 * Contrairement à optimizeTeamMember, cette méthode planifie chaque ACTEUR
 * au moment de son tour. Les futurs tours ne sont jamais figés à l'avance.
 */
export function optimizeTeam(contexts,target,onProgress=()=>{}){
 if(!Array.isArray(contexts)||contexts.length<1||contexts.length>TEAM_LIMIT)
  throw Error("Sélectionne entre 1 et 8 builds.");
 const ids=new Set();
 for(const ctx of contexts){
  if(!ctx?.build?.id||ids.has(ctx.build.id)||!Array.isArray(ctx.spells)||!ctx.settings)
   throw Error("Composition d'équipe invalide.");
  ids.add(ctx.build.id);
 }
 return playSequentialTeam(contexts,cleanTeamTarget(target),onProgress);
}

/**
 * Interactive team mode: run EXACTLY one complete team round on demand.
 * Previous actor states are restored; no later rounds are executed.
 */
export function optimizeTeamTurn(contexts,target,onProgress=()=>{},previous=null){
 if(!Array.isArray(contexts)||contexts.length<1||contexts.length>TEAM_LIMIT)
  throw Error("Sélectionne entre 1 et 8 builds.");
 const ids=new Set();
 for(const ctx of contexts){
  if(!ctx?.build?.id||ids.has(ctx.build.id)||!Array.isArray(ctx.spells)||!ctx.settings)
   throw Error("Composition d'équipe invalide.");
  ids.add(ctx.build.id);
 }
 const config=cleanTeamTarget(target);
 if(previous){
  if(JSON.stringify(previous.target)!==JSON.stringify(config))
   throw Error("La cible a changé : recommence au tour 1.");
  if(previous.finished)throw Error("Le combat est terminé : recommence au tour 1.");
 }
 return playSequentialTeam(contexts,config,onProgress,{previous,oneRound:true});
}
