import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {initialState,eligible,castSpell,endTurn} from "../src/engine.js";
import {playSequentialTeam} from "../src/team-sequential.js";

const target=cleanTeamTarget({turns:3,hp:1_000_000_000_000,criticals:true,
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
 const turns=Math.max(0,4-s.turn);
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
  for(let t=0;t<3;t++){
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
 for(let t=0;t<3;t++){
  previous=playSequentialTeam([ctx],target,()=>{},{previous,oneRound:true,
   manualOverrides:{[ctx.build.id]:plan.rotations[t]}});
 }
 assert.equal(previous.turns.length,3);
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
  for(let t=1;t<=3;t++){
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
const configs=[
 {weight:0,width:550,depth:10,keep:45,turnStates:60},
 {weight:.25,width:550,depth:10,keep:45,turnStates:60},
 {weight:.75,width:550,depth:10,keep:45,turnStates:60},
 {weight:1.5,width:550,depth:10,keep:45,turnStates:60},
 {weight:3,width:550,depth:10,keep:45,turnStates:60},
 {weight:6,width:550,depth:10,keep:45,turnStates:60}
];
const broad=runSearch("tous_sort",usable,configs);
const noPrepSpells=usable.filter(s=>!(
 (s.status?.buff&&s.nonDirect)||s.name==="Château de Cartes"||s.name==="Tout ou Rien"));
const noPrep=runSearch("sans_preparation",noPrepSpells,configs.slice(0,2));
const withoutRekop=runSearch("sans_rekop",usable.filter(s=>s.name!=="Rekop"&&s.name!=="Tout ou Rien"),configs.slice(0,2));

let auto=null;
for(let i=0;i<3;i++)auto=optimizeTeamTurn([ctx],target,()=>{},auto);
const autoRot=auto.turns.map(t=>t.actors[0].actions.map(a=>{
 const sp=ctx.spells.find(s=>s.name===a.name);
 assert.ok(sp,"Sort automatique absent : "+a.name);
 return String(sp.id);
}));
const baseline=evalPlan(autoRot);
assert.ok(Math.abs(baseline.total-auto.theoretical)<.2);
const seeds=[...broad.top,baseline,...noPrep.top,...withoutRekop.top].filter(Boolean);
const old=evalPlan([
 ["Yams","Kraps","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
 ["Kraps","Pile ou Face","Sceptre du Roi Joueur","Infortune"],
 ["Baraka","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur","Yams"]
].map(turn=>turn.map(name=>{
 const sp=ctx.spells.find(s=>s.name===name);assert.ok(sp);return String(sp.id);
})));
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
 for(let turn=0;turn<3;turn++){
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
for(const s of distinctSeeds.slice(0,20)){
 const improved=localClimb(s,22);
 globalBest=max(globalBest,improved);
 console.log("RESTART "+JSON.stringify({seed:s.total,best:improved.total,global:globalBest.total}));
}
const result={
 settings:{character:ctx.build.character,turns:3,pa:12,resistances:0,criticals:true},
 scenarios:{
  manualAll:verify(globalBest),
  searchBest:verify(broad.best),
  noPreparatoryBuffs:verify(noPrep.best),
  noRekop:verify(withoutRekop.best),
  auto:verify(baseline)
 },
 counts:{...stats,mutationCount,mutationLegal,restarts:Math.min(20,distinctSeeds.length)},
 bestRotations:globalBest.rotations.map(N)
};
assert.ok(result.scenarios.manualAll.total>=result.scenarios.auto.total);
console.log("KARUTA_RESULT "+JSON.stringify(result));
