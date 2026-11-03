import assert from "node:assert/strict";
import {INITIAL_BUILDS, normalizeBuild} from "../src/classes.js";
import {cleanTeamTarget,createTeamContext,optimizeTeamTurn} from "../src/team-core.js";
import {playSequentialTeam} from "../src/team-sequential.js";
import {chooseTeamFiftyPlan,TEAM_FIFTY_AUDITED} from "../src/team-audited-fifty-plan.js";
import {sacrierHealthAboveFloor} from "../src/sacrier-safety.js";

const target=cleanTeamTarget({turns:100,hp:1e12,criticals:true,resistances:{
 Air:0,Terre:0,Feu:0,Eau:0,Neutre:0
}});
const policy={mode:"long",horizon:100,minHpPercent:50,effort:"deep"};
const standard=INITIAL_BUILDS.map(normalizeBuild);
const contexts=builds=>builds.map(b=>createTeamContext(b,target));
const baselineSettings=contexts(standard);
console.log("ACTIVATION_DIAG_SETTINGS "+JSON.stringify(baselineSettings.map(c=>({
 character:c.build.character,id:c.build.id,distance:c.settings.distance,
 ap:c.settings.ap,turns:c.settings.turns,hp:c.settings.sacrierStartingHpPercent,
 spells:c.spells.length}))));
console.log("ACTIVATION_DIAG_MATCH "+JSON.stringify({
 defaultAllowed:Boolean(chooseTeamFiftyPlan(baselineSettings,target,policy)),
 userDistances:standard.map(x=>({name:x.character,distance:x.distance})),
 firstSuggested:Object.fromEntries(Object.entries(TEAM_FIFTY_AUDITED).map(([cls,turns])=>[cls,turns[0]]))
}));
const names={sram:"Matryoshka",sacrieur:"Mon Sacrieur",ecaflip:"Karuta"};
const runAuto=()=>{
 let previous=null;
 for(let t=1;t<=50;t++){
  previous=optimizeTeamTurn(baselineSettings,target,()=>{},previous,policy);
  if([1,2,5,9,25,50].includes(t))
   console.log("ACTIVATION_DIAG_AUTO "+JSON.stringify({
    t,total:previous.theoretical,plan:previous.session.teamFiftyPlan,
    firstActor:previous.turns.at(-1).actors[0].actions.map(a=>a.name)
   }));
 }
 return previous;
};
const runManual=(team,label)=>{
 let previous=null,minimum=100;
 try{
  for(let t=1;t<=50;t++){
   const overrides=Object.fromEntries(team.map(c=>[c.build.id,
    TEAM_FIFTY_AUDITED[c.settings.classId][t-1].map(name=>{
     const spell=c.spells.find(s=>s.name===name);
     assert.ok(spell,"Unknown spell "+name);
     return String(spell.id);
    })]));
   previous=playSequentialTeam(team,target,()=>{},{
    previous,oneRound:true,manualOverrides:overrides
   });
   const sacri=previous.session.actors.find(a=>a.id==="sacri-air-pvm");
   if(sacri){
    const h=sacri.state.sacrierHealth;
    minimum=Math.min(minimum,100*h.hp/h.maxHp);
    assert.ok(sacrierHealthAboveFloor(sacri.state,50),"HP below 50 T"+t);
   }
  }
  console.log("ACTIVATION_DIAG_MANUAL "+JSON.stringify({label,total:previous.theoretical,minHpPercent:minimum,
  members:previous.members.map(m=>({name:m.character,damage:m.estimated}))}));
  return previous;
 }catch(error){
  console.log("ACTIVATION_DIAG_MANUAL_FAILED "+JSON.stringify({label,turn:previous?.turns.length||0,reason:String(error)}));
  return null;
 }
};
const original=runAuto();
console.log("ACTIVATION_DIAG_ORIGINAL_TOTAL "+original.theoretical);
runManual(baselineSettings,"default-real-world-distances");
const bothOne=standard.map(b=>({...b,distance:["sacrieur","sram"].includes(b.classId)?1:b.distance}));
runManual(contexts(bothOne),"old-test-melee-distance-one");
