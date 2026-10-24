import {optimizeFromState} from "./engine.js?v=3.24";
import {replayAssist} from "./assist-core.js?v=3.2";

// A fresh worker is used per request; the UI can cancel obsolete suggestions.
self.onmessage=event=>{
 try{
  const {context,history}=event.data||{};
  if(!context?.settings||!Array.isArray(context.spells)||!history)throw Error("Session de combat invalide");
  const {state,config}=replayAssist(context,history);
  if(state.turn>config.turns){
   self.postMessage({type:"complete",result:null});
   return;
  }
  // Avoid recomputing the entire fight: locked player actions remain in the seed.
  const output=optimizeFromState(config,context.spells,state);
  self.postMessage({type:"complete",result:{
   first:output.turns[state.turn-1]||null,
   following:output.turns.slice(state.turn),
   total:output.total,explored:output.explored
  }});
 }catch(e){self.postMessage({type:"error",message:e?.message||String(e)})}
};
