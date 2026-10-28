import {CLASSES} from "./classes.js?v=3.24";
import {updateDamageLeaderboard} from "./team-dps-board.js?v=1";
import {newManualDraft,previewManualDraft,manualSpellChoices,chooseManualSpell,
 undoManualSpell,resetManualActor,nextManualActor,setManualTurnPA,
 manualCurrentTurnDamage,manualActiveEcaflipTable} from "./team-manual.js?v=3.30";
import {
 TEAM_STORAGE_KEY,TEAM_LIMIT,RESIST_ELEMENTS,defaultTeamTarget,cleanTeamTarget,
 teamMembers,createTeamContext,cleanTeamMemberOptions
} from "./team-core.js?v=3.45";
import {cleanTeamStrategy} from "./team-long-plan.js?v=3.41";
import {sacrierHealthAboveFloor} from "./sacrier-safety.js?v=3.32";
import {renderCombatLog,combatReportText} from "./team-combat-log.js?v=3.44";

const safe=s=>String(s??"").replace(/[&<>"']/g,ch=>({
 "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[ch]));
const fmt=n=>new Intl.NumberFormat("fr-FR",{maximumFractionDigits:1}).format(n||0);
// Pure damage comparison: an effectively unkillable virtual target, never shown.
const INTERNAL_TARGET_HP=1_000_000_000_000;
const readStore=()=>{
 try{const data=JSON.parse(localStorage.getItem(TEAM_STORAGE_KEY)||"null");return data&&typeof data==="object"?data:null;}
 catch{return null;}
};
const saveStore=(ids,target,memberOptions,strategy)=>{
 // Do not re-save obsolete manual buff controls from the earlier team UI.
 const paOnly=Object.fromEntries(Object.entries(memberOptions||{}).map(([id,options])=>[
  id,{ap:options.ap}
 ]));
 try{localStorage.setItem(TEAM_STORAGE_KEY,JSON.stringify({ids,target,memberOptions:paOnly,strategy:cleanTeamStrategy(strategy)}));}catch{}
};

export function mountTeamModule({getBuilds,onChangeVariant}){
 const root=document.getElementById("tab-team");
 if(!root)return {refresh(){}};
 const $=id=>root.querySelector("#"+id);
 const saved=readStore();
 let ids=Array.isArray(saved?.ids)?saved.ids.slice(0,TEAM_LIMIT):
  getBuilds().slice(0,2).map(b=>b.id);
 let target=cleanTeamTarget({...defaultTeamTarget(),...saved?.target,hp:INTERNAL_TARGET_HP,turns:100});
 const storedOptions=saved?.memberOptions&&typeof saved.memberOptions==="object"&&!Array.isArray(saved.memberOptions)
  ?saved.memberOptions:{};
 let memberOptions=Object.fromEntries(Object.entries(storedOptions).map(([id,options])=>[id,{
  ap:options?.ap
 }]));
 let result=null,activeTurn=1,worker=null,job=0,mode="automatic",manualDraft=null;
 // Old installations used 10 rounds as the maximum. Promote that legacy
 // default once so existing users also benefit from the new 100-round mode.
 let strategy=cleanTeamStrategy(saved?.strategy);
 if(saved?.strategy?.horizon===10){
  strategy=cleanTeamStrategy({...strategy,horizon:100});
 }
 let previousSignature="";
 const getMembers=()=>teamMembers(getBuilds(),ids);
 const storeState=()=>saveStore(ids,target,memberOptions,strategy);
 const memberSettings=b=>cleanTeamMemberOptions(b,memberOptions[b.id]);
 const status=text=>{$("team-status").textContent=text;};
 function cancel(){
  job++;
  if(worker){worker.terminate();worker=null;}
  $("team-calculate").disabled=false;
  $("team-cancel").disabled=true;
 }
 function buffSelector(build,cls){
  if(!cls||!["sram","sacrieur"].includes(build.classId))return "";
  const preferred=build.classId==="sram"?"Manigance":"Pacte de Sang";
  const group=cls.pairs.findIndex(pair=>pair.includes(preferred));
  if(group<0)return "";
  const variants=cls.pairs[group];
  const chosen=variants.includes(build.variants?.[group])?
    build.variants[group]:cls.defaultVariants[group];
  const options=variants.map(name=>'<option value="'+safe(name)+'"'+
    (name===chosen?' selected':'')+'>'+safe(name)+'</option>').join("");
  return '<label class="team-slot-buff" for="team-buff-'+safe(build.id)+'">'+
    'Sort de buff <select id="team-buff-'+safe(build.id)+
    '" data-team-buff="'+safe(build.id)+'" data-team-group="'+group+
    '" aria-label="Choisir le buff de '+safe(build.character)+'">'+options+
    '</select></label><small class="team-buff-info">'+
    (chosen===preferred?'✓ '+safe(preferred)+' équipé':
      '⚠ '+safe(preferred)+' indisponible : '+safe(chosen)+' sélectionné')+
    '</small>';
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
     ' · '+safe(cls.name):'Choisir parmi Personnages & builds')+'</small>'+extra+
     (b?buffSelector(b,cls):'')+'</div></article>';
  }).join("");
  $("team-count").textContent=roster.length+" / "+TEAM_LIMIT+" personnages";
 }
 function renderTarget(){
  $("team-critical").checked=target.criticals;
  $("team-strategy-fast").checked=strategy.mode==="fast";
  $("team-strategy-long").checked=strategy.mode==="long";
  $("team-horizon").value=String(strategy.horizon);
  $("team-min-hp").value=String(strategy.minHpPercent);
  $("team-long-options").hidden=strategy.mode!=="long";
  for(const name of RESIST_ELEMENTS)$("team-res-"+name).value=String(target.resistances[name]);
 }
const manualContexts=()=>getMembers().map(b=>createTeamContext(b,target,memberOptions[b.id]));
 function renderManual(){
  const board=$("team-manual-board");
  root.dataset??={};root.dataset.teamMode=mode;
  if(mode!=="manual"){board.innerHTML="";return;}
  if(!manualDraft){
   board.innerHTML='<p class="manual-guide">Choisis tes sorts toi-même. Les dégâts cumulés apparaissent dans le classement bleu.</p>'+
    '<button type="button" data-manual-start'+(result?.finished?' disabled':'')+'>'+
    (result?'▶ Commencer le tour suivant':'▶ Commencer le tour 1')+'</button>'+
    '<button type="button" data-manual-restart>↻ Recommencer au tour 1</button>';
   return;
  }
  try{
   const contexts=manualContexts();
   const preview=previewManualDraft(contexts,target,manualDraft);
   const {current,state,actor,order}=preview;
   const turnDamage=manualCurrentTurnDamage(preview);
   const lowHp=current.settings.classId==="sacrieur"&&!sacrierHealthAboveFloor(state,strategy.minHpPercent);
   const hpWarning=lowHp?'<p class="manual-hp-warning" role="alert">⚠ Attention : '+fmt(state.sacrierHealth.hp)+
    ' / '+fmt(state.sacrierHealth.maxHp)+' PV — sous le seuil conseillé de '+strategy.minHpPercent+
    ' %. Choix manuel autorisé, mais risqué.</p>':'';
   const ecaTable=manualActiveEcaflipTable(preview);
   const suits={
    club:{label:"Trèfle",glyph:"♣"},
    spade:{label:"Pique",glyph:"♠"},
    heart:{label:"Cœur",glyph:"♥"},
    diamond:{label:"Carreau",glyph:"♦"}
   };
   const ranks={2:"Valet",3:"Dame",4:"Roi",5:"As"};
   const showEcaCards=current.settings.classId==="ecaflip";
   const renderEcaCard=(card,remaining)=>'<div class="manual-table-card suit-'+safe(card.suit)+
    '" data-table-card="'+safe(card.suit+':'+card.rank)+'" title="'+safe(ranks[card.rank]+' de '+suits[card.suit].label)+'">'+
    '<span class="manual-table-rank">'+safe(ranks[card.rank])+'</span>'+
    '<span class="manual-table-suit" aria-hidden="true">'+suits[card.suit].glyph+'</span>'+
    '<span class="manual-table-lifetime">'+(remaining?remaining+' tour(s)':'En main')+'</span></div>';
   const tableHtml=showEcaCards?
    '<div class="manual-eca-card-zones">'+
    '<section class="manual-eca-table" data-manual-eca-hand aria-label="Cartes en main">'+
    '<div class="manual-table-title"><strong>🃏 Main</strong><small>'+(state.ecaHand||[]).length+' carte(s)</small></div>'+
    '<div class="manual-table-cards">'+((state.ecaHand||[]).length?
     state.ecaHand.map(card=>renderEcaCard(card,null)).join(''):'Aucune carte en main')+'</div></section>'+
    '<section class="manual-eca-table" data-manual-eca-table aria-label="Table active de l’Écaflip">'+
    '<div class="manual-table-title"><strong>♣ Table active</strong><small>'+ecaTable.length+' carte(s) jouée(s)</small></div>'+
    '<div class="manual-table-cards">'+(ecaTable.length?
     ecaTable.map(card=>renderEcaCard(card,card.remainingTurns)).join(''):'Aucune carte jouée')+
    '</div></section></div>':'';
   const choices=manualSpellChoices(contexts,target,manualDraft);
   const buffs=state.buffs.filter(b=>b.until>=state.turn).map(b=>safe(b.key)+
    ' ('+(b.until===Number.MAX_SAFE_INTEGER?'permanent':(b.until-state.turn+1)+' tours')+')');
   const actions=(manualDraft.actions[current.build.id]||[]).map(id=>
    current.spells.find(sp=>String(sp.id)===String(id))?.name||String(id));
   const max=Math.max(1,...choices.map(c=>c.score));
   board.innerHTML='<div class="manual-heading"><div><small>Tour '+state.turn+
    ' · personnage '+(manualDraft.cursor+1)+'/'+order.length+'</small>'+
    '<h3>'+safe(current.build.character)+'</h3></div>'+
        '<div class="manual-ap">'+
     '<label for="manual-turn-pa">PA disponibles au début du tour</label>'+
     '<input id="manual-turn-pa" data-manual-turn-pa type="number" min="1" max="30" step="1" '+
     'value="'+actor.availablePA+'" aria-label="Choisir les PA de départ pour '+safe(current.build.character)+'">'+
     '<span class="manual-pa-remaining"><strong>'+fmt(state.pa)+' PA</strong> restants</span>'+
     '</div></div>'+
    '<p class="manual-guide">Clique sur un sort. Les recommandations se recalculent après chaque action.</p>'+
    hpWarning+
    '<div class="manual-buffs">Buffs : '+(buffs.length?buffs.join(' · '):'aucun')+
    '</div>'+
    tableHtml+
    '<div class="manual-spells" role="group" aria-label="Sorts manuels">'+choices.map((c,index)=>{
     const image=c.icon?'<img src="'+safe(c.icon)+'" alt="" loading="lazy">':'';
     return '<button type="button" class="manual-spell'+(c.enabled?'':' is-unavailable')+
      '" data-manual-cast="'+safe(c.id)+'"'+(c.enabled?'':' disabled')+
      ' title="'+safe(c.reason)+'"><span class="manual-icon">'+image+
      '<span class="manual-icon-fallback">'+(c.isWeapon?'⚔':'✦')+'</span></span>'+
      '<span class="manual-name">'+safe(c.name)+(index===0&&c.enabled?' <em>Conseillé</em>':'')+'</span>'+
      '<span class="manual-cost">'+fmt(c.pa)+' PA</span>'+
      '<strong class="manual-damage">'+(c.enabled?'≈ '+fmt(c.damage)+' dégâts':'Indisponible')+'</strong>'+
      '<span class="manual-extra">'+(c.enabled?
       (c.delayed?'+'+fmt(c.delayed)+' différés · ':'')+
       '≈ '+fmt(c.damage/Math.max(1,c.pa))+' dégâts/PA · '+safe(c.reason):
       safe(c.reason))+'</span>'+
      '<span class="manual-score" style="width:'+Math.max(0,Math.min(100,100*c.score/max)).toFixed(1)+'%"></span>'+
      '</button>';
    }).join('')+'</div>'+
    '<div class="manual-picked"><strong>Actions choisies</strong> '+
    (actions.length?actions.map(a=>'<span>'+safe(a)+'</span>').join(''):
     '<small>Aucune — tu peux passer le tour.</small>')+'</div>'+
    '<div class="manual-controls"><button type="button" data-manual-undo'+
     (actions.length?'':' disabled')+'>↶ Annuler le dernier sort</button>'+
    '<button type="button" data-manual-reset'+(actions.length?'':' disabled')+
     '>Réinitialiser le personnage</button>'+
    '<button type="button" data-manual-restart>↻ Nouveau combat</button>'+
    '<output class="manual-turn-damage" data-manual-turn-damage aria-label="Dégâts estimés du tour en cours">'+
    '<span>Dégâts de ce tour</span><strong>≈ '+fmt(turnDamage.damage)+'</strong>'+
    '<small>'+fmt(turnDamage.direct)+' directs · '+fmt(turnDamage.delayed)+
    ' différés · '+fmt(turnDamage.damagePerPA)+' dégâts/PA</small></output>'+
    '<button type="button" class="manual-next" data-manual-next>'+
    (manualDraft.cursor===order.length-1?'✓ Terminer le tour '+state.turn:
     '→ Valider et passer au suivant')+'</button></div>'+
    '<p class="manual-footnote">Dégâts approximatifs par lancer ; le tri estime aussi la valeur des buffs et des cartes. Certains effets et le placement ne sont pas simulés.</p>';
  }catch(error){board.innerHTML='<p class="manual-guide">'+safe(error.message)+'</p>';}
 }
 function renderResult(){
  let draftPreview=null;
  if(mode==="manual"&&manualDraft){
   try{draftPreview=previewManualDraft(manualContexts(),target,manualDraft).result;}
   catch(error){status("Choix manuel : "+error.message);}
  }
  const displayed=draftPreview||result;
  const present=!!displayed;
  const turn=displayed?.turns[activeTurn-1];
  const logArea=$("team-quick-log");
  const wasOpen=!!logArea.querySelector?.("details.team-log-details")?.open;
  logArea.innerHTML=renderCombatLog(displayed,activeTurn);
  if(wasOpen){const details=logArea.querySelector?.("details.team-log-details");if(details)details.open=true;}
  $("team-calculate").textContent=displayed?(displayed.finished?"✓ Combat terminé":"▶ Tour suivant ("+(displayed.turns.length+1)+")"):"▶ Calculer le tour 1";
  $("team-calculate").disabled=!!worker||!!displayed?.finished;
  $("team-restart").disabled=!displayed||!!worker;
  $("team-turn-select").disabled=!present||(mode==="manual"&&!!manualDraft);
  $("team-turn-select").innerHTML=present?displayed.turns.map(t=>
   '<option value="'+t.number+'"'+(t.number===activeTurn?' selected':'')+'>Tour '+t.number+' / '+displayed.turns.length+'</option>').join(""):
   '<option value="">Calcule d\'abord une rotation</option>';
  $("team-turn-buttons").innerHTML=present?displayed.turns.map(t=>
   '<button type="button" data-team-turn="'+t.number+'" class="'+(t.number===activeTurn?'is-current':'')+
   '" aria-pressed="'+(t.number===activeTurn)+'">Tour '+t.number+'</button>').join(""):"";
  const ordered=present?turn.actors:getMembers();
  $("team-order").innerHTML='<div class="team-order-heading"><strong>Ordre de jeu'+
   (present?' · Tour '+activeTurn:'')+'</strong><small>'+
   (present?'Tour '+activeTurn+' sur '+displayed.turns.length+' calculé(s)':
    'Les personnages joueront dans cet ordre')+'</small></div>'+
   ordered.map((actor,index)=>'<div class="team-order-row'+
    (actor.defeated?' is-last':'')+'">'+
    '<span class="team-order-number">'+String(index+1).padStart(2,"0")+'</span>'+
    '<span class="team-order-name">'+safe(actor.character)+'</span>'+

    '</div>').join("");
  // Explicitly expose unequipped Pacte at the point where the suggested
  // Sacrier rotation is displayed (not only in the roster sidebar).
  // An unselected variant can NEVER be cast by the engine.
  const pactWarnings=getMembers().filter(b=>b.classId==="sacrieur").map(b=>{
   const group=CLASSES.sacrieur.pairs.findIndex(pair=>pair.includes("Pacte de Sang"));
   const active=b.variants?.[group]??CLASSES.sacrieur.defaultVariants[group];
   if(active==="Pacte de Sang")return "";
   return '<div class="team-pact-warning" role="alert">'+
    '<strong>⚠ '+safe(b.character)+' : Pacte de Sang non équipé.</strong> '+
    'Le sort actif est '+safe(active)+'. OMBRE ne peut pas utiliser Pacte dans la rotation. '+
    '<button type="button" data-team-equip-pact="'+safe(b.id)+'">Équiper Pacte de Sang</button>'+
    '</div>';
  }).join("");
  $("team-rotations").innerHTML=pactWarnings+(present?turn.actors.map((a,i)=>
   '<div class="team-rotation-item"><div class="team-rotation-heading"><span>'+
   '<b>'+String(i+1).padStart(2,"0")+'</b> '+safe(a.character)+'</span><strong>'+fmt(a.damage)+' dégâts</strong></div>'+
   '<div class="team-rotation-spells">'+(a.actions.length?a.actions.map(s=>
    '<span class="team-spell-chip'+(s.autoRefreshed?' is-buff-refreshed':'')+'"'+(s.autoRefreshed?' title="Buff expiré : relance automatique"':'')+'>'+
     (s.autoRefreshed?'↻ ':'')+safe(s.name)+' <small>'+safe(s.pa)+' PA</small></span>').join(""):
    '<span class="team-empty-actions">Passer ce tour</span>')+'</div>'+
   '<div class="team-rotation-meta">'+fmt(a.spent)+'/'+fmt(a.availablePA??displayed.members.find(m=>m.id===a.id)?.ap??0)+' PA utilisés'+
   (a.paBonus?' · bonus '+(a.paBonus>0?'+':'')+fmt(a.paBonus)+' PA':'')+' · directs '+fmt(a.direct)+
   ' · différés '+fmt(a.poison)+
   (Number.isFinite(a.criticalRate)?
    ' · Critiques : '+fmt(a.criticalRate*100)+' %'+
    (a.criticalGuaranteed?' (CC garantis)':''):'')+
   (Number.isFinite(a.turquoiseBonus)?
    ' · Turquoise : +'+fmt(a.turquoiseBonus)+' % dommages finaux':'')+

   (a.health?' · PV estimés '+fmt(a.health.hp)+'/'+fmt(a.health.maxHp)+
    ' · Souffrance '+safe(a.health.suffering):'')+
   (activeTurn===1&&displayed.members.find(m=>m.id===a.id)?.chosenOpening?
    ' · ouverture choisie : '+safe(displayed.members.find(m=>m.id===a.id).chosenOpening):'')+
   '</div></div>').join(""):
   '<p class="team-placeholder">Choisis tes personnages à droite, règle la cible et lance le calcul pour voir les sorts conseillés, classés par initiative.</p>');
  updateDamageLeaderboard($("team-damage"),displayed,activeTurn,{safe,fmt});
  const info=$("team-assumptions");
  info.textContent=present?displayed.warnings.filter(note=>!/PV de la cible|cible possède des PV/i.test(note)).join(" "):
   "Chaque personnage joue après le précédent, avec les PV de cible communs et les buffs et relances personnels. Les buffs de soutien entre alliés ne sont pas encore entièrement modélisés.";
 }
 function render(){renderMembers();renderTarget();renderResult();renderManual();}
 function changeSlot(index,value){
  const roster=getMembers().map(b=>b.id);
  if(value&&!getBuilds().some(b=>b.id===value))return;
  if(value&&roster.includes(value)&&roster[index]!==value)return;
  if(index<0||index>=TEAM_LIMIT)return;
  if(value)roster[index]=value;
  else if(index<roster.length)roster.splice(index,1);
  ids=roster.filter(Boolean);storeState();cancel();manualDraft=null;result=null;activeTurn=1;render();
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
  storeState();cancel();manualDraft=null;result=null;activeTurn=1;renderMembers();renderResult();renderManual();
  status("Réglages de "+build.character+" modifiés. Relance le calcul pour voir la nouvelle rotation.");
 }
 function changeTarget(){
  target=cleanTeamTarget({
   hp:INTERNAL_TARGET_HP,turns:100,criticals:$("team-critical").checked,
   resistances:Object.fromEntries(RESIST_ELEMENTS.map(name=>[name,$("team-res-"+name).value]))
  });
  storeState();cancel();manualDraft=null;result=null;activeTurn=1;renderTarget();renderResult();renderManual();
  status("Cible modifiée. Lance le calcul pour actualiser les résultats.");
 }
 function calculate(){
  const members=getMembers();
  if(!members.length){status("Ajoute au moins un personnage.");return;}
  if(result?.finished){status("Combat terminé. Recommence au tour 1.");return;}
  const previous=result;
  cancel();
  if(typeof Worker==="undefined"){status("Le navigateur ne prend pas en charge les calculs en arrière-plan.");return;}
  const contexts=members.map(b=>createTeamContext(b,target,memberOptions[b.id]));
  const currentJob=++job;
  $("team-calculate").disabled=true;
  $("team-cancel").disabled=false;
  status("Calcul du tour "+(previous?previous.turns.length+1:1)+" · "+(strategy.mode==="long"?"DPS équipe, vision "+strategy.horizon+" tours":"optimisation rapide")+"…");
  try{
   worker=new Worker(new URL("./team-worker.js?v=3.45",import.meta.url),{type:"module"});
   worker.onmessage=event=>{
    if(currentJob!==job)return;
    const data=event.data||{};
    if(data.type==="progress"){
     const p=data.progress;
     status(p.character+" · "+(p.scenario||"Optimisation")+" · "+p.index+"/"+p.count+" · tour "+p.turn);
    }
    if(data.type==="complete"||data.type==="error"){
     worker?.terminate();worker=null;$("team-calculate").disabled=false;$("team-cancel").disabled=true;
     if(data.type==="error"){status("Calcul interrompu : "+data.message);return;}
     result=data.result;activeTurn=result.turns.length;renderResult();
     status("Tour "+activeTurn+" calculé. "+(result.finished?"Combat terminé.":"Clique sur « Tour suivant » pour calculer uniquement le tour "+(activeTurn+1)+"."));
    }
   };
   worker.onerror=event=>{
    if(currentJob!==job)return;
    worker?.terminate();worker=null;$("team-calculate").disabled=false;$("team-cancel").disabled=true;
    status("Erreur du calcul : "+(event.message||"vérifie les builds."));
   };
   worker.postMessage({contexts,target,previous,strategy});
  }catch(error){
   worker?.terminate();worker=null;$("team-calculate").disabled=false;$("team-cancel").disabled=true;
   status("Impossible de lancer le calcul : "+error.message);
  }
 }
 root.addEventListener("change",event=>{
  const paChoice=event.target.closest('input[data-manual-turn-pa]');
  if(paChoice&&mode==="manual"&&manualDraft){
   try{
    manualDraft=setManualTurnPA(manualContexts(),target,manualDraft,paChoice.value);
    activeTurn=(result?.turns.length||0)+1;
    renderResult();renderManual();
    status("PA modifiés pour ce personnage et ce tour. Sorts et dégâts actualisés.");
   }catch(error){
    renderManual();
    status("Choix des PA : "+error.message);
   }
   return;
  }
  const minHpChoice=event.target.closest("#team-min-hp");
  const strategyRadio=event.target.closest('input[name="team-strategy"]');
  const horizonChoice=event.target.closest("#team-horizon");
  if(strategyRadio||horizonChoice||minHpChoice){
   strategy=cleanTeamStrategy({
    ...strategy,
    ...(strategyRadio?{mode:strategyRadio.value}:{}),
    ...(horizonChoice?{horizon:Number(horizonChoice.value)}:{}),
    ...(minHpChoice?{minHpPercent:Number(minHpChoice.value)}:{})
   });
   storeState();cancel();result=null;manualDraft=null;activeTurn=1;
   renderTarget();renderResult();renderManual();
   status(strategy.mode==="long"?
    "DPS équipe longue durée : "+strategy.horizon+" tours anticipés, recherche approfondie, Sacrieur ≥ "+strategy.minHpPercent+" % PV.":
    "Optimisation rapide : priorité au prochain tour, Sacrieur ≥ "+strategy.minHpPercent+" % PV.");
   return;
  }
  const selector=event.target.closest('input[name="team-mode"]');
  if(selector){
   mode=selector.value==="manual"?"manual":"automatic";
   cancel();manualDraft=null;result=null;activeTurn=1;
   if(mode==="manual"&&getMembers().length){
    try{manualDraft=newManualDraft(manualContexts(),target);}
    catch(error){status("Choix manuel : "+error.message);}
   }
   renderResult();renderManual();
   status(mode==="manual"?"Mode Choix manuel : sélectionne les sorts du personnage courant.":
    "Mode Optimisation automatique : calcule le prochain tour.");
   return;
  }
  const buff=event.target.closest("select[data-team-buff]");
  if(buff){
   const build=getMembers().find(b=>b.id===buff.dataset.teamBuff);
   const group=Number(buff.dataset.teamGroup),name=buff.value;
   if(!build||!CLASSES[build.classId]?.pairs[group]?.includes(name)||
     typeof onChangeVariant!=="function"){renderMembers();return;}
   if(build.variants?.[group]!==name){
    cancel();manualDraft=null;result=null;activeTurn=1;
    if(!onChangeVariant(build.id,group,name)){render();return;}
    storeState();render();
    status(name+" équipé sur "+build.character+
     " et enregistré dans Sorts & variantes. Recommence au tour 1.");
   }
   return;
  }
  const slot=event.target.closest("select[data-team-slot]");
  if(slot){changeSlot(Number(slot.dataset.teamSlot),slot.value);return;}
  const pa=event.target.closest("input[data-team-ap]");
  if(pa){changeMemberOption(pa.dataset.teamAp,"ap",pa.value);return;}
  if(event.target.closest("#team-settings"))changeTarget();
 });
 root.addEventListener("click",event=>{
  const copyButton=event.target.closest("button[data-team-copy-log]");
  if(copyButton?.dataset?.teamCopyLog!==undefined){
   const source=mode==="manual"&&manualDraft?
    (()=>{try{return previewManualDraft(manualContexts(),target,manualDraft).result;}catch{return result;}})():
    result;
   const report=combatReportText(source);
   if(!source?.turns?.length){status("Aucun journal à copier : calcule un tour.");return;}
   if(typeof globalThis.navigator?.clipboard?.writeText==="function"){
    Promise.resolve(globalThis.navigator.clipboard.writeText(report)).then(()=>
     status("Journal copié : "+source.turns.length+" tour(s), toutes les actions et effets."))
     .catch(()=>status("Copie impossible. Vérifie les autorisations du presse-papiers du navigateur."));
   }else{
    try{
     const textarea=document.createElement("textarea");
     textarea.value=report;textarea.setAttribute("readonly","");
     textarea.style.position="fixed";textarea.style.opacity="0";
     document.body.appendChild(textarea);textarea.select();
     const copied=document.execCommand("copy");
     textarea.remove();
     status(copied?"Journal complet copié.":"Copie non autorisée par le navigateur.");
    }catch{status("Copie non disponible dans ce navigateur.");}
   }
   return;
  }
  const equip=event.target.closest("button[data-team-equip-pact]");
  if(equip?.dataset?.teamEquipPact){
   const build=getMembers().find(b=>b.id===equip.dataset.teamEquipPact);
   const group=CLASSES.sacrieur.pairs.findIndex(pair=>pair.includes("Pacte de Sang"));
   if(!build||build.classId!=="sacrieur"||group<0||
      typeof onChangeVariant!=="function")return;
   if(build.variants?.[group]==="Pacte de Sang")return;
   if(!onChangeVariant(build.id,group,"Pacte de Sang")){
    status("Impossible de sélectionner Pacte de Sang sur ce build.");return;
   }
   cancel();manualDraft=null;result=null;activeTurn=1;
   storeState();render();
   status("Pacte de Sang équipé sur "+build.character+
    ". Le combat repart au tour 1 pour recalculer correctement les bonus de PV.");
   return;
  }
  const button=event.target.closest("button[data-manual-start],button[data-manual-cast],button[data-manual-undo],button[data-manual-reset],button[data-manual-next],button[data-manual-restart]");
  if(!button||mode!=="manual")return;
  try{
   const contexts=manualContexts();
   if(button.hasAttribute("data-manual-restart")){
    result=null;manualDraft=newManualDraft(contexts,target);
   }else if(button.hasAttribute("data-manual-start")){
    manualDraft=newManualDraft(contexts,target,result);
   }else if(button.hasAttribute("data-manual-cast")){
    manualDraft=chooseManualSpell(contexts,target,manualDraft,button.dataset.manualCast);
   }else if(button.hasAttribute("data-manual-undo")){
    manualDraft=undoManualSpell(contexts,target,manualDraft);
   }else if(button.hasAttribute("data-manual-reset")){
    manualDraft=resetManualActor(contexts,target,manualDraft);
   }else if(button.hasAttribute("data-manual-next")){
    const completed=nextManualActor(contexts,target,manualDraft);
    manualDraft=completed.draft;
    if(completed.result)result=completed.result;
   }
   activeTurn=manualDraft?(result?.turns.length||0)+1:(result?.turns.length||1);
   renderResult();renderManual();
   status(manualDraft?"Choix manuel : sélectionne les sorts, ou passe au suivant.":
    "Tour manuel enregistré. Clique sur Commencer le tour suivant pour continuer.");
  }catch(error){status("Choix manuel : "+error.message);}
 });
 $("team-calculate").addEventListener("click",calculate);
 $("team-restart").addEventListener("click",()=>{
  cancel();manualDraft=null;result=null;activeTurn=1;renderResult();
  status("Combat réinitialisé. Clique pour calculer uniquement le tour 1.");
 });
 $("team-cancel").addEventListener("click",()=>{
  if(!worker)return;
  cancel();
  status("Calcul interrompu. Tu peux relancer l’optimisation.");
 });
 $("team-turn-select").addEventListener("change",event=>{
  const turn=Number(event.target.value);
  if(manualDraft||!result||!Number.isInteger(turn)||turn<1||turn>result.turns.length)return;
  activeTurn=turn;renderResult();
 });
 $("team-turn-buttons").addEventListener("click",event=>{
  const button=event.target.closest("button[data-team-turn]");
  if(!button||!result||manualDraft)return;
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
   cancel();manualDraft=null;result=null;activeTurn=1;
   storeState();
   render();
   status("Équipe actualisée depuis Personnages & builds. Les dégâts doivent être recalculés.");
  }else renderMembers();
 };
 window.addEventListener("storage",event=>{
  if(event.key===TEAM_STORAGE_KEY){
   const other=readStore();
   if(other){ids=other.ids||[];target=cleanTeamTarget({...other.target,hp:INTERNAL_TARGET_HP,turns:100});memberOptions=other.memberOptions||{};strategy=cleanTeamStrategy(other.strategy);cancel();manualDraft=null;result=null;activeTurn=1;render();}
  }
 });
 window.addEventListener("pagehide",cancel);
 previousSignature=JSON.stringify(getBuilds());
 render();
 status("Choisis jusqu’à 8 builds ; l’ordre s’ajuste selon l’initiative enregistrée.");
 return {refresh};
}
