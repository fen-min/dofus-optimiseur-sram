/**
 * Independent comparison: 3 manual HP-specific audited rounds then
 * automatic turns 4-15, versus automatic from turn 1 throughout.
 * Identical builds, 12 AP, 0% target res, 15-round target and HP floor.
 */
import assert from "node:assert/strict";
import {INITIAL_BUILDS,CLASSES,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {sacrierHealthAboveFloor} from "../src/sacrier-safety.js";
const R=x=>Math.round((Number(x)||0)*10)/10;
const sacri=normalizeBuild(INITIAL_BUILDS.find(b=>b.id==="sacri-air-pvm"));
const slot=CLASSES.sacrieur.pairs.findIndex(p=>p.includes("Pacte de Sang"));
const target=cleanTeamTarget({turns:15,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const routes=[
 {pct:30,floor:20,variant:"Pacte de Sang",first:[
  ["Furie","Furie","Désolation","Assaut"],
  ["Furie","Furie","Assaut","Désolation"],
  ["Furie","Furie","Assaut","Désolation"]]},
 {pct:30,floor:20,variant:"Mutilation",first:[
  ["Mutilation","Furie","Furie","Assaut","Assaut"],
  ["Furie","Furie","Assaut","Désolation"],
  ["Furie","Furie","Assaut","Désolation"]]},
 {pct:40,floor:20,variant:"Pacte de Sang",first:[
  ["Furie","Furie","Assaut","Désolation"],
  ["Furie","Furie","Assaut","Désolation"],
  ["Furie","Furie","Assaut","Désolation"]]},
 {pct:40,floor:20,variant:"Mutilation",first:[
  ["Mutilation","Furie","Furie","Assaut","Assaut"],
  ["Furie","Furie","Assaut","Désolation"],
  ["Furie","Furie","Assaut","Désolation"]]},
 {pct:60,floor:50,variant:"Pacte de Sang",first:[
  ["Furie","Furie","Fulgurance","Assaut"],
  ["Furie","Furie","Assaut","Désolation"],
  ["Furie","Furie","Assaut","Désolation"]]},
 {pct:60,floor:50,variant:"Mutilation",first:[
  ["Mutilation","Furie","Furie","Désolation"],
  ["Furie","Furie","Assaut","Désolation"],
  ["Furie","Furie","Assaut","Désolation"]]},
 {pct:70,floor:50,variant:"Pacte de Sang",first:[
  ["Furie","Furie","Fulgurance","Assaut"],
  ["Furie","Furie","Assaut","Désolation"],
  ["Furie","Furie","Assaut","Désolation"]]},
 {pct:70,floor:50,variant:"Mutilation",first:[
  ["Mutilation","Furie","Furie","Assaut","Assaut"],
  ["Furie","Furie","Assaut","Désolation"],
  ["Furie","Furie","Assaut","Désolation"]]},
 {pct:80,floor:50,variant:"Pacte de Sang",first:[
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Furie","Assaut","Désolation","Furie"],
  ["Furie","Furie","Assaut","Désolation"]]},
 {pct:80,floor:50,variant:"Mutilation",first:[
  ["Mutilation","Furie","Furie","Assaut","Assaut"],
  ["Furie","Furie","Assaut","Fulgurance"],
  ["Furie","Furie","Assaut","Désolation"]]}
];
function makeCtx(cfg){
 const b=structuredClone(sacri);
 b.variants[slot]=cfg.variant;
 const ctx=createTeamContext(b,target);
 ctx.settings.sacrierStartingHpPercent=cfg.pct;
 return ctx;
}
function run(ctx,cfg,manualFirst=false){
 let previous=null,lowest=100,valid=true;
 const policy={mode:"long",horizon:10,minHpPercent:cfg.floor};
 let first3=[],summary=[];
 for(let turn=1;turn<=15;turn++){
  if(manualFirst&&turn<=3){
   const names=cfg.first[turn-1];
   const ids=names.map(name=>{
    const spell=ctx.spells.find(s=>s.name===name);
    assert.ok(spell,"Missing spell "+name);return String(spell.id);
   });
   previous=playSequentialTeam([ctx],target,()=>{},{previous,oneRound:true,
    manualOverrides:{[ctx.build.id]:ids}});
  }else previous=optimizeTeamTurn([ctx],target,()=>{},previous,policy);
  const actor=previous.turns.at(-1).actors[0];
  assert.equal(actor.availablePA,12);
  assert.ok(actor.spent<=12.01);
  const state=previous.session.actors[0].state;
  const pct=R(state.sacrierHealth.hp/state.sacrierHealth.maxHp*100);
  lowest=Math.min(lowest,pct);
  if(!sacrierHealthAboveFloor(state,cfg.floor)){valid=false;break;}
  if(turn<=3)first3.push(actor.actions.map(a=>a.name));
  if([3,10,15].includes(turn))summary.push({turn,total:R(previous.theoretical),pct});
 }
 return {valid,lowestHp:lowest,summary,first3,rounds:previous.turns.length,
  finalTotal:R(previous.theoretical)};
}
const rows=[];
for(const cfg of routes){
 const a=run(makeCtx(cfg),cfg),b=run(makeCtx(cfg),cfg,true);
 const map=arr=>Object.fromEntries(arr.summary.map(x=>[x.turn,x.total]));
 const old=map(a),fresh=map(b);
 const result={pct:cfg.pct,floor:cfg.floor,variant:cfg.variant,
  before:a,after:b,delta:{
   3:R((fresh[3]||0)-(old[3]||0)),
   10:R((fresh[10]||0)-(old[10]||0)),
   15:R((fresh[15]||0)-(old[15]||0))
  }};
 rows.push(result);
 console.log("SACRI_HP_CONTINUE "+JSON.stringify(result));
}
console.log("SACRI_HP_CONTINUE_FINAL "+JSON.stringify({rows}));
