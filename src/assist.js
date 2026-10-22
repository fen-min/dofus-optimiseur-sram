import {
 ASSIST_CONTEXT_STORE,ASSIST_HISTORY_STORE,
 getAssistContext,readAssistHistory,writeAssistHistory,resetAssistHistory,
 replayAssist,legalAssistSpells,addAssistSpell,undoAssistSpell,nextAssistTurn,setAssistTurnPA,
 contextFingerprint,escaped
} from "./assist-core.js?v=1.8";
import {canPinAssist,openAssistPin,pinAssistUnsupported} from "./assist-pin.js?v=1.6";

const root=document.getElementById("assist-root");
const $=id=>root.querySelector("#"+id);
const buildId=new URLSearchParams(window.location.search).get("build");
let context=null,history=null,legal=[],recommend=[],worker=null,requestNo=0;
let pinned=null,pinOpening=false;

function message(text=""){
 const el=$("assist-message");el.textContent=text;el.hidden=!text;
}
function halt(){
 requestNo++;
 if(worker){worker.terminate();worker=null;}
}
function loadSession(){
 context=buildId?getAssistContext(localStorage,buildId):null;
 if(!context){
  $("assist-build").textContent="Aucun build transféré depuis OMBRE.";
  $("assist-status").textContent="Dans OMBRE, sélectionne ton build puis clique sur « Combat assisté ».";
  $("assist-spell-list").innerHTML="";
  $("assist-next").disabled=true;$("assist-undo").disabled=true;
  $("assist-refresh").disabled=true;return false;
 }
 history=readAssistHistory(localStorage,buildId,context);
 return true;
}
function render(){
 if(!context || !history)return;
 try{
  const {state,config}=replayAssist(context,history);
  const done=state.turn>config.turns;
  const turn=Math.min(state.turn,config.turns);
  const budget=done?config.ap:(config.apByTurn?.[state.turn]??config.ap);
  const spent=done?0:budget-state.pa;
  $("assist-build").textContent=context.build.character+" · "+context.build.name;
  $("assist-turn").textContent="Tour "+turn+" / "+config.turns+(done?" · Terminé":"");
  $("assist-pa").textContent=(done?0:state.pa)+" / "+budget+" PA";
  $("assist-turn-pa").value=String(budget);
  $("assist-turn-pa").disabled=done;
  $("assist-pa-minus").disabled=done||budget<=Math.max(1,spent);
  $("assist-pa-plus").disabled=done||budget>=30;
  $("assist-pa-reset").disabled=done||budget===config.ap;
  $("assist-pa-reset").textContent="↺ "+config.ap+" PA";
  $("assist-progress-fill").style.width=(done?"100":Math.round(spent/budget*100))+"%";
  $("assist-picked").innerHTML=history.current.length?
   history.current.map(name=>'<span class="assist-picked-item">'+escaped(name)+'</span>').join("") :
   '<span class="assist-muted">Aucun sort joué pour ce tour.</span>';
  $("assist-next").disabled=done;
  $("assist-undo").disabled=!history.current.length&&!history.finished.length;
  $("assist-refresh").disabled=done;
  legal=done?[]:legalAssistSpells(context,history);
  const query=$("assist-search").value.trim().toLocaleLowerCase("fr");
  const filtered=legal.filter(spell=>!query||spell.name.toLocaleLowerCase("fr").includes(query));
  $("assist-spell-list").innerHTML=filtered.length?filtered.map(spell=>{
   const idx=legal.indexOf(spell);
   return '<button class="assist-spell" type="button" data-pick="'+idx+'"><span>'+
    escaped(spell.name)+'</span><small>'+spell.pa+' PA</small></button>';
  }).join(""):'<span class="assist-empty">'+(done?"Combat terminé.":"Aucun sort disponible avec les PA et les conditions actuelles.")+'</span>';
  if(done){
   $("assist-status").textContent="Tous les tours sélectionnés. Tu peux recommencer ou annuler.";
   $("assist-recommendation").innerHTML="";
   $("assist-future").innerHTML="";
  }
 }catch(e){
  $("assist-status").textContent="Erreur dans la session de combat.";
  $("assist-spell-list").innerHTML="";
  message(e.message||String(e));
 }
}
function saveAndReplan(next){
 history=next;
 writeAssistHistory(localStorage,buildId,history);
 message("");
 recommend=[];
 render();
 plan();
}
function setRoundBudget(value){
 if(!context||!history)return;
 try{saveAndReplan(setAssistTurnPA(context,history,value));}
 catch(error){
  render();
  message(error?.message||String(error));
 }
}
function stepRoundBudget(delta){
 if(!context||!history)return;
 try{
  const {state,config}=replayAssist(context,history);
  if(state.turn>config.turns)return;
  const total=config.apByTurn?.[state.turn]??config.ap;
  setRoundBudget(total+delta);
 }catch(error){message(error?.message||String(error));}
}
function chooseSpell(name){
 if(!context || !history)return;
 try{saveAndReplan(addAssistSpell(context,history,name));}
 catch(e){message(e.message||String(e));}
}
function showProposal(result){
 const first=result?.first,already=history.current.length;
 recommend=first?.actions?.slice(already)||[];
 if(!first){
  $("assist-status").textContent="Aucune proposition.";
  $("assist-recommendation").innerHTML="";
  $("assist-future").innerHTML="";
  return;
 }
 const PA=recommend.reduce((sum,s)=>sum+s.pa,0);
 $("assist-status").textContent=recommend.length
  ?"Proposition : "+recommend.length+" sort(s) · "+PA+" PA supplémentaires."
  :"La meilleure option estimée est de terminer ce tour.";
 $("assist-recommendation").innerHTML=recommend.length
  ?recommend.map((a,i)=>'<button type="button" data-recommend="'+i+'" title="Cliquer pour ajouter ce sort">'+
   escaped(a.name)+' · '+a.pa+' PA</button>').join("")
  :'<p class="assist-empty">Pas d’autre sort conseillé pour ce tour.</p>';
 const next=result.following||[];
 $("assist-future").innerHTML=next.length?
  '<p class="assist-next-steps">Aperçu des tours suivants (recalculé après tes choix)</p>'+
  next.slice(0,9).map(t=>'<p>T'+t.number+' · '+(t.actions.length?
   t.actions.map(a=>escaped(a.name)).join(" → "):"Passer")+'</p>').join(""):"";
}
function plan(){
 halt();
 if(!context||!history)return;
 const {state,config}=replayAssist(context,history);
 if(state.turn>config.turns)return;
 $("assist-status").textContent="Recherche de la meilleure suite…";
 $("assist-recommendation").innerHTML="";
 $("assist-future").innerHTML="";
 recommend=[];
 const request=++requestNo;
 // Lightweight beam for quick in-combat updates. The complete horizon is kept.
 const settings={...context.settings,beamWidth:Math.min(16,context.settings.beamWidth||24)};
 const taskContext={...context,settings};
 if(typeof Worker==="undefined"){
  $("assist-status").textContent="Ce navigateur ne prend pas en charge le calcul en arrière-plan.";
  return;
 }
 try{
  worker=new Worker(new URL("./assist-worker.js?v=1.8",import.meta.url),{type:"module"});
  worker.onmessage=e=>{
   if(requestNo!==request)return;
   const data=e.data||{};
   worker?.terminate();worker=null;
   if(data.type==="error"){message(data.message||"Calcul impossible");$("assist-status").textContent="Impossible de calculer la suite.";return;}
   if(data.type==="complete")showProposal(data.result);
  };
  worker.onerror=e=>{
   if(requestNo!==request)return;
   $("assist-status").textContent="Erreur du moteur d’optimisation.";
   message(e.message||"Le calcul n'a pas abouti.");
   worker?.terminate();worker=null;
  };
  worker.postMessage({context:taskContext,history});
 }catch(e){message(e.message||String(e));$("assist-status").textContent="Calcul indisponible.";}
}
function goNext(){
 try{saveAndReplan(nextAssistTurn(context,history));}
 catch(e){message(e.message||String(e));}
}
function goBack(){
 try{saveAndReplan(undoAssistSpell(context,history));}
 catch(e){message(e.message||String(e));}
}
function reset(){
 if(!context||!window.confirm("Recommencer ce combat depuis le tour 1 ?"))return;
 saveAndReplan(resetAssistHistory(localStorage,buildId,context));
}
function openSmallWindow(){
 const url=new URL(window.location.href);
 url.searchParams.set("build",buildId);
 url.searchParams.delete("embedded");
 const pop=window.open(url.href,"_blank","popup=yes,width=470,height=790,resizable=yes,scrollbars=yes");
 if(!pop){message("La petite fenêtre a été bloquée. Autorise les pop-ups pour OMBRE.");return;}
 // Avoid showing the embedded sidebar and a second separate window together.
 if(window.self!==window.top){
  window.parent.postMessage({type:"ombre:assist-popout-opened"} ,window.location.origin);
 }
}
function updatePin(){
 const button=$("assist-pin");
 if(!button)return;
 const active=!!pinned&&!pinned.closed;
 button.setAttribute("aria-pressed",String(active));
 button.title=active?"Retirer l'épingle":"Garder au premier plan";
 button.disabled=pinOpening;
}
async function togglePin(){
 if(pinned&&!pinned.closed){pinned.close();return;}
 // Picture-in-Picture cannot be requested from an iframe.
 if(!canPinAssist(window)){message(pinAssistUnsupported);return;}
 if(pinOpening||!buildId)return;
 pinOpening=true;updatePin();message("");
 try{
  const pop=await openAssistPin(window,buildId,()=>{
   pinned=null;updatePin();message("");
  });
  pinned=pop;
  message("Épinglée au premier plan. La fenêtre d’origine doit rester ouverte.");
 }catch(e){message("Impossible d’épingler : "+(e.message||String(e)));}
 finally{pinOpening=false;updatePin();}
}
// Within the main site's iframe, only the TOP-LEVEL parent page can
// request Document PiP. Hide the unavailable pin here; its visible equivalent
// is placed in the parent drawer's header.
if(window.self!==window.top){
 $("assist-pin").hidden=true;
 $("assist-pin").disabled=true;
 // PiP already *is* the floating window. Avoid offering a button that
 // would create an additional popup while the user is playing.
 if(new URLSearchParams(window.location.search).get("embedded")==="pip"){
  $("assist-popout").hidden=true;
 }
}
root.addEventListener("click",event=>{
 const pick=event.target.closest("button[data-pick]");
 if(pick){const s=legal[Number(pick.dataset.pick)];if(s)chooseSpell(s.name);return;}
 const suggested=event.target.closest("button[data-recommend]");
 if(suggested){const s=recommend[Number(suggested.dataset.recommend)];if(s)chooseSpell(s.name);}
});
$("assist-search").addEventListener("input",render);
$("assist-turn-pa").addEventListener("change",e=>setRoundBudget(e.target.value));
$("assist-turn-pa").addEventListener("keydown",e=>{
 if(e.key==="Enter"){e.preventDefault();setRoundBudget(e.target.value);e.target.blur();}
});
$("assist-pa-minus").addEventListener("click",()=>stepRoundBudget(-1));
$("assist-pa-plus").addEventListener("click",()=>stepRoundBudget(1));
$("assist-pa-reset").addEventListener("click",()=>setRoundBudget(context.settings.ap));
$("assist-refresh").addEventListener("click",plan);
$("assist-next").addEventListener("click",goNext);
$("assist-undo").addEventListener("click",goBack);
$("assist-reset").addEventListener("click",reset);
$("assist-popout").addEventListener("click",openSmallWindow);
$("assist-pin").addEventListener("click",togglePin);
window.addEventListener("storage",e=>{
 if(e.key===ASSIST_HISTORY_STORE && context){
  history=readAssistHistory(localStorage,buildId,context);
  render();plan();
 }
 if(e.key===ASSIST_CONTEXT_STORE){
  const newContext=getAssistContext(localStorage,buildId);
  if(newContext && (!context||contextFingerprint(newContext)!==contextFingerprint(context))){
   context=newContext;history=readAssistHistory(localStorage,buildId,context);
   message("Les paramètres du build ont changé : la rotation libre est repartie du tour 1.");
   render();plan();
  }
 }
});
window.addEventListener("pagehide",()=>{halt();pinned?.close();});
if(loadSession()){render();plan();}
updatePin();
