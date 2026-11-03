/**
 * OMBRE 100-round MANUAL rota optimization:
 * - 100-round baseline created by scripts/ombre-manual-100-search.mjs.
 * - Search single-character suffixes for candidate discovery only.
 * - ACCEPT a class change only after 100 turns in real MANUAL team engine.
 * - Preserve all states, cumulative buffs, PA and HP safety at every turn.
 * - Deterministic local search, NOT global optimum.
 */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {cleanTeamTarget,createTeamContext} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {initialState,eligible,castSpell,endTurn} from "../src/engine.js";
import {TEAM_FIFTY_AUDITED} from "../src/team-audited-fifty-plan.js";
import {sacrierCastAboveFloor,sacrierHealthAboveFloor} from "../src/sacrier-safety.js";

const R=n=>Math.round(Number(n)*10)/10;
const baseline=JSON.parse(readFileSync("results/ombre-manual-100-baseline.json","utf8"));
assert.equal(baseline.rotations.length,100);
assert.equal(baseline.auto100,baseline.manual100);
const target=cleanTeamTarget({turns:100,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const contexts=INITIAL_BUILDS.map(b=>{
 const build=normalizeBuild(b);
 if(build.classId==="sacrieur")build.distance=1;
 if(build.classId==="sram")build.distance=3;
 return createTeamContext(build,target);
});
const classes=["sacrieur","ecaflip","sram"];
const byClass=Object.fromEntries(contexts.map(c=>[c.settings.classId,c]));
const id=Object.fromEntries(classes.map(cls=>[cls,byClass[cls].build.id]));
const sourceSeed=process.env.OMBRE100_SEED==="optimized"?
 JSON.parse(readFileSync("results/ombre-manual-100-optimized.json","utf8")):null;
const selectedSeed=sourceSeed?.rotations||baseline.rotations;
assert.equal(selectedSeed.length,100);
const routeKey=cls=>cls==="ecaflip"?"karuta":cls==="sram"?"matryoshka":"sacrieur";
const starting=Object.fromEntries(classes.map(cls=>[
 cls,selectedSeed.map(x=>x[routeKey(cls)].slice())
]));
const actionSpell=Object.fromEntries(classes.map(cls=>[cls,
 new Map(byClass[cls].spells.map(s=>[s.name,s]))]));
const isSelected=(cls,spell)=>spell?.isWeapon||
 byClass[cls].settings.variants?.[spell.variantGroup]===spell.name;
const spellId=(cls,name)=>{
 const sp=actionSpell[cls].get(name);assert.ok(sp,cls+" spell "+name);return String(sp.id);
};
const extra={
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
  ["Furie","Furie","Assaut","Désolation"]
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
  ["Épidémie","Fourvoiement","Fourvoiement"]
 ]
};
const keys=seq=>seq.join("|");
const pool=Object.fromEntries(classes.map(cls=>[cls,
 [...new Map([...starting[cls],...TEAM_FIFTY_AUDITED[cls],...extra[cls]]
  .map(x=>[keys(x),x])).values()]
  .filter(seq=>seq.every(name=>isSelected(cls,actionSpell[cls].get(name))))]));
const limit=Number(process.env.OMBRE100_PASSES)||4;
const fromTurn=Number(process.env.OMBRE100_FROM)||40; // 1-based
const budget=Number(process.env.OMBRE100_BUDGET)||15000;

function endChecks(cls,state){
 if(cls==="sacrieur"&&!sacrierHealthAboveFloor(state,50))return false;
 if(cls==="ecaflip"){
  const live=(state.invocations||[]).filter(x=>x.kind==="Chaton Enragé").length;
  const power=(state.buffs||[]).filter(x=>x.key==="Griffe Invocatrice")
    .reduce((sum,x)=>sum+x.amount,0);
  if(live>6||power>270||Math.abs(power-90*Math.min(3,live))>0.01)return false;
 }
 return true;
}
function advance(cls,state,sequence){
 const settings=byClass[cls].settings;
 for(const name of sequence){
  const spell=actionSpell[cls].get(name);
  if(!isSelected(cls,spell)||!eligible(spell,state,settings))return null;
  const after=castSpell(state,spell,settings);
  if(cls==="sacrieur"&&!sacrierCastAboveFloor(state,spell,after,50))return null;
  state=after;
 }
 state=endTurn(state,settings);
 return endChecks(cls,state)?state:null;
}
function evaluate(cls,route,record=false){
 let state=initialState(byClass[cls].settings);
 const prefix=record?[structuredClone(state)]:null;
 for(let i=0;i<100;i++){
  state=advance(cls,state,route[i]);
  if(!state)return null;
  if(record)prefix.push(structuredClone(state));
 }
 return {score:R(state.total),prefix};
}
function suffix(cls,route,start,choice,prefix){
 let state=structuredClone(prefix[start]);
 for(let i=start;i<100;i++){
  state=advance(cls,state,i===start?choice:route[i]);
  if(!state)return null;
 }
 return R(state.total);
}
function replay(routes,label){
 let previous=null,minSacrier=100;
 const summary={byCharacter:{},minSacrierHp:null,score:null,valid:false,why:null};
 try{
  for(let i=0;i<100;i++){
   const overrides=Object.fromEntries(classes.map(cls=>[
    id[cls],routes[cls][i].map(name=>spellId(cls,name))
   ]));
   previous=playSequentialTeam(contexts,target,()=>{},{previous,oneRound:true,
    manualOverrides:overrides});
   for(const actor of previous.turns.at(-1).actors){
    assert.ok(actor.availablePA<=30&&actor.spent<=actor.availablePA+.00001,
      "Excess AP "+actor.character+" T"+(i+1));
    if(actor.id===id.sacrieur){
     const pct=100*actor.health.hp/actor.health.maxHp;
     minSacrier=Math.min(minSacrier,pct);
     assert.ok(pct>=50-1e-6,"Sacrier below 50% T"+(i+1)+": "+pct);
    }
   }
   const eca=previous.session.actors.find(a=>a.id===id.ecaflip).state;
   assert.ok(endChecks("ecaflip",eca),"Kitten Power cap/number at T"+(i+1));
  }
  summary.valid=true;
  summary.score=R(previous.theoretical);
  summary.minSacrierHp=R(minSacrier);
  summary.byCharacter=Object.fromEntries(previous.members.map(m=>[m.character,R(m.estimated)]));
 }catch(error){
  summary.why=String(error);
  summary.invalidAfter=previous?.turns.length??0;
 }
 console.log("OMBRE100_REPLAY "+JSON.stringify({label,...summary}));
 return summary;
}
const baseReplay=replay(starting,sourceSeed?"previous-manual-100":"actual-auto-100");
assert.ok(baseReplay.valid,"AUTO baseline cannot be replayed safely: "+baseReplay.why);
assert.equal(baseReplay.score,sourceSeed?sourceSeed.manualOptimized100:baseline.auto100,"100-round seed->manual parity");
console.log("OMBRE100_SEARCH_BEGINS "+JSON.stringify({baseline:baseReplay.score,
 fromTurn,limit,budget,pool:Object.fromEntries(classes.map(c=>[c,pool[c].length]))}));

const champions={},search={},teamAccepted=[],candidateRoutes=Object.fromEntries(
 classes.map(cls=>[cls,starting[cls].map(s=>s.slice())]));
let incumbent=baseReplay;

for(const cls of ["ecaflip","sram","sacrieur"]){
 let best=starting[cls].map(x=>x.slice());
 let current=evaluate(cls,best,true);
 if(!current){
  search[cls]={error:"Initial independent route failed legality/safety, skipped"};
  champions[cls]=best;
  console.log("OMBRE100_SINGLE_FAILED "+JSON.stringify({cls}));
  continue;
 }
 const before=current.score;
 const changes=[];
 let attempts=0,valid=0,remaining=budget;
 for(let pass=1;pass<=limit&&remaining>0;pass++){
  let improved=0;
  for(let t=fromTurn-1;t<100&&remaining>0;t++){
   const original=best[t];
   const candidates=[...pool[cls]];
   for(let a=0;a<original.length;a++)for(let b=a+1;b<original.length;b++){
    const shuffled=original.slice();[shuffled[a],shuffled[b]]=[shuffled[b],shuffled[a]];
    candidates.push(shuffled);
   }
   const visited=new Set([keys(original)]);
   let topScore=current.score,top=null;
   for(const option of candidates){
    const key=keys(option);if(visited.has(key))continue;visited.add(key);
    attempts++;remaining--;
    const score=suffix(cls,best,t,option,current.prefix);
    if(score===null)continue;
    valid++;
    if(score>topScore+0.11){topScore=score;top=option;}
    if(remaining<=0)break;
   }
   if(top){
    const originalCopy=original.slice();
    best[t]=top.slice();
    const checked=evaluate(cls,best,true);
    if(!checked||checked.score<topScore-.11){
     best[t]=original;continue;
    }
    const gain=R(checked.score-current.score);
    current=checked;
    changes.push({t:t+1,from:originalCopy,to:top.slice(),gain,score:current.score});
    improved++;
    console.log("OMBRE100_FOUND "+JSON.stringify({cls,pass,turn:t+1,gain,score:current.score}));
   }
  }
  console.log("OMBRE100_PASS "+JSON.stringify({cls,pass,improved,score:current.score,attempts,valid}));
  if(!improved)break;
 }
 champions[cls]=best;
 search[cls]={independentBefore:before,independentAfter:current.score,
  independentGain:R(current.score-before),attempts,valid,changes};
 const proposal=Object.fromEntries(classes.map(c=>[c,
  (c===cls?best:candidateRoutes[c]).map(seq=>seq.slice())]));
 const verdict=replay(proposal,"candidate-"+cls);
 if(verdict.valid&&verdict.score>incumbent.score+.11){
  const gain=R(verdict.score-incumbent.score);
  candidateRoutes[cls]=best.map(s=>s.slice());
  incumbent=verdict;
  teamAccepted.push({cls,gain,cumulative:incumbent.score,changes:changes.length});
  console.log("OMBRE100_CLASS_ACCEPTED "+JSON.stringify(teamAccepted.at(-1)));
 }else console.log("OMBRE100_CLASS_REJECTED "+JSON.stringify({cls,verdict,incumbent:incumbent.score}));
}
const final=replay(candidateRoutes,"final-100");
assert.ok(final.valid&&final.score>=baseReplay.score,"Manual search damaged 100-turn result");
const result={title:"OMBRE — recherche manuelle 100 tours (meilleur résultat testé, non optimum global)",
 seed100:baseReplay.score,
 conditions:baseline.conditions, baseline100:baseReplay.score,manualOptimized100:final.score,
 delta:R(final.score-baseline.auto100),gainOverSeed:R(final.score-baseReplay.score),
 improvementPercent:+((final.score/baseline.auto100-1)*100).toFixed(2),
 minSacrierHpPercent:final.minSacrierHp,byCharacter:final.byCharacter,
 accepted:teamAccepted,search,
 changedTurns:Object.fromEntries(classes.map(cls=>[cls,candidateRoutes[cls].flatMap((s,i)=>
  keys(s)===keys(starting[cls][i])?[]:[i+1])])),
 rotations:Array.from({length:100},(_,i)=>({
  turn:i+1,sacrieur:candidateRoutes.sacrieur[i],
  karuta:candidateRoutes.ecaflip[i],matryoshka:candidateRoutes.sram[i]})),
 notes:["100 full rounds verified through actual manual team engine",
  "Every cast must pass the current engine legality checks; all 12 PA each turn",
  "Sacrier HP >=50%, kittens max 6 and bonus Power <=270",
  "Enemy attacks, movement, summon AI not simulated",
  "Finite local search: best found, not proven global optimum"]
};
mkdirSync("results",{recursive:true});
writeFileSync("results/ombre-manual-100-optimized.json",JSON.stringify(result,null,2)+"\n");
console.log("OMBRE100_SEARCH_FINAL "+JSON.stringify({baseline100:result.baseline100,
 final100:result.manualOptimized100,delta:result.delta,overSeed:result.gainOverSeed,pct:result.improvementPercent,
 minHp:result.minSacrierHpPercent,byCharacter:result.byCharacter,
 accepted:result.accepted,changedTurns:result.changedTurns,
 attempts:Object.fromEntries(classes.map(c=>[c,search[c]?.attempts||0])),
 valid:Object.fromEntries(classes.map(c=>[c,search[c]?.valid||0]))}));
console.log("OMBRE100_OPTIMIZED_ROUTE "+JSON.stringify(result.rotations));
