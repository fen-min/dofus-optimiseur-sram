import {
 getCombatRotation,getCombatTurn,setCombatTurn,renderCombatTurns
} from "./combat-view.js?v=1.4";

/**
 * Document Picture-in-Picture creates a browser-controlled always-on-top window.
 * A standard window.open() popup cannot be made always-on-top by a website.
 * This feature requires HTTPS, a compatible desktop browser, and a user click.
 */
export function canPinCombat(host){
 return !!(host?.isSecureContext!==false &&
   typeof host?.documentPictureInPicture?.requestWindow==="function");
}
export const unsupportedPinText=
 "Épinglage non pris en charge ici. Ouvre OMBRE dans Chrome ou Edge sur ordinateur (HTTPS).";

const markup=[
 '<main class="combat-popout-main combat-pin-main">',
 ' <div class="combat-drawer-top">',
 '  <div class="combat-kicker">📌 OMBRE / AU PREMIER PLAN</div>',
 '  <button id="pip-unpin" type="button" class="combat-close" aria-label="Retirer l’épingle">✕</button>',
 ' </div>',
 ' <div class="combat-identity">',
 '  <strong id="pip-build">Rotation</strong>',
 '  <small id="pip-info">Liste des tours</small>',
 ' </div>',
 ' <div class="combat-controls">',
 '  <button id="pip-prev" type="button" aria-label="Tour précédent">←</button>',
 '  <strong id="pip-current" aria-live="polite">Tour 1</strong>',
 '  <button id="pip-next" type="button" aria-label="Tour suivant">→</button>',
 ' </div>',
 ' <div id="pip-list" class="combat-list" aria-label="Liste des sorts de chaque tour"></div>',
 ' <div class="combat-footer">',
 '  <small>📌 Fenêtre épinglée · garde l’onglet OMBRE ouvert</small>',
 ' </div>',
 '</main>'
].join("");

/**
 * Call ONLY from the pin button's click listener (transient user activation).
 * Returns a controller whose refresh() synchronizes same-document changes.
 * The window goes away if the source tab/window is closed.
 */
export async function openPinnedCombat(host,buildId,storage,{onSync=()=>{},onClose=()=>{}}={}){
 if(!canPinCombat(host))throw new Error(unsupportedPinText);
 // No await before this call: requestWindow requires a direct user gesture.
 const pinWindow=await host.documentPictureInPicture.requestWindow({
  width:390,height:620,disallowReturnToOpener:true
 });
 const doc=pinWindow.document;
 doc.title="OMBRE — Rotation épinglée";
 doc.documentElement.lang="fr";
 const stylesheet=doc.createElement("link");
 stylesheet.rel="stylesheet";
 stylesheet.href=new URL("../combat.css?v=1.4",import.meta.url).href;
 doc.head.append(stylesheet);
 doc.body.className="combat-popout";
 doc.body.innerHTML=markup;
 const $=id=>doc.getElementById(id);
 let active=1,closed=false;
 const refresh=(keepScroll=false)=>{
  if(closed||pinWindow.closed)return;
  const rotation=getCombatRotation(storage,buildId);
  if(!rotation){
   $("pip-build").textContent="Rotation indisponible";
   $("pip-info").textContent="Relance le calcul dans OMBRE.";
   $("pip-list").innerHTML='<p class="combat-empty">Aucune rotation enregistrée pour ce build.</p>';
   $("pip-current").textContent="—";
   $("pip-prev").disabled=true;$("pip-next").disabled=true;
   return;
  }
  active=getCombatTurn(storage,buildId,rotation.turns.length);
  $("pip-build").textContent=rotation.character+" · "+rotation.name;
  $("pip-info").textContent=rotation.turns.length+" tours · "+rotation.ap+" PA / tour";
  $("pip-current").textContent="Tour "+active+" / "+rotation.turns.length;
  $("pip-prev").disabled=active<=1;
  $("pip-next").disabled=active>=rotation.turns.length;
  const list=$("pip-list"),savedScroll=list.scrollTop;
  list.innerHTML=renderCombatTurns(rotation,active);
  if(keepScroll)list.scrollTop=savedScroll;
  else list.querySelector(".combat-turn.is-current")?.scrollIntoView({block:"nearest"});
 };
 const choose=(n)=>{
  const rotation=getCombatRotation(storage,buildId);
  if(!rotation)return;
  setCombatTurn(storage,buildId,n,rotation.turns.length);
  refresh();
  onSync();
 };
 $("pip-list").addEventListener("click",e=>{
  const t=e.target.closest("button[data-combat-turn]");
  if(t)choose(Number(t.dataset.combatTurn));
 });
 $("pip-prev").addEventListener("click",()=>choose(active-1));
 $("pip-next").addEventListener("click",()=>choose(active+1));
 $("pip-unpin").addEventListener("click",()=>pinWindow.close());
 pinWindow.addEventListener("keydown",e=>{
  if(e.key==="ArrowRight"){e.preventDefault();choose(active+1);}
  else if(e.key==="ArrowLeft"){e.preventDefault();choose(active-1);}
 });
 const fromOtherWindow=e=>{
  if(e.key==="ombre-quick-rotations-v1"||e.key==="ombre-quick-current-turn-v1")refresh(true);
 };
 host.addEventListener("storage",fromOtherWindow);
 pinWindow.addEventListener("pagehide",()=>{
  closed=true;
  host.removeEventListener("storage",fromOtherWindow);
  onClose();
 },{once:true});
 refresh();
 return {window:pinWindow,refresh,close:()=>pinWindow.close()};
}
