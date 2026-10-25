/**
 * OMBRE — Matryoshka Sram Air manual-only damage audits (3 or 10 rounds).
 * All candidates cast by actual engine; top rotations replay through
 * playSequentialTeam(manualOverrides) to validate PA/cooldown/DoT effects.
 */
import assert from "node:assert/strict";
import {writeFileSync,mkdirSync} from "node:fs";
import {INITIAL_BUILDS} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {initialState,eligible,castSpell,endTurn} from "../src/engine.js";
import {playSequentialTeam} from "../src/team-sequential.js";

const T=Number(process.argv[2]||3);
if(![3,10].includes(T))throw Error("Use 3 or 10 turns");
const target=cleanTeamTarget({turns:T,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const build=INITIAL_BUILDS.find(b=>b.classId==="sram");
assert.ok(build,"Matryoshka reference missing");
const ctx=createTeamContext(build,target);
const all=ctx.spells.filter(s=>(s.isWeapon||ctx.settings.variants?.[s.variantGroup]===s.name)&&
 !s.status?.unsupported);
const picked=all.filter(s=>s.isWeapon||s.min>0||s.max>0||
  s.status?.buff||s.status?.vulnerability||s.status?.poison||
  s.status?.spendTrapCharges||s.status?.poisonOnTrap);
const byId=new Map(ctx.spells.map(s=>[String(s.id),s]));
const label=rot=>rot.map(id=>byId.get(String(id))?.name||String(id));
const R=n=>Math.round((Number(n)||0)*10)/10;
const counts={transitions:0,turnSearches:0,evaluated:0,valid:0,mutations:0,legalMutations:0,
 crossovers:0,legalCrossovers:0,improvements:0};
const signature=s=>{
 const buffs=(s.buffs||[]).map(b=>[b.key,b.stat,b.amount,b.until].join(":")).sort().join(",");
 const dots=Object.entries(s.dots||{}).map(([k,v])=>[k,v.left,R(v.base),v.phase].join(":")).sort().join(",");
 const traps=(s.traps||[]).map(v=>[v.spell.id,v.base].join(":")).sort().join(",");
 return [s.turn,s.pa,JSON.stringify(s.used),JSON.stringify(s.ready),buffs,dots,traps,
 s.charges,s.visible,s.position,s.concentrationExpires,
 s.enemyDebuff?.expires,s.enemyDebuff?.multiplier].join("|");
};
function future(s,weight){
 let score=0;
 const remain=Math.max(0,T-s.turn+1);
 for(const b of s.buffs||[]){
  const life=Math.min(remain,b.until-s.turn+1);
  if(life<=0)continue;
  if(["Air","Puissance"].includes(b.stat))score+=Math.max(0,b.amount)*life*.85;
  if(b.stat==="Dommages")score+=Math.max(0,b.amount)*life*13;
  if(b.stat==="Dommages finaux")score+=Math.max(0,b.amount)*life*40;
 }
 for(const p of Object.values(s.dots||{}))score+=Math.max(0,p.base||0)*Math.min(remain,p.left||0);
 if(s.charges>0)score+=s.charges*30;
 return weight*score;
}
function prune(items,width,weight){
 const unique=new Map();
 for(const candidate of items){
  const key=signature(candidate.state);
  const old=unique.get(key);
  if(!old||candidate.state.total>old.state.total)unique.set(key,candidate);
 }
 return [...unique.values()].sort((a,b)=>b.state.total+future(b.state,weight)-
    a.state.total-future(a.state,weight)).slice(0,width);
}
function evaluate(rotations){
 counts.evaluated++;
 let state=initialState(ctx.settings);
 const byTurn=[];
 try{
  for(let t=0;t<T;t++){
   const start=state.total;
   for(const id of rotations[t]||[]){
    const spell=byId.get(String(id));
    if(!spell||!eligible(spell,state,ctx.settings))return null;
    state=castSpell(state,spell,ctx.settings);
    counts.transitions++;
   }
   state=endTurn(state,ctx.settings);
   byTurn.push(R(state.total-start));
  }
 }catch{return null}
 counts.valid++;
 return {total:R(state.total),rotations:rotations.map(x=>x.slice()),byTurn};
}
const max=(a,b)=>!a||b&&b.total>a.total?b:a;
function search(label,spells,configs){
 let leaders=[];
 for(const config of configs){
  let seeds=[{state:initialState(ctx.settings),rotations:[]}];
  for(let turn=1;turn<=T;turn++){
   let gathered=[];
   for(const seed of seeds){
    counts.turnSearches++;
    let frontier=[{state:seed.state,seq:[]}],finished=[];
    for(let d=0;d<=config.depth;d++){
     finished.push(...frontier);
     if(d===config.depth)break;
     const next=[];
     for(const item of frontier)for(const spell of spells){
      if(!eligible(spell,item.state,ctx.settings))continue;
      try{
       const state=castSpell(item.state,spell,ctx.settings);
       counts.transitions++;
       next.push({state,seq:[...item.seq,String(spell.id)]});
      }catch{}
     }
     if(!next.length)break;
     frontier=prune(next,config.width,config.weight);
    }
    for(const finalist of prune(finished,config.keep,config.weight))
     gathered.push({state:endTurn(finalist.state,ctx.settings),
      rotations:[...seed.rotations,finalist.seq]});
   }
   seeds=prune(gathered,turn===T?12:config.seeds,config.weight);
   if(!seeds.length)throw Error("No Sram seeds round "+turn);
  }
  const plans=seeds.map(s=>evaluate(s.rotations)).filter(Boolean);
  leaders.push(...plans);
  console.log("SRAM_BEAM "+JSON.stringify({horizon:T,label,weight:config.weight,
   width:config.width,peak:plans[0]?.total,
   best:Math.max(...plans.map(s=>s.total))}));
 }
 return leaders;
}
const conf=T===3?[
 {weight:0,width:235,depth:9,keep:25,seeds:27},
 {weight:.7,width:235,depth:9,keep:25,seeds:27},
 {weight:2.5,width:235,depth:9,keep:25,seeds:27}
]:[
 {weight:0,width:145,depth:9,keep:17,seeds:15},
 {weight:.7,width:145,depth:9,keep:17,seeds:15},
 {weight:2.5,width:145,depth:9,keep:17,seeds:15}
];
console.log("SRAM_SETTINGS "+JSON.stringify({turns:T,character:ctx.build.character,
 pa:ctx.settings.ap,criticals:true,resistances:target.resistances,
 buffs:all.filter(s=>s.status?.buff).map(s=>({name:s.name,buff:s.status.buff})),
 usable:picked.map(s=>({name:s.name,pa:s.pa,min:s.min,max:s.max,cooldown:s.cooldown}))}));
const full=search("all_spells",picked,conf);
const withoutBuff=search("without_setup",picked.filter(s=>!
  (s.nonDirect&&s.status?.buff)),conf.slice(0,2));
const withoutManigance=search("without_manigance",picked.filter(s=>s.name!=="Manigance"),conf.slice(0,1));
const withoutArnaque=search("without_arnaque",picked.filter(s=>s.name!=="Arnaque"),conf.slice(0,1));
// Auto is a reference only. The final choice comes from manual state replays.
let auto=null;
for(let turn=0;turn<T;turn++)
 auto=optimizeTeamTurn([ctx],target,()=>{},auto,{mode:"fast",horizon:10,effort:"deep",minHpPercent:0});
const autoRot=auto.turns.map(turn=>turn.actors[0].actions.map(action=>{
 const spell=ctx.spells.find(s=>s.name===action.name);
 assert.ok(spell,action.name);return String(spell.id);
}));
const baseline=evaluate(autoRot);
assert.ok(baseline&&Math.abs(baseline.total-auto.theoretical)<.2);
let pool=[...full,...withoutBuff,...withoutManigance,...withoutArnaque,baseline];
const refs=new Map(pool.map(x=>[JSON.stringify(x.rotations),x]));
pool=[...refs.values()].sort((a,b)=>b.total-a.total);
let best=pool[0];
const chosenIds=picked.map(s=>String(s.id));
const checked=new Set();
function mutation(base){
 const unique=new Map();
 for(let turn=0;turn<T;turn++){
  const seq=base.rotations[turn];
  const put=newSeq=>{
   const next=base.rotations.map((x,t)=>t===turn?newSeq:x);
   const key=JSON.stringify(next);
   if(!checked.has(key))unique.set(key,next);
  };
  for(let i=0;i<seq.length;i++){
   put(seq.filter((_,j)=>j!==i));
   for(let j=i+1;j<seq.length;j++){
    const next=seq.slice();[next[i],next[j]]=[next[j],next[i]];put(next);
   }
   for(const id of chosenIds)if(seq[i]!==id){
    const next=seq.slice();next[i]=id;put(next);
   }
  }
  for(let i=0;i<=seq.length;i++)for(const id of chosenIds){
   const next=seq.slice();next.splice(i,0,id);put(next);
  }
 }
 return unique;
}
function climb(seed,passes){
 let current=seed;
 for(let pass=0;pass<passes;pass++){
  let winner=null;
  for(const [key,rotations] of mutation(current)){
   checked.add(key);counts.mutations++;
   const candidate=evaluate(rotations);
   if(!candidate)continue;
   counts.legalMutations++;
   if(candidate.total>current.total+.01)winner=max(winner,candidate);
  }
  if(!winner)break;
  current=winner;counts.improvements++;
  console.log("SRAM_IMPROVEMENT "+JSON.stringify({horizon:T,pass:pass+1,total:current.total,
   rotations:current.rotations.map(label)}));
 }
 return current;
}
const refined=[];
for(const seed of pool.slice(0,T===3?10:8)){
 const improved=climb(seed,T===3?24:13);
 refined.push(improved);best=max(best,improved);
 console.log("SRAM_RESTART "+JSON.stringify({turns:T,start:seed.total,finish:improved.total,best:best.total}));
}
const donors=[...pool.slice(0,20),...refined].filter(Boolean);
for(let pass=0;pass<(T===3?5:7);pass++){
 let winner=null;
 for(const donor of donors)for(let start=0;start<T;start++)
  for(let length=1;length<=Math.min(T-start,T===3?3:5);length++){
   counts.crossovers++;
   const rotations=best.rotations.map((x,t)=>t>=start&&t<start+length?donor.rotations[t]:x);
   const proposal=evaluate(rotations);
   if(!proposal)continue;
   counts.legalCrossovers++;
   if(proposal.total>best.total+.01)winner=max(winner,proposal);
  }
 if(!winner)break;
 best=max(best,climb(winner,T===3?16:10));
 donors.push(best);
}
function manualVerification(plan){
 assert.ok(plan);
 let previous=null;
 for(let t=0;t<T;t++){
  previous=playSequentialTeam([ctx],target,()=>{},{previous,oneRound:true,
   manualOverrides:{[ctx.build.id]:plan.rotations[t]}});
 }
 assert.equal(previous.turns.length,T);
 assert.ok(Math.abs(previous.theoretical-plan.total)<.15,
  "Mismatch "+previous.theoretical+" vs "+plan.total);
 const turns=previous.turns.map((t,index)=>{
  const a=t.actors[0];
  assert.ok(a.spent<=a.availablePA);
  return {tour:index+1,sorts:a.actions.map(sp=>sp.name),
   degats:a.damage,pa:a.spent,paMax:a.availablePA};
 });
 return {total:R(previous.theoretical),perTurn:R(previous.theoretical/T),turns};
}
const report={
 settings:{character:ctx.build.character,turns:T,pa:12,criticals:true,
  enemyResistances:0,solo:true},
 bestManual:manualVerification(best),
 automatic:manualVerification(baseline),
 withoutBuff:manualVerification(withoutBuff.reduce(max,null)),
 withoutManigance:manualVerification(withoutManigance.reduce(max,null)),
 withoutArnaque:manualVerification(withoutArnaque.reduce(max,null)),
 counts
};
assert.ok(report.bestManual.total>=report.automatic.total);
mkdirSync("results",{recursive:true});
writeFileSync("results/sram-"+T+"-best.json",JSON.stringify(report,null,2));
console.log("SRAM_"+T+"_FINAL "+JSON.stringify(report));
