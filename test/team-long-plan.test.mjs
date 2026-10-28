import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {createTeamContext,optimizeTeamTurn,cleanTeamTarget} from "../src/team-core.js";
import {cleanTeamStrategy} from "../src/team-long-plan.js";
import {newManualDraft,previewManualDraft,chooseManualSpell} from "../src/team-manual.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {TEAM_TEN_ATTACK} from "../src/team-audited-ten-plan.js";

const target=cleanTeamTarget({turns:10,hp:1_000_000_000_000,criticals:true});
const sac=INITIAL_BUILDS.find(b=>b.classId==="sacrieur");
const eca=INITIAL_BUILDS.find(b=>b.classId==="ecaflip");

function sramAfterTen(turns){
 const target=cleanTeamTarget({turns,hp:1e12,criticals:true});
 const build=normalizeBuild(INITIAL_BUILDS.find(b=>b.classId==="sram"));
 build.distance=1;
 const ctx=createTeamContext(build,target);
 const byName=new Map(ctx.spells.map(s=>[s.name,s.id]));
 let previous=null;
 for(const names of TEAM_TEN_ATTACK.sram){
  previous=playSequentialTeam([ctx],target,()=>{},{previous,oneRound:true,
   manualOverrides:{[ctx.build.id]:names.map(name=>byName.get(name))}});
 }
 return {ctx,target,previous};
}

test("Sram renouvelle les poisons après T10 et T15 sans modifier les tours déjà joués",()=>{
 const {ctx,target,previous:prefix}=sramAfterTen(20);
 const snapshot=structuredClone(prefix);
 let previous=prefix;
 for(let turn=11;turn<=16;turn++){
  previous=optimizeTeamTurn([ctx],target,()=>{},previous,{mode:"long",horizon:100});
  assert.equal(previous.turns.length,turn);
  const actor=previous.turns.at(-1).actors[0];
  const names=actor.actions.map(a=>a.name);
  if(turn===11||turn===16)
   assert.deepEqual(names,["Injection Toxique","Arsenic","Épidémie"]);
  else assert.ok(!names.includes("Injection Toxique"),"Respecter la relance du poison");
  assert.ok(actor.spent<=actor.availablePA);
  assert.equal(actor.log.casts.length,actor.actions.length);
  assert.ok(Math.abs(actor.damage-actor.direct-actor.poison)<.15);
  if(turn===15)assert.equal(previous.theoretical,51578.1);
 }
 assert.deepEqual(prefix,snapshot,"L'anticipation ne modifie pas la session précédente");
 // Replay each automatic decision through the manual engine, with the same
 // PA, cooldowns and poison state. No forecast damage belongs in the result.
 let manual=prefix;
 for(const turn of previous.turns.slice(10)){
  manual=playSequentialTeam([ctx],target,()=>{},{previous:manual,oneRound:true,
   manualOverrides:{[ctx.build.id]:turn.actors[0].actions.map(a=>
    ctx.spells.find(spell=>spell.name===a.name).id)}});
 }
 assert.equal(manual.theoretical,previous.theoretical);
});

test("Sram ne sacrifie pas le dernier tour pour des poisons futurs",()=>{
 const {ctx,target,previous}=sramAfterTen(11);
 const result=optimizeTeamTurn([ctx],target,()=>{},previous,{mode:"long",horizon:100});
 const actor=result.turns.at(-1).actors[0];
 assert.ok(!actor.actions.some(a=>a.name==="Injection Toxique"));
 const fast=optimizeTeamTurn([ctx],target,()=>{},previous,{mode:"fast",horizon:100});
 assert.equal(actor.damage,fast.turns.at(-1).actors[0].damage);
 assert.equal(result.finished,true);
});

test("DPS équipe longue durée est le mode par défaut et borne les paramètres",()=>{
 assert.deepEqual(cleanTeamStrategy(),{mode:"long",horizon:100,effort:"deep",minHpPercent:50});
 assert.deepEqual(cleanTeamStrategy({mode:"fast",horizon:30,effort:"quick"}),
  {mode:"fast",horizon:30,effort:"deep",minHpPercent:50});
 assert.equal(cleanTeamStrategy({effort:"balanced"}).effort,"deep");
 assert.equal(cleanTeamStrategy({effort:"quick"}).effort,"deep");
 assert.equal(cleanTeamStrategy({horizon:-1}).horizon,3);
 assert.equal(cleanTeamStrategy({horizon:"abc"}).horizon,100);
 assert.equal(cleanTeamStrategy({horizon:999}).horizon,100);
 assert.equal(cleanTeamStrategy({horizon:75}).horizon,75);
 assert.equal(cleanTeamStrategy({mode:"unrecognized"}).mode,"long");
 assert.equal(cleanTeamStrategy({minHpPercent:120}).minHpPercent,100);
 assert.equal(cleanTeamStrategy({minHpPercent:0}).minHpPercent,0);
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
