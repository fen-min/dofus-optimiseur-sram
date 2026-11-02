/**
 * Live automatic 100-round regression for all four HP-specific Sacrier
 * champions. These values were established by INDEPENDENT manual replay
 * (T1-T3) followed by dynamic optimisation (T4-T100).
 */
import assert from "node:assert/strict";
import {INITIAL_BUILDS,CLASSES,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {sacrierHealthAboveFloor} from "../src/sacrier-safety.js";
import {SACRIER_HP_100_CHAMPIONS} from "../src/sacrier-hp-rotation.js";
const baseline=normalizeBuild(INITIAL_BUILDS.find(b=>b.id==="sacri-air-pvm"));
const slot=CLASSES.sacrieur.pairs.findIndex(p=>p.includes("Pacte de Sang"));
const target=cleanTeamTarget({turns:100,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const expected={"40:Pacte de Sang":326973.7,
 "60:Mutilation":282402.2,"70:Mutilation":282526.2,
 "80:Mutilation":282012.4};
const R=x=>Math.round((Number(x)||0)*10)/10;
for(const c of SACRIER_HP_100_CHAMPIONS){
 const b=structuredClone(baseline);b.variants[slot]=c.variant;
 const ctx=createTeamContext(b,target,{ap:12,startHpPercent:c.starting});
 const policy={mode:"long",horizon:10,minHpPercent:c.floor};
 let previous=null,minHp=100;
 for(let turn=1;turn<=100;turn++){
  previous=optimizeTeamTurn([ctx],target,()=>{},previous,policy);
  const actor=previous.turns.at(-1).actors[0];
  assert.ok(actor.spent<=12);
  assert.ok(sacrierHealthAboveFloor(previous.session.actors[0].state,c.floor));
  assert.ok(!actor.safetyWarning,"unexpected unsafe HP");
  const hp=actor.health.hp/actor.health.maxHp*100;
  minHp=Math.min(minHp,hp);
  if(turn<=3)assert.deepEqual(actor.actions.map(s=>s.name),c.rounds[turn-1],
   "audited HP rotation not applied at "+turn);
 }
 const expectedTotal=expected[c.starting+":"+c.variant];
 assert.ok(Math.abs(previous.theoretical-expectedTotal)<.2,
  "100-turn automatic regression at "+c.starting+"% "+c.variant+
  ": "+previous.theoretical+" vs "+expectedTotal);
 console.log("SACRI_HP_LIVE_100 "+JSON.stringify({
  startingHp:c.starting,variant:c.variant,floor:c.floor,
  total:R(previous.theoretical),mean:R(previous.theoretical/100),
  minHp:R(minHp),expected:expectedTotal,
  first3:c.rounds
 }));
}
