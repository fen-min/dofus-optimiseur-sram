/**
 * Full duration comparison of incumbent team DPS policy and newly discovered
 * 10-round manual team policy. Replays the exact first 10 rounds in the
 * chronological manual engine, then resumes the existing AUTO long horizon
 * to T100 using persisted real states (buffs, poisons, cards, HP).
 *
 * This audit does not claim a 100-round global optimum.
 */
import assert from "node:assert/strict";
import {writeFileSync,mkdirSync} from "node:fs";
import {INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {sacrierHealthAboveFloor} from "../src/sacrier-safety.js";
import {TEAM_TEN_AUDITED} from "../src/team-audited-ten-plan.js";

const best=Object.freeze({
 sacrieur:[
  ["Furie","Furie","Carnage","Assaut"],
  ["Pacte de Sang","Carnage","Furie","Furie"],
  ["Carnage","Furie","Furie","Assaut"],
  ["Carnage","Furie","Furie","Assaut"],
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Carnage","Manthache","Furie"],
  ["Carnage","Furie","Manthache"],
  ["Pacte de Sang","Carnage","Furie","Furie"],
  ["Carnage","Manthache","Furie"],
  ["Furie","Furie","Assaut","Désolation"]
 ],
 ecaflip:[
  ["Yams","Griffe Joueuse","Kraps","Sceptre du Roi Joueur"],
  ["Griffe Joueuse","Sceptre du Roi Joueur","Infortune"],
  ["Pile ou Face","Kraps","Sceptre du Roi Joueur","Infortune"],
  ["Griffe Joueuse","Kraps","Infortune"],
  ["Griffe Joueuse","Yams","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
  ["Pile ou Face","Kraps","Sceptre du Roi Joueur","Infortune"],
  ["Griffe Joueuse","Pile ou Face","Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur"],
  ["Griffe Joueuse","Sceptre du Roi Joueur","Infortune"],
  ["Kraps","Pile ou Face","Sceptre du Roi Joueur","Infortune"],
  ["Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur","Infortune"]
 ],
 sram:TEAM_TEN_AUDITED.sram
});
const R=n=>Math.round(Number(n)*10)/10;
const target=cleanTeamTarget({turns:100,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const strategy={mode:"long",horizon:100,effort:"deep",minHpPercent:50};
const builds=INITIAL_BUILDS.map(b=>{
 const copy=normalizeBuild(b);
 if(["sacrieur","sram"].includes(copy.classId))copy.distance=1;
 return copy;
});
const contexts=builds.map(b=>createTeamContext(b,target));
const clsMap=Object.fromEntries(contexts.map(c=>[c.settings.classId,c]));
const group=["sacrieur","ecaflip","sram"];
const spellByName=Object.fromEntries(group.map(cls=>
 [cls,new Map(clsMap[cls].spells.map(s=>[s.name,s]))]));
function verify(result,round){
 const t=result.turns[round-1];
 assert.equal(t.actors.length,3);
 let total=0;
 for(const a of t.actors){
  assert.ok(a.spent<=a.availablePA+.0001, "PA overrun T"+round+" "+a.character);
  assert.ok(a.damage>=0&&Number.isFinite(a.damage));
  assert.equal(a.log?.casts?.length,a.actions.length,"Missing action log T"+round);
  assert.ok(Math.abs(R(a.log.casts.reduce((s,c)=>s+c.damage,0))-a.direct)<.15);
  assert.ok(Math.abs(R(a.log.end.delayed)-a.poison)<.15);
  const cls=contexts.find(c=>c.build.id===a.id).settings.classId;
  const state=result.session.actors.find(x=>x.id===a.id).state;
  if(cls==="ecaflip"){
   assert.ok(state.ecaHand.length<=4,"Eca fifth card T"+round);
   assert.ok(state.ecaTable.length<=12,"Eca table overflow T"+round);
  }
  if(cls==="sacrieur"){
   assert.deepEqual(a.health,state.sacrierHealth);
   assert.ok(sacrierHealthAboveFloor(state,50),"Sacri HP <50% T"+round);
  }
  total+=a.damage;
 }
 assert.ok(Math.abs(R(total)-t.theoretical)<.2,"team total mismatch T"+round);
}
async function testProfile(label,rot){
 let previous=null;
 const sample=[];
 let noActions=0,issues=[];
 for(let turn=1;turn<=100;turn++){
  if(turn<=10){
   const overrides={};
   for(const cls of group){
    const ctx=clsMap[cls];
    overrides[ctx.build.id]=rot[cls][turn-1].map(n=>{
     const s=spellByName[cls].get(n);assert.ok(s,"missing "+n);return String(s.id);
    });
   }
   previous=playSequentialTeam(contexts,target,()=>{},{previous,oneRound:true,manualOverrides:overrides});
  }else{
   previous=optimizeTeamTurn(contexts,target,()=>{},previous,strategy);
  }
  verify(previous,turn);
  const current=previous.turns.at(-1);
  for(const actor of current.actors){
   if(!actor.actions.length)noActions++;
   const alert=actor.log.casts.flatMap(a=>a.alerts||[]);
   if(alert.length)issues.push({turn,character:actor.character,alert});
  }
  if([1,3,5,8,10,11,12,13,14,15,20,30,50,75,100].includes(turn)){
   const actor=current.actors.find(a=>a.character==="Mon Sacrieur");
   sample.push({turn,damage:current.theoretical,total:previous.theoretical,
    sacriHp:actor.health.hp,sacriMaxHp:actor.health.maxHp,
    actions:current.actors.map(a=>({character:a.character,
     spells:a.actions.map(s=>s.name),damage:a.damage,pa:a.spent}))});
  }
  if(turn%10===0)console.log("TEAM_DEEP_CONTINUE "+JSON.stringify({
   label,turn,total:previous.theoretical,issues:issues.length}));
 }
 const milestones=Object.fromEntries([10,15,30,50,100].map(n=>[
  n,R(previous.turns.slice(0,n).reduce((s,t)=>s+t.theoretical,0))
 ]));
 const pct=Math.min(...previous.turns.map(t=>{
  const actor=t.actors.find(a=>a.character==="Mon Sacrieur");
  return actor.health.hp/actor.health.maxHp*100;
 }));
 return {label,milestones,minSacriHpPercent:R(pct),noActions,issues,
  sample, byCharacter:Object.fromEntries(previous.members.map(m=>
   [m.character,R(m.estimated)])),completed:previous.finished};
}
const incumbent=await testProfile("incumbent",TEAM_TEN_AUDITED);
const discovered=await testProfile("candidate110046",best);
assert.equal(discovered.milestones[10],110046.6);
assert.equal(incumbent.milestones[10],106566.5);
const delta=Object.fromEntries([10,15,30,50,100].map(n=>[
 n,R(discovered.milestones[n]-incumbent.milestones[n])
]));
const report={incumbent,discovered,delta,
 note:"Exact manual replay T1–10, dynamic long optimizer T11–100; no enemy attacks, placement, personal Sram/Eca HP."};
mkdirSync("results",{recursive:true});
writeFileSync("results/team-deep-long-2026.json",JSON.stringify(report,null,2));
console.log("TEAM_DEEP_LONG_FINAL "+JSON.stringify({
 incumbent:incumbent.milestones,
 discovered:discovered.milestones,delta,
 minSacriHp:{incumbent:incumbent.minSacriHpPercent,candidate:discovered.minSacriHpPercent},
 issues:{incumbent:incumbent.issues,discovered:discovered.issues},
 noActions:{incumbent:incumbent.noActions,discovered:discovered.noActions},
 candidates:discovered.sample.slice(0,10)
}));
