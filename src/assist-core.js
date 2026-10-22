import {initialState,castSpell,endTurn,eligible,cleanSettings,turnActionPoints} from "./engine.js?v=1.8";

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
 // PA overrides belong to the live combat history, not the build identity.
 // Ignore this new empty field to preserve compatible v1.6 saved sessions.
 const settings={...(context?.settings||{})};
 delete settings.apByTurn;
 const body=JSON.stringify([settings,context?.spells,context?.build?.id]);
 let h=2166136261;for(let i=0;i<body.length;i++){h^=body.charCodeAt(i);h=Math.imul(h,16777619);}
 return (h>>>0).toString(36);
}
export function emptyAssistHistory(context){return {fingerprint:contextFingerprint(context),finished:[],current:[],turnPA:{}};}
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
 const turnPA={};
 const raw=h.turnPA&&typeof h.turnPA==="object"&&!Array.isArray(h.turnPA)?h.turnPA:{};
 for(const [key,value] of Object.entries(raw)){
  const turn=Number(key),pa=Number(value);
  if(Number.isInteger(turn)&&turn>=1&&turn<=settings.turns&&
     Number.isInteger(pa)&&pa>=1&&pa<=30&&pa!==settings.ap){
   turnPA[turn]=pa;
  }
 }
 return {fingerprint:String(h.fingerprint||""),finished,current,turnPA};
}
export function replayAssist(context,history){
 const h=validateAssistHistory(history,context.settings);
 const c=cleanSettings({...context.settings,apByTurn:h.turnPA});
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
/**
 * Choose the TOTAL AP available at the start of this specific turn.
 * Existing casts are immutable; a value below AP already spent is rejected.
 * Other turns continue using the build's standard AP unless overridden.
 */
export function setAssistTurnPA(context,history,requested){
 const h=validateAssistHistory(history,context.settings);
 const budget=Number(requested);
 if(!Number.isInteger(budget)||budget<1||budget>30)
  throw Error("Choisis un nombre de PA entier entre 1 et 30.");
 const {state,config}=replayAssist(context,h);
 if(state.turn>config.turns)throw Error("Le combat est terminé.");
 const spent=turnActionPoints(config,state.turn)-state.pa;
 if(budget<spent)throw Error("Tu as déjà dépensé "+spent+" PA ce tour. Choisis au moins "+spent+" PA.");
 const turnPA={...h.turnPA};
 if(budget===config.ap)delete turnPA[state.turn];
 else turnPA[state.turn]=budget;
 return {...h,turnPA};
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
