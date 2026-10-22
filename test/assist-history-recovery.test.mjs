import test from "node:test";
import assert from "node:assert/strict";
import {SACRIER_SPELLS,SACRIER_DEFAULT_VARIANTS} from "../src/sacrier-spells.js";
import {SACRIER_VARIANTS} from "../src/sacrier-catalog.js";
import {cleanSettings} from "../src/engine.js";
import {ASSIST_HISTORY_STORE,emptyAssistHistory,readAssistHistory,writeAssistHistory,
 replayAssist,setAssistTurnPA,sameAssistHistory} from "../src/assist-core.js";

function storage(){
 const data=new Map();
 return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
}
function context(id="sacri-test"){
 return {build:{id,classId:"sacrieur",character:"Sacrieur",name:"Air"},
  settings:cleanSettings({classId:"sacrieur",ap:12,turns:4,distance:2,
   variants:SACRIER_DEFAULT_VARIANTS,variantPairs:SACRIER_VARIANTS,
   defaultVariants:SACRIER_DEFAULT_VARIANTS}),spells:SACRIER_SPELLS};
}
test("Corrupted stored history recovers without affecting the other build",()=>{
 const ls=storage(),a=context("a"),b=context("b"),bHistory=emptyAssistHistory(b);
 writeAssistHistory(ls,"b",bHistory);
 writeAssistHistory(ls,"a",{...emptyAssistHistory(a),finished:"corrupt"});
 const warnings=[];
 const recovered=readAssistHistory(ls,"a",a,error=>warnings.push(error.message));
 assert.deepEqual(recovered,emptyAssistHistory(a));
 assert.equal(warnings.length,1);
 assert.equal(readAssistHistory(ls,"a",a,()=>warnings.push("again")).finished.length,0);
 assert.equal(warnings.length,1);
 const saved=JSON.parse(ls.getItem(ASSIST_HISTORY_STORE));
 assert.deepEqual(saved.a,recovered);
 assert.deepEqual(saved.b,bHistory);
 assert.equal(replayAssist(a,recovered).state.turn,1);
});
test("A structurally valid but impossible saved spell sequence recovers",()=>{
 const ls=storage(),ctx=context();
 writeAssistHistory(ls,ctx.build.id,{...emptyAssistHistory(ctx),current:["Furie","Furie","Furie"]});
 const warnings=[];
 const restored=readAssistHistory(ls,ctx.build.id,ctx,error=>warnings.push(error.message));
 assert.deepEqual(restored.current,[]);
 assert.equal(warnings.length,1);
 assert.match(warnings[0],/indisponible/);
});
test("Valid combat history and adjusted PA are preserved without warning",()=>{
 const ls=storage(),ctx=context();
 const history=setAssistTurnPA(ctx,emptyAssistHistory(ctx),16);
 writeAssistHistory(ls,ctx.build.id,history);
 const warnings=[];
 const saved=readAssistHistory(ls,ctx.build.id,ctx,error=>warnings.push(error.message));
 assert.deepEqual(saved.turnPA,{1:16});
 assert.equal(replayAssist(ctx,saved).state.pa,16);
 assert.deepEqual(warnings,[]);
});
test("A stale fingerprint resets normally without a corruption warning",()=>{
 const ls=storage(),ctx=context();
 writeAssistHistory(ls,ctx.build.id,{...emptyAssistHistory(ctx),fingerprint:"old",current:["Furie"]});
 let warnings=0;
 const restored=readAssistHistory(ls,ctx.build.id,ctx,()=>warnings++);
 assert.deepEqual(restored.current,[]);
 assert.equal(warnings,0);
});
test("Comparing histories includes PA and ignores PA map insertion order",()=>{
 const ctx=context(),initial=emptyAssistHistory(ctx);
 assert.equal(sameAssistHistory(initial,{...initial,turnPA:{}}),true);
 assert.equal(sameAssistHistory({...initial,turnPA:{1:12}},{...initial,turnPA:{1:16}}),false);
 assert.equal(sameAssistHistory({...initial,turnPA:{2:14,1:16}},
  {...initial,turnPA:{1:16,2:14}}),true);
 assert.equal(sameAssistHistory({...initial,current:["Furie"]},initial),false);
});
