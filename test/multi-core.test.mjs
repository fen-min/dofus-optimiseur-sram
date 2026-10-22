import test from "node:test";
import assert from "node:assert/strict";
import {SIM_SPELLS,SRAM_SCREENSHOT_VARIANTS,VARIANT_PAIRS,DEFAULT_VARIANTS} from "../src/sim-spells.js";
import {SACRIER_SPELLS,SACRIER_DEFAULT_VARIANTS} from "../src/sacrier-spells.js";
import {SACRIER_VARIANTS} from "../src/sacrier-catalog.js";
import {cleanSettings} from "../src/engine.js";
import {
 SIZE,MAX_MONSTERS,makeBoard,validateBoard,shapeHits,defaultShape,
 makeState,legalActions,manualActions,possibleTargets,applyAction,finishTurn,replay,newHistory,
 addManual,nextTurn,undo,optimizeMulti
} from "../src/multi-core.js";

const conf=(which="sram",turns=3)=>{
 const sac=which==="sacrieur";
 return {settings:cleanSettings({
  ap:12,turns,classId:which,criticals:false,beamWidth:5,triggerTraps:false,
  variants:sac?SACRIER_DEFAULT_VARIANTS:SRAM_SCREENSHOT_VARIANTS,
  variantPairs:sac?SACRIER_VARIANTS:VARIANT_PAIRS,
  defaultVariants:sac?SACRIER_DEFAULT_VARIANTS:DEFAULT_VARIANTS,
  inLine:true,lineOfSight:true
 }),spells:sac?SACRIER_SPELLS:SIM_SPELLS};
};
const spell=(c,name)=>c.spells.find(s=>s.name===name);
test("9x9 grid validates collisions, fixed hero, and max eight enemies",()=>{
 const b=makeBoard();
 assert.equal(SIZE,9);
 assert.equal(b.monsters.length,3);
 assert.ok(b.monsters.every(m=>m.x>=0&&m.x<9&&m.y>=0&&m.y<9));
 const x=validateBoard({hero:{x:4,y:4},monsters:[
  {x:4,y:4},{x:2,y:2},{x:2,y:2},
  ...Array.from({length:12},(_,i)=>({x:i%9,y:Math.floor(i/9)+5}))
 ]});
 assert.ok(x.monsters.length<=MAX_MONSTERS);
 assert.equal(x.monsters.some(m=>m.x===x.hero.x&&m.y===x.hero.y),false);
});
test("An estimated area can touch 3 red points, while single target touches one",()=>{
 const b=makeBoard(),c={x:5,y:4};
 assert.equal(b.monsters.filter(m=>shapeHits(c,m,"single",b.hero)).length,1);
 assert.equal(b.monsters.filter(m=>shapeHits(c,m,"cross1",b.hero)).length,3);
 assert.equal(defaultShape({name:"Fourvoiement"}),"crossNoCenter");
 assert.equal(defaultShape({name:"Arnaque"}),"single");
});
test("Fourvoiement aims at empty center and hits FOUR neighboring cells, not center",()=>{
 const c=conf(),center={x:3,y:3};
 const b={hero:{...center},monsters:[
  {id:"m1",x:2,y:3,hp:10000},{id:"m2",x:4,y:3,hp:10000},
  {id:"m3",x:3,y:2,hp:10000},{id:"m4",x:3,y:4,hp:10000}
 ],shapes:{}};
 const hit=spell(c,"Fourvoiement"),state=makeState(c,b);
 assert.equal(b.monsters.filter(m=>shapeHits(center,m,"crossNoCenter",b.hero)).length,4);
 assert.ok(possibleTargets(state,hit).some(p=>p.x===3&&p.y===3));
 const out=applyAction(state,hit,center,c);
 assert.equal(out.actions[0].targets.length,4);
 assert.equal(out.monsters.filter(m=>m.damage>0).length,4);
 assert.ok(out.total>3000);
 assert.equal(state.total,0);
 const alternate=structuredClone(b);
 alternate.shapes.Fourvoiement="single";
 const single=applyAction(makeState(c,alternate),hit,{x:2,y:3},c);
 assert.equal(single.actions[0].targets.length,1);
 assert.ok(out.total>single.total*3.5);
});
test("Épidémie starts on one target, with delayed neighbor transfer rather than immediate damage",()=>{
 const c=conf(),b=makeBoard(),s=spell(c,"Épidémie");
 const after=applyAction(makeState(c,b),s,{x:5,y:4},c);
 assert.equal(after.monsters.filter(m=>m.dots.length>0).length,1);
 assert.equal(after.total,0);
 const end=finishTurn(after);
 assert.ok(end.monsters[0].damage>0);
 assert.equal(end.monsters[1].damage,0);
 assert.equal(end.monsters[2].damage,0);
 assert.ok(end.monsters[1].dots.length>0);
});
test("Player actions and cooldowns survive the next turn; undo is reversible",()=>{
 const c=conf(),b=makeBoard();
 let h=newHistory();
 h=addManual(c,b,h,"Manigance",null);
 h=addManual(c,b,h,"Fourvoiement",{x:5,y:4});
 assert.deepEqual(h.current.map(a=>a.name),["Manigance","Fourvoiement"]);
 let st=replay(c,b,h);
 assert.equal(st.engine.pa,6);
 h=nextTurn(h);
 st=replay(c,b,h);
 assert.equal(st.engine.turn,2);
 assert.equal(st.engine.pa,12);
 assert.ok(st.engine.buffs.some(v=>v.stat==="Dommages"));
 h=undo(h);
 assert.equal(h.finished.length,0);
 assert.deepEqual(h.current.map(a=>a.name),["Manigance"]);
});
test("Automated multi-target assistant optimizes both Sram and Sacrier independently",()=>{
 for(const name of ["sram","sacrieur"]){
  const c=conf(name,3),b=makeBoard(),seed=makeState(c,b);
  const result=optimizeMulti(c,b,seed,{beamWidth:5});
  assert.equal(result.current.turn,1,name);
  assert.equal(result.future.length,2,name);
  assert.ok(result.current.actions.every(a=>a.pa>0),name);
  assert.ok(result.total>0,name);
  assert.equal(result.targetDamage.length,3,name);
  assert.ok(result.explored>0,name);
 }
});
test("Ten turns can be optimized with a narrow experimental beam",()=>{
 const c=conf("sram",10),b=makeBoard();
 const output=optimizeMulti(c,b,makeState(c,b),{beamWidth:4});
 assert.equal(output.future.length,9);
 assert.ok(output.future.every(t=>t.spent<=12));
 assert.ok(Number.isFinite(output.total));
});

test("Manual trap casts are possible on free cells without inventing immediate hits",()=>{
 const c=conf(),b=makeBoard();
 const trap=spell(c,"Piège Répulsif");
 const variants=c.settings.variants.slice();
 variants[trap.variantGroup]=trap.name;
 c.settings.variants=variants;
 const available=manualActions(makeState(c,b),c).filter(a=>a.spell.name===trap.name);
 assert.ok(available.length>0);
 const center=available[0].center;
 const out=applyAction(makeState(c,b),trap,center,c);
 assert.equal(out.total,0);
 assert.equal(out.placedTraps.length,1);
 assert.equal(out.placedTraps[0].name,trap.name);
 assert.equal(out.engine.pa,10);
 assert.ok(!legalActions(makeState(c,b),c).some(a=>a.spell.name===trap.name));
});
