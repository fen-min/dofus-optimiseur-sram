import test from "node:test";
import assert from "node:assert/strict";
import {saveMultiContext,getMultiContext,MULTI_CONTEXT_KEY} from "../src/multi-build-link.js";
import {ASSIST_CONTEXT_STORE,ASSIST_HISTORY_STORE} from "../src/assist-core.js";
import {SIM_SPELLS,SRAM_SCREENSHOT_VARIANTS,VARIANT_PAIRS} from "../src/sim-spells.js";
import {cleanSettings,initialState,castSpell,endTurn} from "../src/engine.js";
import {makeState,applyAction,finishTurn} from "../src/multi-core.js";
const storage=()=>{
 const data=new Map();
 return {getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v)}};
};
const settings=cleanSettings({
 classId:"sram",ap:12,turns:5,beamWidth:8,
 variants:SRAM_SCREENSHOT_VARIANTS,variantPairs:VARIANT_PAIRS,
 resistance:20,resistanceTerre:35,criticals:true,
 inLine:true,lineOfSight:true
});
const build={id:"sram-main",classId:"sram",character:"Matryoshka",name:"Air",level:200,
 stats:{agility:1645,power:160,critical:17,flatDamage:{Air:153}}};
test("Multi mode receives exact calibrated spell rows and full OMBRE settings",()=>{
 const st=storage();
 const spells=structuredClone(SIM_SPELLS);
 const row=spells.find(s=>s.name==="Fourvoiement");
 row.min=777;row.max=1001;
 const newData=saveMultiContext(st,build,settings,spells);
 assert.equal(newData,true);
 const restored=getMultiContext(st,build.id);
 assert.equal(restored.settings.resistance,20);
 assert.equal(restored.settings.resistanceTerre,35);
 assert.equal(restored.settings.criticals,true);
 assert.equal(restored.settings.variants.length,22);
 assert.equal(restored.spells.find(s=>s.name==="Fourvoiement").min,777);
 assert.equal(restored.spells.find(s=>s.name==="Fourvoiement").max,1001);
 assert.equal(restored.stats.agility,1645);
 assert.equal(restored.damageOrigin.includes("OMBRE"),true);
 assert.equal(saveMultiContext(st,build,settings,spells),false,"Identical snapshot is not rewritten");
 assert.equal(st.getItem(ASSIST_HISTORY_STORE),null);
 assert.equal(st.getItem(ASSIST_CONTEXT_STORE),null);
 assert.ok(st.getItem(MULTI_CONTEXT_KEY));
});
test("Changing calibration updates the multi snapshot without modifying mono history",()=>{
 const st=storage();
 st.setItem(ASSIST_HISTORY_STORE,'{"sram-main":{"current":["Arnaque"]}}');
 const spells=structuredClone(SIM_SPELLS);
 saveMultiContext(st,build,settings,spells);
 const prior=getMultiContext(st,build.id).signature;
 spells.find(s=>s.name==="Arnaque").critMax+=90;
 assert.equal(saveMultiContext(st,build,settings,spells),true);
 assert.notEqual(getMultiContext(st,build.id).signature,prior);
 assert.equal(st.getItem(ASSIST_HISTORY_STORE),'{"sram-main":{"current":["Arnaque"]}}');
});
test("Direct single-target hit in multi uses same calibrated OMBRE cast result",()=>{
 const spell=structuredClone(SIM_SPELLS).find(s=>s.name==="Arnaque");
 const ctx={settings,spells:SIM_SPELLS};
 const board={hero:{x:4,y:4},monsters:[{id:"m1",x:5,y:4,hp:10000}],shapes:{}};
 const original=makeState(ctx,board);
 const hit=applyAction(original,spell,{x:5,y:4},ctx);
 const native=castSpell(initialState({...settings,distance:1}),spell,{...settings,distance:1});
 assert.ok(Math.abs(hit.monsters[0].damage-native.total)<0.2);
 assert.equal(hit.engine.pa,native.pa);
});
test("Delayed Sram poison tick matches native OMBRE poison damage for a single target",()=>{
 const spell=SIM_SPELLS.find(s=>s.name==="Épidémie");
 const ctx={settings,spells:SIM_SPELLS};
 const board={hero:{x:4,y:4},monsters:[{id:"m1",x:5,y:4,hp:10000}],shapes:{}};
 const state=makeState(ctx,board);
 const multi=applyAction(state,spell,{x:5,y:4},ctx);
 const native=castSpell(initialState({...settings,distance:1}),spell,{...settings,distance:1});
 const nativeTick=native.dots[spell.id]?.base;
 assert.ok(Number.isFinite(nativeTick));
 assert.ok(Math.abs(multi.monsters[0].dots[0].amount-nativeTick)<0.2);
 const ended=finishTurn(multi);
 const nativeEnded=endTurn(native,settings);
 assert.ok(Math.abs(ended.monsters[0].damage-nativeEnded.delayed)<0.2);
});
