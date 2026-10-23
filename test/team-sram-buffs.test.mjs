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
