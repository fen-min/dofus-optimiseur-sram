import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS,CLASSES} from "../src/classes.js";
import {createTeamContext,optimizeTeamTurn,cleanTeamTarget} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {sacrierHealthAboveFloor} from "../src/sacrier-safety.js";
import {planSacrierAuditedDps} from "../src/sacrier-dps-rotation.js";

const base=INITIAL_BUILDS.find(b=>b.classId==="sacrieur");
const pactSlot=CLASSES.sacrieur.pairs.findIndex(pair=>pair.includes("Pacte de Sang"));
const variants=base.variants.slice();
variants[pactSlot]="Pacte de Sang";
const pact={...base,variants};
const target=n=>cleanTeamTarget({turns:n,hp:1e12,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const strategy={mode:"long",horizon:10,effort:"quick",minHpPercent:50};

function run(turns){
 const t=target(turns),ctx=createTeamContext(pact,t);
 let previous=null;
 for(let i=0;i<turns;i++){
  previous=optimizeTeamTurn([ctx],t,()=>{},previous,strategy);
  assert.ok(sacrierHealthAboveFloor(previous.session.actors[0].state,50),
   "Ne jamais descendre sous 50% des PV au tour "+(i+1));
  assert.equal(previous.turns.length,i+1);
  assert.ok(previous.turns[i].actors[0].spent<=12);
 }
 return previous;
}
test("Le mode long reprend le record manuel Sacrieur sur 3 tours",()=>{
 const result=run(3);
 const actions=result.turns.map(t=>t.actors[0].actions.map(a=>a.name));
 console.log("SACRIER_AUDITED_AUTO_3 "+JSON.stringify({damage:result.theoretical,actions}));
 assert.ok(result.theoretical>=7297.2,"Le DPS automatique 3 tours régresse: "+result.theoretical);
 assert.equal(actions[0][0],"Pacte de Sang");
});

test("Le mode long reprend le record manuel Sacrieur sur 10 tours",()=>{
 const result=run(10);
 const actions=result.turns.map(t=>t.actors[0].actions.map(a=>a.name));
 console.log("SACRIER_AUDITED_AUTO_10 "+JSON.stringify({damage:result.theoretical,actions}));
 assert.ok(result.theoretical>=24429.3,"Le DPS automatique 10 tours régresse: "+result.theoretical);
 assert.ok(actions[0].includes("Désolation"),"Il faut pouvoir retarder Pacte au T2");
 assert.ok(actions[1].includes("Pacte de Sang"));
 assert.ok(actions[4].includes("Pacte de Sang"));
 assert.ok(actions[7].includes("Pacte de Sang"));
});

test("Le moteur manuel reproduit le plan choisi par l'automatique",()=>{
 const turns=3,t=target(turns),ctx=createTeamContext(pact,t);
 const auto=run(turns);
 let manual=null;
 for(let i=0;i<turns;i++){
  const ids=auto.turns[i].actors[0].actions.map(a=>{
   const spell=ctx.spells.find(s=>s.name===a.name);
   assert.ok(spell,a.name);return spell.id;
  });
  manual=playSequentialTeam([ctx],t,()=>{},{previous:manual,oneRound:true,
   manualOverrides:{[ctx.build.id]:ids}});
 }
 assert.ok(Math.abs(manual.theoretical-auto.theoretical)<.2);
});

test("La rotation de référence ne s'impose pas sans Pacte ou avec des PA différents",()=>{
 const t=target(3),ctx=createTeamContext(base,t);
 assert.equal(planSacrierAuditedDps({ctx,state:{},currentPA:12},strategy),null);
 const other=createTeamContext(pact,t);
 assert.equal(planSacrierAuditedDps({ctx:other,state:{},currentPA:14},strategy),null);
});

test("En équipe, le Sacrieur applique ses meilleurs enchaînements sans toucher aux alliés",()=>{
 const t=target(10);
 const allies=INITIAL_BUILDS.filter(x=>x.classId!=="sacrieur");
 const contexts=[pact,...allies].map(b=>createTeamContext(b,t));
 let previous=null;
 for(let i=0;i<3;i++){
  previous=optimizeTeamTurn(contexts,t,()=>{},previous,strategy);
  assert.equal(previous.turns.length,i+1);
  assert.equal(previous.turns[i].actors.length,3);
  assert.ok(previous.turns[i].actors.every(a=>a.spent<=a.availablePA+0.01));
  const sac=previous.turns[i].actors.find(a=>a.id===pact.id);
  assert.ok(sac,"Sacrieur absent du tour d'équipe "+(i+1));
  assert.ok(sac.health.hp>=sac.health.maxHp/2,"PV insuffisants dans l'équipe");
 }
 const first=previous.turns[0].actors.find(a=>a.id===pact.id).actions.map(a=>a.name);
 const second=previous.turns[1].actors.find(a=>a.id===pact.id).actions.map(a=>a.name);
 assert.deepEqual(first,["Furie","Furie","Désolation","Assaut"]);
 assert.deepEqual(second,["Pacte de Sang","Furie","Furie","Assaut","Assaut"]);
 console.log("SACRIER_AUDITED_TEAM_3 "+JSON.stringify({
  teamDamage:previous.theoretical,
  sacrierDamage:previous.members.find(m=>m.id===pact.id).estimated,
  teammates:previous.members.filter(m=>m.id!==pact.id).map(m=>({name:m.character,damage:m.estimated}))
 }));
});

test("Diagnostic reproduit capture avec critiques décochés et trois personnages",()=>{
 const t=cleanTeamTarget({turns:10,hp:1e12,criticals:false,
  resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
 for(const [label,b] of [["Pacte",pact],["Mutilation",base]]){
  const team=[b,...INITIAL_BUILDS.filter(x=>x.classId!=="sacrieur")].map(x=>createTeamContext(x,t));
  let prev=null;
  for(let i=0;i<9;i++)prev=optimizeTeamTurn(team,t,()=>{},prev,strategy);
  const summary=prev.turns.map((turn,index)=>{
   const a=turn.actors.find(x=>x.id===b.id);
   return {turn:index+1,actions:a.actions.map(x=>x.name),damage:a.damage,hp:a.health?.hp,maxHp:a.health?.maxHp};
  });
  console.log("SACRIER_SCREENSHOT_DIAGNOSTIC "+JSON.stringify({label,summary}));
 }
});

test("DPS approfondi sur combat de 100 tours : Pacte lance au T2, rafraîchi T5/T8", {timeout:240000},()=>{
 for(const criticals of [false,true]){
  const t=cleanTeamTarget({turns:100,hp:1e12,criticals,
   resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
  const team=[pact,...INITIAL_BUILDS.filter(b=>b.classId!=="sacrieur")]
   .map(b=>createTeamContext(b,t));
  // Saved old settings ("quick" or "balanced") must also run deep.
  const policy={mode:"long",horizon:10,effort:"balanced",minHpPercent:50};
  let previous=null;
  for(let turn=1;turn<=9;turn++){
   previous=optimizeTeamTurn(team,t,()=>{},previous,policy);
   const actor=previous.turns.at(-1).actors.find(a=>a.id===pact.id);
   assert.ok(actor,"Sacrieur non présent tour "+turn);
   assert.ok(actor.health.hp>=actor.health.maxHp/2,
    "Le Sacrieur descend sous 50% tour "+turn);
   if([2,5,8].includes(turn))
    assert.ok(actor.actions.some(a=>a.name==="Pacte de Sang"),
     "Pacte reporté au tour "+turn+" (critiques "+criticals+") : "+actor.actions.map(a=>a.name));
  }
  const rounds=previous.turns.map(t=>t.actors.find(a=>a.id===pact.id));
  assert.ok(rounds[0].actions.every(a=>a.name!=="Pacte de Sang"));
  assert.ok(rounds[1].actions.some(a=>a.name==="Pacte de Sang"));
  console.log("SACRIER_PACTE_100_DEPTH "+JSON.stringify({
   criticals,effort:previous.session.teamStrategy.effort,damage:previous.members.find(m=>m.id===pact.id).estimated,
   spells:rounds.map(a=>a.actions.map(s=>s.name))
  }));
 }
});
