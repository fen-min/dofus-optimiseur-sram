import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {cleanTeamTarget,teamMembers,initiativeOf,createTeamContext,assembleTeamResult,optimizeTeam,cleanTeamMemberOptions} from "../src/team-core.js";

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

test("eight-build rotation generates eight initiative-sorted actions sets without PA overflow",()=>{
 const builds=Array.from({length:8},(_,i)=>({
  ...INITIAL_BUILDS[i%2],id:"synthetic-"+i,character:"Joueur "+(i+1),
  stats:{initiative:2100-i*100}
 }));
 const target={hp:30000,turns:1,resistances:{Air:20}};
 const lineup=teamMembers(builds,builds.map(b=>b.id));
 const output=optimizeTeam(lineup.map(b=>createTeamContext(b,target)),target);
 assert.equal(output.members.length,8);
 assert.equal(output.turns.length,1);
 assert.equal(output.turns[0].actors.length,8);
 assert.ok(output.turns[0].actors.every(a=>a.spent<=12));
 assert.ok(output.members.every((m,i)=>!i||output.members[i-1].initiative>=m.initiative));
 assert.ok(Number.isFinite(output.theoretical)&&output.theoretical>=0);
});

test("team PA overrides stay per-character and leave original builds unchanged",()=>{
 const original=base.ap;
 const build={...base,ap:12};
 const ctx=createTeamContext(build,{turns:2},{ap:16});
 assert.equal(ctx.settings.ap,16);
 assert.equal(ctx.build.ap,16);
 assert.equal(build.ap,12);
 assert.equal(base.ap,original);
 const other=createTeamContext(sacri,{turns:2},{ap:11});
 assert.equal(other.settings.ap,11);
 assert.equal(cleanTeamMemberOptions(build,{ap:21}).ap,12);
 assert.equal(cleanTeamMemberOptions(build,{ap:5}).ap,12);
 assert.equal(cleanTeamMemberOptions(build,{ap:8.5}).ap,12);
});
test("Sacrier buff variant is team-only, and Pacte and Mutilation remain exclusive",()=>{
 const original=sacri.variants.slice();
 const ctx=createTeamContext(sacri,{turns:2},{ap:14,support:"Pacte de Sang"});
 const pactIndex=ctx.settings.variantPairs.findIndex(p=>p.includes("Pacte de Sang"));
 assert.equal(ctx.settings.variants[pactIndex],"Pacte de Sang");
 assert.equal(ctx.settings.ap,14);
 assert.equal(ctx.build.support,"Pacte de Sang");
 assert.ok(ctx.spells.some(s=>s.name==="Pacte de Sang"));
 assert.deepEqual(sacri.variants,original);
 const fallback=createTeamContext(sacri,{turns:2},{support:"Inconnu"});
 assert.equal(fallback.settings.variants[pactIndex],original[pactIndex]);
});
test("forcing Pacte de Sang at the opening actually launches it and obeys PA",()=>{
 const target={hp:20000,turns:2};
 const context=createTeamContext(sacri,target,{ap:14,support:"Pacte de Sang",forceOpeningBuff:true});
 const output=optimizeTeam([context],target);
 assert.equal(output.turns[0].actors[0].actions[0].name,"Pacte de Sang");
 assert.equal(output.turns[0].actors[0].actions[0].pa,2);
 assert.equal(output.members[0].forcedOpeningSpell,"Pacte de Sang");
 assert.ok(output.turns.every(t=>t.actors[0].spent<=14));
 assert.equal(output.turns.length,2);
});
test("forcing Mutilation is also possible while other actors keep distinct PA",()=>{
 const target={hp:25000,turns:1};
 const sacriCtx=createTeamContext(sacri,target,{ap:16,forceOpeningBuff:true});
 const sramCtx=createTeamContext(base,target,{ap:10});
 const output=optimizeTeam([sacriCtx,sramCtx],target);
 assert.equal(output.turns[0].actors[0].actions[0].name,"Mutilation");
 assert.ok(output.turns[0].actors[0].spent<=16);
 assert.ok(output.turns[0].actors[1].spent<=10);
 assert.equal(output.members[1].forcedOpeningSpell,null);
});
