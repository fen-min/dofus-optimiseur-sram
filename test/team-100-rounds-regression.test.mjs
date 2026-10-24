import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {createTeamContext,optimizeTeamTurn,cleanTeamTarget} from "../src/team-core.js";
import {initialState,eligible,castSpell} from "../src/engine.js";

const target=cleanTeamTarget({
 hp:1_000_000_000_000,turns:100,criticals:true,
 resistances:{Air:0,Terre:0,Feu:0,Eau:0,Neutre:0}
});
const lineup=INITIAL_BUILDS.map(build=>createTeamContext(build,target));
const named=Object.fromEntries(INITIAL_BUILDS.map(b=>[b.classId,b.id]));
const histories={ecaflip:[],sram:[],sacrieur:[]};
const requiredBuffs={sram:["Manigance"],sacrieur:["Mutilation","Furie"]};
test("100 sequential team rounds: Eca recurring four-club combos and Sram/Sacrier buff health",()=>{
 assert.equal(target.turns,100);
 assert.ok(lineup.every(c=>c.settings.turns===100));
 let previous=null;
 for(let i=1;i<=100;i++){
  previous=optimizeTeamTurn(lineup,target,()=>{},previous);
  assert.equal(previous.turns.length,i,"exactly ONE team round per call");
  assert.equal(previous.session.actors.length,3);
  for(const [classId,id] of Object.entries(named)){
   const a=previous.turns.at(-1).actors.find(x=>x.id===id);
   const session=previous.session.actors.find(x=>x.id===id);
   assert.ok(a&&session);
   assert.equal(session.state.turn,i+1,"turn continuity "+classId+" T"+i);
   assert.ok(a.spent>=0&&a.spent<=a.availablePA+1e-8,
    "net PA not legal "+classId+" T"+i);
   assert.ok(Number.isFinite(a.damage)&&a.damage>=0,
    "invalid damage "+classId+" T"+i);
   histories[classId].push({
    turn:i,names:a.actions.map(x=>x.name),damage:a.damage,
    buffs:session.state.buffs.map(b=>({key:b.key,until:b.until,stat:b.stat})),
    ready:session.state.ready,hand:session.state.ecaHand,table:session.state.ecaTable,
    suffering:session.state.sacrierHealth?.suffering??null,
    stage:session.state.mutilationStage
   });
  }
 }
 for(const [classId,entries] of Object.entries(histories)){
  const usage={};
  for(const t of entries)for(const name of t.names)usage[name]=(usage[name]||0)+1;
  console.log("100-ROUND-"+classId.toUpperCase()+"-SPELL-COUNTS",JSON.stringify(usage));
  console.log("100-ROUND-"+classId.toUpperCase()+"-SAMPLES",
   JSON.stringify(entries.filter(x=>x.turn<=9||x.turn%10===0||x.turn>=96).map(x=>({
    turn:x.turn,names:x.names,active:x.buffs.map(b=>b.key),
    hand:x.hand.map(c=>c.suit+":"+c.rank),suffering:x.suffering,stage:x.stage}))));
 }
 const eca=histories.ecaflip;
 const combo=eca.filter(x=>{
  const a=x.names;
  return a.includes("Baraka")&&a.includes("Tout ou Rien")&&a.includes("Rekop")&&
   a.indexOf("Baraka")<a.indexOf("Tout ou Rien")&&a.indexOf("Tout ou Rien")<a.indexOf("Rekop");
 });
 assert.ok(combo.length>=30,"recurring Eca combo disappeared after round 3");
 const sram=histories.sram;
 assert.ok(sram.some(x=>x.names.includes("Manigance")),"Sram never used Manigance");
 const sacri=histories.sacrieur;
 assert.ok(sacri.some(x=>x.names.includes("Mutilation")||x.names.includes("Furie")),
  "Sacrier never used offensive buffs");
 assert.ok(previous.theoretical>0);
});
