/**
 * Follow-up 100-turn Sacrier audit for the HP-specific openers that gained
 * DPS on 15-turn runs. Identical contexts for current vs manual prefix.
 */
import assert from "node:assert/strict";
import {INITIAL_BUILDS,CLASSES,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {sacrierHealthAboveFloor} from "../src/sacrier-safety.js";
const R=x=>Math.round((Number(x)||0)*10)/10;
const base=normalizeBuild(INITIAL_BUILDS.find(b=>b.id==="sacri-air-pvm"));
const slot=CLASSES.sacrieur.pairs.findIndex(p=>p.includes("Pacte de Sang"));
const target=cleanTeamTarget({turns:100,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const F=["Furie","Furie","Assaut","Désolation"];
const routes=[
 {pct:40,floor:20,variant:"Pacte de Sang",first:[F,F,F]},
 {pct:60,floor:50,variant:"Mutilation",first:[
  ["Mutilation","Furie","Furie","Désolation"],F,F]},
 {pct:70,floor:50,variant:"Mutilation",first:[
  ["Mutilation","Furie","Furie","Assaut","Assaut"],F,F]},
 {pct:80,floor:50,variant:"Mutilation",first:[
  ["Mutilation","Furie","Furie","Assaut","Assaut"],
  ["Furie","Furie","Assaut","Fulgurance"],F]},
 {pct:70,floor:50,variant:"Pacte de Sang",first:[
  ["Furie","Furie","Fulgurance","Assaut"],F,F]},
 {pct:80,floor:50,variant:"Pacte de Sang",first:[
  ["Pacte de Sang","Furie","Furie","Assaut","Assaut"],
  ["Furie","Assaut","Désolation","Furie"],F]}
];
function buildContext(cfg){
 const b=structuredClone(base);b.variants[slot]=cfg.variant;
 const c=createTeamContext(b,target);
 c.settings.sacrierStartingHpPercent=cfg.pct;
 return c;
}
function play(cfg,forcePrefix){
 const c=buildContext(cfg),policy={mode:"long",horizon:10,minHpPercent:cfg.floor};
 let previous=null,lowest=100,valid=true;
 const milestones={};
 for(let turn=1;turn<=100;turn++){
  if(forcePrefix&&turn<=3){
   const ids=cfg.first[turn-1].map(name=>{
    const spell=c.spells.find(s=>s.name===name);assert.ok(spell,name);return String(spell.id);
   });
   previous=playSequentialTeam([c],target,()=>{},{previous,
    oneRound:true,manualOverrides:{[c.build.id]:ids}});
  }else previous=optimizeTeamTurn([c],target,()=>{},previous,policy);
  const actor=previous.turns.at(-1).actors[0];
  assert.ok(actor.spent<=actor.availablePA+.01);
  const state=previous.session.actors[0].state;
  const hpPct=R(state.sacrierHealth.hp/state.sacrierHealth.maxHp*100);
  lowest=Math.min(lowest,hpPct);
  if(!sacrierHealthAboveFloor(state,cfg.floor)){valid=false;break;}
  if([3,10,15,30,50,75,100].includes(turn))
   milestones[turn]=R(previous.theoretical);
 }
 return {valid,rounds:previous.turns.length,lowestHp:lowest,milestones,
  total:R(previous.theoretical)};
}
for(const cfg of routes){
 const old=play(cfg,false),found=play(cfg,true);
 const delta=Object.fromEntries([3,10,15,30,50,75,100].map(n=>[
  n,old.milestones[n]!==undefined&&found.milestones[n]!==undefined?
    R(found.milestones[n]-old.milestones[n]):null
 ]));
 console.log("SACRI_HP_100_COMPARE "+JSON.stringify({
  pct:cfg.pct,floor:cfg.floor,variant:cfg.variant,old,found,delta
 }));
}
