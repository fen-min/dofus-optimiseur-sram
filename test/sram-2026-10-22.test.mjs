import test from "node:test";
import assert from "node:assert/strict";
import {SRAM_CATALOG} from "../src/sram-catalog.js";
import {SIM_SPELLS,VARIANT_PAIRS,DEFAULT_VARIANTS,SRAM_SCREENSHOT_VARIANTS} from "../src/sim-spells.js";
import {SPELL_EFFECTS_AUDIT} from "../src/spell-effects-audit.js";
import {SRAM_AIR_REFERENCE_STATS} from "../src/character-stats.js";
import {normalizeBuild} from "../src/classes.js";
import {initialState,cleanSettings,castSpell,optimize} from "../src/engine.js";

test("Matryoshka's 22 selected variants respect one per slot",()=>{
 assert.equal(SRAM_CATALOG.length,44);
 assert.equal(VARIANT_PAIRS.length,22);
 assert.equal(SRAM_SCREENSHOT_VARIANTS.length,22);
 for(let i=0;i<22;i++){
  assert.ok(VARIANT_PAIRS[i].includes(SRAM_SCREENSHOT_VARIANTS[i]),SRAM_SCREENSHOT_VARIANTS[i]);
 }
});
test("Only unmodified reference Sram preset migrates from old DofusBook variant list",()=>{
 const initial=normalizeBuild({id:"sram-air-pvm",classId:"sram",variants:DEFAULT_VARIANTS,ap:16});
 assert.deepEqual(initial.variants,SRAM_SCREENSHOT_VARIANTS);
 assert.equal(initial.ap,16);
 const custom=DEFAULT_VARIANTS.slice();custom[0]="Chausse-trappe";
 const edited=normalizeBuild({id:"sram-air-pvm",classId:"sram",variants:custom});
 assert.deepEqual(edited.variants,custom);
 const other=normalizeBuild({id:"custom",classId:"sram",variants:DEFAULT_VARIANTS});
 assert.deepEqual(other.variants,DEFAULT_VARIANTS);
});
test("Sram screenshot core values are stored without recalculating DofusBook baseline",()=>{
 const st=SRAM_AIR_REFERENCE_STATS;
 assert.equal(st.hitPoints,4065);assert.equal(st.agility,1645);
 assert.equal(st.critical,17);assert.equal(st.power,160);
 assert.equal(st.flatDamage.Air,153);assert.equal(st.criticalDamage,33);
 assert.equal(st.resistPercent.Air,27);
 assert.equal(st.actionPoints,12);
});
test("Every Sram spell has explicit OpenDofusDB source and simulation limitations",()=>{
 assert.equal(Object.keys(SPELL_EFFECTS_AUDIT.sram).length,44);
 for(const entry of SRAM_CATALOG){
  const audit=SPELL_EFFECTS_AUDIT.sram[entry.name];
  assert.ok(audit,entry.name);
  assert.match(audit.source,/^https:\/\/openddb\.dev\/(classes\/4-sram|spells\/)/);
  assert.equal(audit.verificationDate,"2026-10-22");
  assert.ok(audit.description.length>30);
  assert.ok(audit.simulation.length>10);
 }
 assert.match(SPELL_EFFECTS_AUDIT.sram["Guet-apens"].description,/0 %/);
 assert.match(SPELL_EFFECTS_AUDIT.sram["Piège Effroyable"].description,/Terre/);
 assert.match(SPELL_EFFECTS_AUDIT.sram["Fosse Commune"].description,/Pesanteur/);
 assert.match(SPELL_EFFECTS_AUDIT.sram["Méprise"].description,/Double/);
});
test("Rank 200 characteristic steal grants +100, not the rank 1 +40",()=>{
 for(const [name,stat] of [["Arnaque","Air"],["Extorsion","Terre"],["Pillage","Eau"],["Fourberie","Feu"]]){
  const spell=SIM_SPELLS.find(x=>x.name===name);
  const variants=DEFAULT_VARIANTS.slice();variants[spell.variantGroup]=name;
  const config=cleanSettings({ap:12,turns:3,distance:2,variants,criticals:false});
  const state=castSpell(initialState(config),spell,config);
  assert.ok(state.buffs.some(b=>b.stat===stat&&b.amount===100),name);
 }
});
test("10-turn screenshot Sram simulation respects 12 AP and chosen exclusive variants",()=>{
 const config=cleanSettings({ap:12,turns:10,beamWidth:8,distance:3,variants:SRAM_SCREENSHOT_VARIANTS});
 const res=optimize(config,SIM_SPELLS);
 assert.equal(res.turns.length,10);
 assert.equal(res.considered,22);
 assert.ok(res.turns.every(t=>t.spent<=12));
 assert.ok(Number.isFinite(res.total));
});
