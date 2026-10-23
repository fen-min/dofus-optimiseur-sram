import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {createTeamContext,optimizeTeamTurn} from "../src/team-core.js";
const target={hp:1000000,turns:50,criticals:false,resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}};
const builds=INITIAL_BUILDS;
function context(build,spellName){
 const original=createTeamContext(build,target);
 const spell=original.spells.find(s=>s.name===spellName);
 assert.ok(spell);
 return {...original,spells:[spell]};
}
test("un clic ne calcule que le tour 1, même si la limite vaut 50",()=>{
 const contexts=[context(builds[0],"Arnaque"),context(builds[1],"Assaut")];
 const progress=[];
 const first=optimizeTeamTurn(contexts,target,p=>progress.push(p));
 assert.equal(first.turns.length,1);
 assert.equal(first.turns[0].number,1);
 assert.equal(first.finished,false);
 assert.deepEqual([...new Set(progress.map(x=>x.turn))],[1]);
 assert.deepEqual(first.turns[0].actors.map(x=>x.id),[builds[1].id,builds[0].id]);
 assert.deepEqual(first.session.actors.map(x=>x.state.turn),[2,2]);
});
test("second click only resolves tour 2 while preserving states and damage",()=>{
 const contexts=[context(builds[1],"Assaut")];
 const one=optimizeTeamTurn(contexts,target);
 const history=structuredClone(one);
 const two=optimizeTeamTurn(contexts,target,()=>{},one);
 assert.equal(one.turns.length,1);
 assert.equal(two.turns.length,2);
 assert.deepEqual(two.turns[0],one.turns[0]);
 assert.equal(two.turns[1].number,2);
 assert.equal(two.turns[1].roundStartHp,one.turns[0].remainingHp);
 assert.equal(two.session.actors[0].state.turn,3);
 assert.deepEqual(one,history,"previous result must remain unchanged");
});
test("cooldown survives two independent click events",()=>{
 const ctx=context(builds[1],"Assaut");
 const spell={...ctx.spells[0],cooldown:2};
 const opts={...ctx,spells:[spell]};
 const one=optimizeTeamTurn([opts],target);
 const two=optimizeTeamTurn([opts],target,()=>{},one);
 const three=optimizeTeamTurn([opts],target,()=>{},two);
 assert.ok(one.turns[0].actors[0].actions.length>0);
 assert.equal(two.turns[1].actors[0].actions.length,0);
 assert.ok(three.turns[2].actors[0].actions.length>0);
});
test("combat stops once target is defeated, no extra turn calculated",()=>{
 const ctx=context(builds[1],"Assaut");
 const result=optimizeTeamTurn([ctx],{...target,hp:100});
 assert.equal(result.turns.length,1);
 assert.equal(result.finished,true);
 assert.throws(()=>optimizeTeamTurn([ctx],{...target,hp:100},()=>{},result),/terminé/);
});
