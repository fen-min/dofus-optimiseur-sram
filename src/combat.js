import {
 getCombatRotation,getCombatTurn,setCombatTurn,renderCombatTurns,
 COMBAT_STORE,COMBAT_TURNS
} from "./combat-view.js?v=1.4";
import {canPinCombat,openPinnedCombat,unsupportedPinText} from "./combat-pin.js?v=1.4";

const $=id=>document.getElementById(id);
const buildId=new URLSearchParams(window.location.search).get("build");
let rotation=null,active=1,pinned=null,pinOpening=false;
function setPinMessage(message=""){
 const status=$("combat-pin-status");
 status.hidden=!message;
 status.textContent=message;
}
function updatePinButton(){
 const btn=$("combat-pin"),activePin=!!pinned?.window&&!pinned.window.closed;
 btn.disabled=pinOpening;
 btn.setAttribute("aria-pressed",String(activePin));
 btn.textContent=activePin?"📌 Épinglée · retirer":"📌 Épingler";
 btn.title=activePin?"Fermer la fenêtre au premier plan":"Garder la rotation au premier plan";
}
async function togglePin(){
 if(pinned?.window&&!pinned.window.closed){pinned.close();return;}
 if(!canPinCombat(window)){setPinMessage(unsupportedPinText);return;}
 if(pinOpening||!buildId)return;
 pinOpening=true;updatePinButton();setPinMessage("");
 try{
  const next=await openPinnedCombat(window,buildId,localStorage,{
   onSync:()=>render(true),
   onClose:()=>{pinned=null;updatePinButton();setPinMessage("");}
  });
  pinned=next;
  setPinMessage("Épinglée au premier plan. Garde cette petite fenêtre d’origine ouverte.");
 }catch(error){
  setPinMessage("Impossible d’épingler : "+(error?.message||"fonction indisponible"));
 }finally{pinOpening=false;updatePinButton();}
}
function render(keepScroll=false){
 rotation=buildId?getCombatRotation(localStorage,buildId):null;
 if(!rotation){
  $("combat-build").textContent="Aucune rotation enregistrée";
  $("combat-info").textContent="Lance d'abord un calcul dans OMBRE.";
  $("combat-list").innerHTML='<p class="combat-empty">Calcule ton plan de combat depuis OMBRE, puis utilise « Ouvrir en petite fenêtre ».</p>';
  $("combat-current").textContent="—";$("combat-prev").disabled=true;$("combat-next").disabled=true;
  return;
 }
 active=getCombatTurn(localStorage,buildId,rotation.turns.length);
 $("combat-build").textContent=rotation.character+" · "+rotation.name;
 $("combat-info").textContent=rotation.turns.length+" tours · "+rotation.ap+" PA par tour";
 $("combat-current").textContent="Tour "+active+" / "+rotation.turns.length;
 $("combat-prev").disabled=active<=1;
 $("combat-next").disabled=active>=rotation.turns.length;
 const list=$("combat-list"),oldScroll=list.scrollTop;
 list.innerHTML=renderCombatTurns(rotation,active);
 if(keepScroll)list.scrollTop=oldScroll;
 else list.querySelector('.combat-turn.is-current')?.scrollIntoView({block:"nearest"});
}
function choose(n){
 if(!rotation)return;
 setCombatTurn(localStorage,buildId,n,rotation.turns.length);
 render();
 pinned?.refresh();
}
$("combat-list").addEventListener("click",e=>{
 const node=e.target.closest("button[data-combat-turn]");
 if(node)choose(Number(node.dataset.combatTurn));
});
$("combat-prev").addEventListener("click",()=>choose(active-1));
$("combat-next").addEventListener("click",()=>choose(active+1));
$("combat-window-close").addEventListener("click",()=>window.close());
$("combat-pin").addEventListener("click",togglePin);
window.addEventListener("storage",e=>{
 if(e.key===COMBAT_STORE || e.key===COMBAT_TURNS){render(true);pinned?.refresh(true);}
});
window.addEventListener("keydown",e=>{
 if(e.key==="ArrowRight"){e.preventDefault();choose(active+1);}
 if(e.key==="ArrowLeft"){e.preventDefault();choose(active-1);}
});
render();
updatePinButton();
