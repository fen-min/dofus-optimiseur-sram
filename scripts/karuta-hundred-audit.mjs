/**
 * Karuta 100-round independent audit.
 * No fabricated future damage: each automatic decision is committed for one
 * round only, then every selected spell is replayed through the manual engine.
 * Logs are simulations (single virtual target, no enemy attacks).
 */
import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {cleanTeamTarget,createTeamContext,optimizeTeamTurn} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {KARUTA_FIFTEEN_ROUNDS} from "../src/karuta-fifteen-plan.js";

const target=cleanTeamTarget({turns:100,hp:1_000_000_000_000,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}});
const R=n=>Math.round((Number(n)||0)*10)/10;
const karuta=INITIAL_BUILDS.find(b=>b.id==="ecaflip-karuta-eau");
assert.ok(karuta,"Karuta's reference build is missing");
const milestones=new Set([1,3,10,15,16,25,50,75,100]);

function inspectRound(result,contexts,number){
 assert.equal(result.turns.length,number,"one click should commit exactly one round");
 const round=result.turns.at(-1);
 assert.equal(round.actors.length,contexts.length);
 assert.ok(Number.isFinite(round.theoretical),"finite team damage");
 assert.ok(round.theoretical>=0,"nonnegative team damage");
 for(const actor of round.actors){
  const context=contexts.find(x=>x.build.id===actor.id);
  assert.ok(context,"unknown actor at round "+number);
  assert.ok(actor.spent<=actor.availablePA+1e-6,
   "AP exceeded "+actor.character+" round "+number);
  assert.ok(actor.spent>=0);
  assert.equal(actor.log?.casts?.length,actor.actions.length,
   "missing cast logs "+actor.character+" round "+number);
  const state=result.session.actors.find(x=>x.id===actor.id)?.state;
  assert.ok(state,"missing persistent actor state "+actor.character);
  assert.equal(state.turn,number+1,"combat state did not advance");
  if(context.settings.classId==="ecaflip"){
   assert.ok(state.ecaHand.length<=4,"fifth card retained at round "+number);
   assert.ok(state.ecaTable.length<=12,"table overflow at round "+number);
  }
 }
}

async function check(label,contexts,strategy){
 let previous=null;
 const checkpoint=[],autoRounds=[],totalsByCharacter={};
 for(let turn=1;turn<=100;turn++){
  previous=optimizeTeamTurn(contexts,target,()=>{},previous,strategy);
  inspectRound(previous,contexts,turn);
  const last=previous.turns.at(-1);
  const actors=last.actors.map(a=>({id:a.id,character:a.character,
   classId:contexts.find(c=>c.build.id===a.id).settings.classId,
   damage:R(a.damage),pa:a.spent,spells:a.actions.map(s=>s.name),
   spellIds:a.actions.map(s=>String(s.id))}));
  for(const a of actors)totalsByCharacter[a.character]=
   R((totalsByCharacter[a.character]||0)+a.damage);
  autoRounds.push(actors);
  if(milestones.has(turn)){
   checkpoint.push({turn,total:R(previous.theoretical),teamDamage:R(last.theoretical),
    karuta:actors.find(a=>a.classId==="ecaflip")});
  }
  if(turn<=15&&label==="solo-long"){
   assert.deepEqual(actors[0].spells,KARUTA_FIFTEEN_ROUNDS[turn-1],
    "audited Karuta rotation differs at T"+turn);
  }
 }
 assert.equal(previous.session.teamStrategy.horizon,100);
 assert.equal(previous.turns.length,100);
 const automatic=R(previous.theoretical);
 // Independent manual replay, from an empty combat, using ONLY actions chosen
 // in the automatic run. This tests legality, all carried state, and damages.
 let manual=null,maxDifference=0;
 for(let i=0;i<100;i++){
  const overrides=Object.fromEntries(autoRounds[i].map(a=>[a.id,a.spellIds]));
  manual=playSequentialTeam(contexts,target,()=>{},{previous:manual,
   oneRound:true,manualOverrides:overrides});
  assert.equal(manual.turns.length,i+1,"manual round count mismatch");
  const actual=manual.turns.at(-1),expected=previous.turns[i];
  assert.equal(actual.actors.length,expected.actors.length);
  for(let k=0;k<actual.actors.length;k++){
   const a=actual.actors[k],b=expected.actors[k];
   assert.deepEqual(a.actions.map(x=>x.name),b.actions.map(x=>x.name),
    "manual casts differ T"+(i+1)+" actor "+a.character);
   assert.ok(a.spent<=a.availablePA+1e-6,"manual AP exceeded");
   const delta=Math.abs(a.damage-b.damage);
   maxDifference=Math.max(maxDifference,delta);
   assert.ok(delta<0.12,
    "manual and automatic character DPS differ T"+(i+1)+" "+a.character+": "+a.damage+" vs "+b.damage);
  }
  assert.ok(Math.abs(actual.theoretical-expected.theoretical)<0.2,
   "manual and automatic team DPS differ T"+(i+1));
 }
 const replayed=R(manual.theoretical);
 assert.ok(Math.abs(automatic-replayed)<0.2,
  "100-round total mismatch: auto "+automatic+" manual "+replayed);
 const result={label,total:automatic,replayed,
  mean:R(automatic/100),maxActorDifference:R(maxDifference),
  byCharacter:totalsByCharacter,checkpoint};
 console.log("KARUTA_100_AUDIT "+JSON.stringify(result));
 return result;
}

const soloContext=[createTeamContext(karuta,target)];
const baseline=await check("solo-fast",soloContext,{mode:"fast",horizon:100,minHpPercent:50});
const solo=await check("solo-long",soloContext,{mode:"long",horizon:100,minHpPercent:50});
const team=await check("team-long",INITIAL_BUILDS.map(b=>createTeamContext(b,target)),
 {mode:"long",horizon:100,minHpPercent:50});
console.log("KARUTA_100_FINAL "+JSON.stringify({
 baseline:baseline.total,solo:solo.total,soloDelta:R(solo.total-baseline.total),
 team:team.total,teamKaruta:team.byCharacter.Karuta,
 note:"All 300 auto rounds were checked and replayed manually (100 per scenario). Results are heuristic, not global optima."
}));
