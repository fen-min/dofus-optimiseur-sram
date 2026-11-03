import {optimizeTeamTurn,recalculateTeamCurrentTurn} from "./team-core.js?v=4.03";

self.onmessage=event=>{
 try{
  const {contexts,target,previous,strategy,turnPaOverrides,recalculateCurrent}=event.data||{};
  const calculate=recalculateCurrent?recalculateTeamCurrentTurn:optimizeTeamTurn;
  const result=calculate(contexts,target,progress=>{
   self.postMessage({type:"progress",progress});
  },previous,strategy,turnPaOverrides||{});
  self.postMessage({type:"complete",result});
 }catch(error){
  self.postMessage({type:"error",message:error?.message||String(error)});
 }
};
