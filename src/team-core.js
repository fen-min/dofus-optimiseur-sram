/**
 * Team DPS prototype: combines existing independent mono-target OMBRE rotations.
 * Order is from the saved in-game initiative stat; no ally spell interactions,
 * movement or shared target effects are simulated.
 */
import {CLASSES} from "./classes.js?v=1.8";
import {DEFAULT_SETTINGS} from "./spells.js";
import {optimize,optimizeFromState,initialState,castSpell,eligible,endTurn,cleanSettings} from "./engine.js?v=1.8";

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
 return {hp:Math.round(clamp(r.hp,100,100000000,defaults.hp)),
  turns:Math.round(clamp(r.turns,1,10,defaults.turns)),
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
 const input=cleanTeamTarget(target),calibration=build.calibration||{};
 const options=cleanTeamMemberOptions(build,memberOptions);
 const variants=[...(build.variants||cls.defaultVariants)];
 const spells=cls.spells.map(base=>{
  const s=JSON.parse(JSON.stringify(base));
  const edit=calibration[s.id];
  if(edit){
   for(const key of ["min","max","critMin","critMax","summonBase"])
    if(Number.isFinite(edit[key])&&edit[key]>=0)s[key]=edit[key];
   if(s.status?.buff&&edit.buff)
    for(const key of ["value","duration"])
     if(Number.isFinite(edit.buff[key])&&edit.buff[key]>=0)s.status.buff[key]=edit.buff[key];
  }
  return s;
 });
 const settings=cleanSettings({...DEFAULT_SETTINGS,
   classId:cls.id,ap:options.ap,turns:input.turns,distance:build.distance,
  variantPairs:cls.pairs,variants,defaultVariants:cls.defaultVariants,
  resistance:input.resistances.Air,resistanceTerre:input.resistances.Terre,
  resistanceFeu:input.resistances.Feu,resistanceEau:input.resistances.Eau,
  resistanceNeutre:input.resistances.Neutre,
  criticals:input.criticals,beamWidth:8,refreshTimedBuffs:false,
  inLine:true,lineOfSight:true,triggerTraps:false,triggerOnPush:false,
  comploteurContact:false
 });
 return {build:{id:build.id,character:build.character,name:build.name,
  classId:build.classId,initiative:initiativeOf(build),ap:options.ap},settings,spells};
}
const round=n=>Math.round(n*10)/10;
export function assembleTeamResult(results,target){
 const conf=cleanTeamTarget(target);
 const members=results.map(x=>({
  id:x.build.id,character:x.build.character,name:x.build.name,
  initiative:x.build.initiative,ap:x.build.ap,
  strategy:x.strategy,strategiesTested:x.strategiesTested,
  chosenOpening:x.chosenOpening||null,estimated:round(x.result.total),
  direct:round(x.result.immediate),poison:round(x.result.poison)
 }));
 const turns=[];
 let theoreticalTotal=0;
 for(let i=0;i<conf.turns;i++){
  const actors=results.map(entry=>{
   const t=entry.result.turns[i];
   return {id:entry.build.id,character:entry.build.character,
    initiative:entry.build.initiative,actions:(t?.actions||[]).map(a=>({
     name:a.name,pa:a.pa,autoRefreshed:!!a.notes?.includes("Relance automatique : buff expiré")
    })),spent:t?.spent||0,direct:round(t?.immediate||0),
    poison:round(t?.poison||0),damage:round(t?.total||0)};
  });
  const theoretical=round(actors.reduce((sum,a)=>sum+a.damage,0));
  theoreticalTotal=round(theoreticalTotal+theoretical);
  turns.push({number:i+1,actors,theoretical,
   remainingHp:round(Math.max(0,conf.hp-theoreticalTotal)),
   cappedDamage:round(Math.min(conf.hp,theoreticalTotal))});
 }
 return {target:conf,members,turns,
  theoretical:round(theoreticalTotal),
  direct:round(members.reduce((n,b)=>n+b.direct,0)),
  poison:round(members.reduce((n,b)=>n+b.poison,0)),
  effective:round(Math.min(conf.hp,theoreticalTotal)),
  overkill:round(Math.max(0,theoreticalTotal-conf.hp)),
  averagePerTurn:round(theoreticalTotal/conf.turns),
  warnings:["Estimations monocibles indépendantes : pas de buffs, soins, érosion ni vulnérabilités partagés entre personnages.",
   "Les résistances sont prises en compte par élément. Les dégâts utilisent les valeurs du build calibrées dans OMBRE ; aucune caractéristique n'est ajoutée deux fois.",
   "Ordre par initiative enregistrée. Sans initiative connue, le personnage figure à la fin. Les égalités conservent l'ordre de sélection.",
   "Les PV de la cible plafonnent seulement le bilan : l'optimiseur n'adapte pas encore ses rotations lorsque la cible meurt.",
   "L'optimiseur compare la rotation libre, l'entretien des buffs expirés et les ouvertures avec les buffs disponibles, puis retient le scénario le plus dommageable parmi ceux testés.",
   "Les variantes exclusives proviennent du build. La recherche reste heuristique : meilleur scénario testé, pas optimum mathématiquement garanti.",
   "Pièges non déclenchés automatiquement, carte/obstacles et Souffrance du Sacrieur non simulés. Optimum non garanti."],
  approximate:true};
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
  Number(spell.status.buff.duration)>0&&
  eligible(spell,start,c)
 ).sort((a,b)=>{
  const estimate=spell=>spell.status.buff.value*
   Math.min(c.turns,spell.status.buff.duration)/Math.max(1,spell.pa);
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
/** Run only in team-worker, never on the UI thread. */
export function optimizeTeam(contexts,target,onProgress=()=>{}){
 if(!Array.isArray(contexts)||contexts.length<1||contexts.length>TEAM_LIMIT)
  throw Error("Sélectionne entre 1 et 8 builds.");
 const ids=new Set(),evaluated=[];
 for(let i=0;i<contexts.length;i++){
  const ctx=contexts[i];
  if(!ctx?.build?.id||ids.has(ctx.build.id)||!Array.isArray(ctx.spells)||!ctx.settings)
   throw Error("Composition d'équipe invalide.");
  ids.add(ctx.build.id);
  const chosen=optimizeTeamMember(ctx,p=>onProgress({
   character:ctx.build.character,index:i+1,count:contexts.length,
   turn:p.turn,turns:ctx.settings.turns,scenario:p.scenario
  }));
  evaluated.push({build:ctx.build,...chosen});
 }
 return assembleTeamResult(evaluated,target);
}
