/**
 * OMBRE: Audit Matryoshka's Sram Air choices in actual THREE-PERSON combat.
 * Search 3/10 rounds, keeping current team strategy for Sacrier & Karuta,
 * mutating only Sram. Every scored candidate is replayed and its combat
 * logs are checked for PA, buff/poison tick consistency and eligibility.
 */
import assert from "node:assert/strict";
import {writeFileSync,mkdirSync} from "node:fs";
import {INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {TEAM_TEN_ATTACK} from "../src/team-audited-ten-plan.js";
import {SRAM_AUDITED_3,SRAM_AUDITED_100} from "../src/sram-audited-plan.js";
import {initialState,castSpell,endTurn,eligible} from "../src/engine.js";
import {sacrierCastAboveFloor,sacrierHealthAboveFloor} from "../src/sacrier-safety.js";

const T=Number(process.argv[2]||10);
assert.ok([3,10].includes(T));
const R=n=>Math.round(Number(n)*10)/10;
const target=cleanTeamTarget({turns:100,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const builds=INITIAL_BUILDS.map(b=>{
 const x=normalizeBuild(b);
 if(["sacrieur","sram"].includes(x.classId))x.distance=1;
 return x;
});
const contexts=builds.map(b=>createTeamContext(b,target));
const byClass=Object.fromEntries(contexts.map(c=>[c.settings.classId,c]));
const classes=["sacrieur","ecaflip","sram"];
const byName=Object.fromEntries(classes.map(cls=>[
 cls,new Map(byClass[cls].spells.map(s=>[s.name,s]))
]));
const incumbent=Object.fromEntries(classes.map(cls=>[cls,TEAM_TEN_ATTACK[cls].slice(0,T).map(x=>x.slice())]));
const clone=p=>Object.fromEntries(classes.map(cls=>[cls,p[cls].map(x=>x.slice())]));
const key=p=>JSON.stringify(p.sram);
const saved=new Map();
const rejection={eligibility:0,logged:0,unsafe:0};
let attempts=0,valid=0,improvements=[];
function validateRound(result,index){
 const turn=result.turns[index];assert.ok(turn,"missing turn");
 let sum=0;
 for(const actor of turn.actors){
  assert.ok(actor.spent<=actor.availablePA+0.01,"PA overflow "+actor.character);
  assert.equal(actor.actions.length,actor.log.casts.length);
  assert.ok(Math.abs(actor.direct-R(actor.log.casts.reduce((acc,c)=>acc+c.damage,0)))<.15);
  assert.ok(Math.abs(actor.poison-actor.log.end.delayed)<.15);
  assert.ok(Math.abs(actor.damage-R(actor.direct+actor.poison))<.15);
  assert.ok(actor.log.casts.every(c=>c.remainingPA>=0));
  assert.ok(actor.log.casts.every(c=>!c.alerts?.length),
   actor.character+" has alerts "+JSON.stringify(actor.log.casts));
  sum+=actor.damage;
 }
 assert.ok(Math.abs(R(sum)-turn.theoretical)<.15,"group damage sum invalid");
 const sacri=turn.actors.find(a=>a.character==="Mon Sacrieur");
 assert.ok(sacri.health.hp/sacri.health.maxHp>=.5,
  "Sacrier unsafe in team round "+(index+1));
 const sram=turn.actors.find(a=>a.character==="Matryoshka");
 const sramState=result.session.actors.find(a=>a.id===sram.id).state;
 const activeDots=Object.values(sramState.dots||{}).filter(d=>d.left>0);
 assert.ok(activeDots.every(d=>d.left>0&&Number.isFinite(d.base)));
 const direct=R(sram.log.casts.reduce((s,c)=>s+c.damage,0));
 assert.ok(Math.abs(sram.direct-direct)<.15);
 return {turn:index+1,teamDamage:turn.theoretical,sramDamage:sram.damage,
  sramDirect:sram.direct,sramPoisons:sram.poison,
  spentPA:sram.spent,remainingPA:sram.availablePA-sram.spent,
  rotation:sram.actions.map(a=>a.name),
  activeBuffs:(sramState.buffs||[]).filter(b=>b.until>=sramState.turn).map(b=>b.key),
  activePoisons:activeDots.map(d=>d.name)};
}
function legalSram(p){
 const c=byClass.sram;let state=initialState(c.settings);
 for(const seq of p.sram){
  for(const name of seq){
   const spell=byName.sram.get(name);
   if(!spell||!(spell.isWeapon||c.settings.variants?.[spell.variantGroup]===spell.name)||
     !eligible(spell,state,c.settings))return false;
   state=castSpell(state,spell,c.settings);
  }
  state=endTurn(state,c.settings);
 }
 return true;
}
function evalCandidate(p){
 const k=key(p);if(saved.has(k))return saved.get(k);
 attempts++;
 if(!legalSram(p)){rejection.eligibility++;saved.set(k,null);return null;}
 let previous=null;
 try{
  for(let i=0;i<T;i++){
   const manualOverrides={};
   for(const cls of classes){
    const c=byClass[cls],spells=p[cls][i].map(n=>byName[cls].get(n));
    if(spells.some(s=>!s))throw Error("missing spell");
    manualOverrides[c.build.id]=spells.map(s=>String(s.id));
   }
   previous=playSequentialTeam(contexts,target,()=>{},{previous,oneRound:true,manualOverrides});
   const actual=previous.turns[i].actors;
   for(const a of actual){
    const cls=contexts.find(c=>c.build.id===a.id).settings.classId;
    assert.equal(a.actions.length,p[cls][i].length,"some actions skipped");
   }
   validateRound(previous,i);
  }
 }catch(e){rejection.logged++;saved.set(k,null);return null;}
 valid++;
 const turns=previous.turns.map((_,i)=>validateRound(previous,i));
 const result={
  total:R(previous.theoretical),
  sram:R(previous.members.find(m=>m.character==="Matryoshka").estimated),
  byCharacter:Object.fromEntries(previous.members.map(m=>[m.character,R(m.estimated)])),
  rotations:p.sram.map(x=>x.slice()),
  turns
 };
 saved.set(k,result);return result;
}
let current=clone(incumbent),baseline=evalCandidate(current);
assert.ok(baseline,"incumbent full-team Sram audit failed");
if(T===10)assert.ok(Math.abs(baseline.total-110046.6)<.2,"reference team result changed "+baseline.total);
console.log("SRAM_TEAM_AUDIT_BASELINE "+JSON.stringify({rounds:T,team:baseline.total,sram:baseline.sram,turns:baseline.turns}));
let best=baseline;
const candidates=[
 ...TEAM_TEN_ATTACK.sram,...SRAM_AUDITED_3,...SRAM_AUDITED_100.slice(0,20),
 ["Arnaque","Manthache","Épidémie"],["Manthache","Arnaque","Épidémie"],
 ["Épidémie","Arnaque","Manthache"],["Arnaque","Manthache","Arnaque"],
 ["Arnaque","Injection Toxique","Arsenic"],
 ["Injection Toxique","Arnaque","Arsenic"],
 ["Arnaque","Injection Toxique","Épidémie"],
 ["Injection Toxique","Arsenic","Épidémie"],
 ["Arsenic","Injection Toxique","Épidémie"],
 ["Arsenic","Épidémie","Injection Toxique"],
 ["Fourvoiement","Fourvoiement","Épidémie"],
 ["Épidémie","Fourvoiement","Fourvoiement"],
 ["Truanderie","Arnaque","Arnaque","Arsenic"],
 ["Manigance","Arnaque","Arnaque","Épidémie"],
 ["Manigance","Arnaque","Arsenic","Épidémie"],
 ["Arnaque","Manigance","Arsenic","Épidémie"],
 ["Arnaque","Manthache","Truanderie"],
 ["Arnaque","Arnaque","Manthache"],
 ["Manthache","Arnaque","Arnaque"],
 ["Arnaque","Épidémie","Manthache"],
 ["Manthache","Épidémie","Arnaque"],
 ["Manigance","Arnaque","Manthache"],
 ["Arnaque","Manigance","Manthache"],
 ["Arnaque","Arnaque","Épidémie","Arsenic"],
 ["Arnaque","Arnaque","Injection Toxique"],
 ["Injection Toxique","Arnaque","Arnaque"]
];
const unique=new Map(candidates.map(s=>[s.join("|"),s]));
const options=[...unique.values()];
let passes=0;
for(let pass=1;pass<=5;pass++){
 passes++;let improvement=false;
 for(let turn=0;turn<T;turn++){
  let local=null,which=null;
  const orderVariations=[];
  for(const seq of options){
   orderVariations.push(seq);
   if(seq.length>1){
    for(let a=0;a<seq.length;a++)for(let b=a+1;b<seq.length;b++){
     const reversed=seq.slice();
     [reversed[a],reversed[b]]=[reversed[b],reversed[a]];
     orderVariations.push(reversed);
    }
   }
  }
  const evaluated=new Set();
  for(const seq of orderVariations){
   const sk=seq.join("|");
   if(evaluated.has(sk)||sk===current.sram[turn].join("|"))continue;
   evaluated.add(sk);
   const change=clone(current);change.sram[turn]=seq.slice();
   const result=evalCandidate(change);
   if(result&&result.total>best.total+.01&&(!local||result.total>local.total)){
    local=result;which=change;
   }
  }
  if(local){
   improvement=true;current=which;best=local;
   improvements.push({pass,turn:turn+1,total:best.total,sram:best.sram});
   console.log("SRAM_TEAM_AUDIT_IMPROVED "+JSON.stringify(improvements.at(-1)));
  }
 }
 console.log("SRAM_TEAM_AUDIT_PASS "+JSON.stringify({T,pass,team:best.total,sram:best.sram,attempts,valid}));
 if(!improvement)break;
}
// Try multi-round block swaps from the audited long Sram reference and
// adjacent changes that can affect poison expiration / buff investment.
for(const donor of [SRAM_AUDITED_100,TEAM_TEN_ATTACK.sram,SRAM_AUDITED_3]){
 for(let start=0;start<T;start++)for(const count of [2,3,4,5]){
  if(start+count>T||start+count>donor.length)continue;
  const p=clone(current);
  for(let j=0;j<count;j++)p.sram[start+j]=donor[start+j].slice();
  const result=evalCandidate(p);
  if(result&&result.total>best.total+.01){
   current=p;best=result;improvements.push({donor:true,start:start+1,count,total:best.total});
   console.log("SRAM_TEAM_AUDIT_BLOCK "+JSON.stringify(improvements.at(-1)));
  }
 }
}
const report={settings:{rounds:T,pa:12,criticals:true,resistances:0,
  lineup:contexts.map(c=>c.build.character),sacrierFloorPercent:50,
  source:"October 28 player comparison, current GitHub engine",
  note:"GitHub reference builds differ from user's local Sram stats"},
 baseline,best,gainTeam:R(best.total-baseline.total),gainSram:R(best.sram-baseline.sram),
 attempts,valid,invalid:rejection,passes,improvements,
 improvementIsVerified:best.total>=baseline.total};
mkdirSync("results",{recursive:true});
writeFileSync("results/sram-team-current-"+T+".json",JSON.stringify(report,null,2));
console.log("SRAM_TEAM_AUDIT_FINAL "+JSON.stringify(report));
