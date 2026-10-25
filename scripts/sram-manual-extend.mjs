/**
 * Starting with the actually discovered 10-round manual Sram winner, validate
 * a 15-round extension and 100-round sustained DPS. The long tail is a
 * bounded simulated policy, NOT a proof of global optimality over 100 rounds.
 */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {INITIAL_BUILDS} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget} from "../src/team-core.js";
import {eligible,initialState,castSpell,endTurn} from "../src/engine.js";
import {playSequentialTeam} from "../src/team-sequential.js";

const R=x=>Math.round((Number(x)||0)*10)/10;
// Allow the long validation to be rerun independently of the expensive
// 10-round search. This incumbent was fully manually verified on GitHub.
const verifiedTen=[
 ["Arnaque","Injection Toxique","Arsenic"],
 ["Fourvoiement","Fourvoiement","Épidémie"],
 ["Truanderie","Arnaque","Arnaque","Arsenic"],
 ["Fourvoiement","Fourvoiement","Épidémie"],
 ["Truanderie","Arnaque","Arnaque","Arsenic"],
 ["Injection Toxique","Arnaque","Épidémie"],
 ["Manigance","Arnaque","Arsenic","Épidémie"],
 ["Fourvoiement","Fourvoiement","Épidémie"],
 ["Truanderie","Arnaque","Arnaque","Arsenic"],
 ["Fourvoiement","Fourvoiement","Épidémie"]
];
const incumbent={bestManual:{total:31646.7,turns:verifiedTen.map(sorts=>({sorts}))}};
let audit=incumbent;
try{audit=JSON.parse(readFileSync("results/sram-10-best.json","utf8"));}catch{}
const avoidRedundant=process.env.SRAM_AVOID_REDUNDANT==="1";
const build=INITIAL_BUILDS.find(b=>b.classId==="sram");
const target=cleanTeamTarget({turns:100,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const ctx=createTeamContext(build,target);
const spells=ctx.spells.filter(s=>(s.isWeapon||ctx.settings.variants?.[s.variantGroup]===s.name)&&
 !s.status?.unsupported&&(s.isWeapon||s.min>0||s.max>0||s.status?.buff||
 s.status?.vulnerability||s.status?.poison||s.status?.spendTrapCharges||s.status?.poisonOnTrap));
const spellMap=new Map(ctx.spells.map(s=>[s.name,s]));
const ids=new Map(ctx.spells.map(s=>[String(s.id),s]));
const names=idsArr=>idsArr.map(id=>ids.get(String(id))?.name||String(id));
const firstTen=audit.bestManual.turns.map(t=>t.sorts.map(name=>{
 const s=spellMap.get(name);assert.ok(s,name);return String(s.id);
}));
let seed=initialState(ctx.settings);
for(const seq of firstTen){
 for(const id of seq){
  const sp=ids.get(id);assert.ok(eligible(sp,seed,ctx.settings),"Illegal existing 10 champion "+sp.name);
  seed=castSpell(seed,sp,ctx.settings);
 }
 seed=endTurn(seed,ctx.settings);
}
assert.equal(seed.turn,11);
assert.ok(Math.abs(seed.total-audit.bestManual.total)<.15);

let transitions=0,opens=0;
function metric(state,forward=5){
 let bonus=0;
 for(const b of state.buffs||[]){
  const life=Math.min(forward,Math.max(0,b.until-state.turn+1));
  if(["Air","Puissance"].includes(b.stat))bonus+=Math.max(0,b.amount)*life*.85;
  if(b.stat==="Dommages")bonus+=Math.max(0,b.amount)*life*14;
  if(b.stat==="Dommages finaux")bonus+=Math.max(0,b.amount)*life*35;
 }
 for(const dot of Object.values(state.dots||{}))bonus+=Math.max(0,dot.base||0)*Math.min(forward,dot.left||0);
 return state.total+bonus;
}
function fingerprint(state){
 return JSON.stringify([
  state.turn,state.pa,state.used,state.ready,
  (state.buffs||[]).map(b=>[b.key,b.amount,b.until]),
  state.dots,state.charges,state.position,state.enemyDebuff?.multiplier,state.enemyDebuff?.expires
 ]);
}
function keep(states,limit,forward=5){
 const map=new Map();
 for(const entry of states){
  const k=fingerprint(entry.state),prior=map.get(k);
  if(!prior||entry.state.total>prior.state.total)map.set(k,entry);
 }
 return [...map.values()].sort((a,b)=>metric(b.state,forward)-metric(a.state,forward)).slice(0,limit);
}
function choices(startState,{width=55,depth=8,keepCount=7,forward=5}={}){
 opens++;
 let frontier=[{state:startState,seq:[]}],done=[];
 for(let d=0;d<=depth;d++){
  done.push(...frontier);
  if(d===depth)break;
  const next=[];
  for(const item of frontier)for(const spell of spells){
   if(!eligible(spell,item.state,ctx.settings))continue;
   if(avoidRedundant&&spell.name==="Manigance"&&
     item.state.buffs.some(b=>b.key==="Manigance"&&b.until>=item.state.turn))
    continue;
   const after=castSpell(item.state,spell,ctx.settings);transitions++;
   next.push({state:after,seq:[...item.seq,String(spell.id)]});
  }
  if(!next.length)break;
  frontier=keep(next,width,forward);
 }
 return keep(done,keepCount,forward).map(item=>({
  state:endTurn(item.state,ctx.settings),seq:item.seq
 }));
}
// Find the best five-round continuation, rather than repeating a known
// 10-round sequence which might violate cooldowns or delayed poison effects.
let candidates=[{state:seed,rotations:firstTen}];
for(let turn=11;turn<=15;turn++){
 const next=[];
 for(const plan of candidates){
  for(const proposal of choices(plan.state,{width:105,depth:9,keepCount:12,forward:16-turn})){
   next.push({state:proposal.state,
    rotations:[...plan.rotations,proposal.seq]});
  }
 }
 candidates=keep(next,turn===15?16:12,16-turn);
 assert.ok(candidates.length,"No valid manual 15-round continuation at "+turn);
 console.log("SRAM_CONTINUE_15 "+JSON.stringify({turn,leading:R(candidates[0].state.total)}));
}
let best=candidates.reduce((a,b)=>a.state.total>=b.state.total?a:b);
const fifteen=best.rotations.map(seq=>seq.slice());
const fifteenTotal=R(best.state.total);
console.log("SRAM_15_SEARCH "+JSON.stringify({total:fifteenTotal,
 lastFive:fifteen.slice(10).map(names)}));

// Choose one validated, damage-aware turn at a time until T100. The engine's
// actual buff expiration and poison ticks are carried forward; do not repeat
// an unsafe or unavailable spell sequence.
let tailState=best.state;
const allRotations=fifteen.map(r=>r.slice());
for(let turn=16;turn<=100;turn++){
 const options=choices(tailState,{width:turn<=30?70:40,depth:8,
  keepCount:10,forward:Math.min(4,100-turn)});
 assert.ok(options.length,"No candidate at turn "+turn);
 const bestOption=options.sort((a,b)=>metric(b.state,Math.min(4,100-turn))-
  metric(a.state,Math.min(4,100-turn)))[0];
 tailState=bestOption.state;
 allRotations.push(bestOption.seq);
 if(turn%10===0||turn===16)
  console.log("SRAM_CONTINUE_100 "+JSON.stringify({turn,total:R(tailState.total),
   nextActions:names(bestOption.seq)}));
}
// Replay all 100 rounds in the *actual manual team UI engine*.
let previous=null;
for(let turn=0;turn<100;turn++){
 previous=playSequentialTeam([ctx],target,()=>{},{previous,oneRound:true,
  manualOverrides:{[ctx.build.id]:allRotations[turn]}});
}
assert.equal(previous.turns.length,100);
assert.ok(Math.abs(previous.theoretical-tailState.total)<.2,
 "Manual replay differs from direct engine "+previous.theoretical+" vs "+tailState.total);
assert.ok(Math.abs(previous.turns.slice(0,10).reduce((s,t)=>s+t.theoretical,0)-
  audit.bestManual.total)<.25);
assert.ok(Math.abs(previous.turns.slice(0,15).reduce((s,t)=>s+t.theoretical,0)-fifteenTotal)<.3);
assert.ok(previous.turns.every(t=>t.actors[0].spent<=12));
const parsed=previous.turns.map((turn,index)=>{
 const actor=turn.actors[0];
 return {tour:index+1,degats:actor.damage,pa:actor.spent,
  sorts:actor.actions.map(a=>a.name)};
});
const report={
 settings:{character:build.character,pa:12,criticals:true,enemyResistances:0,solo:true,
  firstTenSource:"deep manual search",avoidRedundantManigance:avoidRedundant,beyondTen:"state-aware search and replay; heuristic, not exhaustive"},
 checks:{
  ten:{total:audit.bestManual.total,turns:parsed.slice(0,10)},
  fifteen:{total:fifteenTotal,average:R(fifteenTotal/15),turns:parsed.slice(0,15)},
  hundred:{total:R(previous.theoretical),average:R(previous.theoretical/100),
   maniganceCasts:parsed.filter(t=>t.sorts.includes("Manigance")).length,
   arnaqueCasts:parsed.filter(t=>t.sorts.includes("Arnaque")).length,
   poisonCasts:parsed.filter(t=>t.sorts.some(s=>s==="Épidémie"||s==="Injection Toxique")).length,
   noActionRounds:parsed.filter(t=>t.sorts.length===0).length,
   everyTen:Array.from({length:10},(_,i)=>({
    from:i*10+1,to:(i+1)*10,
    damage:R(parsed.slice(i*10,(i+1)*10).reduce((s,t)=>s+t.degats,0))
   })),firstTwenty:parsed.slice(0,20),lastTen:parsed.slice(-10)}
 },
 counts:{transitions,opens}
};
mkdirSync("results",{recursive:true});
writeFileSync("results/sram-100-verified"+(avoidRedundant?"-no-redundant":"")+".json",JSON.stringify(report,null,2));
console.log("SRAM_15_AND_100_FINAL "+JSON.stringify(report));
