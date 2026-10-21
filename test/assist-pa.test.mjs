import test from "node:test";
import assert from "node:assert/strict";
import {SACRIER_SPELLS,SACRIER_DEFAULT_VARIANTS} from "../src/sacrier-spells.js";
import {SACRIER_VARIANTS} from "../src/sacrier-catalog.js";
import {cleanSettings,optimizeFromState,turnActionPoints} from "../src/engine.js";
import {
 emptyAssistHistory,setAssistTurnPA,addAssistSpell,nextAssistTurn,
 replayAssist,legalAssistSpells,writeAssistHistory,readAssistHistory,
 undoAssistSpell,resetAssistHistory
} from "../src/assist-core.js";

function context(){
 return {
  build:{id:"sacri-pa",classId:"sacrieur",character:"Sacrieur",name:"Air"},
  settings:cleanSettings({classId:"sacrieur",ap:12,turns:10,distance:2,beamWidth:8,
   variants:SACRIER_DEFAULT_VARIANTS,variantPairs:SACRIER_VARIANTS,
   defaultVariants:SACRIER_DEFAULT_VARIANTS}),
  spells:SACRIER_SPELLS
 };
}
function storage(){
 const obj={};return {getItem:key=>obj[key]??null,setItem:(key,value)=>{obj[key]=value;}};
}
test("Extra PA on turn one increases remaining PA without discarding already played spells",()=>{
 const ctx=context();
 let h=addAssistSpell(ctx,emptyAssistHistory(ctx),"Furie");
 h=addAssistSpell(ctx,h,"Furie");
 assert.equal(replayAssist(ctx,h).state.pa,6);
 h=setAssistTurnPA(ctx,h,14);
 assert.equal(replayAssist(ctx,h).state.pa,8);
 assert.deepEqual(h.current,["Furie","Furie"]);
 assert.equal(turnActionPoints(replayAssist(ctx,h).config,1),14);
 assert.ok(!legalAssistSpells(ctx,h).some(x=>x.name==="Furie"));
});
test("When moving to next turn, PA revert to build default unless overridden separately",()=>{
 const ctx=context();let h=emptyAssistHistory(ctx);
 h=setAssistTurnPA(ctx,h,16);
 h=addAssistSpell(ctx,h,"Furie");
 h=nextAssistTurn(ctx,h);
 const t2=replayAssist(ctx,h);
 assert.equal(t2.state.turn,2);
 assert.equal(t2.state.pa,12);
 assert.equal(t2.state.turns[0].spent,3);
 assert.equal(t2.config.apByTurn[1],16);
 h=setAssistTurnPA(ctx,h,18);
 assert.equal(replayAssist(ctx,h).state.pa,18);
 h=nextAssistTurn(ctx,h);
 assert.equal(replayAssist(ctx,h).state.pa,12);
 assert.equal(replayAssist(ctx,h).state.turn,3);
});
test("No impossible PA adjustment below already spent AP, no changes on invalid inputs",()=>{
 const ctx=context();let h=emptyAssistHistory(ctx);
 h=addAssistSpell(ctx,h,"Furie");
 h=addAssistSpell(ctx,h,"Furie");
 assert.throws(()=>setAssistTurnPA(ctx,h,5),/déjà dépensé 6 PA/);
 assert.throws(()=>setAssistTurnPA(ctx,h,"1.5"),/entier/);
 assert.throws(()=>setAssistTurnPA(ctx,h,31),/entre 1 et 30/);
 assert.equal(replayAssist(ctx,h).state.pa,6);
 h=setAssistTurnPA(ctx,h,6);
 assert.equal(replayAssist(ctx,h).state.pa,0);
 assert.equal(legalAssistSpells(ctx,h).length,0);
});
test("PA overrides persist in a saved combat history; undo and reset work",()=>{
 const ctx=context(),ls=storage();
 let h=setAssistTurnPA(ctx,emptyAssistHistory(ctx),15);
 h=addAssistSpell(ctx,h,"Furie");
 writeAssistHistory(ls,"sacri-pa",h);
 h=readAssistHistory(ls,"sacri-pa",ctx);
 assert.equal(replayAssist(ctx,h).state.pa,12);
 h=undoAssistSpell(ctx,h);
 assert.equal(replayAssist(ctx,h).state.pa,15);
 h=setAssistTurnPA(ctx,h,12);
 assert.deepEqual(h.turnPA,{});
 h=resetAssistHistory(ls,"sacri-pa",ctx);
 assert.deepEqual(h.turnPA,{});
});
test("Optimizing a manual turn uses changed AP, not base AP, with later turns at default",()=>{
 const ctx=context();let h=emptyAssistHistory(ctx);
 h=setAssistTurnPA(ctx,h,16);
 h=addAssistSpell(ctx,h,"Furie");
 const {state,config}=replayAssist(ctx,h);
 const output=optimizeFromState({...config,beamWidth:8,turns:3},ctx.spells,state);
 assert.deepEqual(output.turns[0].actions[0].name,"Furie");
 assert.ok(output.turns[0].spent<=16);
 assert.ok(output.turns.slice(1).every(t=>t.spent<=12));
 assert.equal(output.turns.length,3);
});
