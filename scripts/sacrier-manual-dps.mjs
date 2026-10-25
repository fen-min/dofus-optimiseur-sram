import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {initialState,eligible,castSpell,endTurn} from "../src/engine.js";
import {playSequentialTeam} from "../src/team-sequential.js";

const turns=Number(process.argv[2]);
if(![3,10].includes(turns))throw Error("3 ou 10 tours requis");
const target=cleanTeamTarget({turns,hp:1_000_000_000_000,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const build=INITIAL_BUILDS.find(x=>x.classId==="sacrieur");
assert.ok(build,"Sacrieur absent");
const ctx=createTeamContext(build,target);
const picked=ctx.spells.filter(s=>s.isWeapon||ctx.settings.variants?.[s.variantGroup]===s.name);
const offensive=new Set(["Puissance","Dommages finaux","Critique","Air","Dommages"]);
const usable=picked.filter(s=>!s.status?.unsupported&&(s.min>0||s.isWeapon||
 s.status?.berserk||s.status?.mutilation||s.status?.vulnerability||
 offensive.has(s.status?.buff?.stat)));
const ids=new Map(ctx.spells.map(s=>[String(s.id),s]));
const N=xs=>xs.map(id=>ids.get(id)?.name||String(id));
const R=n=>Math.round((Number(n)||0)*10)/10;
console.log("CONFIG "+JSON.stringify({character:build.character,pa:ctx.settings.ap,
 crit:build.stats.critical,agility:build.stats.agility,power:build.stats.power,hp:ctx.settings.sacrierMaxHp,
 spells:usable.map(x=>({name:x.name,pa:x.pa,damage:x.max,uses:x.maxPerTurn,nonDirect:x.nonDirect}))}));
const stats={transitions:0,turnStarts:0,depthStages:0,replays:0,validPlans:0};

// Dedup by mechanically meaningful future state, not by action history.
// At the same signature, only the highest accumulated actual damage matters.
function fingerprint(s){
 const pairs=o=>Object.keys(o||{}).sort().map(k=>k+":"+(o[k]||0)).join(",");
 const buffs=(s.buffs||[]).map(b=>b.key+":"+b.stat+":"+b.amount+":"+b.until).sort().join("|");
 return [s.turn,s.pa,pairs(s.used),pairs(s.ready),buffs,s.berserkActive,s.mutilationStage,
  s.sacrierHealth?.hp,s.sacrierHealth?.maxHp,s.sacrierHealth?.suffering,
  s.position,s.enemyDebuff?.expires,s.enemyDebuff?.multiplier].join("|");
}
function future(s,weight=1){
 const remaining=Math.max(0,turns-s.turn+1);
 let bonus=0;
 for(const b of s.buffs||[]){
  const life=Math.min(remaining,b.until-s.turn+1);
  if(life<1)continue;
  if(["Puissance","Air"].includes(b.stat))bonus+=Math.max(0,b.amount)*life*.85;
  if(b.stat==="Dommages finaux")bonus+=Math.max(0,b.amount)*life*17;
  if(b.stat==="Critique")bonus+=Math.max(0,b.amount)*life*5;
 }
 if(s.berserkActive)bonus+=remaining*130;
 bonus+=Math.max(0,(s.sacrierHealth?.suffering||0)-3)*remaining*40;
 return bonus*weight;
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
  for(let t=0;t<turns;t++){
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
 for(let t=0;t<turns;t++){
  previous=playSequentialTeam([ctx],target,()=>{},{previous,oneRound:true,
   manualOverrides:{[ctx.build.id]:plan.rotations[t]}});
 }
 assert.equal(previous.turns.length,turns);
 const damage=R(previous.theoretical);
 assert.ok(Math.abs(damage-plan.total)<.2,"Moteur manuel "+damage+" != "+plan.total);
 const actors=previous.turns.map(t=>t.actors[0]);
 assert.ok(actors.every(a=>a.spent<=a.availablePA+1e-6));
 return {total:damage,average:R(damage/turns),
  turns:actors.map((a,t)=>({tour:t+1,degats:a.damage,
   paDepenses:a.spent,paDisponibles:a.availablePA,
   hp:a.health?.hp??null,suffering:a.health?.suffering??null,
   sorts:a.actions.map(x=>x.name)}))};
}
function runSearch(mode,allowed,configs){
 let best=null,top=[];
 for(const conf of configs){
  let seeds=[{s:initialState(ctx.settings),rotations:[],perTurn:[]}];
  for(let t=1;t<=turns;t++{
   const generated=turnSearch(seeds,allowed,{width:conf.width,
    depth:conf.depth,keep:conf.keep,weight:conf.weight});
   const count=t===3?Math.min(10,conf.turnStates):conf.turnStates;
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
const configs=turns===3?[
 {weight:0,width:260,depth:9,keep:32,turnStates:32},
 {weight:.5,width:260,depth:9,keep:32,turnStates:32},
 {weight:1.5,width:260,depth:9,keep:32,turnStates:32},
 {weight:4,width:260,depth:9,keep:32,turnStates:32}
]:[
 {weight:0,width:170,depth:9,keep:19,turnStates:15},
 {weight:.5,width:170,depth:9,keep:19,turnStates:15},
 {weight:1.5,width:170,depth:9,keep:19,turnStates:15},
 {weight:4,width:170,depth:9,keep:19,turnStates:15}
];
const broad=runSearch("tous_sort",usable,configs);
const noBerserk=runSearch("sans_berserk",usable.filter(x=>x.name!=="Berserk"),configs.slice(0,2));
const noMutilation=runSearch("sans_mutilation",usable.filter(x=>x.name!=="Mutilation"),configs.slice(0,2));
const noPrep=runSearch("sans_berserk_ni_mutilation",usable.filter(x=>!["Berserk","Mutilation"].includes(x.name)),configs.slice(0,2));

let auto=null;
for(let i=0;i<turns;i++)auto=optimizeTeamTurn([ctx],target,()=>{},auto);
const autoRot=auto.turns.map(t=>t.actors[0].actions.map(a=>{
 const sp=ctx.spells.find(s=>s.name===a.name);
 assert.ok(sp,"Sort automatique absent : "+a.name);
 return String(sp.id);
}));
const baseline=evalPlan(autoRot);
assert.ok(Math.abs(baseline.total-auto.theoretical)<.2);
const seeds=[...broad.top,baseline,...noBerserk.top,...noMutilation.top,...noPrep.top].filter(Boolean);
const warm3=[
 ["Berserk","Furie","Furie","Assaut","Assaut"],
 ["Mutilation","Furie","Furie","Assaut","Assaut"],
 ["Furie","Furie","Assaut","Désolation"]
].map(turn=>turn.map(name=>{
 const sp=ctx.spells.find(s=>s.name===name);assert.ok(sp,name);return String(sp.id);
}));
const reference=evalPlan(turns===3?warm3:[...warm3,...autoRot.slice(3)]);
if(reference)seeds.push(reference);
const old=reference;
console.log("BASELINE "+JSON.stringify({automatic:baseline.total,old:old?.total,autoRot:baseline.rotations.map(N)}));

// Climb the exact three-round objective; try individual replacements,
// insertions, deletions and order swaps. Restart from multiple distinct
// preliminary search results to escape a single greedy search basin.
const allowedIds=usable.map(s=>String(s.id));
const tried=new Set();
let mutationCount=0,mutationLegal=0;
function mutate(base){
 const plans=new Map();
 for(let turn=0;turn<turns;turn++){
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
const selectedSeeds=[reference,...distinctSeeds.slice(0,turns===3?13:9)].filter(Boolean);
for(const s of selectedSeeds){
 const improved=localClimb(s,30);
 improvedSeeds.push(improved);
 globalBest=max(globalBest,improved);
 console.log("RESTART "+JSON.stringify({seed:s.total,best:improved.total,global:globalBest.total}));
}
// Multi-turn recombination: replace entire spans of the winning rotation with
// spans from other tested strategies. This can cross card/cooldown barriers
// that require two or more coordinated turns to change at once.
const donors=[...distinctSeeds.slice(0,34),...improvedSeeds,baseline,noPrep.best,noBerserk.best]
 .filter(Boolean);
let crossoverAttempts=0,crossoverLegal=0,crossoverImprovements=0;
for(let pass=0;pass<6;pass++){
 let top=null;
 for(const donor of donors)for(let start=0;start<10;start++){
  for(let len=1;len<=Math.min(6,turns-start);len++){
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
 const improved=localClimb(top,30);
 globalBest=max(globalBest,improved);
 donors.push(improved);
 crossoverImprovements++;
 console.log("CROSSOVER "+JSON.stringify({pass:pass+1,total:globalBest.total}));
}
const result={
 settings:{character:ctx.build.character,turns,pa:12,resistances:0,criticals:true,maxHp:ctx.settings.sacrierMaxHp,enemyAttacks:false},
 dpsMoyen:R(globalBest.total/turns),
 scenarios:{
  manualAll:verify(globalBest),
  searchBest:verify(broad.best),
  noPreparatoryBuffs:verify(noPrep.best),
  noBerserk:verify(noBerserk.best),
  noMutilation:verify(noMutilation.best),
  auto:verify(baseline)
 },
 counts:{...stats,mutationCount,mutationLegal,restarts:selectedSeeds.length,crossoverAttempts,crossoverLegal,crossoverImprovements},
 bestRotations:globalBest.rotations.map(N)
};
assert.ok(result.scenarios.manualAll.total>=result.scenarios.auto.total);
console.log("SACRIER_FINAL "+JSON.stringify(result));
