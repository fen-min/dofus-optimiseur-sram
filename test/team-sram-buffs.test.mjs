import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {createTeamContext,optimizeTeamTurn} from "../src/team-core.js";
import {eligible,initialState,castSpell} from "../src/engine.js";

const sram=INITIAL_BUILDS.find(b=>b.classId==="sram");
const cfg={hp:1_000_000_000_000,turns:50,criticals:false,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}};
function setup(){
 const ctx=createTeamContext(sram,cfg);
 const manigance=ctx.spells.find(s=>s.name==="Manigance");
 const arnaque=ctx.spells.find(s=>s.name==="Arnaque");
 assert.ok(manigance);assert.ok(arnaque);
 assert.equal(ctx.settings.variants[manigance.variantGroup],"Manigance");
 assert.equal(ctx.settings.variants[arnaque.variantGroup],"Arnaque");
 return {ctx,manigance,arnaque};
}
function steps(ctx,n=5){
 let prior=null;
 const rows=[];
 for(let i=0;i<n;i++){
  prior=optimizeTeamTurn([ctx],cfg,()=>{},prior);
  const actor=prior.turns.at(-1).actors[0];
  rows.push({turn:i+1,damage:actor.damage,
   actions:actor.actions.map(a=>a.name),
   activeBuffs:prior.session.actors[0].state.buffs.map(b=>b.key)});
 }
 return rows;
}
test("audit Sram real equipped spells and their buff effects",()=>{
 const {ctx,manigance,arnaque}=setup();
 const state=initialState(ctx.settings);
 assert.ok(eligible(manigance,state,ctx.settings));
 const cast=castSpell(state,manigance,ctx.settings);
 assert.ok(cast.buffs.some(b=>b.key==="Manigance"));
 const stolen=castSpell(state,arnaque,ctx.settings);
 assert.ok(stolen.buffs.some(b=>b.key==="Arnaque"));
 const history=steps(ctx,5);
 console.log("SRAM REAL ROTATIONS",JSON.stringify(history));
 assert.equal(history.length,5);
});
test("diagnostic: a lasting high-value Sram self buff is considered vs pure immediate damage",()=>{
 const {ctx,manigance,arnaque}=setup();
 const boost={...manigance,status:{...manigance.status,
  buff:{...manigance.status.buff,value:100,duration:3}}};
 const modified={...ctx,spells:[arnaque,boost]};
 const history=steps(modified,4);
 console.log("SRAM BUFF OPPORTUNITY",JSON.stringify(history));
 assert.equal(history.length,4);
});

test("regression: un buff durable rentable sur les tours suivants doit être choisi sans simuler plusieurs tours",()=>{
 const {ctx,manigance,arnaque}=setup();
 const attack={...arnaque,maxPerTurn:4,perTarget:4,status:{}};
 const buff={...manigance,status:{...manigance.status,buff:{
  ...manigance.status.buff,value:160,duration:3
 }}};
 const modified={...ctx,spells:[attack,buff]};
 const history=steps(modified,3);
 console.log("SRAM LONG BUFF PROFIT",JSON.stringify(history));
 assert.ok(history[0].actions.includes("Manigance"),
  "Le bonus +160 pour trois tours devrait compenser un sort perdu au premier tour");
});

test("real Sram team build uses Manigance then waits until the buff expires",()=>{
 const {ctx}=setup();
 const history=steps(ctx,5);
 assert.ok(history[0].actions.includes("Manigance"),"Le buff réel doit être considéré dès le premier tour");
 assert.ok(history[0].actions.includes("Arnaque"),"Le vol d'Agilité est également un buff");
 assert.ok(!history[1].actions.includes("Manigance"),"Manigance est encore active au tour 2");
 assert.ok(!history[2].actions.includes("Manigance"),"Manigance est encore active au tour 3");
 assert.ok(history[3].actions.includes("Manigance"),"Relance possible après expiration au tour 4");
});
test("in a Sacrieur+Sram team, the Sram still considers its own buffs",()=>{
 const {ctx}=setup();
 const sacri=INITIAL_BUILDS.find(b=>b.classId==="sacrieur");
 const ally=createTeamContext(sacri,cfg);
 let previous=null;
 for(let turn=1;turn<=4;turn++)previous=optimizeTeamTurn([ctx,ally],cfg,()=>{},previous);
 const sramCasts=previous.turns.map(t=>t.actors.find(a=>a.id===ctx.build.id).actions.map(a=>a.name));
 console.log("SRAM TEAM BUFFS",JSON.stringify(sramCasts));
 assert.ok(sramCasts[0].includes("Manigance"));
 assert.ok(!sramCasts[1].includes("Manigance"));
 assert.ok(!sramCasts[2].includes("Manigance"));
 assert.ok(sramCasts[3].includes("Manigance"));
});
test("unavailable buff variants and weak buffs are not blindly forced",()=>{
 const {ctx,manigance,arnaque}=setup();
 const weak={...manigance,status:{...manigance.status,buff:{...manigance.status.buff,value:1}}};
 const attack={...arnaque,maxPerTurn:4,perTarget:4,status:{}};
 const modified={...ctx,spells:[attack,weak]};
 const history=steps(modified,1);
 assert.ok(!history[0].actions.includes("Manigance"));
 const altVariants=ctx.settings.variants.slice();
 altVariants[manigance.variantGroup]=ctx.settings.variantPairs[manigance.variantGroup]
  .find(name=>name!=="Manigance");
 const alternative={...ctx,settings:{...ctx.settings,variants:altVariants}};
 const out=steps(alternative,1);
 assert.ok(!out[0].actions.includes("Manigance"));
});
