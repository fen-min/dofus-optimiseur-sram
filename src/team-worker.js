import {optimizeTeam} from "./team-core.js?v=2.7";

self.onmessage=event=>{
 try{
  const {contexts,target}=event.data||{};
  const result=optimizeTeam(contexts,target,progress=>{
   self.postMessage({type:"progress",progress});
  });
  self.postMessage({type:"complete",result});
 }catch(error){
  self.postMessage({type:"error",message:error?.message||String(error)});
 }
};
