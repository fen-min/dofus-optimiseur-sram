import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS,CLASSES,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {planAuditedSacrierHpTurn,SACRIER_HP_100_CHAMPIONS}
 from "../src/sacrier-hp-rotation.js";
import {initialState} from "../src/engine.js";
import {sacrierHealthAboveFloor} from "../src/sacrier-safety.js";

const ref=normalizeBuild(INITIAL_BUILDS.find(x=>x.id==="sacri-air-pvm"));
const slot=CLASSES.sacrieur.pairs.findIndex(x=>x.includes("Pacte de Sang"));
const target=cleanTeamTarget({turns:100,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
function context(plan){
 const build=structuredClone(ref);build.variants[slot]=plan.variant;
 const ctx=createTeamContext(build,target,{ap:12,startHpPercent:plan.starting});
 return ctx;
}
for(const plan of SACRIER_HP_100_CHAMPIONS){
 test("HP-audited Sacrieur T1-T3 "+plan.starting+"% "+plan.variant,()=>{
  const ctx=context(plan);
  const policy={mode:"long",horizon:10,minHpPercent:plan.floor};
  assert.equal(ctx.settings.ap,12);
  let previous=null;
  for(let turn=1;turn<=3;turn++){
   previous=optimizeTeamTurn([ctx],target,()=>{},previous,policy);
   const actor=previous.turns[turn-1].actors[0];
   assert.deepEqual(actor.actions.map(a=>a.name),plan.rounds[turn-1],
    "reference route not applied at round "+turn);
   assert.ok(sacrierHealthAboveFloor(previous.session.actors[0].state,plan.floor));
  }
  assert.equal(previous.turns.length,3);
 });
}
test("HP champion is not forced with changed AP, crits, damage stats, variant or fight state",()=>{
 const plan=SACRIER_HP_100_CHAMPIONS.find(x=>x.starting===70);
 const ctx=context(plan);
 const policy={mode:"long",horizon:10,minHpPercent:plan.floor};
 const entry={ctx,state:initialState(ctx.settings),currentPA:12};
 assert.ok(planAuditedSacrierHpTurn(entry,policy)?.auditedHp);
 assert.equal(planAuditedSacrierHpTurn({...entry,currentPA:13},policy),null);
 assert.equal(planAuditedSacrierHpTurn(entry,{...policy,horizon:100}),null);
 assert.equal(planAuditedSacrierHpTurn(entry,{...policy,minHpPercent:20}),null);
 const other=structuredClone(ctx);
 other.settings.criticals=false;
 assert.equal(planAuditedSacrierHpTurn({...entry,ctx:other},policy),null);
 const changed=structuredClone(ctx);
 changed.spells[0].min+=10;
 assert.equal(planAuditedSacrierHpTurn({...entry,ctx:changed},policy),null);
 const badState=structuredClone(entry.state);badState.sacrierHealth.hp-=1;
 assert.equal(planAuditedSacrierHpTurn({...entry,state:badState},policy),null);
});
