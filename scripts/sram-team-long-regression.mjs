/**
 * Matryoshka Sram Air full-team regression audit on current corrected engine.
 * Exact audited team plan 1-10, then actual automatic 100-round team policy.
 * Assert cast-by-cast, poison ticks, AP, HP and no harmful Manigance recast.
 */
import assert from "node:assert/strict";
import {mkdirSync,writeFileSync} from "node:fs";
import {INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {TEAM_TEN_ATTACK} from "../src/team-audited-ten-plan.js";
const n=Number(process.argv[2]||15);
assert.ok([15,100].includes(n));
const R=x=>Math.round(Number(x)*10)/10;
const target=cleanTeamTarget({turns:100,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const strategy={mode:"long",horizon:100,effort:"deep",minHpPercent:50};
const contexts=INITIAL_BUILDS.map(b=>{
 const x=normalizeBuild(b);
 if(["sacrieur","sram"].includes(x.classId))x.distance=1;
 return createTeamContext(x,target);
});
const map=new Map(contexts.map(x=>[x.settings.classId,x]));
const lookup=Object.fromEntries(["sacrieur","ecaflip","sram"].map(cls=>
 [cls,new Map(map.get(cls).spells.map(x=>[x.name,x]))]));
let previous=null,checks=0;
const rows=[],byTen=[],alertList=[];
for(let i=1;i<=n;i++){
 if(i<=10){
  const manualOverrides={};
  for(const cls of ["sacrieur","ecaflip","sram"]){
   const ctx=map.get(cls);
   manualOverrides[ctx.build.id]=TEAM_TEN_ATTACK[cls][i-1].map(name=>{
    const spell=lookup[cls].get(name);assert.ok(spell,name);return String(spell.id);
   });
  }
  previous=playSequentialTeam(contexts,target,()=>{},{previous,oneRound:true,manualOverrides});
 }else{
  previous=optimizeTeamTurn(contexts,target,()=>{},previous,strategy);
 }
 assert.equal(previous.turns.length,i);
 const turn=previous.turns.at(-1),actor=turn.actors.find(a=>a.character==="Matryoshka");
 const state=previous.session.actors.find(x=>x.id===actor.id).state;
 const casts=actor.log.casts;
 assert.equal(actor.actions.length,casts.length,"Sram log incomplete T"+i);
 assert.ok(actor.spent<=actor.availablePA&&actor.spent>=0,"Sram PA overdraw T"+i);
 assert.ok(casts.every(c=>c.remainingPA>=0),"Negative PA remaining T"+i);
 assert.ok(Math.abs(R(casts.reduce((a,c)=>a+c.damage,0))-actor.direct)<.15,
  "Sram direct mismatch T"+i);
 assert.ok(Math.abs(actor.log.end.delayed-actor.poison)<.15,
  "Sram poison accounting mismatch T"+i);
 assert.ok(Math.abs(R(actor.direct+actor.poison)-actor.damage)<.15,
  "Sram total mismatch T"+i);
 const all=turn.actors.reduce((total,a)=>total+a.damage,0);
 assert.ok(Math.abs(R(all)-turn.theoretical)<.15,"Team damage mismatch T"+i);
 const sacri=turn.actors.find(a=>a.character==="Mon Sacrieur");
 assert.ok(sacri.health.hp/sacri.health.maxHp>=.5,
  "Sacrier below 50% at T"+i);
 assert.ok(state.pa>=0&&state.turn===i+1);
 assert.ok(Object.values(state.dots||{}).every(d=>Number.isFinite(d.base)&&d.left>0));
 for(const cast of casts){
  if(cast.alerts.length)alertList.push({turn:i,spell:cast.name,alerts:cast.alerts});
  assert.ok(!cast.alerts.some(a=>a.includes("Manigance relancée")),
   "Wasteful Manigance recast at T"+i);
 }
 const row={turn:i,rotation:actor.actions.map(x=>x.name),
  pa:actor.spent,damage:actor.damage,direct:actor.direct,dots:actor.poison,
  cumulative:R(previous.members.find(x=>x.character==="Matryoshka").estimated),
  activeBuffs:state.buffs.filter(b=>b.until>=state.turn).map(b=>b.key),
  activeDots:Object.values(state.dots||{}).map(d=>({name:d.name,left:d.left})),
  notes:casts.flatMap(c=>c.notes).filter(x=>/Poison|Buff|relance/.test(x)).slice(0,7)
 };
 rows.push(row);checks++;
 if(i%10===0){byTen.push({through:i,sram:row.cumulative,team:R(previous.theoretical)});
  console.log("SRAM_LONG_CHECKPOINT "+JSON.stringify(byTen.at(-1)));}
}
assert.equal(rows.length,n);
assert.equal(R(previous.turns.slice(0,10).reduce((s,t)=>s+t.actors.find(a=>a.character==="Matryoshka").damage,0)),34267.5);
if(n>=15){
 assert.ok(Math.abs(R(previous.turns.slice(0,15).reduce((s,t)=>s+t.theoretical,0))-163658.7)<.3);
 assert.deepEqual(rows[10].rotation,["Injection Toxique","Arsenic","Épidémie"]);
 assert.equal(rows[14].cumulative,51578.1);
}
if(n===100){
 const renewals=rows.filter(row=>row.turn>10&&row.rotation.includes("Injection Toxique"));
 assert.ok(renewals.length>=17,"Sram stopped renewing poisons in long combat");
 assert.ok(renewals.every((row,index)=>index===0||row.turn-renewals[index-1].turn>=5),
  "Injection Toxique cooldown was not respected");
}
const result={
 settings:{rounds:n,criticals:true,horizon:100,minimumSacrierHP:50,
 builds:"GitHub normalized builds, Sram/Sacri melee"},
 teamTotal:R(previous.theoretical),
 sramTotal:R(previous.members.find(x=>x.character==="Matryoshka").estimated),
 teamAt15:n>=15?R(previous.turns.slice(0,15).reduce((s,t)=>s+t.theoretical,0)):null,
 sramAt15:n>=15?R(previous.turns.slice(0,15).reduce((s,t)=>
  s+t.actors.find(a=>a.character==="Matryoshka").damage,0)):null,
 sramSharePercent:R(previous.members.find(x=>x.character==="Matryoshka").estimated/previous.theoretical*100),
 alerts:alertList,checks,checkpoints:byTen,
 firstFifteen:rows.slice(0,15),lastTen:rows.slice(-10),
 maniganceCasts:rows.filter(x=>x.rotation.includes("Manigance")).length,
 poisonCasts:rows.filter(x=>x.rotation.includes("Épidémie")||
   x.rotation.includes("Injection Toxique")||x.rotation.includes("Arsenic")).length
};
mkdirSync("results",{recursive:true});
writeFileSync("results/sram-team-long-"+n+".json",JSON.stringify(result,null,2));
console.log("SRAM_LONG_FINAL "+JSON.stringify(result));
