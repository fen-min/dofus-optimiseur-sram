import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {SRAM_AUDITED_3,SRAM_AUDITED_100,sramAuditedPlan} from "../src/sram-audited-plan.js";
import {initialState} from "../src/engine.js";
const sram=INITIAL_BUILDS.find(b=>b.id==="sram-air-pvm");
const target=turns=>cleanTeamTarget({turns,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const policy={mode:"long",horizon:100,effort:"deep",minHpPercent:50};
function run(n,team=false){
 const t=target(n);
 const ctx=team?INITIAL_BUILDS.map(b=>createTeamContext(b,t)):[createTeamContext(sram,t)];
 let prior=null;let actions=[];
 for(let i=0;i<n;i++){
  prior=optimizeTeamTurn(ctx,t,()=>{},prior,policy);
  const a=prior.turns[i].actors.find(x=>x.id===sram.id);
  assert.ok(a,"Matryoshka missing turn "+(i+1));
  assert.ok(a.spent<=a.availablePA+.01);
  actions.push(a.actions.map(s=>s.name));
 }
 return {prior,actions};
}
test("Matryoshka: three-round short route is applied and verified",()=>{
 const {prior,actions}=run(3);
 assert.deepEqual(actions,SRAM_AUDITED_3);
 const solo=prior.members.find(x=>x.id===sram.id);
 assert.ok(Math.abs(solo.estimated-9836.5)<.2,solo.estimated);
});
test("Matryoshka: ten-round record applied with 100-round horizon",()=>{
 const {prior,actions}=run(10);
 assert.deepEqual(actions,SRAM_AUDITED_100.slice(0,10));
 assert.ok(Math.abs(prior.theoretical-31646.7)<.2,prior.theoretical);
});
test("Matryoshka: fifteen-round and 100-round safe Manigance policy", {timeout:240000},()=>{
 const {prior,actions}=run(100);
 assert.deepEqual(actions,SRAM_AUDITED_100);
 assert.equal(actions.length,100);
 const first15=prior.turns.slice(0,15).reduce((sum,t)=>sum+t.theoretical,0);
 assert.ok(Math.abs(first15-47633.4)<.4,first15);
 assert.ok(Math.abs(prior.theoretical-318816.6)<.4,prior.theoretical);
 assert.equal(actions.filter(seq=>seq.includes("Manigance")).length,27);
 console.log("SRAM_OPTIMIZER_AUDIT "+JSON.stringify({
  first15,total:prior.theoretical,rounds:prior.turns.length,
  manigance:actions.filter(seq=>seq.includes("Manigance")).length
 }));
});
test("Matryoshka: team keeps initiative and uses validated first turn",()=>{
 const {prior,actions}=run(2,true);
 assert.deepEqual(actions[0],SRAM_AUDITED_100[0]);
 assert.equal(prior.turns.length,2);
 assert.equal(prior.turns[0].actors.length,3);
});
test("Matryoshka: different PA or inactive crits disable preset",()=>{
 const t=target(10);
 const ctx=createTeamContext(sram,t);
 const state=initialState(ctx.settings);
 assert.equal(sramAuditedPlan({ctx,state,currentPA:14},policy),null);
 assert.equal(sramAuditedPlan({ctx,state,currentPA:12},{...policy,mode:"fast"}),null);
 const alt=createTeamContext(sram,cleanTeamTarget({...t,criticals:false}));
 assert.equal(sramAuditedPlan({ctx:alt,state:initialState(alt.settings),currentPA:12},policy),null);
});
