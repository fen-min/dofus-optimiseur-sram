import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS} from "../src/classes.js";
import {mountTeamModule} from "../src/team-ui.js";

function mockBrowser(){
 const elements=new Map(),events={};
 const node=id=>{
  if(!elements.has(id))elements.set(id,{id,innerHTML:"",textContent:"",value:"",checked:false,
   disabled:false,listeners:{},addEventListener(type,cb){this.listeners[type]=cb;}});
  return elements.get(id);
 };
 const root={
  listeners:{},querySelector(q){return node(q.slice(1));},
  addEventListener(type,cb){this.listeners[type]=cb;}
 };
 const document={getElementById:id=>id==="tab-team"?root:null};
 const data=new Map();
 const localStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 const window={addEventListener(type,fn){events[type]=fn;}};
 return {document,localStorage,window,root,node,events};
}
function withBrowser(run){
 const original={document:globalThis.document,localStorage:globalThis.localStorage,window:globalThis.window};
 const mock=mockBrowser();
 Object.assign(globalThis,{document:mock.document,localStorage:mock.localStorage,window:mock.window});
 try{return run(mock);}finally{Object.assign(globalThis,original);}
}
test("eight visible slots and initiative sorting use saved characters",()=>withBrowser(({node})=>{
 const team=mountTeamModule({getBuilds:()=>INITIAL_BUILDS});
 const markup=node("team-members").innerHTML;
 assert.equal((markup.match(/<article class="team-slot/g)||[]).length,8);
 assert.ok(markup.indexOf("Mon Sacrieur")<markup.indexOf("Matryoshka"));
 assert.match(markup,/initiative/);
 assert.equal(node("team-count").textContent,"2 / 8 personnages");
 assert.match(node("team-rotations").innerHTML,/Choisis tes personnages/);
 assert.ok(typeof team.refresh==="function");
}));
test("emptying a slot keeps other character selected and invalidates results",()=>withBrowser(({root,node,localStorage})=>{
 mountTeamModule({getBuilds:()=>INITIAL_BUILDS});
 root.listeners.change({target:{closest(selector){
  if(selector==="select[data-team-slot]")return {dataset:{teamSlot:"0"},value:""};
  return null;
 }}});
 assert.equal(node("team-count").textContent,"1 / 8 personnages");
 assert.match(node("team-members").innerHTML,/Matryoshka/);
 assert.doesNotMatch(localStorage.getItem("ombre-team-dps-v1"),/sacri-air-pvm/);
}));
test("target changes persist and enforce resistance and turn limits",()=>withBrowser(({root,node,localStorage})=>{
 mountTeamModule({getBuilds:()=>INITIAL_BUILDS});
 node("team-hp").value="5000";node("team-turns").value="2";node("team-res-Air").value="25";
 root.listeners.change({target:{closest(selector){return selector==="#team-settings"?{}:null;}}});
 const stored=JSON.parse(localStorage.getItem("ombre-team-dps-v1"));
 assert.equal(stored.target.hp,5000);
 assert.equal(stored.target.turns,2);
 assert.equal(stored.target.resistances.Air,25);
 assert.equal(node("team-turns").value,"2");
}));
