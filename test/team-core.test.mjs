import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {cleanTeamTarget,teamMembers,initiativeOf,createTeamContext,assembleTeamResult} from "../src/team-core.js";

const base=INITIAL_BUILDS[0],sacri=INITIAL_BUILDS[1];
test("eight slots contain unique selected builds sorted by decreasing initiative",()=>{
 const b=[{...base,id:"a",stats:{initiative:100}},{...sacri,id:"b",stats:{initiative:800}},
 {...base,id:"c",stats:{initiative:100}},{...base,id:"d",stats:null}];
 assert.deepEqual(teamMembers(b,["a","b","a","c","d","missing"]).map(x=>x.id),["b","a","c","d"]);
 assert.equal(initiativeOf(b[3]),null);
});
test("initiative zero remains a known value, and unknown goes last",()=>{
 const b=[{...base,id:"a",stats:{initiative:0}},{...base,id:"b",stats:null}];
 assert.deepEqual(teamMembers(b,["b","a"]).map(x=>x.id),["a","b"]);
});
test("target limits and resistances are sanitized",()=>{
 const t=cleanTeamTarget({hp:-1,turns:50,criticals:false,resistances:{Air:200,Feu:30,Eau:-10}});
 assert.equal(t.hp,100);assert.equal(t.turns,10);
 assert.equal(t.criticals,false);assert.equal(t.resistances.Air,90);
 assert.equal(t.resistances.Feu,30);assert.equal(t.resistances.Eau,0);
});
test("calibration is applied once, and independent variants and resists are preserved",()=>{
 const ctx=createTeamContext({...base,calibration:{}},{turns:2,resistances:{Air:25,Terre:15}});
 assert.equal(ctx.settings.ap,12);
 assert.equal(ctx.settings.turns,2);
 assert.equal(ctx.settings.resistances.Air,25);
 assert.equal(ctx.settings.resistances.Terre,15);
 assert.deepEqual(ctx.settings.variants,base.variants);
 const spell=ctx.spells.find(x=>x.status?.buff)||ctx.spells[0];
 const edited=createTeamContext({...base,calibration:{[spell.id]:{min:77,max:88,buff:{value:99,duration:2}}}},{turns:2});
 assert.equal(edited.spells.find(x=>x.id===spell.id).min,77);
 assert.equal(edited.spells.find(x=>x.id===spell.id).max,88);
 if(spell.status?.buff)assert.equal(edited.spells.find(x=>x.id===spell.id).status.buff.value,99);
 assert.notEqual(ctx.spells.find(x=>x.id===spell.id).min,77);
});
test("result aggregates actors per turn in initiative order, caps effective target HP",()=>{
 const toy=(build,turns,total)=>({build,result:{
  total,immediate:total,poison:0,turns:turns.map((d,i)=>({
   number:i+1,total:d,immediate:d,poison:0,spent:3,actions:[{name:"Sort "+i,pa:3}]
  }))}});
 const res=assembleTeamResult([
  toy({id:"high",character:"H",name:"Air",initiative:500},[100,200],300),
  toy({id:"low",character:"L",name:"Air",initiative:200},[80,150],230)
 ],{hp:350,turns:2});
 assert.equal(res.theoretical,530);
 assert.equal(res.effective,350);
 assert.equal(res.overkill,180);
 assert.equal(res.turns[0].remainingHp,170);
 assert.equal(res.turns[1].remainingHp,0);
 assert.deepEqual(res.turns[1].actors.map(a=>a.id),["high","low"]);
 assert.equal(res.turns[1].actors[0].actions[0].name,"Sort 1");
});
