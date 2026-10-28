/**
 * OMBRE: ten-round full-team DPS manual verification against the user's
 * 2026-10-28 exported combat journal (100151.7 total).
 * This audit never modifies the optimizer automatically. Every candidate
 * is fully replayed by playSequentialTeam with the three actual builds,
 * shared target debuffs, individual cooldowns and 50% Sacrier HP floor.
 */
import assert from "node:assert/strict";
import {writeFileSync,mkdirSync} from "node:fs";
import {INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {eligible,initialState,castSpell,endTurn} from "../src/engine.js";
import {sacrierCastAboveFloor,sacrierHealthAboveFloor} from "../src/sacrier-safety.js";
import {KARUTA_FIFTEEN_ROUNDS} from "../src/karuta-fifteen-plan.js";
import {SRAM_AUDITED_100} from "../src/sram-audited-plan.js";

const R=n=>Math.round((Number(n)||0)*10)/10;
const target=cleanTeamTarget({turns:100,hp:1_000_000_000_000,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const builds=INITIAL_BUILDS.map(b=>normalizeBuild(b));
const contexts=builds.map(b=>createTeamContext(b,target));
const byClass=Object.fromEntries(contexts.map(c=>[c.settings.classId,c]));
const ORDER=["sacrieur","ecaflip","sram"];
const byName=Object.fromEntries(ORDER.map(k=>[k,new Map(byClass[k].spells.map(s=>[s.name,s]))]));
const submitted=Object.freeze({
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
assert.ok(byClass.sacrieur.settings.variants.includes("Pacte de Sang"));
const ids=Object.fromEntries(ORDER.map(k=>[k,byClass[k].build.id]));
const plan=parts=>Object.fromEntries(ORDER.map(k=>[k,parts[k].map(seq=>seq.slice())]));
const baseline=plan(submitted);
const variants={
 sacrieur:[
  ["Carnage","Furie","Manthache"],
  ["Carnage","Manthache","Furie"],
  ["Manthache","Carnage","Furie"],
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Pacte de Sang","Carnage","Furie","Furie"],
  ["Furie","Furie","Désolation","Assaut"],
  ["Carnage","Furie","Furie","Assaut"],
  ["Furie","Furie","Manthache"],
  ["Furie","Furie","Assaut","Assaut","Assaut"],
  ["Manthache","Furie","Furie"]
 ],
 ecaflip:[
  ...KARUTA_FIFTEEN_ROUNDS.slice(0,10),
  ...submitted.ecaflip,
  ["Yams","Griffe Joueuse","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
  ["Yams","Kraps","Pile ou Face","Pile ou Face","Infortune"],
  ["Baraka","Tout ou Rien","Rekop","Yams"],
  ["Baraka","Kraps","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
  ["Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur","Infortune"],
  ["Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
  ["Griffe Joueuse","Kraps","Infortune"],
  ["Yams","Yams","Sceptre du Roi Joueur","Infortune"]
 ],
 sram:[
  ...SRAM_AUDITED_100.slice(0,10),
  ["Arnaque","Manthache","Épidémie"],
  ["Arnaque","Injection Toxique","Arsenic"],
  ["Arnaque","Injection Toxique","Épidémie"],
  ["Fourvoiement","Fourvoiement","Épidémie"],
  ["Manigance","Arnaque","Arsenic","Épidémie"],
  ["Manigance","Arnaque","Arnaque","Épidémie"],
  ["Truanderie","Arnaque","Arnaque","Arsenic"],
  ["Truanderie","Arsenic","Arnaque","Arnaque"],
  ["Injection Toxique","Arsenic","Épidémie"],
  ["Injection Toxique","Arnaque","Épidémie"],
  ["Épidémie","Fourvoiement","Fourvoiement"]
 ]
};
const seenChoices={};
for(const cls of ORDER){
 const map=new Map();
 for(const seq of variants[cls]){
  const key=seq.join("|");
  if(!map.has(key))map.set(key,seq);
 }
 seenChoices[cls]=[...map.values()];
}
let evaluated=0,legal=0,hpRejected=0;
const signature=rot=>JSON.stringify(ORDER.map(cls=>rot[cls]));
const cache=new Map();
function safetySacri(rounds){
 const ctx=byClass.sacrieur;
 let state=initialState(ctx.settings);
 for(let turn=0;turn<10;turn++){
  for(const name of rounds[turn]){
   const sp=byName.sacrieur.get(name);
   if(!sp||!eligible(sp,state,ctx.settings))return false;
   const next=castSpell(state,sp,ctx.settings);
   if(!sacrierCastAboveFloor(state,sp,next,50))return false;
   state=next;
  }
  state=endTurn(state,ctx.settings);
  if(!sacrierHealthAboveFloor(state,50))return false;
 }
 return true;
}
function replay(rotations,skipSafety=false){
 const key=signature(rotations);
 if(cache.has(key))return cache.get(key);
 evaluated++;
 if(!skipSafety&&!safetySacri(rotations.sacrieur)){hpRejected++;cache.set(key,null);return null;}
 let previous=null;
 try{
  for(let turn=0;turn<10;turn++){
   const overrides=Object.fromEntries(ORDER.map(cls=>[
    ids[cls],rotations[cls][turn].map(name=>{
     const sp=byName[cls].get(name);
     if(!sp)throw Error(cls+": missing "+name);
     return String(sp.id);
    })
   ]));
   previous=playSequentialTeam(contexts,target,()=>{},{previous,oneRound:true,manualOverrides:overrides});
  }
  if(previous.turns.length!==10)throw Error("Not ten rounds");
  for(const turn of previous.turns)for(const actor of turn.actors)
   assert.ok(actor.spent<=actor.availablePA+.01);
  legal++;
  const report={
   total:R(previous.theoretical),
   actors:Object.fromEntries(previous.members.map(m=>[m.character,R(m.estimated)])),
   roundTotals:previous.turns.map(t=>R(t.theoretical)),
   perTurn:previous.turns.map(t=>Object.fromEntries(t.actors.map(a=>[a.character,R(a.damage)])))
  };
  cache.set(key,report);
  return report;
 }catch(e){cache.set(key,null);return null;}
}
const copy=rot=>plan(rot);
function proposal(base,cls,start,seqs){
 const p=copy(base);
 for(let i=0;i<seqs.length;i++)p[cls][start+i]=seqs[i].slice();
 return p;
}
let best=copy(baseline),bestResult=replay(best);
const originalResult=bestResult;
console.log("TEAM_JOURNAL_10_REPLAY "+JSON.stringify({expected:100151.7,
 actual:originalResult,builds:contexts.map(c=>({
  name:c.build.character,weapon:c.build.weapon,
  variants:c.settings.variants.filter(x=>/Pacte|Manigance|Mutilation/.test(x))
 }))}));
assert.ok(originalResult,"User-supplied journal could not be replayed from reference builds");
assert.ok(Math.abs(originalResult.total-100151.7)<.4,
 "Configuration mismatch: user journal "+100151.7+" vs reference "+originalResult.total+
 ". Do not claim comparable optimal results.");
const scored=[];
const record=(label,rotation,result)=>{
 if(!result)return;
 scored.push({label,total:result.total});
 if(result.total>bestResult.total+.01){
  best=copy(rotation);bestResult=result;
  console.log("TEAM_IMPROVED "+JSON.stringify({label,total:result.total,vsUser:R(result.total-originalResult.total),actors:result.actors}));
 }
};
const examples={
 sram:SRAM_AUDITED_100.slice(0,10),
 ecaflip:KARUTA_FIFTEEN_ROUNDS.slice(0,10),
 sacrieur:[
  ["Furie","Furie","Désolation","Assaut"],
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Furie","Furie","Désolation","Assaut"],
  ["Furie","Furie","Désolation","Assaut"],
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Furie","Furie","Désolation","Assaut"],
  ["Furie","Furie","Désolation","Assaut"],
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Furie","Furie","Désolation","Assaut"],
  ["Furie","Furie","Désolation","Assaut"]
 ]
};
for(const cls of ORDER){
 const t=copy(baseline);t[cls]=examples[cls].map(seq=>seq.slice());
 record("Solo manual champion "+cls,t,replay(t));
}
// Test all 2^3 mixes of the known 10-round solo champions.
for(let mask=1;mask<8;mask++){
 const candidate=copy(baseline);
 for(let i=0;i<3;i++)if(mask&(1<<i))candidate[ORDER[i]]=examples[ORDER[i]].map(x=>x.slice());
 record("Champion mix "+mask,candidate,replay(candidate));
}
function improveRound(base,cls,turn){
 let winner=null,winnerResult=null;
 for(const option of seenChoices[cls]){
  if(JSON.stringify(option)===JSON.stringify(base[cls][turn]))continue;
  const candidate=proposal(base,cls,turn,[option]);
  const result=replay(candidate);
  if(result&&(!winnerResult||result.total>winnerResult.total+.001)){
   winnerResult=result;winner=candidate;
  }
 }
 return winnerResult&&winnerResult.total>bestResult.total+.01?{winner,result:winnerResult}:null;
}
// Deterministic coordinate search including discontinuous future buff effects.
for(let pass=1;pass<=3;pass++){
 let gained=false;
 for(const cls of ["sram","ecaflip","sacrieur"]){
  for(let turn=0;turn<10;turn++){
   const imp=improveRound(best,cls,turn);
   if(imp){record("single-round "+pass+" "+cls+" T"+(turn+1),imp.winner,imp.result);gained=true;}
  }
 }
 console.log("TEAM_AUDIT_PASS "+JSON.stringify({pass,best:bestResult.total,legal,evaluated,hpRejected}));
 if(!gained)break;
}
// Replace 2/3-round blocks to escape local maxima while preserving all cooldowns.
for(let pass=1;pass<=2;pass++){
 let gained=false;
 for(const cls of ["ecaflip","sram","sacrieur"]){
  for(let start=0;start<9;start++){
   for(const length of [2,3]){
    if(start+length>10)continue;
    const donors=[submitted[cls],examples[cls],best[cls]];
    for(const donor of donors){
     const cand=proposal(best,cls,start,donor.slice(start,start+length));
     const out=replay(cand);
     if(out&&out.total>bestResult.total+.01){
      record("block "+cls+" T"+(start+1)+"-"+(start+length),cand,out);
      gained=true;
     }
    }
   }
  }
 }
 if(!gained)break;
}
const finalReplay=replay(best);
assert.ok(Math.abs(finalReplay.total-bestResult.total)<.1);
const report={
 settings:{criticalHits:true,resistances:0,turns:10,teamHorizon:100,minSacrierHpPercent:50,
  source:"User combat log exported Oct 28 2026",
  weaponLifeSteal:"Manthache healing NOT modeled for Sram/Sacrier",
  cardLimit:"Karuta 4-card hand has unresolved game rules"},
 baseline:originalResult,best:bestResult,
 gain:R(bestResult.total-originalResult.total),
 gainPercent:R((bestResult.total/originalResult.total-1)*100),
 bestRotations:best,verifiedCount:legal,attempted:evaluated,healthRejected:hpRejected,
 references:scored
};
mkdirSync("results",{recursive:true});
writeFileSync("results/team-10-manual-compare.json",JSON.stringify(report,null,2));
console.log("TEAM_TEN_MANUAL_FINAL "+JSON.stringify(report));
