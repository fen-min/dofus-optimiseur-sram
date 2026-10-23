import {CLASSES} from "./classes.js?v=1.8";
import {
 TEAM_STORAGE_KEY,TEAM_LIMIT,RESIST_ELEMENTS,defaultTeamTarget,cleanTeamTarget,
 teamMembers,createTeamContext,cleanTeamMemberOptions
} from "./team-core.js?v=3.1";

const safe=s=>String(s??"").replace(/[&<>"']/g,ch=>({
 "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[ch]));
const fmt=n=>new Intl.NumberFormat("fr-FR",{maximumFractionDigits:1}).format(n||0);
const readStore=()=>{
 try{const data=JSON.parse(localStorage.getItem(TEAM_STORAGE_KEY)||"null");return data&&typeof data==="object"?data:null;}
 catch{return null;}
};
const saveStore=(ids,target,memberOptions)=>{
 // Do not re-save obsolete manual buff controls from the earlier team UI.
 const paOnly=Object.fromEntries(Object.entries(memberOptions||{}).map(([id,options])=>[
  id,{ap:options.ap}
 ]));
 try{localStorage.setItem(TEAM_STORAGE_KEY,JSON.stringify({ids,target,memberOptions:paOnly}));}catch{}
};

export function mountTeamModule({getBuilds}){
 const root=document.getElementById("tab-team");
 if(!root)return {refresh(){}};
 const $=id=>root.querySelector("#"+id);
 const saved=readStore();
 let ids=Array.isArray(saved?.ids)?saved.ids.slice(0,TEAM_LIMIT):
  getBuilds().slice(0,2).map(b=>b.id);
 let target=cleanTeamTarget(saved?.target||defaultTeamTarget());
 const storedOptions=saved?.memberOptions&&typeof saved.memberOptions==="object"&&!Array.isArray(saved.memberOptions)
  ?saved.memberOptions:{};
 let memberOptions=Object.fromEntries(Object.entries(storedOptions).map(([id,options])=>[id,{
  ap:options?.ap
 }]));
 let result=null,activeTurn=1,worker=null,job=0;
 let previousSignature="";
 const getMembers=()=>teamMembers(getBuilds(),ids);
 const storeState=()=>saveStore(ids,target,memberOptions);
 const memberSettings=b=>cleanTeamMemberOptions(b,memberOptions[b.id]);
 const status=text=>{$("team-status").textContent=text;};
 function cancel(){
  job++;
  if(worker){worker.terminate();worker=null;}
  $("team-calculate").disabled=false;
  $("team-cancel").disabled=true;
 }
 function renderMembers(){
  const roster=getMembers(),all=getBuilds().filter(b=>CLASSES[b.classId]);
  const taken=new Set(roster.map(b=>b.id));
  // Always show eight physical slots even when only two builds exist.
  $("team-members").innerHTML=Array.from({length:TEAM_LIMIT},(_,i)=>{
   const b=roster[i];
   const cls=b?CLASSES[b.classId]:null;
   const settings=b?memberSettings(b):null;
   const options=['<option value="">＋ Choisir un personnage</option>',...all.map(other=>
    '<option value="'+safe(other.id)+'"'+(b?.id===other.id?' selected':'')+
    (taken.has(other.id)&&b?.id!==other.id?' disabled':'')+'>'+
    safe(other.character+" — "+other.name)+'</option>')].join("");
   const extra=b?'<label class="team-slot-pa" aria-label="PA du personnage">PA '+
    '<input type="number" data-team-ap="'+safe(b.id)+'" min="6" max="20" step="1" value="'+settings.ap+'" aria-label="PA de '+safe(b.character)+'"></label>':'';
   return '<article class="team-slot'+(b?' is-filled':'')+'"'+(cls?' style="--team-accent:'+cls.color+'"':'')+'>'+
    '<span class="team-slot-order">'+(i+1)+'</span>'+
    '<span class="team-slot-icon" aria-hidden="true">'+(cls?safe(cls.glyph):'＋')+'</span>'+
    '<div class="team-slot-body"><label for="team-pick-'+i+'">'+(b?safe(b.character):'Emplacement libre')+'</label>'+
    '<select id="team-pick-'+i+'" data-team-slot="'+i+'" aria-label="Personnage en position '+(i+1)+'">'+options+'</select>'+
    '<small>'+(b?(b.initiative===null?'Initiative non renseignée':fmt(b.initiative)+' initiative')+
     ' · '+safe(cls.name):'Choisir parmi Personnages & builds')+'</small>'+extra+'</div></article>';
  }).join("");
  $("team-count").textContent=roster.length+" / "+TEAM_LIMIT+" personnages";
 }
 function renderTarget(){
  $("team-hp").value=String(target.hp);
  $("team-turns").value=String(target.turns);
  $("team-critical").checked=target.criticals;
  for(const name of RESIST_ELEMENTS)$("team-res-"+name).value=String(target.resistances[name]);
 }
 function renderResult(){
  const present=!!result;
  const turn=result?.turns[activeTurn-1];
  $("team-turn-select").disabled=!present;
  $("team-turn-select").innerHTML=present?result.turns.map(t=>
   '<option value="'+t.number+'"'+(t.number===activeTurn?' selected':'')+'>Tour '+t.number+' / '+result.turns.length+'</option>').join(""):
   '<option value="">Calcule d\'abord une rotation</option>';
  $("team-turn-buttons").innerHTML=present?result.turns.map(t=>
   '<button type="button" data-team-turn="'+t.number+'" class="'+(t.number===activeTurn?'is-current':'')+
   '" aria-pressed="'+(t.number===activeTurn)+'">Tour '+t.number+'</button>').join(""):"";
  $("team-rotations").innerHTML=present?turn.actors.map((a,i)=>
   '<div class="team-rotation-item"><div class="team-rotation-heading"><span>'+
   '<b>'+String(i+1).padStart(2,"0")+'</b> '+safe(a.character)+'</span><strong>'+fmt(a.damage)+' dégâts</strong></div>'+
   '<div class="team-rotation-spells">'+(a.actions.length?a.actions.map(s=>
    '<span class="team-spell-chip'+(s.autoRefreshed?' is-buff-refreshed':'')+'"'+(s.autoRefreshed?' title="Buff expiré : relance automatique"':'')+'>'+
     (s.autoRefreshed?'↻ ':'')+safe(s.name)+' <small>'+safe(s.pa)+' PA</small></span>').join(""):
    '<span class="team-empty-actions">Passer ce tour</span>')+'</div>'+
   '<div class="team-rotation-meta">'+fmt(a.spent)+' PA utilisés · directs '+fmt(a.direct)+
   ' · différés '+fmt(a.poison)+
   (a.health?' · PV estimés '+fmt(a.health.hp)+'/'+fmt(a.health.maxHp)+
    ' · Souffrance '+safe(a.health.suffering):'')+
   (activeTurn===1&&result.members.find(m=>m.id===a.id)?.chosenOpening?
    ' · ouverture choisie : '+safe(result.members.find(m=>m.id===a.id).chosenOpening):'')+
   '</div></div>').join(""):
   '<p class="team-placeholder">Choisis tes personnages à droite, règle la cible et lance le calcul pour voir les sorts conseillés, classés par initiative.</p>';
  $("team-damage").innerHTML=present?
   '<div class="team-numbers"><div><small>Dégâts théoriques</small><strong>'+fmt(result.theoretical)+'</strong></div>'+
   '<div><small>Dégâts directs</small><strong>'+fmt(result.direct)+'</strong></div>'+
   '<div><small>Poison / différés</small><strong>'+fmt(result.poison)+'</strong></div>'+
   '<div><small>Dégâts limités aux PV</small><strong>'+fmt(result.effective)+'</strong></div>'+
   '<div><small>Moyenne / tour</small><strong>'+fmt(result.averagePerTurn)+'</strong></div></div>'+
   '<div class="team-target-life"><div><span>PV de la cible</span><strong>'+fmt(turn.remainingHp)+' / '+fmt(result.target.hp)+'</strong></div>'+
    '<meter min="0" max="'+result.target.hp+'" value="'+turn.remainingHp+'">'+fmt(turn.remainingHp)+'</meter>'+
   '</div><div class="team-contributions"><h3>Contribution par personnage</h3>'+
   result.members.map(m=>'<div class="team-contribution"><span>'+safe(m.character)+'</span><b>'+fmt(m.estimated)+'</b>'+
    '<div class="team-contribution-track"><i style="width:'+(result.theoretical?Math.min(100,100*m.estimated/result.theoretical):0)+'%"></i></div></div>').join("")+
   '</div><div class="team-round-totals"><h3>Dégâts cumulés par tour</h3>'+
   result.turns.map(t=>'<div>T'+t.number+' <strong>'+fmt(t.theoretical)+
    '</strong> · cible : '+fmt(t.remainingHp)+' PV</div>').join("")+'</div>'+
   '<p class="team-footnote">Excès de dégâts théorique : '+fmt(result.overkill)+
    '. Les dégâts affichés sont des estimations, pas des dégâts constatés dans DOFUS.</p>':
   '<p class="team-placeholder">Le bilan des dégâts et des PV restants de la cible apparaîtra ici après le calcul.</p>';
  const info=$("team-assumptions");
  info.textContent=present?result.warnings.join(" "):
   "Les rotations sont calculées indépendamment pour chaque personnage. Les buffs et vulnérabilités entre alliés ne sont pas encore pris en compte.";
 }
 function render(){renderMembers();renderTarget();renderResult();}
 function changeSlot(index,value){
  const roster=getMembers().map(b=>b.id);
  if(value&&!getBuilds().some(b=>b.id===value))return;
  if(value&&roster.includes(value)&&roster[index]!==value)return;
  if(index<0||index>=TEAM_LIMIT)return;
  if(value)roster[index]=value;
  else if(index<roster.length)roster.splice(index,1);
  ids=roster.filter(Boolean);storeState();cancel();result=null;activeTurn=1;render();
  status(ids.length?"Composition modifiée. Relance le calcul pour actualiser les recommandations.":"Ajoute au moins un personnage.");
 }
 function changeMemberOption(id,field,value){
  const build=getMembers().find(b=>b.id===id);
  if(!build)return;
  if(field==="ap"){
   const pa=Number(value);
   if(!Number.isInteger(pa)||pa<6||pa>20){
    renderMembers();status("Choisis un nombre entier de PA entre 6 et 20.");return;
   }
   value=pa;
  }
  if(field!=="ap")return;
  memberOptions={...memberOptions,[id]:{ap:value}};
  storeState();cancel();result=null;activeTurn=1;renderMembers();renderResult();
  status("Réglages de "+build.character+" modifiés. Relance le calcul pour voir la nouvelle rotation.");
 }
 function changeTarget(){
  target=cleanTeamTarget({
   hp:$("team-hp").value,turns:$("team-turns").value,criticals:$("team-critical").checked,
   resistances:Object.fromEntries(RESIST_ELEMENTS.map(name=>[name,$("team-res-"+name).value]))
  });
  storeState();cancel();result=null;activeTurn=1;renderTarget();renderResult();
  status("Cible modifiée. Lance le calcul pour actualiser les résultats.");
 }
 function calculate(){
  const members=getMembers();
  if(!members.length){status("Ajoute au moins un personnage.");return;}
  cancel();
  if(typeof Worker==="undefined"){status("Le navigateur ne prend pas en charge les calculs en arrière-plan.");return;}
  const contexts=members.map(b=>createTeamContext(b,target,memberOptions[b.id]));
  const currentJob=++job;
  $("team-calculate").disabled=true;
  $("team-cancel").disabled=false;
  status("Optimisation des rotations de "+members.length+" personnages sur "+target.turns+" tours…");
  try{
   worker=new Worker(new URL("./team-worker.js?v=3.1",import.meta.url),{type:"module"});
   worker.onmessage=event=>{
    if(currentJob!==job)return;
    const data=event.data||{};
    if(data.type==="progress"){
     const p=data.progress;
     status(p.character+" · "+(p.scenario||"Optimisation")+" · "+p.index+"/"+p.count+" · tour "+p.turn+"/"+p.turns);
    }
    if(data.type==="complete"||data.type==="error"){
     worker?.terminate();worker=null;$("team-calculate").disabled=false;$("team-cancel").disabled=true;
     if(data.type==="error"){status("Calcul interrompu : "+data.message);return;}
     result=data.result;activeTurn=1;renderResult();
     status("Calcul terminé : "+fmt(result.theoretical)+" dégâts théoriques sur "+target.turns+" tour(s).");
    }
   };
   worker.onerror=event=>{
    if(currentJob!==job)return;
    worker?.terminate();worker=null;$("team-calculate").disabled=false;$("team-cancel").disabled=true;
    status("Erreur du calcul : "+(event.message||"vérifie les builds."));
   };
   worker.postMessage({contexts,target});
  }catch(error){
   worker?.terminate();worker=null;$("team-calculate").disabled=false;$("team-cancel").disabled=true;
   status("Impossible de lancer le calcul : "+error.message);
  }
 }
 root.addEventListener("change",event=>{
  const slot=event.target.closest("select[data-team-slot]");
  if(slot){changeSlot(Number(slot.dataset.teamSlot),slot.value);return;}
  const pa=event.target.closest("input[data-team-ap]");
  if(pa){changeMemberOption(pa.dataset.teamAp,"ap",pa.value);return;}
  if(event.target.closest("#team-settings"))changeTarget();
 });
 $("team-calculate").addEventListener("click",calculate);
 $("team-cancel").addEventListener("click",()=>{
  if(!worker)return;
  cancel();
  status("Calcul interrompu. Tu peux relancer l’optimisation.");
 });
 $("team-turn-select").addEventListener("change",event=>{
  const turn=Number(event.target.value);
  if(!result||!Number.isInteger(turn)||turn<1||turn>result.turns.length)return;
  activeTurn=turn;renderResult();
 });
 $("team-turn-buttons").addEventListener("click",event=>{
  const button=event.target.closest("button[data-team-turn]");
  if(!button||!result)return;
  const turn=Number(button.dataset.teamTurn);
  if(turn<1||turn>result.turns.length)return;
  activeTurn=turn;renderResult();
 });
 const refresh=()=>{
  const signature=JSON.stringify(getBuilds());
  if(signature!==previousSignature){
   previousSignature=signature;
   const allowed=new Set(getBuilds().map(b=>b.id));
   ids=ids.filter(id=>allowed.has(id));
   cancel();result=null;activeTurn=1;
   storeState();
   render();
   status("Équipe actualisée depuis Personnages & builds. Les dégâts doivent être recalculés.");
  }else renderMembers();
 };
 window.addEventListener("storage",event=>{
  if(event.key===TEAM_STORAGE_KEY){
   const other=readStore();
   if(other){ids=other.ids||[];target=cleanTeamTarget(other.target);memberOptions=other.memberOptions||{};cancel();result=null;activeTurn=1;render();}
  }
 });
 window.addEventListener("pagehide",cancel);
 previousSignature=JSON.stringify(getBuilds());
 render();
 status("Choisis jusqu’à 8 builds ; l’ordre s’ajuste selon l’initiative enregistrée.");
 return {refresh};
}
