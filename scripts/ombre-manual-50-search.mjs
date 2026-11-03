/**
 * 50-round manual DPS experiment against the user's exact 49-round log.
 * Team mechanics are verified with playSequentialTeam before comparing candidates.
 * Fast one-character scoring is ONLY candidate discovery; results must be
 * accepted by real three-actor manual replay. No RNG / enemy attacks are modeled.
 */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {cleanTeamTarget,createTeamContext,optimizeTeamTurn} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {initialState,eligible,castSpell,endTurn} from "../src/engine.js";
import {sacrierCastAboveFloor,sacrierHealthAboveFloor} from "../src/sacrier-safety.js";

const R=x=>Math.round((Number(x)||0)*10)/10;
const reference=JSON.parse(readFileSync(new URL("./manual50-user-baseline.json",import.meta.url),"utf8"));
assert.equal(reference.rounds.length,49);
const target=cleanTeamTarget({turns:50,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const contexts=INITIAL_BUILDS.map(b=>{ const build=normalizeBuild(b); if(["sacrieur","sram"].includes(build.classId))build.distance=1; return createTeamContext(build,target); });
const classes=["sacrieur","ecaflip","sram"];
const ctx=Object.fromEntries(contexts.map(c=>[c.settings.classId,c]));
const actorName={sacrieur:"Mon Sacrieur",ecaflip:"Karuta",sram:"Matryoshka"};
const byName=Object.fromEntries(classes.map(cls=>[cls,
 new Map(ctx[cls].spells.map(s=>[s.name,s]))]));
const lookup=Object.fromEntries(classes.map(cls=>[cls,ctx[cls].build.id]));
const path=Object.fromEntries(classes.map(cls=>[cls,reference.rounds.map(row=>
 row.actors[actorName[cls]].actions.slice())]));
const ids=(cls,names)=>names.map(name=>{
 const sp=byName[cls].get(name);
 assert.ok(sp,"Unknown spell "+cls+": "+name);
 return String(sp.id);
});
const user49=reference.referenceTotal49;
const strategy={mode:"long",horizon:50,effort:"deep",minHpPercent:50};
let checked=null,firstMismatch=null,maxPerActorError=0,first50=[];
for(let t=1;t<=49;t++){
 const overrides=Object.fromEntries(classes.map(cls=>[lookup[cls],ids(cls,path[cls][t-1])]));
 checked=playSequentialTeam(contexts,target,()=>{},{previous:checked,oneRound:true,manualOverrides:overrides});
 const actual=checked.turns.at(-1);
 for(const cls of classes){
  const name=actorName[cls],observed=reference.rounds[t-1].actors[name].damage;
  const actor=actual.actors.find(a=>a.id===lookup[cls]);
  const difference=Math.abs(actor.damage-observed);
  maxPerActorError=Math.max(maxPerActorError,difference);
  if(difference>0.2&&!firstMismatch)firstMismatch={turn:t,name,observed,actual:actor.damage,delta:R(actor.damage-observed)};
 }
}
const total49=R(checked.theoretical);
console.log("OMBRE50_BASELINE_CHECK "+JSON.stringify({user49,replayed49:total49,
 difference:R(total49-user49),maxPerActorError:R(maxPerActorError),firstMismatch}));
if(firstMismatch||Math.abs(total49-user49)>1){
 console.log("OMBRE50_INCOMPARABLE "+JSON.stringify({reason:"The uploaded saved build or target differs from canonical GitHub reference. No deceptive claim of a like-for-like improvement."}));
 process.exit(2);
}
const manual49=checked;
const next=optimizeTeamTurn(contexts,target,()=>{},manual49,strategy);
const row50=next.turns.at(-1);
for(const cls of classes){
 const actor=row50.actors.find(a=>a.id===lookup[cls]);
 assert.ok(actor);
 path[cls].push(actor.actions.map(a=>a.name));
}
const round50=Object.fromEntries(classes.map(cls=>[lookup[cls],ids(cls,path[cls][49])]));
const baseline=playSequentialTeam(contexts,target,()=>{},{previous:manual49,oneRound:true,manualOverrides:round50});
assert.equal(baseline.turns.length,50);
const baseTotal=R(baseline.theoretical);
console.log("OMBRE50_BASELINE "+JSON.stringify({total49,user49,total50:baseTotal,
 turn50:row50.actors.map(a=>({name:a.character,spells:a.actions.map(x=>x.name),damage:a.damage})),
 byCharacter:Object.fromEntries(baseline.members.map(m=>[m.character,R(m.estimated)]))}));

const additions={
 sacrieur:[
  ["Furie","Furie","Carnage","Assaut"],
  ["Carnage","Furie","Furie","Assaut"],
  ["Carnage","Manthache","Furie"],
  ["Manthache","Furie","Carnage"],
  ["Furie","Carnage","Manthache"],
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Pacte de Sang","Carnage","Furie","Furie"],
  ["Pacte de Sang","Manthache","Assaut","Assaut"],
  ["Furie","Furie","Désolation","Assaut"],
  ["Furie","Furie","Assaut","Désolation"],
  ["Furie","Furie","Assaut","Assaut","Assaut"]
 ],
 ecaflip:[
  ["Griffe Invocatrice","Yams","Griffe Joueuse","Sceptre du Roi Joueur"],
  ["Griffe Invocatrice","Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur"],
  ["Yams","Griffe Joueuse","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
  ["Griffe Joueuse","Kraps","Infortune"],
  ["Kraps","Griffe Joueuse","Infortune"],
  ["Kraps","Pile ou Face","Infortune","Sceptre du Roi Joueur"],
  ["Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur","Infortune"],
  ["Kraps","Kraps","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
  ["Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
  ["Kraps","Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur"],
  ["Tout ou Rien","Sceptre du Roi Joueur","Rekop","Yams"],
  ["Baraka","Tout ou Rien","Rekop","Yams"]
 ],
 sram:[
  ["Arnaque","Injection Toxique","Arsenic"],
  ["Fourvoiement","Fourvoiement","Épidémie"],
  ["Injection Toxique","Arnaque","Épidémie"],
  ["Arnaque","Arnaque","Épidémie"],
  ["Truanderie","Arnaque","Arnaque","Arsenic"],
  ["Manigance","Arnaque","Arsenic","Épidémie"],
  ["Manigance","Arnaque","Arnaque","Épidémie"],
  ["Manigance","Arnaque","Injection Toxique"],
  ["Truanderie","Arsenic","Arnaque","Arnaque"],
  ["Arnaque","Arsenic","Épidémie"],
  ["Arsenic","Injection Toxique","Épidémie"],
  ["Épidémie","Fourvoiement","Fourvoiement"],
  ["Fourvoiement","Épidémie","Fourvoiement"]
 ]
};
const pool=Object.fromEntries(classes.map(cls=>{
 const choices=[...path[cls],...additions[cls]];
 const byKey=new Map(choices.map(seq=>[seq.join("|"),seq]));
 return [cls,[...byKey.values()]];
}));
function evaluate(cls,rot,record=false){
 const c=ctx[cls],settings=c.settings,sacri=cls==="sacrieur";
 let state=initialState(settings);
 const prefix=record?[structuredClone(state)]:null;
 let minPct=100;
 for(let round=0;round<50;round++){
  const actions=rot[round];
  for(const name of actions){
   const spell=byName[cls].get(name);
   if(!spell||!eligible(spell,state,settings))return null;
   const next=castSpell(state,spell,settings);
   if(sacri&&!sacrierCastAboveFloor(state,spell,next,50))return null;
   state=next;
  }
  state=endTurn(state,settings);
  if(sacri){
   if(!sacrierHealthAboveFloor(state,50))return null;
   const health=state.sacrierHealth;
   minPct=Math.min(minPct,100*health.hp/health.maxHp);
  }
  if(record)prefix.push(structuredClone(state));
 }
 return {score:R(state.total),minPct:R(minPct),prefix};
}
function evaluateSuffix(cls,bestPath,t,replacement,prefix){
 const settings=ctx[cls].settings,sacri=cls==="sacrieur";
 let state=structuredClone(prefix[t]);
 let minPct=100;
 for(let round=t;round<50;round++){
  const actions=round===t?replacement:bestPath[round];
  for(const name of actions){
   const spell=byName[cls].get(name);
   if(!spell||!eligible(spell,state,settings))return null;
   const next=castSpell(state,spell,settings);
   if(sacri&&!sacrierCastAboveFloor(state,spell,next,50))return null;
   state=next;
  }
  state=endTurn(state,settings);
  if(sacri&&!sacrierHealthAboveFloor(state,50))return null;
  if(sacri)minPct=Math.min(minPct,100*state.sacrierHealth.hp/state.sacrierHealth.maxHp);
 }
 return {score:R(state.total),minPct:R(minPct)};
}
const trials={};
const champions={};
for(const cls of classes){
 let best=path[cls].map(x=>x.slice());
 let current=evaluate(cls,best,true);
 if(!current){console.log("OMBRE50_SINGLE_INVALID "+cls);champions[cls]=best;continue;}
 const initial=current.score;
 let attempts=0,valid=0,steps=[];
 for(let pass=1;pass<=6;pass++){
  let gains=0;
  for(let turn=0;turn<50;turn++){
   const original=best[turn];
   const candidates=[...pool[cls]];
   for(let i=0;i<original.length;i++)for(let j=i+1;j<original.length;j++){
    const swap=original.slice();
    [swap[i],swap[j]]=[swap[j],swap[i]];
    candidates.push(swap);
   }
   let top=null,topSeq=null;
   const seen=new Set([original.join("|")]);
   for(const option of candidates){
    const key=option.join("|");
    if(seen.has(key))continue;
    seen.add(key);
    attempts++;
    const outcome=evaluateSuffix(cls,best,turn,option,current.prefix);
    if(!outcome)continue;valid++;
    if(outcome.score>current.score+0.11 && (!top||outcome.score>top.score+0.11)){
     top=outcome;topSeq=option;
    }
   }
   if(topSeq){
    const old=best[turn];
    best[turn]=topSeq.slice();
    const recalculated=evaluate(cls,best,true);
    if(!recalculated||recalculated.score<current.score+0.09){
     best[turn]=old;continue;
    }
    const gain=R(recalculated.score-current.score);
    current=recalculated;gains++;
    steps.push({turn:turn+1,from:old,to:topSeq,gain});
    console.log("OMBRE50_FOUND "+JSON.stringify({cls,pass,turn:turn+1,gain,score:current.score}));
   }
  }
  if(!gains)break;
 }
 trials[cls]={base:initial,best:current.score,improvement:R(current.score-initial),attempts,valid,changes:steps};
 champions[cls]=best;
 console.log("OMBRE50_CLASS "+JSON.stringify({cls,...trials[cls]}));
}
function playPlan(paths,stop=50){
 let previous=null,lowerHp=100,rounds=[];
 try{
  for(let t=0;t<stop;t++){
   const overrides=Object.fromEntries(classes.map(cls=>[lookup[cls],ids(cls,paths[cls][t])]));
   previous=playSequentialTeam(contexts,target,()=>{},{previous,oneRound:true,manualOverrides:overrides});
   const turn=previous.turns.at(-1);
   const sacri=turn.actors.find(a=>a.id===lookup.sacrieur);
   const health=sacri.health;
   lowerHp=Math.min(lowerHp,health.hp/health.maxHp*100);
   if(health.hp/health.maxHp<0.5-1e-9)return {valid:false,why:"Sacrier below 50% at turn "+(t+1)};
   for(const a of turn.actors){
    if(a.spent>a.availablePA+1e-5)return {valid:false,why:"PA exceeded "+(t+1)};
   }
   rounds.push({turn:t+1,total:R(previous.theoretical),
    byActor:Object.fromEntries(turn.actors.map(a=>[a.character,R(a.damage)]))});
  }
  return {valid:true,total:R(previous.theoretical),lowerHp:R(lowerHp),rounds,
   byActor:Object.fromEntries(previous.members.map(m=>[m.character,R(m.estimated)]))};
 }catch(error){return {valid:false,why:String(error)}}
}
const baselineManual=playPlan(path);
console.log("OMBRE50_TEAM_REFERENCE "+JSON.stringify({valid:baselineManual.valid,total:baselineManual.total,
 minSacriHp:baselineManual.lowerHp,reason:baselineManual.why}));
let championPath=Object.fromEntries(classes.map(cls=>[cls,path[cls].map(x=>x.slice())]));
let incumbent=baselineManual.valid?baselineManual:{total:baseTotal};
const accepted=[];
for(const cls of ["ecaflip","sram","sacrieur"]){
 const next=Object.fromEntries(classes.map(c=>[c,(c===cls?champions[cls]:championPath[c]).map(x=>x.slice())]));
 const verdict=playPlan(next);
 const gain=verdict.valid?R(verdict.total-incumbent.total):null;
 console.log("OMBRE50_TEAM_PROPOSAL "+JSON.stringify({cls,valid:verdict.valid,total:verdict.total,
 delta:gain,minSacriHp:verdict.lowerHp,reason:verdict.why}));
 if(verdict.valid&&gain>0.11){
  championPath=next;incumbent=verdict;
  accepted.push({cls,gain,total:incumbent.total});
 }
}
const result={settings:{rounds:50,pa:12,crits:true,targetResistances:0,minSacrierHpPercent:50,
 model:"Manual engine, single target, no enemy attacks"},
 user49,baselineReplay49:total49,baseline50:baseTotal,
 baselineTurn50:path.sacrieur[49],
 accepted,final50:incumbent.total,delta:R(incumbent.total-baseTotal),
 percent:R(100*(incumbent.total/baseTotal-1)),search:trials,
 manualRoutes:championPath,byCharacter:incumbent.byActor,minSacriHpPercent:incumbent.lowerHp,
 notes:["Fast single-character scores are candidate discovery only",
 "Only real 50-round manual team replay is used to accept improvements",
 "No guarantee of global optimum"]};
mkdirSync("results",{recursive:true});
writeFileSync("results/ombre-manual-50.json",JSON.stringify(result,null,2));
console.log("OMBRE50_FINAL "+JSON.stringify({baseline50:result.baseline50,final50:result.final50,
 delta:result.delta,percent:result.percent,accepted:result.accepted,
 search:Object.fromEntries(classes.map(cls=>[cls,{attempts:trials[cls]?.attempts||0,
 valid:trials[cls]?.valid||0,improvement:trials[cls]?.improvement||0}])),
 byCharacter:result.byCharacter,minSacriHpPercent:result.minSacriHpPercent,
 importantChanges:Object.fromEntries(classes.map(cls=>[cls,championPath[cls]
 .flatMap((row,i)=>row.join("|")===path[cls][i].join("|")?[]:[{turn:i+1,from:path[cls][i],to:row}])
 .slice(0,12)]))}));
