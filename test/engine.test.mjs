import test from "node:test";
import assert from "node:assert/strict";
import {SIM_SPELLS,VARIANT_PAIRS,DEFAULT_VARIANTS} from "../src/sim-spells.js";
import {optimize,cleanSettings,initialState,eligible,castSpell,endTurn} from "../src/engine.js";

const spell=name=>SIM_SPELLS.find(s=>s.name===name);
const set=(name,options={})=>{const variants=DEFAULT_VARIANTS.slice();const s=spell(name);variants[s.variantGroup]=name;return cleanSettings({ap:12,turns:5,distance:3,variants,...options});};

test("all 44 spells are listed as 22 mutually exclusive pairs",()=>{
 assert.equal(SIM_SPELLS.length,44);assert.equal(VARIANT_PAIRS.length,22);
 for(const pair of VARIANT_PAIRS)assert.equal(pair.length,2);
 const names=new Set(SIM_SPELLS.map(x=>x.name));assert.equal(names.size,44);
});
test("each Sram spell can enter the model under its selected variant",()=>{
 for(const s of SIM_SPELLS){
  const c=set(s.name,{distance:Math.max(1,Math.min(3,s.range)),triggerTraps:true,comploteurContact:true});
  const start=initialState(c);assert.equal(eligible(s,start,c),true,s.name);
  const cast=castSpell(start,s,c);assert.ok(cast.pa>=0,s.name);
  const tick=endTurn(cast,c);assert.ok(Number.isFinite(tick.total),s.name);
 }
});
test("exclusive variants cannot be cast together",()=>{
 const c=set("Toxines");
 assert.equal(eligible(spell("Toxines"),initialState(c),c),true);
 assert.equal(eligible(spell("Arsenic"),initialState(c),c),false);
});
test("Manigance costs 2 PA and increases subsequent damage",()=>{
 const c=set("Manigance",{criticals:false});
 const state=initialState(c);
 const baseline=castSpell(state,spell("Arnaque"),c).total;
 const buffed=castSpell(castSpell(state,spell("Manigance"),c),spell("Arnaque"),c);
 assert.equal(buffed.pa,7);
 assert.ok(buffed.total>baseline);
});
test("a poison deals no immediate damage and does tick",()=>{
 const c=set("Injection Toxique");
 const cast=castSpell(initialState(c),spell("Injection Toxique"),c);
 assert.equal(cast.total,0);
 assert.ok(endTurn(cast,c).total>0);
});
test("Comploteur only explodes after the delay and with contact assumed",()=>{
 const c=set("Comploteur",{comploteurContact:true});
 let state=castSpell(initialState(c),spell("Comploteur"),c);
 assert.equal(state.total,0);
 state=endTurn(state,c);assert.equal(state.total,0);
 state=endTurn(state,c);assert.equal(state.total,0);
 state=endTurn(state,c);assert.ok(state.total>0);
 const noContact=set("Comploteur",{comploteurContact:false});
 let other=castSpell(initialState(noContact),spell("Comploteur"),noContact);
 for(let i=0;i<3;i++)other=endTurn(other,noContact);
 assert.equal(other.total,0);
});
test("Invisibilité is preserved by poison and broken by direct attacks",()=>{
 const c=set("Invisibilité");
 const state=castSpell(initialState(c),spell("Invisibilité"),c);
 assert.equal(state.visible,false);
 const poisonCfg=set("Arsenic");
 const pb=initialState(poisonCfg);pb.visible=false;
 assert.equal(castSpell(pb,spell("Arsenic"),poisonCfg).visible,false);
 assert.equal(castSpell(state,spell("Arnaque"),c).visible,true);
});
test("5-turn search respects 12 PA and returns finite damage",()=>{
 const c=cleanSettings({ap:12,turns:5,beamWidth:8});
 const result=optimize(c);
 assert.equal(result.turns.length,5);
 assert.equal(result.considered,22);
 assert.ok(Number.isFinite(result.total));
 for(const t of result.turns)assert.ok(t.spent<=12,"Tour "+t.number);
});
