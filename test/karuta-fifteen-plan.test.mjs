import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {createTeamContext,optimizeTeamTurn,cleanTeamTarget} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {initialState,castSpell,endTurn} from "../src/engine.js";
import {KARUTA_FIFTEEN_ROUNDS,planAuditedKarutaTurn} from "../src/karuta-fifteen-plan.js";
import {cleanTeamStrategy} from "../src/team-long-plan.js";

const karuta=INITIAL_BUILDS.find(b=>b.id==="ecaflip-karuta-eau");
const target=(turns,criticals=true)=>cleanTeamTarget({turns,hp:1e12,criticals,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const strategy=cleanTeamStrategy({mode:"long",horizon:100,minHpPercent:50});
test("Karuta: known 15-round manual champion is legal and confirmed at 66 672.3",()=>{
 const t=target(15),ctx=createTeamContext(karuta,t);
 let prior=null;
 for(const seq of KARUTA_FIFTEEN_ROUNDS){
  const ids=seq.map(name=>{
   const spell=ctx.spells.find(s=>s.name===name);
   assert.ok(spell,name);return String(spell.id);
  });
  prior=playSequentialTeam([ctx],t,()=>{},{previous:prior,oneRound:true,
   manualOverrides:{[ctx.build.id]:ids}});
 }
 assert.equal(prior.turns.length,15);
 assert.ok(Math.abs(prior.theoretical-66672.3)<.12,prior.theoretical);
 assert.ok(prior.turns.every(t=>t.actors[0].spent<=12));
});

test("Karuta: long optimizer replays validated record for 15 rounds with 100 round setting",()=>{
 const t=target(100),ctx=createTeamContext(karuta,t);
 let previous=null;
 for(let turn=1;turn<=15;turn++){
  previous=optimizeTeamTurn([ctx],t,()=>{},previous,strategy);
  assert.deepEqual(previous.turns.at(-1).actors[0].actions.map(s=>s.name),
   KARUTA_FIFTEEN_ROUNDS[turn-1],"Karuta round "+turn+" diverged from verified champion");
  assert.equal(previous.turns.length,turn);
  assert.ok(previous.turns.at(-1).actors[0].spent<=12);
 }
 assert.ok(Math.abs(previous.theoretical-66672.3)<.12,
  "Karuta forecast 100 rounds, first 15 should match champion: "+previous.theoretical);
 console.log("KARUTA_AUDITED_15_IN_100 "+JSON.stringify({
  total:previous.theoretical,turns:previous.turns.map(t=>({
   number:t.number,damage:t.actors[0].damage,spells:t.actors[0].actions.map(a=>a.name)
  }))
 }));
});

test("Karuta: changes to crit, PA and card history invalidate audited template",()=>{
 const t=target(100),ctx=createTeamContext(karuta,t);
 const state=initialState(ctx.settings);
 assert.equal(planAuditedKarutaTurn({ctx,state,currentPA:12},strategy)?.audited,true);
 assert.equal(planAuditedKarutaTurn({ctx,state,currentPA:14},strategy),null);
 const changed=createTeamContext(karuta,target(100,false));
 assert.equal(planAuditedKarutaTurn({ctx:changed,state:initialState(changed.settings),currentPA:12},strategy),null);
 const first=ctx.spells.find(s=>s.name==="Yams");
 const after=endTurn(castSpell(state,first,ctx.settings),ctx.settings);
 assert.equal(planAuditedKarutaTurn({ctx,state:after,currentPA:12},strategy),null);
 assert.equal(planAuditedKarutaTurn({ctx,state,currentPA:12},{...strategy,mode:"fast"}),null);
});

test("Karuta: 100 future rounds are accepted in multi-actor team", {timeout:180000},()=>{
 const t=target(100),contexts=INITIAL_BUILDS.map(b=>createTeamContext(b,t));
 const start=Date.now();
 const result=optimizeTeamTurn(contexts,t,()=>{},null,strategy);
 assert.equal(result.turns.length,1);
 assert.equal(result.session.teamStrategy.horizon,100);
 assert.equal(result.turns[0].actors.length,3);
 assert.ok(result.turns[0].actors.every(a=>a.spent<=a.availablePA));
 console.log("KARUTA_TEAM_100_HORIZON "+JSON.stringify({
  elapsedMs:Date.now()-start,turnDamage:result.turns[0].theoretical,
  karuta:result.turns[0].actors.find(a=>a.character==="Karuta")?.actions.map(a=>a.name)
 }));
});

test("Karuta: after the 15th round, forecast switches to dynamic long optimizer", {timeout:120000},()=>{
 const t=target(100),ctx=createTeamContext(karuta,t);
 let prev=null;
 for(let i=0;i<16;i++)prev=optimizeTeamTurn([ctx],t,()=>{},prev,strategy);
 assert.equal(prev.turns.length,16);
 assert.ok(prev.theoretical>=66672.3,"Cumulative DPS should remain nondecreasing");
 assert.ok(prev.turns[15].actors[0].spent<=12);
 assert.equal(prev.session.teamStrategy.horizon,100);
 console.log("KARUTA_DYNAMIC_AFTER_15 "+JSON.stringify({
  first15:Math.round((prev.theoretical-prev.turns[15].theoretical)*10)/10,
  turn16:prev.turns[15].actors[0].actions.map(a=>a.name),total:prev.theoretical
 }));
});
