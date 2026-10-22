/**
 * Team DPS prototype: combines existing independent mono-target OMBRE rotations.
 * Order is from the saved in-game initiative stat; no ally spell interactions,
 * movement or shared target effects are simulated.
 */
import {CLASSES} from "./classes.js?v=1.8";
import {DEFAULT_SETTINGS} from "./spells.js";
import {optimize,optimizeFromState,initialState,castSpell,eligible,cleanSettings} from "./engine.js?v=1.8";

export const TEAM_STORAGE_KEY="ombre-team-dps-v1";
export const TEAM_LIMIT=8;
export const RESIST_ELEMENTS=["Air","Terre","Feu","Eau","Neutre"];
export const SACRIER_SUPPORT_SPELLS=["Mutilation","Pacte de Sang"];

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
 const cls=CLASSES[build?.classId];
 const pairIndex=cls?.id==="sacrieur"
  ?cls.pairs.findIndex(pair=>pair.includes("Pacte de Sang")):-1;
 const existing=pairIndex>=0?build?.variants?.[pairIndex]:null;
 const support=pairIndex>=0
  ?SACRIER_SUPPORT_SPELLS.includes(options.support)?options.support:
    SACRIER_SUPPORT_SPELLS.includes(existing)?existing:"Mutilation"
  :null;
 return {ap,support,forceOpeningBuff:pairIndex>=0&&options.forceOpeningBuff===true,
  refreshTimedBuffs:options.refreshTimedBuffs!==false};
}
export function createTeamContext(build,target,memberOptions={}){
 const cls=CLASSES[build?.classId];
 if(!cls)throw Error("Classe indisponible pour le build sélectionné.");
 const input=cleanTeamTarget(target),calibration=build.calibration||{};
 const options=cleanTeamMemberOptions(build,memberOptions);
 const variants=[...(build.variants||cls.defaultVariants)];
 if(cls.id==="sacrieur"){
  const supportIndex=cls.pairs.findIndex(pair=>pair.includes("Pacte de Sang"));
  if(supportIndex>=0)variants[supportIndex]=options.support;
 }
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
  criticals:input.criticals,beamWidth:8,refreshTimedBuffs:options.refreshTimedBuffs,
  inLine:true,lineOfSight:true,triggerTraps:false,triggerOnPush:false,
  comploteurContact:false
 });
 return {build:{id:build.id,character:build.character,name:build.name,
  classId:build.classId,initiative:initiativeOf(build),ap:options.ap,
  support:options.support,refreshTimedBuffs:options.refreshTimedBuffs},settings,spells,
  forceOpeningSpell:options.forceOpeningBuff?options.support:null};
}
const round=n=>Math.round(n*10)/10;
export function assembleTeamResult(results,target){
 const conf=cleanTeamTarget(target);
 const members=results.map(x=>({
  id:x.build.id,character:x.build.character,name:x.build.name,
  initiative:x.build.initiative,ap:x.build.ap,support:x.build.support,
  forcedOpeningSpell:x.forceOpeningSpell||null,estimated:round(x.result.total),
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
   "« Entretenir les buffs » réapplique les bonus offensifs précédemment utilisés après leur expiration, si les PA et les délais de relance le permettent. Cela ne garantit pas le meilleur DPS.",
   "En mode automatique, un buff peut être ignoré par la recherche même s'il est équipé. L'option « Buff au T1 » l'impose au début du premier tour.",
   "Pièges non déclenchés automatiquement, carte/obstacles et Souffrance du Sacrieur non simulés. Optimum non garanti."],
  approximate:true};
}
/** Run only in team-worker, never on the UI thread. */
export function optimizeTeam(contexts,target,onProgress=()=>{}){
 if(!Array.isArray(contexts)||contexts.length<1||contexts.length>TEAM_LIMIT)
  throw Error("Sélectionne entre 1 et 8 builds.");
 const ids=new Set();
 const evaluated=[];
 for(let i=0;i<contexts.length;i++){
  const ctx=contexts[i];
  if(!ctx?.build?.id||ids.has(ctx.build.id)||!Array.isArray(ctx.spells)||!ctx.settings)
   throw Error("Composition d'équipe invalide.");
  ids.add(ctx.build.id);
  const report=progress=>onProgress({
   character:ctx.build.character,index:i+1,count:contexts.length,
   turn:progress.turn,turns:ctx.settings.turns
  });
  let result;
  if(ctx.forceOpeningSpell){
   const forced=ctx.spells.find(spell=>spell.name===ctx.forceOpeningSpell);
   const seed=initialState(ctx.settings);
   if(!forced||!eligible(forced,seed,cleanSettings(ctx.settings)))
    throw Error("Le buff imposé au tour 1 n'est pas disponible pour "+ctx.build.character+".");
   result=optimizeFromState(ctx.settings,ctx.spells,castSpell(seed,forced,ctx.settings),report);
  }else result=optimize(ctx.settings,ctx.spells,report);
  evaluated.push({build:ctx.build,result,forceOpeningSpell:ctx.forceOpeningSpell||null});
 }
 return assembleTeamResult(evaluated,target);
}
