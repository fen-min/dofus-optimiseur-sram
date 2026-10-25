import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {createTeamContext,optimizeTeamTurn,cleanTeamTarget} from "../src/team-core.js";
import {cleanTeamStrategy} from "../src/team-long-plan.js";
import {newManualDraft,previewManualDraft,chooseManualSpell} from "../src/team-manual.js";

const target=cleanTeamTarget({turns:10,hp:1_000_000_000_000,criticals:true});
const sac=INITIAL_BUILDS.find(b=>b.classId==="sacrieur");
const eca=INITIAL_BUILDS.find(b=>b.classId==="ecaflip");

test("DPS équipe longue durée est le mode par défaut et borne les paramètres",()=>{
 assert.deepEqual(cleanTeamStrategy(),{mode:"long",horizon:10,effort:"balanced"});
 assert.deepEqual(cleanTeamStrategy({mode:"fast",horizon:30,effort:"deep"}),
  {mode:"fast",horizon:10,effort:"deep"});
 assert.equal(cleanTeamStrategy({horizon:-1}).horizon,3);
 assert.equal(cleanTeamStrategy({horizon:"abc"}).horizon,10);
 assert.equal(cleanTeamStrategy({mode:"unrecognized"}).mode,"long");
});

test("DPS équipe : un seul tour engagé malgré 10 tours anticipés",()=>{
 const ctx=createTeamContext(sac,target);
 const strategy={mode:"long",horizon:10,effort:"quick"};
 const result=optimizeTeamTurn([ctx],target,()=>{},null,strategy);
 assert.equal(result.turns.length,1);
 assert.equal(result.session.actors[0].state.turn,2);
 assert.equal(result.session.teamStrategy.mode,"long");
 assert.equal(result.session.teamStrategy.horizon,10);
 assert.ok(result.turns[0].actors[0].spent<=12);
 const next=optimizeTeamTurn([ctx],target,()=>{},result,strategy);
 assert.equal(next.turns.length,2);
 assert.equal(next.session.actors[0].state.turn,3);
 assert.deepEqual(next.turns[0],result.turns[0]);
 assert.throws(()=>optimizeTeamTurn([ctx],target,()=>{},result,
  {mode:"fast",horizon:10,effort:"quick"}),/stratégie|recommence/i);
});

test("DPS long préserve les décisions par initiative et PA de chaque membre",()=>{
 const t=cleanTeamTarget({turns:3,hp:1_000_000_000_000,criticals:true});
 const team=[sac,eca].map(b=>createTeamContext(b,t));
 const output=optimizeTeamTurn(team,t,()=>{},null,
  {mode:"long",horizon:3,effort:"quick"});
 assert.deepEqual(output.turns[0].actors.map(a=>a.character),
  ["Mon Sacrieur","Karuta"]);
 assert.ok(output.turns[0].actors.every(a=>a.spent<=a.availablePA+0.01));
 assert.equal(output.turns.length,1);
});

test("Le choix manuel ne passe jamais par le planificateur longue durée",()=>{
 const context=createTeamContext(eca,target);
 const draft=newManualDraft([context],target);
 const start=previewManualDraft([context],target,draft);
 const spell=context.spells.find(s=>s.name==="Yams");
 const chosen=chooseManualSpell([context],target,draft,spell.id);
 const current=previewManualDraft([context],target,chosen);
 assert.equal(current.state.actions.length,1);
 assert.equal(current.state.actions[0].name,"Yams");
 assert.equal(start.state.turn,1);
 assert.equal(current.state.turn,1);
 assert.equal(current.result.turns.length,1);
});

test("Audit DPS équipe sur 3 tours avec anticipation 10 tours", {timeout:240000},()=>{
 const contexts=INITIAL_BUILDS.map(build=>createTeamContext(build,target));
 const results={};
 for(const mode of ["fast","long"]){
  let previous=null;
  const start=Date.now();
  for(let turn=1;turn<=3;turn++)previous=optimizeTeamTurn(
   contexts,target,()=>{},previous,{mode,horizon:10,effort:"balanced"});
  assert.equal(previous.turns.length,3);
  results[mode]={damage:previous.theoretical,elapsedMs:Date.now()-start,
   rounds:previous.turns.map(t=>t.theoretical),
   actors:previous.members.map(m=>({name:m.character,damage:m.estimated}))};
  assert.ok(previous.turns.every(t=>t.actors.every(a=>a.spent<=a.availablePA)));
 }
 console.log("AUDIT_DPS_EQUIPE "+JSON.stringify(results));
 assert.ok(results.long.damage>0&&results.fast.damage>0);
});
