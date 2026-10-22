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

test("individual PA selector persists its value without changing the saved build",()=>withBrowser(({root,node,localStorage})=>{
 const baseAP=INITIAL_BUILDS[1].ap;
 mountTeamModule({getBuilds:()=>INITIAL_BUILDS});
 const markup=node("team-members").innerHTML;
 assert.match(markup,/data-team-ap="sacri-air-pvm"/);
 assert.doesNotMatch(markup,/data-team-support|data-team-force-buff|data-team-refresh-buffs/);
 root.listeners.change({target:{closest(selector){
  if(selector==="input[data-team-ap]")return {dataset:{teamAp:"sacri-air-pvm"},value:"14"};
  return null;
 }}});
 const store=JSON.parse(localStorage.getItem("ombre-team-dps-v1"));
 assert.equal(store.memberOptions["sacri-air-pvm"].ap,14);
 assert.match(node("team-members").innerHTML,/value="14"/);
 assert.equal(INITIAL_BUILDS[1].ap,baseAP);
}));
test("invalid team PA cannot be stored or propagated",()=>withBrowser(({root,localStorage,node})=>{
 mountTeamModule({getBuilds:()=>INITIAL_BUILDS});
 root.listeners.change({target:{closest(selector){
  if(selector==="input[data-team-ap]")return {dataset:{teamAp:"sacri-air-pvm"},value:"30"};
  return null;
 }}});
 assert.match(node("team-status").textContent,/entre 6 et 20/);
 const saved=localStorage.getItem("ombre-team-dps-v1");
 assert.equal(saved,null);
}));



test("team roster is compact and shows no manual buff dropdowns or checkboxes",()=>withBrowser(({node})=>{
 mountTeamModule({getBuilds:()=>INITIAL_BUILDS});
 const html=node("team-members").innerHTML;
 assert.equal((html.match(/data-team-ap=/g)||[]).length,2);
 assert.doesNotMatch(html,/data-team-support|data-team-force-buff|data-team-refresh-buffs/);
 assert.doesNotMatch(html,/<input[^>]+type="checkbox"/);
 assert.equal((html.match(/<article class="team-slot/g)||[]).length,8);
}));
test("legacy saved buff overrides are discarded while custom PA survives",()=>withBrowser(({node,localStorage,root})=>{
 localStorage.setItem("ombre-team-dps-v1",JSON.stringify({
  ids:["sacri-air-pvm","sram-air-pvm"],
  target:{turns:3,hp:9000},
  memberOptions:{"sacri-air-pvm":{ap:14,support:"Pacte de Sang",forceOpeningBuff:true,refreshTimedBuffs:false}}
 }));
 mountTeamModule({getBuilds:()=>INITIAL_BUILDS});
 const html=node("team-members").innerHTML;
 assert.match(html,/data-team-ap="sacri-air-pvm"[^>]+value="14"/);
 assert.doesNotMatch(html,/Pacte de Sang|forceOpeningBuff|refreshTimedBuffs/);
 root.listeners.change({target:{closest(selector){
  if(selector==="input[data-team-ap]")return {dataset:{teamAp:"sacri-air-pvm"},value:"15"};
  return null;
 }}});
 const persisted=JSON.parse(localStorage.getItem("ombre-team-dps-v1"));
 assert.deepEqual(persisted.memberOptions["sacri-air-pvm"],{ap:15});
}));


test("50-turn results expose direct turn navigation through the selector",()=>withBrowser(({root,node})=>{
 const previousWorker=globalThis.Worker,previousURL=globalThis.URL;
 const completed={
  target:{hp:10000},theoretical:50,direct:50,poison:0,effective:50,averagePerTurn:1,overkill:0,
  members:[{id:"sacri-air-pvm",character:"Mon Sacrieur",estimated:50}],
  turns:Array.from({length:50},(_,index)=>({number:index+1,theoretical:1,remainingHp:10000-index-1,
   actors:[{id:"sacri-air-pvm",character:"Mon Sacrieur",initiative:2272,actions:[],spent:0,direct:1,poison:0,damage:1}]})),
  warnings:[]
 };
 class FakeWorker{
  postMessage(){this.onmessage({data:{type:"complete",result:completed}});}
  terminate(){}
 }
 globalThis.Worker=FakeWorker;
 if(!globalThis.URL)globalThis.URL=class {constructor(p){this.href=p;}};
 try{
  mountTeamModule({getBuilds:()=>INITIAL_BUILDS});
  node("team-turns").value="50";
  root.listeners.change({target:{closest(selector){return selector==="#team-settings"?{}:null;}}});
  node("team-calculate").listeners.click();
  assert.equal(node("team-turn-select").disabled,false);
  assert.equal((node("team-turn-select").innerHTML.match(/<option value=/g)||[]).length,50);
  node("team-turn-select").listeners.change({target:{value:"50"}});
  assert.match(node("team-turn-buttons").innerHTML,/data-team-turn="50" class="is-current"/);
  assert.match(node("team-damage").innerHTML,/9 950/);
  assert.equal(node("team-cancel").disabled,true);
 }finally{globalThis.Worker=previousWorker;globalThis.URL=previousURL;}
}));
test("long calculations can be cancelled without changing the selected builds",()=>withBrowser(({node,localStorage})=>{
 const previousWorker=globalThis.Worker,previousURL=globalThis.URL;
 let terminated=false;
 class FakeWorker{postMessage(){} terminate(){terminated=true;}}
 globalThis.Worker=FakeWorker;
 if(!globalThis.URL)globalThis.URL=class {constructor(p){this.href=p;}};
 try{
  mountTeamModule({getBuilds:()=>INITIAL_BUILDS});
  node("team-calculate").listeners.click();
  assert.equal(node("team-calculate").disabled,true);
  assert.equal(node("team-cancel").disabled,false);
  node("team-cancel").listeners.click();
  assert.equal(terminated,true);
  assert.equal(node("team-calculate").disabled,false);
  assert.equal(node("team-cancel").disabled,true);
  assert.match(node("team-status").textContent,/interrompu/);
  assert.equal(node("team-count").textContent,"2 / 8 personnages");
 }finally{globalThis.Worker=previousWorker;globalThis.URL=previousURL;}
}));
