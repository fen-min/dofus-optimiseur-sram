import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {createTeamContext,optimizeTeam,optimizeTeamTurn} from "../src/team-core.js";
import {planCurrentTurn} from "../src/team-sequential.js";
import {initialState,endTurn} from "../src/engine.js";

const original=INITIAL_BUILDS.find(b=>b.classId==="sacrieur");
const target={turns:3,hp:1000000};
function context(id,initiative,ap=6){
 const build={...original,id,character:id,ap,
  stats:{...original.stats,initiative}};
 return createTeamContext(build,target,{ap});
}
function striker(id,initiative,ap=6){
 const ctx=context(id,initiative,ap);
 const attack=ctx.spells.find(s=>s.name==="Assaut");
 assert.ok(attack);
 return {...ctx,spells:[{...attack,maxPerTurn:20,perTarget:20,cooldown:0}]};
}
function paBuffer(id,initiative,targets="allies"){
 const ctx=context(id,initiative);
 const buff=ctx.spells.find(s=>s.name==="Mutilation");
 assert.ok(buff);
 return {...ctx,spells:[{
  ...buff,id:"test-team-PA",name:"Mutilation",target:"self",nonDirect:true,
  min:0,max:0,critMin:0,critMax:0,pa:2,cooldown:5,
  maxPerTurn:1,perTarget:1,status:{teamBuff:{stat:"PA",value:2,duration:2,targets}}
 }]};
}

test("la recherche ne planifie que le tour courant, même sur un combat de 50 tours",()=>{
 const ctx=createTeamContext(original,{turns:50,hp:1000000});
 const attack=ctx.spells.find(s=>s.name==="Assaut");
 const focused={...ctx,spells:[attack]};
 const entry={ctx:focused,state:initialState(focused.settings),
  currentPA:focused.settings.ap,trials:0,teamBuffs:[],everyone:[]};
 const first=planCurrentTurn(entry,1000000);
 assert.equal(first.settings.turns,1);
 assert.equal(first.actions.every(a=>a.name==="Assaut"),true);
 // Un nouveau tour ne reprend pas les PA consommés du précédent.
 entry.state=endTurn(entry.state,focused.settings);
 const second=planCurrentTurn(entry,1000000);
 assert.equal(second.settings.turns,2);
 assert.equal(ctx.settings.turns,50);
});

test("+2 PA reçus avant son tour : disponibles immédiatement, puis expirent",()=>{
 const withSupport=optimizeTeam([paBuffer("support",3000),striker("damage",2000)],target);
 const rounds=withSupport.turns.map(t=>t.actors.find(a=>a.id==="damage").availablePA);
 assert.deepEqual(rounds,[8,8,6]);
 assert.ok(withSupport.turns[0].actors[0].actions.some(a=>a.name==="Mutilation"));
 const unbuffed=optimizeTeam([striker("damage",2000)],target);
 assert.ok(withSupport.turns[0].actors[1].damage>unbuffed.turns[0].actors[0].damage);
});

test("+PA lancés après un allié : effet au prochain tour, sans anticipation",()=>{
 const result=optimizeTeam([striker("damage",3000),paBuffer("support",2000)],target);
 const rounds=result.turns.map(t=>t.actors.find(a=>a.id==="damage").availablePA);
 assert.deepEqual(rounds,[6,8,6]);
 assert.equal(result.turns[0].actors[0].paBonus,0);
 assert.ok(result.turns[0].actors[1].actions.some(a=>a.name==="Mutilation"));
});

test("les relances de sorts restent mémorisées malgré les changements de PA",()=>{
 const ctx=striker("damage",2500);
 ctx.spells[0].cooldown=2;
 const result=optimizeTeam([ctx],target);
 assert.ok(result.turns[0].actors[0].actions.length>0);
 assert.equal(result.turns[1].actors[0].actions.length,0);
 assert.ok(result.turns[2].actors[0].actions.length>0);
});

test("PA choisis = total disponible, les bonus +PA ne sont pas ajoutés une seconde fois",()=>{
 const contexts=[paBuffer("support",3000),striker("damage",2000)];
 const policy={mode:"fast",horizon:3,minHpPercent:50};
 const first=optimizeTeamTurn(contexts,target,()=>{},null,policy,{damage:9});
 assert.equal(first.turns[0].actors.find(a=>a.id==="damage").availablePA,9);
 const second=optimizeTeamTurn(contexts,target,()=>{},first,policy);
 assert.equal(second.turns[1].actors.find(a=>a.id==="damage").availablePA,8,
  "without an override the +2 PA buff from the prior turn still applies");
 const third=optimizeTeamTurn(contexts,target,()=>{},second,policy,{damage:11});
 assert.equal(third.turns[2].actors.find(a=>a.id==="damage").availablePA,11);
 assert.equal(third.turns[0].actors.find(a=>a.id==="damage").availablePA,9);
});
