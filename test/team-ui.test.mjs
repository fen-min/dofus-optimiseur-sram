import test from "node:test";
import assert from "node:assert/strict";
import {INITIAL_BUILDS,CLASSES} from "../src/classes.js";
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
test("target changes preserve resistances and use a hidden maximum for stepwise turns",()=>withBrowser(({root,node,localStorage})=>{
 mountTeamModule({getBuilds:()=>INITIAL_BUILDS});
 node("team-res-Air").value="25";
 root.listeners.change({target:{closest(selector){return selector==="#team-settings"?{}:null;}}});
 const stored=JSON.parse(localStorage.getItem("ombre-team-dps-v1"));
 assert.equal(stored.target.hp,1000000000000);
 assert.equal(stored.target.turns,100);
 assert.equal(stored.target.resistances.Air,25);
 assert.equal(node("team-calculate").textContent,"▶ Calculer le tour 1");
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



test("team roster includes build variant choices but no obsolete buff checkboxes",()=>withBrowser(({node})=>{
 mountTeamModule({getBuilds:()=>INITIAL_BUILDS});
 const html=node("team-members").innerHTML;
 assert.equal((html.match(/data-team-ap=/g)||[]).length,2);
 assert.doesNotMatch(html,/data-team-support|data-team-force-buff|data-team-refresh-buffs/);
 assert.match(html,/data-team-buff="sacri-air-pvm"/);
 assert.match(html,/data-team-buff="sram-air-pvm"/);
 assert.match(html,/Pacte de Sang indisponible/);
 assert.match(html,/Manigance équipé/);
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
 assert.match(html,/data-team-buff="sacri-air-pvm"/);
 assert.doesNotMatch(html,/forceOpeningBuff|refreshTimedBuffs/);
 root.listeners.change({target:{closest(selector){
  if(selector==="input[data-team-ap]")return {dataset:{teamAp:"sacri-air-pvm"},value:"15"};
  return null;
 }}});
 const persisted=JSON.parse(localStorage.getItem("ombre-team-dps-v1"));
 assert.deepEqual(persisted.memberOptions["sacri-air-pvm"],{ap:15});
}));


test("each button click calculates one new round and restart clears progress",()=>withBrowser(({node})=>{
 const previousWorker=globalThis.Worker,previousURL=globalThis.URL;
 const requests=[];
 class FakeWorker{
  postMessage(input){
   requests.push(input);
   const number=(input.previous?.turns.length||0)+1;
   const earlier=input.previous?.turns||[];
   const turns=[...earlier,{
    number,theoretical:15,remainingHp:10000-number*15,roundStartHp:10000-(number-1)*15,
    actors:[{id:"sacri-air-pvm",character:"Mon Sacrieur",initiative:2272,
     actions:[],spent:0,direct:15,poison:0,damage:15,remainingHp:10000-number*15}]
   }];
   this.onmessage({data:{type:"complete",result:{
    target:input.target,theoretical:15*number,direct:15*number,
    poison:0,effective:15*number,averagePerTurn:15,overkill:0,
    members:[{id:"sacri-air-pvm",character:"Mon Sacrieur",estimated:15*number,ap:12}],
    turns,session:{actors:[]},finished:false,warnings:[]
   }}});
  }
  terminate(){}
 }
 globalThis.Worker=FakeWorker;
 if(!globalThis.URL)globalThis.URL=class {constructor(p){this.href=p;}};
 try{
  mountTeamModule({getBuilds:()=>INITIAL_BUILDS});
  node("team-calculate").listeners.click();
  assert.equal(requests.length,1);
  assert.equal(requests[0].previous,null);
  assert.equal((node("team-turn-select").innerHTML.match(/<option value=/g)||[]).length,1);
  assert.match(node("team-calculate").textContent,/Tour suivant \(2\)/);
  node("team-calculate").listeners.click();
  assert.equal(requests.length,2);
  assert.equal(requests[1].previous.turns.length,1);
  assert.equal((node("team-turn-select").innerHTML.match(/<option value=/g)||[]).length,2);
  assert.match(node("team-turn-buttons").innerHTML,/data-team-turn="2" class="is-current"/);
  node("team-restart").listeners.click();
  assert.equal(node("team-calculate").textContent,"▶ Calculer le tour 1");
  assert.equal(node("team-turn-select").disabled,true);
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

test("Sacrier can select Pacte de Sang from team; callback persists the actual build variant",()=>withBrowser(({root,node})=>{
 const builds=structuredClone(INITIAL_BUILDS);
 const calls=[];
 const team=mountTeamModule({
  getBuilds:()=>builds,
  onChangeVariant:(id,group,name)=>{
   calls.push({id,group,name});
   const b=builds.find(x=>x.id===id);
   b.variants[group]=name;
   return true;
  }
 });
 const before=node("team-members").innerHTML;
 assert.match(before,/Pacte de Sang indisponible/);
 root.listeners.change({target:{closest(selector){
  if(selector==="select[data-team-buff]")
   return {dataset:{teamBuff:"sacri-air-pvm",teamGroup:"5"},value:"Pacte de Sang"};
  return null;
 }}});
 assert.deepEqual(calls,[{id:"sacri-air-pvm",group:5,name:"Pacte de Sang"}]);
 assert.equal(builds.find(b=>b.classId==="sacrieur").variants[5],"Pacte de Sang");
 assert.match(node("team-members").innerHTML,/Pacte de Sang équipé/);
 assert.match(node("team-status").textContent,/Pacte de Sang équipé/);
 assert.equal(node("team-calculate").textContent,"▶ Calculer le tour 1");
 assert.ok(typeof team.refresh==="function");
}));
test("Sram Manigance option follows its saved variant instead of silently casting an unavailable buff",()=>withBrowser(({root,node})=>{
 const builds=structuredClone(INITIAL_BUILDS);
 const sram=builds.find(b=>b.classId==="sram");
 const i=CLASSES.sram.pairs.findIndex(p=>p.includes("Manigance"));
 const alternative=CLASSES.sram.pairs[i].find(name=>name!=="Manigance");
 sram.variants[i]=alternative;
 const calls=[];
 mountTeamModule({getBuilds:()=>builds,onChangeVariant:(id,group,name)=>{
  const b=builds.find(x=>x.id===id);
  b.variants[group]=name;
  calls.push({id,group,name});
  return true;
 }});
 assert.match(node("team-members").innerHTML,/Manigance indisponible/);
 root.listeners.change({target:{closest(selector){
  if(selector==="select[data-team-buff]")
   return {dataset:{teamBuff:sram.id,teamGroup:String(i)},value:"Manigance"};
  return null;
 }}});
 assert.equal(calls.length,1);
 assert.equal(sram.variants[i],"Manigance");
 assert.match(node("team-members").innerHTML,/Manigance équipé/);
}));

test("manual UI switches mode, chooses spells, supports undo and advances to next character",()=>withBrowser(({root,node})=>{
 mountTeamModule({getBuilds:()=>INITIAL_BUILDS});
 const radio={value:"manual"};
 root.listeners.change({target:{closest(selector){
  return selector==='input[name="team-mode"]'?radio:null;
 }}});
 assert.equal(root.dataset.teamMode,"manual");
 const initial=node("team-manual-board").innerHTML;
 assert.match(initial,/Mon Sacrieur/);
 assert.match(initial,/PA.*restants/);
 assert.match(initial,/data-manual-cast="/);
 assert.match(initial,/data-manual-next/);
 assert.match(node("team-damage").innerHTML,/dégâts cumulés/);
 const match=initial.match(/data-manual-cast="([^"]+)"/);
 assert.ok(match);
 const click=([flag,id])=>root.listeners.click({target:{closest(selector){
  return {dataset:{manualCast:id||""},hasAttribute(name){
   return name==="data-"+flag;
  }};
 }}});
 click(["manual-cast",match[1]]);
 assert.match(node("team-manual-board").innerHTML,/Actions choisies/);
 click(["manual-undo"]);
 assert.match(node("team-manual-board").innerHTML,/Aucune — tu peux passer le tour/);
 click(["manual-next"]);
 assert.match(node("team-manual-board").innerHTML,/Matryoshka/);
 click(["manual-next"]);
 assert.match(node("team-status").textContent,/Tour manuel enregistré/);
 assert.match(node("team-manual-board").innerHTML,/Commencer le tour suivant/);
 click(["manual-start"]);
 assert.match(node("team-manual-board").innerHTML,/Tour 2/);
 click(["manual-restart"]);
 assert.match(node("team-manual-board").innerHTML,/Tour 1/);
 assert.ok(node("team-damage").innerHTML);
}));

test("Choix manuel : modifier ses PA dans le compteur ne réinitialise pas le combat",()=>withBrowser(({root,node})=>{
 mountTeamModule({getBuilds:()=>INITIAL_BUILDS});
 root.listeners.change({target:{closest(s){
  return s==='input[name="team-mode"]'?{value:"manual"}:null;
 }}});
 const before=node("team-manual-board").innerHTML;
 assert.match(before,/data-manual-turn-pa/);
 assert.match(before,/value="12"/);
 root.listeners.change({target:{closest(s){
  return s==='input[data-manual-turn-pa]'?{value:"17"}:null;
 }}});
 assert.match(node("team-manual-board").innerHTML,/value="17"/);
 assert.match(node("team-manual-board").innerHTML,/17 PA/);
 assert.match(node("team-status").textContent,/PA modifiés/);
 const choose=()=>root.listeners.click({target:{closest(){
  return {dataset:{},hasAttribute(key){return key==="data-manual-next";}};
 }}});
 choose();
 assert.match(node("team-manual-board").innerHTML,/Matryoshka/);
 assert.match(node("team-manual-board").innerHTML,/value="12"/);
 root.listeners.change({target:{closest(s){
  return s==='input[data-manual-turn-pa]'?{value:"0"}:null;
 }}});
 assert.match(node("team-status").textContent,/entre 1 et 30/);
 assert.match(node("team-manual-board").innerHTML,/value="12"/);
}));
