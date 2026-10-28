/**
 * Current-engine full-team manual audit (2026-10-28).
 * Uses playSequentialTeam and the EXACT 10-round reference. Scores *complete*
 * rotations, including poison ticks, Ecaflip full-hand auto-play, Manthache
 * healing and Sacrier state, with Pacte on T2/T5/T8 and 50% HP minimum.
 * This is a reproducible HEURISTIC search, never proof of global optimality.
 */
import assert from "node:assert/strict";
import {writeFileSync,mkdirSync} from "node:fs";
import {INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {sacrierCastAboveFloor,sacrierHealthAboveFloor} from "../src/sacrier-safety.js";
import {initialState,eligible,castSpell,endTurn} from "../src/engine.js";
import {KARUTA_FIFTEEN_ROUNDS} from "../src/karuta-fifteen-plan.js";
import {SRAM_AUDITED_100} from "../src/sram-audited-plan.js";
import {TEAM_TEN_AUDITED,TEAM_TEN_BASELINE} from "../src/team-audited-ten-plan.js";

const R=n=>Math.round((Number(n)||0)*10)/10;
const horizon=10,passes=Number(process.env.SEARCH_PASSES||4);
const target=cleanTeamTarget({turns:100,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const classes=["sacrieur","ecaflip","sram"],minimum=50;
const builds=INITIAL_BUILDS.map(b=>{
 const normalized=normalizeBuild(b);
 return ["sacrieur","sram"].includes(normalized.classId)?
  {...normalized,distance:1}:normalized;
});
const contexts=builds.map(b=>createTeamContext(b,target));
const ctx=Object.fromEntries(contexts.map(c=>[c.settings.classId,c]));
const lookup=Object.fromEntries(classes.map(cls=>[
 cls,new Map(ctx[cls].spells.map(s=>[s.name,s]))
]));
const ids=Object.fromEntries(classes.map(cls=>[cls,ctx[cls].build.id]));
const plan=p=>Object.fromEntries(classes.map(c=>[c,p[c].map(x=>x.slice())]));
const serialize=p=>JSON.stringify(classes.map(cls=>p[cls]));
const allPacts=p=>[2,5,8].every(t=>p.sacrieur[t-1]?.includes("Pacte de Sang"));
let attempts=0,legal=0,healthRejected=0,mechanicRejected=0,replayCache=new Map(),reports=[];
function safety(plan){
 const c=ctx.sacrieur;
 let state=initialState(c.settings);
 for(const round of plan.sacrieur){
  for(const name of round){
   const s=lookup.sacrieur.get(name);
   if(!s||!eligible(s,state,c.settings))return false;
   const next=castSpell(state,s,c.settings);
   if(!sacrierCastAboveFloor(state,s,next,minimum))return false;
   state=next;
  }
  state=endTurn(state,c.settings);
  if(!sacrierHealthAboveFloor(state,minimum))return false;
 }
 return true;
}
function verifyLoggedRound(result,at){
 const turn=result.turns[at];
 assert.equal(turn.actors.length,3);
 let actorsTotal=0;
 for(const actor of turn.actors){
  assert.ok(Number.isFinite(actor.damage)&&actor.damage>=0,"invalid actor damage");
  assert.ok(actor.spent>=0&&actor.spent<=actor.availablePA+.0001,"overspent PA");
  assert.equal(actor.log.casts.length,actor.actions.length,"per-cast journal is incomplete");
  assert.ok(Math.abs(R(actor.direct+actor.poison)-actor.damage)<.12,
   actor.character+" direct+poison mismatch");
  assert.ok(Math.abs(R(actor.log.casts.reduce((n,a)=>n+a.damage,0))-
   actor.direct)<.12,actor.character+" spell sum mismatch");
  assert.ok(Math.abs(actor.log.end.delayed-actor.poison)<.12,
   actor.character+" pending damage mismatch");
  assert.ok(actor.log.casts.every(x=>x.remainingPA>=0),"negative AP in journal");
  const c=contexts.find(c=>c.build.id===actor.id);
  const session=result.session.actors.find(a=>a.id===actor.id);
  if(c.settings.classId==="ecaflip"){
   assert.ok(session.state.ecaHand.length<=4,
    "fifth Ecaflip card retained without play");
   assert.ok(session.state.ecaTable.length<=12,
    "Ecaflip table illegally overflows");
  }
  if(c.settings.classId==="sacrieur"){
   assert.ok(sacrierHealthAboveFloor(session.state,minimum),
    "Sacrier below 50% after a round");
   assert.deepEqual(actor.health,session.state.sacrierHealth,
    "logged health differs from actual simulated HP");
  }
  actorsTotal+=actor.damage;
 }
 assert.ok(Math.abs(R(actorsTotal)-turn.theoretical)<.15,
  "logged team subtotal mismatch");
}
function evaluate(rot){
 const key=serialize(rot);
 if(replayCache.has(key))return replayCache.get(key);
 attempts++;
 if(!allPacts(rot)||!safety(rot)){
  healthRejected++;replayCache.set(key,null);return null;
 }
 let previous=null;
 try{
  for(let t=0;t<horizon;t++){
   const manualOverrides={};
   for(const cls of classes){
    const names=rot[cls][t];
    const spells=names.map(n=>lookup[cls].get(n));
    if(spells.some(s=>!s))throw Error("missing spell");
    manualOverrides[ids[cls]]=spells.map(s=>String(s.id));
   }
   previous=playSequentialTeam(contexts,target,()=>{},{previous,oneRound:true,manualOverrides});
   const turn=previous.turns[t];
   for(const actor of turn.actors){
    const cls=contexts.find(c=>c.build.id===actor.id).settings.classId;
    if(actor.actions.length!==rot[cls][t].length)
     throw Error("illegal action truncated "+cls+" T"+(t+1));
   }
   verifyLoggedRound(previous,t);
  }
  legal++;
  const output={score:R(previous.theoretical),
   actorScores:Object.fromEntries(previous.members.map(m=>[m.character,R(m.estimated)])),
   firstTenDamage:previous.turns.map(t=>R(t.theoretical)),
   minSacriPercent:R(Math.min(...previous.turns.map(t=>{
    const hp=t.actors.find(a=>a.character==="Mon Sacrieur").health;
    return hp.hp/hp.maxHp*100;
   }))),
   alerts:previous.turns.flatMap(t=>t.actors.flatMap(a=>a.log.casts.flatMap(x=>x.alerts))).slice(0,10)
  };
  replayCache.set(key,output);return output;
 }catch(e){
  mechanicRejected++;
  replayCache.set(key,null);return null;
 }
}
const incumbent=plan(TEAM_TEN_AUDITED),baseline=plan(TEAM_TEN_BASELINE);
let best=incumbent,bestScore=evaluate(incumbent);
const old=evaluate(baseline);
assert.ok(bestScore&&old&&bestScore.score>old.score);
console.log("TEAM_DEEP_BASELINE "+JSON.stringify({incumbent:bestScore,previous:old}));
function logBest(why,plan,result){
 if(result&&result.score>bestScore.score+.01){
  best=plan;bestScore=result;
  console.log("TEAM_DEEP_IMPROVED "+JSON.stringify({
   why,total:result.score,gainOverIncumbent:R(result.score-evaluate(incumbent).score),
   byCharacter:result.actorScores,minimumHp:result.minSacriPercent
  }));
  return true;
 }
 return false;
}
const UNIQUE={};
const curated={
 sacrieur:[
  ...incumbent.sacrieur,
  ...baseline.sacrieur,
  ["Carnage","Manthache","Furie"],
  ["Carnage","Furie","Manthache"],
  ["Manthache","Carnage","Furie"],
  ["Furie","Furie","Désolation","Assaut"],
  ["Furie","Furie","Carnage","Assaut"],
  ["Furie","Furie","Manthache"],
  ["Furie","Furie","Assaut","Assaut","Assaut"],
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Pacte de Sang","Carnage","Furie","Furie"],
  ["Pacte de Sang","Furie","Manthache","Assaut"],
  ["Pacte de Sang","Furie","Désolation","Assaut"],
  ["Pacte de Sang","Manthache","Assaut","Assaut"]
 ],
 ecaflip:[
  ...incumbent.ecaflip,
  ...baseline.ecaflip,
  ...KARUTA_FIFTEEN_ROUNDS.slice(0,10),
  ["Yams","Griffe Joueuse","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
  ["Kraps","Pile ou Face","Infortune","Sceptre du Roi Joueur"],
  ["Baraka","Tout ou Rien","Rekop","Yams"],
  ["Baraka","Kraps","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
  ["Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
  ["Yams","Kraps","Pile ou Face","Pile ou Face","Infortune"],
  ["Yams","Yams","Sceptre du Roi Joueur","Infortune"],
  ["Infortune","Pile ou Face","Sceptre du Roi Joueur","Pile ou Face"],
  ["Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur","Infortune"]
 ],
 sram:[
  ...incumbent.sram,...baseline.sram,...SRAM_AUDITED_100.slice(0,10),
  ["Arnaque","Manthache","Épidémie"],
  ["Manthache","Arnaque","Épidémie"],
  ["Épidémie","Arnaque","Manthache"],
  ["Arnaque","Injection Toxique","Arsenic"],
  ["Injection Toxique","Arnaque","Épidémie"],
  ["Injection Toxique","Arsenic","Épidémie"],
  ["Arsenic","Injection Toxique","Épidémie"],
  ["Arnaque","Arnaque","Épidémie","Arsenic"],
  ["Fourvoiement","Fourvoiement","Épidémie"],
  ["Manigance","Arnaque","Arsenic","Épidémie"],
  ["Manigance","Arnaque","Arnaque","Épidémie"],
  ["Truanderie","Arnaque","Arnaque","Arsenic"]
 ]
};
for(const cls of classes){
 const map=new Map(curated[cls].map(x=>[x.join("|"),x]));
 UNIQUE[cls]=[...map.values()];
}
function changed(rot,cls,t,newSeq){
 const out=plan(rot);out[cls][t]=newSeq.slice();return out;
}
let stateCount=0;
for(let pass=1;pass<=passes;pass++){
 let improved=false;
 for(const cls of ["sram","ecaflip","sacrieur"]){
  for(let t=0;t<10;t++){
   let selected=null,res=null;
   const seq=best[cls][t];
   const options=[...UNIQUE[cls]];
   // Reordering within a turn changes damage if buffs/debuffs are early.
   // Include all pair swaps, but not factorial permutations.
   for(let a=0;a<seq.length;a++)for(let b=a+1;b<seq.length;b++){
    const swap=seq.slice();[swap[a],swap[b]]=[swap[b],swap[a]];options.push(swap);
   }
   const seen=new Set();
   for(const next of options){
    const key=next.join("|");
    if(seen.has(key)||key===seq.join("|"))continue;seen.add(key);
    const candidate=changed(best,cls,t,next);
    const score=evaluate(candidate);
    stateCount++;
    if(score&&score.score>bestScore.score+.01&&
       (!res||score.score>res.score)){
     selected=candidate;res=score;
    }
   }
   if(selected){improved=logBest("pass "+pass+" "+cls+" T"+(t+1),selected,res)||improved;}
  }
 }
 console.log("TEAM_DEEP_PASS "+JSON.stringify({pass,score:bestScore.score,
  attempts,legal,healthRejected,mechanicRejected}));
 if(!improved)break;
}
// Cross over multi-round blocks between high-quality known routes.
const seeds=[
 incumbent,baseline,
 ...classes.map(cls=>{
  const p=plan(incumbent);p[cls]=(cls==="ecaflip"?KARUTA_FIFTEEN_ROUNDS:
    cls==="sram"?SRAM_AUDITED_100:baseline.sacrieur).slice(0,10).map(x=>x.slice());
  return p;
 })
];
for(let pass=1;pass<=2;pass++){
 let improved=false;
 for(const cls of ["sram","ecaflip","sacrieur"]){
  for(let start=0;start<9;start++){
   for(const size of [2,3,4]){
    if(start+size>10)continue;
    for(const donor of seeds){
     const proposal=plan(best);
     for(let t=start;t<start+size;t++)proposal[cls][t]=donor[cls][t].slice();
     const score=evaluate(proposal);
     if(score)improved=logBest("multi-round "+cls+" "+(start+1)+
      "-"+(start+size),proposal,score)||improved;
    }
   }
  }
 }
 if(!improved)break;
}
assert.ok(bestScore.score>=evaluate(incumbent).score);
const report={
 settings:{builds:"normalized references, melee Sacrier and Sram",pa:12,
  turns:10,teamStrategy:"long 100",minimumSacrierHpPercent:50,
  forcedPactTurns:[2,5,8],criticals:true,resistances:0,
  userUploadedLog:104878.3,
  note:"The user local builds differ from the GitHub baseline. Compare like-for-like only."},
 baselineCurrent:evaluate(incumbent),
 baselineOld:old,
 best:bestScore,
 improvement:R(bestScore.score-evaluate(incumbent).score),
 improvementPercent:R((bestScore.score/evaluate(incumbent).score-1)*100),
 rotations:best,
 search:{attempts,legal,healthRejected,mechanicRejected,pairVariations:stateCount},
 logsContract:"Every candidate verified cast-by-cast, PA/delayed damage/PV and Ecaflip hand."
};
mkdirSync("results",{recursive:true});
writeFileSync("results/team-deep-10.json",JSON.stringify(report,null,2));
console.log("TEAM_DEEP_FINAL "+JSON.stringify(report));
