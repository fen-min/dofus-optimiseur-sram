import {optimizeTeamTurn} from "./team-core.js?v=3.63";

self.onmessage=event=>{
 try{
  const {contexts,target,previous,strategy}=event.data||{};
  const result=optimizeTeamTurn(contexts,target,progress=>{
   self.postMessage({type:"progress",progress});
  },previous,strategy);
  self.postMessage({type:"complete",result});
 }catch(error){
  self.postMessage({type:"error",message:error?.message||String(error)});
 }
};
