/**
 * Independent 100-round Karuta MANUAL cross-check.
 * Compare live automatic long model (with buffs allowed), 15-round
 * audited manual prelude, and 100-round manually entered buff-free
 * repeated rotations. Check every cast/cooldown/AP with true engine.
 */
import assert from "node:assert/strict";
import {INITIAL_BUILDS,normalizeBuild} from "../src/classes.js";
import {createTeamContext,cleanTeamTarget,optimizeTeamTurn} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {KARUTA_FIFTEEN_ROUNDS} from "../src/karuta-fifteen-plan.js";
const scenario=process.argv[2]||"AUTO";
assert.ok(["AUTO","REPEAT12","REPEAT11","PREFIX15"].includes(scenario));
const R=n=>Math.round((Number(n)||0)*10)/10;
const t=cleanTeamTarget({turns:100,hp:1e12,criticals:true,resistances:{
 Air:0,Eau:0,Feu:0,Terre:0,Neutre:0}});
const b=normalizeBuild(INITIAL_BUILDS.find(b=>b.id==="ecaflip-karuta-eau"));
const c=createTeamContext(b,t),actorId=c.build.id;
const strategy={mode:"long",horizon:100,effort:"deep",minHpPercent:50};
const noStat=new Set(["Pile ou Face","Sceptre du Roi Joueur","Infortune"]);
const path12=["Pile ou Face","Sceptre du Roi Joueur","Sceptre du Roi Joueur","Infortune"];
const path11=["Sceptre du Roi Joueur","Sceptre du Roi Joueur","Infortune"];
const ids=names=>names.map(name=>{
 const sp=c.spells.find(x=>x.name===name);
 assert.ok(sp&&((sp.isWeapon)||c.settings.variants?.[sp.variantGroup]===sp.name),
  "Unequipped "+name);
 return String(sp.id);
});
let previous=null;
let automatic=null;
let first3=[],perTurn=[],milestones={},totalBuffs=new Set();
for(let round=1;round<=100;round++){
 if(scenario==="AUTO"){
  previous=optimizeTeamTurn([c],t,()=>{},previous,strategy);
 }else if(scenario==="PREFIX15"){
  if(round<=15)previous=playSequentialTeam([c],t,()=>{},{previous,oneRound:true,
   manualOverrides:{[actorId]:ids(KARUTA_FIFTEEN_ROUNDS[round-1])}});
  else previous=optimizeTeamTurn([c],t,()=>{},previous,strategy);
 }else{
  const names=scenario==="REPEAT12"?path12:path11;
  assert.ok(names.every(n=>noStat.has(n)));
  previous=playSequentialTeam([c],t,()=>{},{previous,oneRound:true,
   manualOverrides:{[actorId]:ids(names)}});
 }
 const actor=previous.turns.at(-1).actors[0];
 assert.equal(previous.turns.length,round);
 assert.equal(actor.availablePA,12);
 assert.ok(actor.spent<=12+1e-8);
 assert.ok(actor.actions.every(a=>
  a.name==="Sceptre du Roi Joueur"||
  c.settings.variants.includes(a.name)||
  a.name===c.spells.find(sp=>sp.isWeapon)?.name));
 const state=previous.session.actors[0].state;
 assert.ok(state.ecaHand.length<=4&&state.ecaTable.length<=12);
 if(scenario.startsWith("REPEAT"))assert.ok(
  actor.actions.every(a=>noStat.has(a.name)));
 for(const effect of state.buffs||[])totalBuffs.add(effect.stat);
 if(round<=3)first3.push(actor.actions.map(a=>a.name));
 perTurn.push(R(actor.damage));
 if([1,3,10,15,25,50,75,100].includes(round))
  milestones[round]=R(previous.theoretical);
}
const total=R(previous.theoretical);
if(scenario==="AUTO"||scenario==="PREFIX15"){
 // Independently replay the entire 100-round auto rotation in MANUAL mode.
 let manual=null;
 for(const r of previous.turns){
  const actions=r.actors[0].actions.map(a=>a.name);
  manual=playSequentialTeam([c],t,()=>{},{previous:manual,
   oneRound:true,manualOverrides:{[actorId]:ids(actions)}});
 }
 assert.equal(manual.turns.length,100);
 assert.ok(Math.abs(manual.theoretical-total)<.2,
  "Automatic 100-round trace not reproducible manually");
}
console.log("KARUTA_MANUAL_100_VERIFY "+JSON.stringify({
 scenario,total,perTurnAverage:R(total/100),milestones,first3,
 passiveTurquoise:c.settings.dofusTurquoise,
 observedBuffStats:[...totalBuffs].sort(),
 noBuffsDefinition:"No active spell delivering offensive stat buffs; Dofus Turquoise stays equipped",
 note:"100 independent legal rounds, one target with no attacks, deterministic expected crits"
}));
