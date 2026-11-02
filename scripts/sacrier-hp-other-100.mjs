/**
 * Final alternate-variant checks at each requested HP (12 PA, 100 rounds).
 * Champions already passed full 100-round regression elsewhere. This script
 * tests the REMAINING variant for each HP point without forcing it.
 */
import assert from "node:assert/strict";
import {INITIAL_BUILDS,CLASSES,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {sacrierHealthAboveFloor} from "../src/sacrier-safety.js";
const b=normalizeBuild(INITIAL_BUILDS.find(x=>x.id==="sacri-air-pvm"));
const slot=CLASSES.sacrieur.pairs.findIndex(p=>p.includes("Pacte de Sang"));
const target=cleanTeamTarget({turns:100,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const R=n=>Math.round((Number(n)||0)*10)/10;
const cases=[
 {pct:30,floor:20,variant:"Mutilation"},
 {pct:30,floor:20,variant:"Pacte de Sang"},
 {pct:40,floor:20,variant:"Mutilation"},
 {pct:60,floor:50,variant:"Pacte de Sang"},
 {pct:70,floor:50,variant:"Pacte de Sang"},
 {pct:80,floor:50,variant:"Pacte de Sang"}
];
for(const cfg of cases){
 const build=structuredClone(b);build.variants[slot]=cfg.variant;
 const ctx=createTeamContext(build,target,{startHpPercent:cfg.pct,ap:12});
 let prev=null,valid=true,minHp=100,turn=0;
 const samples={};
 for(turn=1;turn<=100;turn++){
  prev=optimizeTeamTurn([ctx],target,()=>{},prev,
   {mode:"long",horizon:10,minHpPercent:cfg.floor});
  const actor=prev.turns.at(-1).actors[0];
  assert.ok(actor.spent<=12);
  const state=prev.session.actors[0].state;
  const current=R(100*state.sacrierHealth.hp/state.sacrierHealth.maxHp);
  minHp=Math.min(minHp,current);
  if(!sacrierHealthAboveFloor(state,cfg.floor)){valid=false;break;}
  if([3,10,15,30,50,100].includes(turn))samples[turn]=R(prev.theoretical);
 }
 console.log("SACRI_HP_ALT_100 "+JSON.stringify({
  ...cfg,valid,turns:prev.turns.length,total:R(prev.theoretical),
  minHp,samples,opening:prev.turns[0].actors[0].actions.map(x=>x.name)
 }));
}
