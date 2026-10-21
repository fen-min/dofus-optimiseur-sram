import test from "node:test";
import assert from "node:assert/strict";
import {canPinAssist,openAssistPin} from "../src/assist-pin.js";

function browser(){
 const source={children:["L’interface complète reste dans sa fenêtre d’origine"]};
 const doc={
  title:"",documentElement:{lang:""},body:{
   style:{},children:[],append(node){this.children.push(node);}
  },createElement(tag){return {tag,style:{},setAttribute(name,value){this[name]=value;}}}
 };
 const listeners={};
 const pip={
  document:doc,closed:false,addEventListener(type,fn){listeners[type]=fn;},
  close(){this.closed=true;listeners.pagehide?.();}
 };
 const host={
  isSecureContext:true,location:{href:"https://fen-min.github.io/dofus-optimiseur-sram/"},
  source,documentPictureInPicture:{calls:0,requestWindow(options){
   this.calls++;this.options=options;return Promise.resolve(pip);
  }}
 };
 host.self=host;host.top=host;
 return {host,pip,doc};
}
test("Only a top-level secure page may request a pinned window",async()=>{
 const {host}=browser();
 assert.equal(canPinAssist(host),true);
 const iframe={...host,self:{},top:{}};
 assert.equal(canPinAssist(iframe),false);
 await assert.rejects(openAssistPin(iframe,"sacri"),/page OMBRE|petite fenêtre/);
 assert.equal(host.documentPictureInPicture.calls,0);
});
test("Pinned assistant embeds its own content WITHOUT moving original UI",async()=>{
 const {host,pip,doc}=browser();
 let closed=0;
 const control=await openAssistPin(host,"sacri-air-pvm",()=>{closed++});
 assert.equal(host.documentPictureInPicture.calls,1);
 assert.equal(host.documentPictureInPicture.options.width,455);
 assert.equal(host.documentPictureInPicture.options.height,790);
 assert.deepEqual(host.source.children,["L’interface complète reste dans sa fenêtre d’origine"]);
 assert.equal(doc.body.children.length,1);
 const frame=doc.body.children[0];
 assert.equal(frame.tag,"iframe");
 const uri=new URL(frame.src);
 assert.equal(uri.pathname,"/dofus-optimiseur-sram/combat-assiste.html");
 assert.equal(uri.searchParams.get("build"),"sacri-air-pvm");
 assert.equal(uri.searchParams.get("embedded"),"pip");
 assert.equal(doc.title,"OMBRE — Combat assisté 📌");
 control.close();
 assert.equal(pip.closed,true);
 assert.equal(closed,1);
});
test("Missing build does not create a floating window",async()=>{
 const {host}=browser();
 await assert.rejects(openAssistPin(host,""),/build/);
 assert.equal(host.documentPictureInPicture.calls,0);
});
