import {CLASSES,INITIAL_BUILDS,normalizeBuild} from "./classes.js?v=1.8";
import {cleanSettings,turnActionPoints} from "./engine.js?v=1.8";
import {
 SIZE,MAX_MONSTERS,MULTI_STORE,SHAPES,makeBoard,validateBoard,shapeHits,
 defaultShape,dist,selectedSpells,legalActions,manualActions,possibleTargets,replay,newHistory,
 addManual,nextTurn,undo
} from "./multi-core.js?v=2.1";
import {geometryFor,inMask,profileCoverage,MASK_LABELS} from "./spell-zones.js?v=2.0";
import {MULTI_CONTEXT_KEY,getMultiContext} from "./multi-build-link.js?v=2.1";

const $=id=>document.getElementById(id);
const deep=value=>JSON.parse(JSON.stringify(value));
const html=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Math.round(Number(v)))):fallback;
const get=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||"null")??fallback}catch{return fallback}};
const put=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
const profileList=get("ombre-builds-v1",null);
const builds=(Array.isArray(profileList)&&profileList.length?profileList:INITIAL_BUILDS)
 .filter(x=>CLASSES[x.classId]).map(normalizeBuild);
let build=null,context=null,board=makeBoard(),history=newHistory(),settingsTurnCount=3,basePA=12;
let tool="enemy",movingMonster=null,selectedSpell=null,hovered=null,lastResult=null,worker=null,requestNo=0,pip=null;
let mainContextSignature="",sessionVariants=[];
const storageKey=id=>MULTI_STORE+":"+id;
const COORDINATES_KEY="ombre-multi-show-coordinates-v1";
let showCoordinates=get(COORDINATES_KEY,true)!==false;
const cellLabel=(x,y)=>(x+1)+","+(y+1);
const selectedId=new URLSearchParams(location.search).get("build")||get("ombre-active-build-v1","sram-air-pvm");

function currentState(){return replay(workingContext(),board,history);}
function workingContext(){
 return {...context,settings:cleanSettings({
  ...context.settings,ap:basePA,turns:settingsTurnCount,
  apByTurn:history.paByTurn||{}
 })};
}
function setupContext(b){
 const linked=getMultiContext(localStorage,b.id);
 if(!linked||!linked.settings||!Array.isArray(linked.spells))
  throw Error("Ce build n’a pas encore été transmis par OMBRE. Ouvre « Combat multi-cibles » depuis la page principale.");
 build={...b,...linked.build,ap:linked.settings.ap,turns:linked.settings.turns};
 sessionVariants=linked.settings.variants.slice();
 context={
  build:linked.build,
  spells:linked.spells.map(sp=>({...sp,status:deep(sp.status||{})})),
  settings:cleanSettings({...linked.settings,classId:linked.build.classId})
 };
 mainContextSignature=linked.signature;
}
function loadBuild(id){
 const b=builds.find(x=>x.id===id)||builds[0];
 if(!b)return;
 stopWorker();
 try{setupContext(b);}
 catch(error){
  $("status").textContent=error.message;
  $("message").textContent=error.message;
  $("message").hidden=false;
  $("next-turn").disabled=true;
  $("recompute").disabled=true;
  return;
 }
 const snapshot=get(storageKey(b.id),null);
 const oldSignature=snapshot?.signature;
 board=validateBoard(snapshot?.board||makeBoard());
 history=oldSignature===mainContextSignature&&snapshot?.history
  ?sanitizedHistory(snapshot.history):newHistory();
 // The OMBRE build is the only source of truth for stats, spell rows,
 // variants and baseline PA. Only board, played actions and horizon are local.
 context.settings.variants=sessionVariants.slice();
 settingsTurnCount=oldSignature===mainContextSignature
  ?num(snapshot?.turns,1,10,context.settings.turns)
  :context.settings.turns;
 basePA=context.settings.ap;
 if(history.finished.length>=settingsTurnCount){
  history=newHistory();
 }
 selectedSpell=null;movingMonster=null;tool="enemy";lastResult=null;
 put("ombre-multi-selected-v1",b.id);
 $("build").value=b.id;
 $("build").disabled=true;
 $("ap").value=String(basePA);
 $("ap").disabled=true;
 $("turns").value=String(settingsTurnCount);
 $("hp").value=String(board.monsters[0]?.hp||10000);
 drawVariantOptions();
 drawShapeOptions();
 paint();
 requestPlan();
}
function sanitizedHistory(h){
 if(!h||!Array.isArray(h.finished)||!Array.isArray(h.current))return newHistory();
 const sanitizeAction=a=>a&&typeof a.name==="string"&&
  (a.center===null||a.center&&Number.isInteger(a.center.x)&&Number.isInteger(a.center.y))
  ?{name:a.name.slice(0,75),center:a.center===null?null:{x:a.center.x,y:a.center.y}}:null;
 const sanitizeList=list=>Array.isArray(list)?list.slice(0,20).map(sanitizeAction).filter(Boolean):[];
 const paByTurn={};
 for(const [key,val] of Object.entries(h.paByTurn||{})){
  const t=num(key,0,11,-1),v=num(val,0,31,-1);
  if(t>=1&&t<=10&&v>=1&&v<=30)paByTurn[t]=v;
 }
 return {finished:h.finished.slice(0,10).map(sanitizeList),current:sanitizeList(h.current),paByTurn};
}
function save(){
 if(!build)return;
 put(storageKey(build.id),{
  board,history,variants:sessionVariants.slice(),ap:basePA,turns:settingsTurnCount,signature:mainContextSignature
 });
}
function stopWorker(){requestNo++;if(worker){worker.terminate();worker=null;}}
function inform(message=""){const el=$("message");el.textContent=message;el.hidden=!message;}
function confirmLayout(){
 if(history.current.length||history.finished.length){
  if(!window.confirm("Modifier la grille redémarrera ce combat multi-cibles. Continuer ?"))return false;
 }
 history=newHistory();lastResult=null;selectedSpell=null;
 return true;
}
function setTool(value){
 tool=value;
 movingMonster=null;
 if(value!=="target")selectedSpell=null;
 document.querySelectorAll("[data-tool]").forEach(button=>button.classList.toggle("active",button.dataset.tool===tool));
 paint();
}
function layoutClick(x,y){
 const enemy=board.monsters.find(m=>m.x===x&&m.y===y);
 const isHero=board.hero.x===x&&board.hero.y===y;
 if(tool==="target"){
  if(!selectedSpell)return inform("Choisis d’abord un sort dans la liste à droite.");
  // Cast centers can be EMPTY squares, including the center of
  // Fourvoiement's four-cell cross.
  performAction(selectedSpell,{x,y});return;
 }
 if(tool==="hero"){
  if(isHero)return;
  if(!confirmLayout())return;
  if(enemy)board.monsters=board.monsters.filter(m=>m.id!==enemy.id);
  board.hero={x,y};
 }else if(tool==="erase"){
  if(!enemy)return;
  if(!confirmLayout())return;
  board.monsters=board.monsters.filter(m=>m.id!==enemy.id);
 }else{
  if(enemy){movingMonster=enemy.id;inform("Monstre sélectionné : clique une case vide pour le déplacer.");paint();return;}
  if(isHero)return inform("Déplace d’abord ton personnage bleu.");
  if(!confirmLayout())return;
  if(movingMonster){
   const moving=board.monsters.find(m=>m.id===movingMonster);
   if(moving){moving.x=x;moving.y=y;}
   movingMonster=null;
  }else{
   if(board.monsters.length>=MAX_MONSTERS)return inform("Maximum : 8 monstres.");
   board.monsters.push({id:"m"+(board.monsters.length+1),x,y,hp:num($("hp").value,100,1000000,10000)});
  }
 }
 board=validateBoard(board);save();inform("");drawShapeOptions();paint();requestPlan();
}
function changeCount(count){
 const n=num(count,1,MAX_MONSTERS,3);
 if(!confirmLayout()){paint();return;}
 board.monsters=board.monsters.slice(0,n);
 const free=[];
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)
  if((x!==board.hero.x||y!==board.hero.y)&&!board.monsters.some(m=>m.x===x&&m.y===y))free.push({x,y});
 free.sort((a,b)=>dist(board.hero,a)-dist(board.hero,b)||a.y-b.y||a.x-b.x);
 while(board.monsters.length<n&&free.length){
  const p=free.shift();
  board.monsters.push({id:"m"+(board.monsters.length+1),...p,hp:num($("hp").value,100,1000000,10000)});
 }
 board=validateBoard(board);save();paint();requestPlan();
}
function drawBoard(){
 const boardEl=$("board"),monsters=currentMonsterMap();
 const placed=(()=>{try{return currentState().placedTraps||[]}catch{return []}})();
 const ctx=workingContext();
 let aim=hovered,legalCenters=new Set(),spell=null,mask="single";
 if(selectedSpell){
  spell=ctx.spells.find(s=>s.name===selectedSpell);
  if(spell){
   mask=board.shapes[spell.name]||geometryFor(spell,build.classId).mask;
   try{legalCenters=new Set(manualActions(currentState(),ctx).filter(a=>a.spell.name===selectedSpell&&a.center)
    .map(a=>a.center.x+","+a.center.y));}catch{}
   if(!aim){aim={...board.hero};}
  }
 }
 let markup="";
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  const enemy=board.monsters.find(m=>m.x===x&&m.y===y);
  const hero=board.hero.x===x&&board.hero.y===y;
  const hp=enemy&&monsters.get(enemy.id);
  const zone=!!spell&&aim&&inMask(aim,{x,y},mask,board.hero);
  const spread=!!spell&&spell.name==="Épidémie"&&aim&&Math.abs(aim.x-x)+Math.abs(aim.y-y)<=2&&!(aim.x===x&&aim.y===y);
  const onCell=placed.filter(t=>t.center.x===x&&t.center.y===y);
  const canAim=legalCenters.has(x+","+y);
  const isAim=!!aim&&aim.x===x&&aim.y===y&&!!spell;
  const classes=["board-cell",hero?"hero":"",enemy?"enemy":"",zone?"zone":"",spread?"spread":"",
   canAim?"castable":"",isAim?"aim":"",enemy?.id===movingMonster?"targeted":""].filter(Boolean).join(" ");
  const label=hero?"Ton personnage":enemy?"Monstre "+enemy.id.slice(1)+(hp?" (PV "+Math.round(hp.hp)+")":""):"Case libre";
  const coords=cellLabel(x,y);
  markup+='<button type="button" class="'+classes+'" data-x="'+x+'" data-y="'+y+
   '" title="'+html(label)+' — '+coords+'" aria-label="'+html(label)+', case '+coords+'">'+
   (showCoordinates?'<span class="cell-coordinate" aria-hidden="true">'+coords+'</span>':"")+
   (hero?'<span class="marker">TOI</span>':enemy?'<span class="marker">'+html(enemy.id.slice(1))+'</span>':"")+ (onCell.length?'<span class="trap-mark">◇'+onCell.length+'</span>':'')+'</button>';
 }
 boardEl.innerHTML=markup;
 $("count").value=String(board.monsters.length);
}
function currentMonsterMap(){
 try{return new Map(currentState().monsters.map(x=>[x.id,x]));}catch{return new Map();}
}
function drawVariantOptions(){
 const cls=CLASSES[build.classId],holder=$("multi-variants");
 holder.innerHTML=cls.pairs.map((pair,i)=>
  '<label>Variante '+(i+1)+'<select disabled title="Modifiable dans OMBRE" data-variant-pair="'+i+'">'+
   pair.map(name=>'<option value="'+html(name)+'"'+(name===sessionVariants[i]?' selected':'')+'>'+html(name)+'</option>').join("")+
   '</select></label>'
 ).join("");
}
function showShapeInfo(){
 const name=$("shape-spell").value;
 const spell=context.spells.find(x=>x.name===name);
 if(!spell)return;
 const profile=geometryFor(spell,build.classId);
 const shape=board.shapes[name]||profile.mask;
 const changed=shape!==profile.mask;
 const confirmation=profile.confidence==="verified"?"Forme vérifiée":
  profile.confidence==="approximate"?"Forme indicative":"Forme non vérifiée";
 const node=$("shape-info");
 node.classList.toggle("warning-zone",profile.confidence!=="verified"||changed);
 node.textContent=confirmation+" : "+(MASK_LABELS[shape]||shape)+
  (changed?" (gabarit personnalisé)":"")+". "+profile.notes+
  " Source : "+(profile.source||"non renseignée")+".";
}
function drawShapeOptions(){
 const list=selectedSpells(workingContext());
 const el=$("shape-spell"),chosen=list.some(x=>x.name===el.value)?el.value:
  list.find(x=>x.name==="Fourvoiement"||x.name==="Furie")?.name||list[0]?.name;
 el.innerHTML=list.map(s=>'<option value="'+html(s.name)+'">'+html(s.name)+'</option>').join("");
 if(chosen)el.value=chosen;
 $("shape").value=board.shapes[el.value]||geometryFor(list.find(s=>s.name===el.value),build.classId).mask;
 showShapeInfo();
}
function paint(){
 if(!context)return;
 const ctx=workingContext();
 let state;
 try{state=replay(ctx,board,history);}
 catch(err){
  inform("Les actions sauvegardées ne correspondent plus à la situation : "+err.message);
  history=newHistory();state=replay(ctx,board,history);save();
 }
 const turn=state.engine.turn,done=turn>settingsTurnCount||!state.monsters.some(m=>m.hp>0);
 const budget=turnActionPoints(state.settings,turn);
 $("build-label").textContent=context.build.character+" · "+context.build.name;
 $("linked-source").textContent="🔗 Build actif OMBRE · "+context.build.character+
  " · "+basePA+" PA · "+sessionVariants.length+" variantes · "+
  (context.settings.criticals?"critiques activés":"critiques désactivés")+
  ". Les dégâts, buffs et résistances sont les mêmes paramètres que dans l'optimiseur principal.";
 $("turn-label").textContent="Tour "+Math.min(turn,settingsTurnCount)+" / "+settingsTurnCount+(done?" · terminé":"");
 $("pa-label").textContent=(done?0:state.engine.pa)+" / "+(done?basePA:budget)+" PA";
 $("pa-bar").style.width=done?"100%":Math.round((budget-state.engine.pa)/Math.max(1,budget)*100)+"%";
 $("turn-ap").value=String(done?basePA:budget);
 $("turn-ap").disabled=done;
 $("pa-minus").disabled=done||budget<=Math.max(1,budget-state.engine.pa);
 $("pa-plus").disabled=done||budget>=30;
 $("pa-reset").disabled=done||budget===basePA;
 $("next-turn").disabled=done;
 $("undo").disabled=!history.current.length&&!history.finished.length;
 $("picked").innerHTML=state.actions.length?state.actions.map(a=>
  '<span class="chip">'+html(a.name)+(a.center?" → M"+html(board.monsters.find(m=>m.x===a.center.x&&m.y===a.center.y)?.id.slice(1)||"?"):"")+
  ' · '+a.pa+' PA</span>').join(""):"Aucun sort joué pour ce tour.";
 drawBoard();
 const legal=done?[]:manualActions(state,ctx);
 const byName=new Map();
 for(const action of legal)if(!byName.has(action.spell.name))byName.set(action.spell.name,action.spell);
 const q=$("search").value.trim().toLocaleLowerCase("fr");
 const choices=selectedSpells(ctx).filter(s=>!q||s.name.toLocaleLowerCase("fr").includes(q));
 $("spells").innerHTML=choices.map(s=>{
  const enabled=byName.has(s.name);
  const profile=geometryFor(s,build.classId);
  const explanation=!enabled?"Hors de portée, limite de lancer, relance ou PA insuffisants":
   profile.confidence==="verified"?profile.notes:
   "Géométrie non validée, aperçu prudent : "+profile.notes;
  return '<button data-spell="'+html(s.name)+'" type="button" class="'+(selectedSpell===s.name?"active":"")+
   '" '+(!enabled?"disabled":"")+' title="'+html(explanation||s.utility||"Choisir ce sort")+'"><span>'+html(s.name)+'</span><small>'+s.pa+' PA</small></button>';
 }).join("");
 if(!lastResult)$("damage-by-target").innerHTML=state.monsters.map(m=>
  '<span>M'+html(m.id.slice(1))+' : '+Math.round(m.damage).toLocaleString("fr-FR")+' dégâts déjà simulés</span>').join("");
}
function performAction(name,center){
 try{
  const next=addManual(workingContext(),board,history,name,center);
  history={...next,paByTurn:{...(history.paByTurn||{})}};
  selectedSpell=null;tool="enemy";hovered=null;
  inform("");save();paint();requestPlan();
 }catch(error){inform(error.message||String(error));}
}
function adjustPA(newValue){
 const n=Number(newValue);
 if(!Number.isInteger(n)||n<1||n>30){inform("Entre un total de PA entier entre 1 et 30.");paint();return;}
 const state=currentState();
 const turn=state.engine.turn;
 if(turn>settingsTurnCount)return;
 const spent=turnActionPoints(state.settings,turn)-state.engine.pa;
 if(n<spent){inform("Tu as déjà dépensé "+spent+" PA ce tour. Choisis au moins "+spent+".");paint();return;}
 history.paByTurn={...(history.paByTurn||{})};
 if(n===basePA)delete history.paByTurn[turn];
 else history.paByTurn[turn]=n;
 inform("");save();paint();requestPlan();
}
function requestPlan(){
 stopWorker();lastResult=null;
 $("recommendations").innerHTML="";
 $("future").innerHTML="";
 if(!board.monsters.length){$("status").textContent="Place au moins un monstre.";return;}
 const state=currentState();
 if(state.engine.turn>settingsTurnCount){$("status").textContent="Horizon terminé. Recommence pour un nouveau combat.";return;}
 $("status").textContent="Recherche des meilleurs dégâts multi-cibles…";
 if(typeof Worker==="undefined"){$("status").textContent="Ce navigateur ne prend pas en charge le calcul en arrière-plan.";return;}
 const id=++requestNo;
 try{
  worker=new Worker(new URL("./multi-worker.js?v=2.1",import.meta.url),{type:"module"});
  worker.onmessage=e=>{
   if(requestNo!==id)return;
   const data=e.data||{};
   worker?.terminate();worker=null;
   if(data.type==="error"){$("status").textContent="Calcul indisponible.";inform(data.message);return;}
   lastResult=data.result;
   showResult(lastResult);
  };
  worker.onerror=e=>{
   if(requestNo!==id)return;
   $("status").textContent="Erreur du calculateur.";inform(e.message||"L'optimisation n'a pas abouti.");
   worker?.terminate();worker=null;
  };
  worker.postMessage({context:workingContext(),board,history});
 }catch(e){$("status").textContent="Impossible de lancer le calcul.";inform(e.message);}
}
function showResult(result){
 if(!result){$("status").textContent="Aucune cible disponible ou combat terminé.";return;}
 const already=history.current.length;
 const actions=result.current?.actions?.slice(already)||[];
 const direct=result.current?.direct||0;
 const total=result.current?.total||0;
 $("status").textContent=actions.length?
  "Proposition : "+actions.length+" sort(s) · "+actions.reduce((n,a)=>n+a.pa,0)+
   " PA restants à jouer · tour estimé "+Math.round(total).toLocaleString("fr-FR")+" dégâts.":
  "La meilleure option estimée est de finir ton tour.";
 $("recommendations").innerHTML=actions.length?actions.map((a,i)=>
  '<button type="button" data-recommend="'+i+'">'+html(a.name)+(a.center?" → ("+(a.center.x+1)+","+(a.center.y+1)+")":"")+
  ' · '+a.pa+' PA'+(a.targets.length>1?" · "+a.targets.length+" cibles":"")+'</button>').join(""):
  '<span class="muted">Aucun sort supplémentaire conseillé.</span>';
 $("future").innerHTML=(result.future||[]).map(t=>
  '<p>T'+t.turn+' · '+t.actions.map(a=>html(a.name)+(a.targets.length>1?" ("+a.targets.length+" cibles)":"")).join(" → ")+
  ' · '+Math.round(t.total).toLocaleString("fr-FR")+' dégâts</p>').join("")||'<p>Pas de tour suivant dans cet horizon.</p>';
 $("damage-by-target").innerHTML=result.targetDamage.map(t=>
  '<span>M'+html(t.id.slice(1))+' : '+Math.round(t.damage).toLocaleString("fr-FR")+
  ' dégâts, '+Math.round(t.remainingHp).toLocaleString("fr-FR")+' PV restants</span>').join("");
}
function goNext(){
 try{
  const st=currentState();if(st.engine.turn>settingsTurnCount)return;
  history={...nextTurn(history),paByTurn:{...(history.paByTurn||{})}};
  inform("");save();paint();requestPlan();
 }catch(e){inform(e.message);}
}
function restart(){
 if(!window.confirm("Recommencer ce combat multi-cibles depuis le tour 1 ?"))return;
 history=newHistory();lastResult=null;selectedSpell=null;
 save();paint();requestPlan();
}
function updateSettings(){
 if(!confirmLayout()){paint();return;}
 basePA=context.settings.ap; // controlled by OMBRE
 settingsTurnCount=num($("turns").value,1,10,context.settings.turns);
 save();paint();requestPlan();
}
function resetBoard(){
 if(!confirmLayout())return;
 board=makeBoard();$("hp").value=10000;save();inform("");drawShapeOptions();paint();requestPlan();
}
function switchShape(){
 if(!confirmLayout()){drawShapeOptions();paint();return;}
 const spell=$("shape-spell").value,value=$("shape").value;
 if(!SHAPES[value])return;
 board.shapes[spell]=value;
 save();paint();requestPlan();
}
function pin(){
 if(window.self!==window.top)return inform("L'épingle doit être utilisée dans la fenêtre indépendante.");
 if(pip&&!pip.closed){pip.close();return;}
 if(!window.documentPictureInPicture?.requestWindow||!window.isSecureContext)return inform("Épinglage disponible sur Chrome/Edge PC en HTTPS.");
 // Must be called from direct click without an await preceding the request.
 const req=window.documentPictureInPicture.requestWindow({width:520,height:820});
 req.then(p=>{
  pip=p;
  const d=p.document;
  d.title="OMBRE — Multi-cibles épinglé";
  d.body.style.cssText="margin:0;background:#121826;overflow:hidden";
  const iframe=d.createElement("iframe");
  const url=new URL("./multi-combat.html",window.location.href);
  url.searchParams.set("build",build.id);
  url.searchParams.set("embedded","pip");
  iframe.src=url.href;iframe.style.cssText="width:100%;height:100vh;border:0";
  d.body.append(iframe);
  $("pin").textContent="📌 Épinglée";$("pin").setAttribute("aria-pressed","true");
  p.addEventListener("pagehide",()=>{pip=null;$("pin").textContent="📌 Épingler";$("pin").setAttribute("aria-pressed","false");});
 }).catch(e=>inform("Épinglage impossible : "+e.message));
}
function bindEvents(){
 // One-based coordinates match the numbers on proposed cast buttons.
 $("show-coordinates").checked=showCoordinates;
 $("show-coordinates").addEventListener("change",event=>{
  showCoordinates=!!event.target.checked;
  put(COORDINATES_KEY,showCoordinates);
  drawBoard(); // visual-only preference: does not reset a turn or rerun DPS
 });
 // The build selector is read-only. Change characters in OMBRE itself.
 document.querySelectorAll("[data-tool]").forEach(b=>b.addEventListener("click",()=>setTool(b.dataset.tool)));
 $("layout-reset").addEventListener("click",resetBoard);
 $("board").addEventListener("click",event=>{
  const cell=event.target.closest("button[data-x]");if(!cell)return;
  layoutClick(Number(cell.dataset.x),Number(cell.dataset.y));
 });
 $("board").addEventListener("mouseover",event=>{
  if(!selectedSpell)return;
  const cell=event.target.closest("button[data-x]");if(!cell)return;
  if(hovered?.x===+cell.dataset.x&&hovered?.y===+cell.dataset.y)return;
  hovered={x:+cell.dataset.x,y:+cell.dataset.y};drawBoard();
 });
 $("count").addEventListener("change",e=>changeCount(e.target.value));
 $("hp").addEventListener("change",e=>{
  if(!confirmLayout()){$("hp").value=board.monsters[0]?.hp||10000;return;}
  const hp=num(e.target.value,100,1000000,10000);
  board.monsters.forEach(m=>m.hp=hp);save();paint();requestPlan();
 });
 $("ap").addEventListener("change",updateSettings);
 $("turns").addEventListener("change",updateSettings);
 $("shape-spell").addEventListener("change",()=>{
  const s=context.spells.find(x=>x.name===$("shape-spell").value);
  $("shape").value=board.shapes[$("shape-spell").value]||geometryFor(s,build.classId).mask;
  showShapeInfo();
 });

 $("turn-ap").addEventListener("change",e=>adjustPA(e.target.value));
 $("pa-minus").addEventListener("click",()=>adjustPA(Number($("turn-ap").value)-1));
 $("pa-plus").addEventListener("click",()=>adjustPA(Number($("turn-ap").value)+1));
 $("pa-reset").addEventListener("click",()=>adjustPA(basePA));
 $("spells").addEventListener("click",e=>{
  const b=e.target.closest("button[data-spell]");if(!b||b.disabled)return;
  const name=b.dataset.spell,spell=context.spells.find(s=>s.name===name);
  const profile=geometryFor(spell,build.classId);
  if(profile.mode==="self"){performAction(name,null);return;}
  if(profile.mode==="selfArea"){performAction(name,board.hero);return;}
  selectedSpell=name;tool="target";hovered=null;
  $("shape-spell").value=name;
  $("shape").value=board.shapes[name]||profile.mask;
  showShapeInfo();
  inform(profile.mode==="enemy"?"Clique sur le monstre que tu vises.":
   profile.mode==="free"?"Clique sur une case LIBRE pour poser le sort.":
   "Clique sur une case centrale, même vide, pour voir et toucher la zone.");
  paint();
 });
 $("recommendations").addEventListener("click",e=>{
  const b=e.target.closest("button[data-recommend]");
  const rec=lastResult?.current?.actions?.slice(history.current.length)[Number(b?.dataset.recommend)];
  if(rec)performAction(rec.name,rec.center);
 });
 $("search").addEventListener("input",paint);
 $("next-turn").addEventListener("click",goNext);
 $("restart").addEventListener("click",restart);
 $("undo").addEventListener("click",()=>{
  history={...undo(history),paByTurn:{...(history.paByTurn||{})}};
  save();inform("");paint();requestPlan();
 });
 $("recompute").addEventListener("click",requestPlan);
 $("pin").addEventListener("click",pin);
 window.addEventListener("storage",e=>{
  if(e.key===COORDINATES_KEY){
   showCoordinates=get(COORDINATES_KEY,true)!==false;
   $("show-coordinates").checked=showCoordinates;
   drawBoard();
  }
  if(e.key===MULTI_CONTEXT_KEY&&build){
   const fresh=getMultiContext(localStorage,build.id);
   if(fresh?.signature!==mainContextSignature){
    // Build changed in OMBRE while the multi-mode was open.
    loadBuild(build.id);
    inform("Build OMBRE actualisé. Les actions précédentes ont été réinitialisées si les réglages ont changé.");
   }
  }
  if(e.key===storageKey(build?.id)){
   const saved=get(e.key,null);
   if(saved){
    board=validateBoard(saved.board);history=sanitizedHistory(saved.history);
    // Variants are always read from the live OMBRE context, not from a past multi session.
    drawVariantOptions();drawShapeOptions();paint();requestPlan();
   }
  }
 });
 const embedded=new URLSearchParams(location.search).get("embedded");
 if(embedded==="pip"||embedded==="ombre"){
  $("pin").hidden=true;
  const standaloneLink=document.querySelector(".top-actions a");
  if(standaloneLink)standaloneLink.hidden=true;
 }
}
$("build").innerHTML=builds.map(b=>'<option value="'+html(b.id)+'">'+html(b.character+" · "+b.name)+'</option>').join("");
bindEvents();
loadBuild(selectedId);
