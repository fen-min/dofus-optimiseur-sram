import assert from "node:assert/strict";
import {INITIAL_BUILDS,CLASSES,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {sacrierHealthAboveFloor,sacrierCastAboveFloor} from "../src/sacrier-safety.js";
import {initialState,eligible,castSpell} from "../src/engine.js";
const ref=normalizeBuild(INITIAL_BUILDS.find(b=>b.id==="sacri-air-pvm"));
const slot=CLASSES.sacrieur.pairs.findIndex(x=>x.includes("Pacte de Sang"));
const target=cleanTeamTarget({turns:100,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const F=["Furie","Furie","Assaut","Désolation"];
const cases=[
 {pct:30,floor:20,first:[["Furie","Furie","Désolation","Assaut"],F,F]},
 {pct:60,floor:50,first:[["Furie","Furie","Fulgurance","Assaut"],F,F]}
];
const R=n=>Math.round((Number(n)||0)*10)/10;
function run(c,forced=false){
 const b=structuredClone(ref);b.variants[slot]="Pacte de Sang";
 const ctx=createTeamContext(b,target,{ap:12,startHpPercent:c.pct});
 let previous=null,minimum=100;
 for(let t=1;t<=100;t++){
  if(forced&&t<=3){
   const names=c.first[t-1];
   let state=previous?.session.actors[0].state||initialState(ctx.settings);
   const ids=names.map(name=>{
    const spell=ctx.spells.find(s=>s.name===name&&ctx.settings.variants[s.variantGroup]===name);
    assert.ok(spell&&eligible(spell,state,ctx.settings),name+" unavailable at T"+t);
    const after=castSpell(state,spell,ctx.settings);
    assert.ok(sacrierCastAboveFloor(state,spell,after,c.floor),"Unsafe "+name+" T"+t);
    state=after;
    return spell.id;
   });
   previous=playSequentialTeam([ctx],target,()=>{},{previous,oneRound:true,
    teamStrategy:{mode:"long",horizon:10,minHpPercent:c.floor},
    manualOverrides:{[ctx.build.id]:ids}});
  }else previous=optimizeTeamTurn([ctx],target,()=>{},previous,
   {mode:"long",horizon:10,minHpPercent:c.floor});
  const actor=previous.turns.at(-1).actors[0];
  assert.ok(actor.spent<=12);
  const hp=previous.session.actors[0].state.sacrierHealth;
  minimum=Math.min(minimum,100*hp.hp/hp.maxHp);
  assert.ok(sacrierHealthAboveFloor(previous.session.actors[0].state,c.floor),
   "HP violation "+c.pct+"% T"+t);
 }
 return {damage:R(previous.theoretical),minHp:R(minimum),
  first3:previous.turns.slice(0,3).map(t=>t.actors[0].actions.map(a=>a.name))};
}
for(const c of cases){
 const auto=run(c,false),manual=run(c,true);
 console.log("PACTE_30_60_COMPARE "+JSON.stringify({...c,
  baseline:auto,beam:manual,delta:R(manual.damage-auto.damage)}));
}
