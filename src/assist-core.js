import {initialState,castSpell,endTurn,eligible,cleanSettings} from "./engine.js?v=1.5";

/** The player chooses spells. Rebuild state from choices, never from guessed actions. */
export const ASSIST_CONTEXT_STORE="ombre-assist-context-v1";
export const ASSIST_HISTORY_STORE="ombre-assist-history-v1";

const fetchMap=(storage,key)=>{
 try{const obj=JSON.parse(storage.getItem(key)||"{}");return obj&&typeof obj==="object"&&!Array.isArray(obj)?obj:{};}
 catch{return {};}
};
const writeMap=(storage,key,obj)=>{try{storage.setItem(key,JSON.stringify(obj));return true;}catch{return false;}};
export const escaped=value=>String(value??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));

export function saveAssistContext(storage,build,settings,spells){
 if(!build?.id||!Array.isArray(spells)||!settings)throw Error("Build incomplet");
 const all=fetchMap(storage,ASSIST_CONTEXT_STORE);
 all[build.id]={
  build:{id:build.id,classId:build.classId,character:build.character,name:build.name},
  settings:cleanSettings(settings),spells:spells.map(s=>({...s,status:{...(s.status||{})}})),
 };
 return writeMap(storage,ASSIST_CONTEXT_STORE,all);
}
export function getAssistContext(storage,id){return fetchMap(storage,ASSIST_CONTEXT_STORE)[id]||null;}
/** FNV-1a fingerprint; solely for staleness checking, not a security hash. */
export function contextFingerprint(context){
 const body=JSON.stringify([context?.settings,context?.spells,context?.build?.id]);
 let h=2166136261;for(let i=0;i<body.length;i++){h^=body.charCodeAt(i);h=Math.imul(h,16777619);}
 return (h>>>0).toString(36);
}
export function emptyAssistHistory(context){return {fingerprint:contextFingerprint(context),finished:[],current:[]};}
export function readAssistHistory(storage,buildId,context){
 const saved=fetchMap(storage,ASSIST_HISTORY_STORE)[buildId];
 if(!saved||saved.fingerprint!==contextFingerprint(context))return emptyAssistHistory(context);
 return validateAssistHistory(saved,context.settings);
}
export function writeAssistHistory(storage,buildId,history){
 const all=fetchMap(storage,ASSIST_HISTORY_STORE);
 all[buildId]=history;
 return writeMap(storage,ASSIST_HISTORY_STORE,all);
}
export function resetAssistHistory(storage,buildId,context){
 const h=emptyAssistHistory(context);writeAssistHistory(storage,buildId,h);return h;
}
export function validateAssistHistory(h,c){
 const settings=cleanSettings(c);
 if(!Array.isArray(h.finished)||!Array.isArray(h.current)||h.finished.length>settings.turns)throw Error("Historique du combat non valide");
 const names=xs=>{if(!Array.isArray(xs)||xs.length>30||xs.some(n=>typeof n!=="string"||n.length>80))throw Error("Liste de sorts incorrecte");return xs.slice();};
 const finished=h.finished.map(names),current=names(h.current);
 if(finished.length===settings.turns&&current.length)throw Error("Le combat est terminé");
 return {fingerprint:String(h.fingerprint||""),finished,current};
}
export function replayAssist(context,history){
 const c=cleanSettings(context.settings),h=validateAssistHistory(history,c);
 const spells=new Map(context.spells.map(s=>[s.name,s]));
 let state=initialState(c);
 const push=name=>{
  const s=spells.get(name);if(!s)throw Error("Sort non connu : "+name);
  if(!eligible(s,state,c))throw Error("Sort indisponible à ce moment : "+name);
  state=castSpell(state,s,c);
 };
 for(const actions of h.finished){
  for(const name of actions)push(name);
  state=endTurn(state,c);
 }
 for(const name of h.current)push(name);
 return {state,config:c,finished:h.finished.length,remainingTurns:c.turns-h.finished.length};
}
export function legalAssistSpells(context,history){
 const {state,config}=replayAssist(context,history);
 if(state.turn>config.turns)return [];
 return context.spells.filter(s=>eligible(s,state,config))
  .sort((a,b)=>a.pa-b.pa||a.name.localeCompare(b.name,"fr"));
}
export function addAssistSpell(context,history,name){
 const h=validateAssistHistory(history,context.settings);
 const available=legalAssistSpells(context,h);
 if(!available.some(s=>s.name===name))throw Error("Sort indisponible (PA, portée, variante ou relance).");
 return {...h,current:[...h.current,name]};
}
export function undoAssistSpell(context,history){
 const h=validateAssistHistory(history,context.settings);
 if(h.current.length)return {...h,current:h.current.slice(0,-1)};
 if(!h.finished.length)return h;
 return {...h,finished:h.finished.slice(0,-1),current:h.finished[h.finished.length-1].slice(0,-1)};
}
export function nextAssistTurn(context,history){
 const h=validateAssistHistory(history,context.settings),c=cleanSettings(context.settings);
 if(h.finished.length>=c.turns)return h;
 replayAssist(context,h); // reject illegal history before commit
 return {...h,finished:[...h.finished,h.current],current:[]};
}
export function sameAssistHistory(a,b){return JSON.stringify([a.finished,a.current])===JSON.stringify([b.finished,b.current]);}
