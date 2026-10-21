import test from "node:test";
import assert from "node:assert/strict";
import {SACRIER_SPELLS,SACRIER_DEFAULT_VARIANTS} from "../src/sacrier-spells.js";
import {SACRIER_VARIANTS} from "../src/sacrier-catalog.js";
import {SIM_SPELLS,DEFAULT_VARIANTS,VARIANT_PAIRS} from "../src/sim-spells.js";
import {optimizeFromState,cleanSettings} from "../src/engine.js";
import {
 saveAssistContext,getAssistContext,readAssistHistory,writeAssistHistory,
 addAssistSpell,undoAssistSpell,nextAssistTurn,replayAssist,
 legalAssistSpells,contextFingerprint,resetAssistHistory
} from "../src/assist-core.js";

const storage=()=>{
 const data=new Map();
 return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
};
const config=(classId="sacrieur",changes={})=>{
 const isSac=classId==="sacrieur";
 return {
  build:{id:classId,classId,character:classId,name:"Air"},
  settings:cleanSettings({classId,ap:12,turns:4,distance:isSac?2:3,
   beamWidth:8,variants:isSac?SACRIER_DEFAULT_VARIANTS:DEFAULT_VARIANTS,
   variantPairs:isSac?SACRIER_VARIANTS:VARIANT_PAIRS,
   defaultVariants:isSac?SACRIER_DEFAULT_VARIANTS:DEFAULT_VARIANTS,...changes}),
  spells:isSac?SACRIER_SPELLS:SIM_SPELLS
 };
};
test("Manual Furie x2 consumes 6 PA and obeys two casts per turn",()=>{
 const ctx=config(),storageLocal=storage();
 saveAssistContext(storageLocal,ctx.build,ctx.settings,ctx.spells);
 let history=readAssistHistory(storageLocal,ctx.build.id,getAssistContext(storageLocal,ctx.build.id));
 assert.ok(legalAssistSpells(ctx,history).some(x=>x.name==="Furie"));
 history=addAssistSpell(ctx,history,"Furie");
 assert.equal(replayAssist(ctx,history).state.pa,9);
 history=addAssistSpell(ctx,history,"Furie");
 assert.equal(replayAssist(ctx,history).state.pa,6);
 assert.ok(!legalAssistSpells(ctx,history).some(x=>x.name==="Furie"));
 assert.throws(()=>addAssistSpell(ctx,history,"Furie"),/indisponible/);
});
test("Optimizer respects manual choices and proposes remaining PA, never a fresh start",()=>{
 const ctx=config();let h=readAssistHistory(storage(),"sacrieur",ctx);
 h=addAssistSpell(ctx,h,"Furie");h=addAssistSpell(ctx,h,"Furie");
 const seed=replayAssist(ctx,h).state;
 const out=optimizeFromState(ctx.settings,ctx.spells,seed);
 assert.equal(out.turns.length,4);
 assert.deepEqual(out.turns[0].actions.slice(0,2).map(x=>x.name),["Furie","Furie"]);
 assert.ok(out.turns[0].spent<=12);
 assert.ok(Number.isFinite(out.total));
});
test("Next turn preserves two final damage buffs and spell cooldowns",()=>{
 const ctx=config();
 let h=readAssistHistory(storage(),"sacrieur",ctx);
 h=addAssistSpell(ctx,h,"Furie");h=addAssistSpell(ctx,h,"Furie");
 h=nextAssistTurn(ctx,h);
 const {state}=replayAssist(ctx,h);
 assert.equal(state.turn,2);
 assert.equal(state.pa,12);
 assert.equal(state.buffs.filter(x=>x.stat==="Dommages finaux").length,2);
});
test("Manual selections are saved separately for Sacrier and Sram",()=>{
 const ls=storage(),a=config("sacrieur"),b=config("sram");
 for(const ctx of [a,b])saveAssistContext(ls,ctx.build,ctx.settings,ctx.spells);
 let sa=readAssistHistory(ls,a.build.id,a);
 sa=addAssistSpell(a,sa,"Furie");
 writeAssistHistory(ls,"sacrieur",sa);
 let sb=readAssistHistory(ls,b.build.id,b);
 const pick=legalAssistSpells(b,sb)[0].name;
 sb=addAssistSpell(b,sb,pick);
 writeAssistHistory(ls,"sram",sb);
 assert.deepEqual(readAssistHistory(ls,"sacrieur",a).current,["Furie"]);
 assert.deepEqual(readAssistHistory(ls,"sram",b).current,[pick]);
});
test("Changed build settings reset history, but unchanged settings preserve it",()=>{
 const ls=storage(),a=config();
 saveAssistContext(ls,a.build,a.settings,a.spells);
 const ctx=getAssistContext(ls,a.build.id);
 const h=addAssistSpell(ctx,readAssistHistory(ls,a.build.id,ctx),"Furie");
 writeAssistHistory(ls,a.build.id,h);
 assert.equal(readAssistHistory(ls,a.build.id,ctx).current.length,1);
 const other=config("sacrieur",{ap:16});
 assert.notEqual(contextFingerprint(ctx),contextFingerprint(other));
 assert.deepEqual(readAssistHistory(ls,a.build.id,other).current,[]);
});
test("Undo and restart are supported after the player completes a turn",()=>{
 const ctx=config(),ls=storage();
 let h=addAssistSpell(ctx,readAssistHistory(ls,"sacrieur",ctx),"Furie");
 h=nextAssistTurn(ctx,h);
 assert.equal(h.finished.length,1);
 h=undoAssistSpell(ctx,h);
 assert.equal(h.finished.length,0);
 assert.equal(h.current.length,0);
 h=addAssistSpell(ctx,h,"Furie");
 h=resetAssistHistory(ls,"sacrieur",ctx);
 assert.equal(h.current.length,0);
});
