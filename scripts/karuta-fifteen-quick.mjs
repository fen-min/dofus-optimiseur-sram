import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {initialState,eligible,castSpell,endTurn} from "../src/engine.js";
import {playSequentialTeam} from "../src/team-sequential.js";

const HORIZON=15;
const target=cleanTeamTarget({turns:HORIZON,hp:1_000_000_000_000,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const build=INITIAL_BUILDS.find(x=>x.classId==="ecaflip");
assert.ok(build,"Profil Karuta absent");
const ctx=createTeamContext(build,target);
const picked=ctx.spells.filter(s=>s.isWeapon||ctx.settings.variants?.[s.variantGroup]===s.name);
const usable=picked.filter(s=>!s.status?.unsupported&&(s.min>0||s.ecaflipRekop||s.playHand||s.playSuit||
 s.drawCard||s.status?.buff||s.ecaflipCriticalRateBuff||s.ecaflipCritDamageBuff||s.restoreTable||s.isWeapon));
const ids=new Map(ctx.spells.map(s=>[String(s.id),s]));
const N=xs=>xs.map(id=>ids.get(id)?.name||String(id));
const R=n=>Math.round((Number(n)||0)*10)/10;
console.log("CONFIG "+JSON.stringify({character:build.character,pa:ctx.settings.ap,
 crit:build.stats.critical,chance:build.stats.chance,power:build.stats.power,
 spells:usable.map(x=>({name:x.name,pa:x.pa,damage:x.max,uses:x.maxPerTurn,nonDirect:x.nonDirect}))}));
const stats={transitions:0,turnStarts:0,depthStages:0,replays:0,validPlans:0};

// Dedup by mechanically meaningful future state, not by action history.
// At the same signature, only the highest accumulated actual damage matters.
function fingerprint(s){
 const pairs=o=>Object.keys(o||{}).sort().map(k=>k+":"+(o[k]||0)).join(",");
 const b=(s.buffs||[]).map(x=>x.key+":"+x.stat+":"+R(x.amount)+":"+x.until).sort().join(",");
 const cards=(s.ecaHand||[]).map(x=>x.suit+x.rank).sort().join(",");
 const table=(s.ecaTable||[]).map(x=>x.suit+x.rank+":"+x.expires).sort().join(",");
 const turq=(s.turquoiseProcs||[]).map(x=>R(x.value)+":"+x.until).sort().join(",");
 const shreds=(s.enemyCriticalShreds||[]).map(x=>R(x.amount)+":"+x.until).sort().join(",");
 const dots=Object.keys(s.dots||{}).sort().map(k=>k+":"+R(s.dots[k].base)+":"+s.dots[k].left).join(",");
 return [s.turn,s.pa,pairs(s.used),pairs(s.ready),b,cards,table,turq,shreds,dots].join("|");
}
function future(s,weight=1){
 let v=0;
 const turns=Math.max(0,HORIZON+1-s.turn);
 for(const b of s.buffs||[]){
  const dur=Math.min(turns,b.until-s.turn+1);
  if(dur<=0)continue;
  if(["Eau","Puissance","Air","Feu","Terre","Neutre"].includes(b.stat))v+=Math.max(0,b.amount)*dur*.85;
  if(b.stat==="Dommages finaux")v+=Math.max(0,b.amount)*dur*12;
  if(b.stat==="Critique")v+=Math.max(0,b.amount)*dur*5;
  if(b.stat==="Dommages Critiques")v+=Math.max(0,b.amount)*dur*10;
  if(b.stat==="Dommages")v+=Math.max(0,b.amount)*dur*3;
 }
 if(turns>0){
  const hand=s.ecaHand||[],table=s.ecaTable||[];
  v+=hand.length*65+table.length*20;
  const ranks=new Set(hand.filter(c=>c.suit==="club").map(c=>c.rank));
  if(ranks.size>=3)v+=2200*(ranks.size-2);
  if(ranks.size>=4)v+=1350;
 }
 return v*weight;
}
function bestUnique(arr,limit,score){
 const distinct=new Map();
 for(const x of arr){
  const key=fingerprint(x.s);
  const old=distinct.get(key);
  if(!old||x.s.total>old.s.total)distinct.set(key,x);
 }
 return [...distinct.values()].sort((a,b)=>score(b)-score(a)).slice(0,limit);
}
function play(s,id){
 const spell=ids.get(String(id));
 if(!spell||!eligible(spell,s,ctx.settings))return null;
 stats.transitions++;
 return castSpell(s,spell,ctx.settings);
}
function evalPlan(rotations){
 stats.replays++;
 let s=initialState(ctx.settings),breakdown=[];
 try{
  for(let t=0;t<HORIZON;t++){
   const before=s.total;
   for(const id of rotations[t]||[]){
    s=play(s,id);
    if(!s)return null;
   }
   s=endTurn(s,ctx.settings);
   breakdown.push(R(s.total-before));
  }
 }catch{return null;}
 stats.validPlans++;
 return {total:R(s.total),rotations:rotations.map(x=>x.slice()),breakdown,s};
}
function max(a,b){return !a||b&&b.total>a.total?b:a;}
function turnSearch(seeds,allowed,options){
 const {width,depth,keep,weight}=options;
 const results=[];
 for(const seed of seeds){
  stats.turnStarts++;
  let frontier=[{s:seed.s,actions:[]}];
  let finals=[];
  for(let d=0;d<=depth;d++){
   stats.depthStages++;
   finals.push(...frontier);
   if(d===depth)break;
   const next=[];
   for(const entry of frontier)for(const spell of allowed){
    if(!eligible(spell,entry.s,ctx.settings))continue;
    const s=castSpell(entry.s,spell,ctx.settings);stats.transitions++;
    next.push({s,actions:[...entry.actions,String(spell.id)]});
   }
   if(!next.length)break;
   frontier=bestUnique(next,width,x=>x.s.total+future(x.s,weight));
  }
  const retained=bestUnique(finals,keep,x=>x.s.total+future(x.s,weight));
  for(const candidate of retained){
   const current=candidate.s.total-seed.s.total;
   const next=endTurn(candidate.s,ctx.settings);
   results.push({s:next,rotations:[...seed.rotations,candidate.actions],
    perTurn:[...seed.perTurn,R(next.total-seed.s.total)],turnDamage:R(current)});
  }
 }
 return results;
}
// Manual-only replay is the referee for every finally reported rotation.
function verify(plan){
 assert.ok(plan);
 let previous=null;
 for(let t=0;t<HORIZON;t++){
  previous=playSequentialTeam([ctx],target,()=>{},{previous,oneRound:true,
   manualOverrides:{[ctx.build.id]:plan.rotations[t]}});
 }
 assert.equal(previous.turns.length,HORIZON);
 const damage=R(previous.theoretical);
 assert.ok(Math.abs(damage-plan.total)<.2,
  "Écart entre moteur manuel et simulation "+damage+" vs "+plan.total);
 const actors=previous.turns.map(t=>t.actors[0]);
 assert.ok(actors.every(a=>a.spent<=a.availablePA+1e-6));
 return {total:damage,turns:actors.map((a,t)=>({tour:t+1,degats:a.damage,
  paDepenses:a.spent,paDisponibles:a.availablePA,sorts:a.actions.map(x=>x.name)}))};
}
function runSearch(mode,allowed,configs){
 let best=null,top=[];
 for(const conf of configs){
  let seeds=[{s:initialState(ctx.settings),rotations:[],perTurn:[]}];
  for(let t=1;t<=HORIZON;t++){
   const generated=turnSearch(seeds,allowed,{width:conf.width,
    depth:conf.depth,keep:conf.keep,weight:conf.weight});
   const count=t===HORIZON?Math.min(12,conf.turnStates):conf.turnStates;
   const graded=bestUnique(generated,count,x=>x.s.total+future(x.s,conf.weight));
   seeds=graded;
   if(!seeds.length)throw Error("Recherche "+mode+" vide au tour "+t);
  }
  const candidate=seeds.reduce((a,x)=>!a||x.s.total>a.s.total?x:a,null);
  const res=evalPlan(candidate.rotations);
  if(res){
   top.push(res);best=max(best,res);
  }
  // Keep diverse fully legal 3-turn trajectories, not only the top scorer,
  // so local mutations can start from distinct card/buff setups.
  for(const candidate of seeds.slice(1,13)){
   const variant=evalPlan(candidate.rotations);
   if(variant)top.push(variant);
  }
  console.log("BEAM "+JSON.stringify({mode,weight:conf.weight,width:conf.width,
   turnStates:conf.turnStates,total:res?.total,
   rotation:res?.rotations.map(N)}));
 }
 return {best,top};
}
const configs=[
 {weight:0,width:95,depth:8,keep:12,turnStates:8},
 {weight:1.1,width:95,depth:8,keep:12,turnStates:8}
];
const broad=runSearch("tous_sort",usable,configs);
const noPrepSpells=usable.filter(s=>!(s.nonDirect&&s.status?.buff)&&!["Château de Cartes","Tout ou Rien","Baraka","Rekop"].includes(s.name));
const noPrep=runSearch("sans_preparation",noPrepSpells,configs.slice(0,1));
const withoutRekop=runSearch("sans_rekop",usable.filter(s=>s.name!=="Rekop"&&s.name!=="Tout ou Rien"),configs.slice(0,1));

let auto=null;
for(let i=0;i<HORIZON;i++)auto=optimizeTeamTurn([ctx],target,()=>{},auto,{mode:"fast",horizon:10,effort:"deep",minHpPercent:50});
const autoRot=auto.turns.map(t=>t.actors[0].actions.map(a=>{
 const sp=ctx.spells.find(s=>s.name===a.name);
 assert.ok(sp,"Sort automatique absent : "+a.name);
 return String(sp.id);
}));
const baseline=evalPlan(autoRot);
assert.ok(Math.abs(baseline.total-auto.theoretical)<.2);
const seeds=[...broad.top,baseline,...noPrep.top,...withoutRekop.top].filter(Boolean);
// Verified 10-round manual champion from previous CI audit, extended with
// actual legal beam-search continuations (not arbitrary later-turn copies).
const championTenNames=[["Yams","Griffe Joueuse","Kraps","Sceptre du Roi Joueur"],["Yams","Infortune","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur"],["Baraka","Tout ou Rien","Rekop","Yams"],["Griffe Joueuse","Kraps","Infortune"],["Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],["Baraka","Kraps","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],["Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],["Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],["Yams","Kraps","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],["Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur","Infortune"]];
function extendTenChampion(){
 let state=initialState(ctx.settings);
 const start=[];
 for(const spells of championTenNames){
  const idsForRound=spells.map(name=>{
   const spell=ctx.spells.find(sp=>sp.name===name);
   assert.ok(spell,name);
   return String(spell.id);
  });
  for(const id of idsForRound){
   const spell=ids.get(id);
   assert.ok(eligible(spell,state,ctx.settings),"Champion 10 rounds illegal: "+spell.name);
   state=castSpell(state,spell,ctx.settings);
  }
  state=endTurn(state,ctx.settings);
  start.push(idsForRound);
 }
 let seeds=[{s:state,rotations:start,perTurn:[]}];
 for(let turn=11;turn<=HORIZON;turn++){
  const generated=turnSearch(seeds,usable,{width:100,depth:8,keep:9,weight:.5});
  seeds=bestUnique(generated,7,x=>x.s.total+future(x.s,.5));
  assert.ok(seeds.length,"Continuation vide T"+turn);
 }
 const plans=seeds.map(candidate=>evalPlan(candidate.rotations)).filter(Boolean);
 return plans.sort((a,b)=>b.total-a.total);
}
const championExtended=extendTenChampion();
seeds.push(...championExtended);
const incumbent=championExtended[0]||baseline;
console.log("TEN_ROUND_CHAMPION_EXTENDED "+JSON.stringify({
 initial:championTenNames, extended:incumbent?.total,
 bestRotations:incumbent?.rotations.map(N)
}));
const oldPrefix=[
 ["Yams","Griffe Joueuse","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
 ["Yams","Kraps","Pile ou Face","Pile ou Face","Infortune"],
 ["Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur","Infortune"]
].map(turn=>turn.map(name=>{
 const sp=ctx.spells.find(s=>s.name===name);assert.ok(sp);return String(sp.id);
}));
const old=evalPlan([...oldPrefix,...autoRot.slice(3)]);
if(old)seeds.push(old);
console.log("BASELINE "+JSON.stringify({automatic:baseline.total,old:old?.total,autoRot:baseline.rotations.map(N)}));

// Climb the exact three-round objective; try individual replacements,
// insertions, deletions and order swaps. Restart from multiple distinct
// preliminary search results to escape a single greedy search basin.
const allowedIds=usable.map(s=>String(s.id));
const tried=new Set();
let mutationCount=0,mutationLegal=0;
function mutate(base){
 const plans=new Map();
 for(let turn=0;turn<HORIZON;turn++){
  const seq=base.rotations[turn];
  const add=newSeq=>{
   const next=base.rotations.map((x,i)=>i===turn?newSeq:x);
   const key=JSON.stringify(next);
   if(!tried.has(key))plans.set(key,next);
  };
  for(let i=0;i<seq.length;i++){
   add(seq.filter((_,j)=>i!==j));
   for(let j=i+1;j<seq.length;j++){
    const out=seq.slice();[out[i],out[j]]=[out[j],out[i]];add(out);
   }
   for(const id of allowedIds){
    if(id===seq[i])continue;
    const out=seq.slice();out[i]=id;add(out);
   }
  }
  for(let i=0;i<=seq.length;i++)for(const id of allowedIds){
   const out=seq.slice();out.splice(i,0,id);add(out);
  }
 }
 return plans;
}
function localClimb(seed,maxPasses=25){
 let best=seed,passes=0;
 for(let pass=0;pass<maxPasses;pass++){
  let nextBest=null;
  for(const [key,rotations] of mutate(best)){
   tried.add(key);mutationCount++;
   const res=evalPlan(rotations);
   if(!res)continue;
   mutationLegal++;
   if(res.total>best.total+.01)nextBest=max(nextBest,res);
  }
  if(!nextBest)break;
  best=nextBest;passes++;
  console.log("AMELIORATION "+JSON.stringify({passes,total:best.total,rotations:best.rotations.map(N)}));
 }
 return best;
}
let globalBest=seeds.reduce(max,null);
const distinctSeeds=[...new Map(seeds.map(x=>[JSON.stringify(x.rotations),x])).values()]
 .sort((a,b)=>b.total-a.total);
const improvedSeeds=[];
const selectedSeeds=[incumbent,...distinctSeeds.slice(0,4)];
for(const s of selectedSeeds){
 const improved=localClimb(s,5);
 improvedSeeds.push(improved);
 globalBest=max(globalBest,improved);
 console.log("RESTART "+JSON.stringify({seed:s.total,best:improved.total,global:globalBest.total}));
}
// Multi-turn recombination: replace entire spans of the winning rotation with
// spans from other tested strategies. This can cross card/cooldown barriers
// that require two or more coordinated turns to change at once.
const donors=[...distinctSeeds.slice(0,12),...improvedSeeds,baseline,noPrep.best,withoutRekop.best]
 .filter(Boolean);
let crossoverAttempts=0,crossoverLegal=0,crossoverImprovements=0;
for(let pass=0;pass<2;pass++){
 let top=null;
 for(const donor of donors)for(let start=0;start<HORIZON;start++){
  for(let len=1;len<=Math.min(4,HORIZON-start);len++){
   const sequence=globalBest.rotations.map((turn,index)=>
    index>=start&&index<start+len?donor.rotations[index]:turn);
   crossoverAttempts++;
   const trial=evalPlan(sequence);
   if(!trial)continue;
   crossoverLegal++;
   if(trial.total>globalBest.total+.01)top=max(top,trial);
  }
 }
 if(!top)break;
 const improved=localClimb(top,6);
 globalBest=max(globalBest,improved);
 donors.push(improved);
 crossoverImprovements++;
 console.log("CROSSOVER "+JSON.stringify({pass:pass+1,total:globalBest.total}));
}
const result={
 settings:{character:ctx.build.character,turns:HORIZON,pa:12,resistances:0,criticals:true},
 dpsMoyen:R(globalBest.total/HORIZON),
 scenarios:{
  manualAll:verify(globalBest),
  searchBest:verify(broad.best),
  noPreparatoryBuffs:verify(noPrep.best),
  noRekop:verify(withoutRekop.best),
  auto:verify(baseline)
 },
 counts:{...stats,mutationCount,mutationLegal,restarts:selectedSeeds.length,crossoverAttempts,crossoverLegal,crossoverImprovements},
 bestRotations:globalBest.rotations.map(N)
};
assert.ok(result.scenarios.manualAll.total>=result.scenarios.auto.total);
console.log("KARUTA_15_QUICK_RESULT "+JSON.stringify(result));
