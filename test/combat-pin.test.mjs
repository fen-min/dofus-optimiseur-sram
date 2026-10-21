import test from "node:test";
import assert from "node:assert/strict";
import {canPinCombat,openPinnedCombat,unsupportedPinText} from "../src/combat-pin.js";
import {
 packCombatRotation,storeCombatRotation,getCombatTurn,setCombatTurn,COMBAT_STORE
} from "../src/combat-view.js";

const makeStorage=()=>{
 const data=new Map();
 return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
};
function mockDocument(){
 const nodes=new Map();
 const make=id=>{
  if(!nodes.has(id))nodes.set(id,{
   id,disabled:false,scrollTop:0,innerHTML:"",textContent:"",handlers:{},
   addEventListener(event,fn){this.handlers[event]=fn;},
   querySelector(){return {scrollIntoView(){}};}
  });
  return nodes.get(id);
 };
 return {
  title:"",documentElement:{lang:""},body:{className:"",innerHTML:""},
  head:{links:[],append(link){this.links.push(link);}},
  createElement(tag){return {tagName:tag,rel:"",href:""};},
  getElementById:make
 };
}
function mockHost(){
 const doc=mockDocument(),listeners={},options=[];
 const pip={
  document:doc,closed:false,listeners:{},
  addEventListener(name,fn){this.listeners[name]=fn;},
  close(){this.closed=true;this.listeners.pagehide?.();}
 };
 const host={
  isSecureContext:true,listeners,
  documentPictureInPicture:{requestWindow(option){options.push(option);return Promise.resolve(pip);}},
  addEventListener(event,fn){listeners[event]=fn;},
  removeEventListener(event,fn){if(listeners[event]===fn)delete listeners[event];}
 };
 return {host,pip,doc,options};
}
const sample={
 settings:{ap:12},
 turns:Array.from({length:10},(_,i)=>({
  number:i+1,spent:i?12:11,
  actions:[{name:"Furie",pa:3},{name:"Assaut",pa:2}]
 }))
};
test("Pin feature requires browser Document Picture-in-Picture, user gesture and HTTPS",()=>{
 assert.equal(canPinCombat({}),false);
 assert.equal(canPinCombat({isSecureContext:false,
  documentPictureInPicture:{requestWindow(){}}}),false);
 assert.equal(canPinCombat({isSecureContext:true,
  documentPictureInPicture:{requestWindow(){}}}),true);
 assert.match(unsupportedPinText,/Chrome|Edge/);
});
test("Pinned floating combat view renders all turns and synchronizes controls",async()=>{
 const storage=makeStorage(),{host,pip,doc,options}=mockHost();
 storeCombatRotation(storage,packCombatRotation({
  id:"sacri",classId:"sacrieur",character:"Mon Sacrieur",name:"Air PvM"
 },sample));
 let synced=0,closed=0;
 const control=await openPinnedCombat(host,"sacri",storage,{
  onSync(){synced++;},onClose(){closed++;}
 });
 assert.equal(options.length,1);
 assert.equal(options[0].width,390);
 assert.ok(doc.head.links[0].href.endsWith("/combat.css?v=1.4"));
 assert.equal(doc.body.className,"combat-popout");
 assert.equal(doc.getElementById("pip-build").textContent,"Mon Sacrieur · Air PvM");
 assert.equal((doc.getElementById("pip-list").innerHTML.match(/data-combat-turn/g)||[]).length,10);
 doc.getElementById("pip-next").handlers.click();
 assert.equal(doc.getElementById("pip-current").textContent,"Tour 2 / 10");
 assert.equal(getCombatTurn(storage,"sacri",10),2);
 assert.equal(synced,1);
 setCombatTurn(storage,"sacri",5,10);
 control.refresh();
 assert.equal(doc.getElementById("pip-current").textContent,"Tour 5 / 10");
 assert.equal(doc.getElementById("pip-list").innerHTML.includes("Furie"),true);
 assert.equal(doc.head.links.length,1);
 host.listeners.storage?.({key:COMBAT_STORE});
 assert.equal(doc.getElementById("pip-current").textContent,"Tour 5 / 10");
 doc.getElementById("pip-unpin").handlers.click();
 assert.equal(pip.closed,true);
 assert.equal(closed,1);
 assert.equal(host.listeners.storage,undefined);
});
test("Pin window safely shows unavailable rotation if build is missing",async()=>{
 const storage=makeStorage(),{host,doc}=mockHost();
 await openPinnedCombat(host,"other",storage);
 assert.match(doc.getElementById("pip-build").textContent,/indisponible/);
 assert.equal(doc.getElementById("pip-next").disabled,true);
});
