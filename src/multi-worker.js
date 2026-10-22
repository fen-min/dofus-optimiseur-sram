import {replay,optimizeMulti} from "./multi-core.js?v=2.1";
self.onmessage=event=>{
 try{
  const {context,board,history}=event.data||{};
  if(!context?.settings||!Array.isArray(context.spells)||!history)throw Error("Contexte de combat manquant.");
  const state=replay(context,board,history);
  if(!state.monsters.some(m=>m.hp>0)||state.engine.turn>context.settings.turns){
   self.postMessage({type:"done",result:null});return;
  }
  const value=optimizeMulti(context,board,state,{
   beamWidth:Math.min(10,Math.max(4,Number(context.settings.beamWidth)||7))
  });
  self.postMessage({type:"done",result:value});
 }catch(error){self.postMessage({type:"error",message:error.message||String(error)})}
};