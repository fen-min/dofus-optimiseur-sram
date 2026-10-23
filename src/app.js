import {DEFAULT_SETTINGS} from "./spells.js";
import {sanitizeCharacterStats} from "./character-stats.js?v=1.8";
import {prepareBuildSpells} from "./build-damage.js?v=3.3";
import {CLASSES,INITIAL_BUILDS,normalizeBuild} from "./classes.js?v=3.2";
import {renderBuildCards} from "./build-cards.js?v=2.4";
import {mountTeamModule} from "./team-ui.js?v=3.3";
import {optimize} from "./engine.js?v=3.2";
import {packCombatRotation,storeCombatRotation,getCombatRotation,clearCombatRotation,getCombatTurn,setCombatTurn,renderCombatTurns,COMBAT_STORE,COMBAT_TURNS} from "./combat-view.js?v=1.4";
import {canPinCombat,openPinnedCombat,unsupportedPinText} from "./combat-pin.js?v=1.4";
import {saveAssistContext} from "./assist-core.js?v=3.2";
import {saveMultiContext} from "./multi-build-link.js?v=2.1";
import {openAssistPin,canPinAssist,pinAssistUnsupported} from "./assist-pin.js?v=1.6";
import {groupActiveEffects,effectDuration,effectValue} from "./effect-view.js?v=1.1";
import {SPELL_EFFECTS_AUDIT} from "./spell-effects-audit.js?v=1.8";

const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const fmt=value=>new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(value||0);
const spellBonuses=s=>[...(s.status?.buff?[s.status.buff]:[]),...(s.status?.extraBuffs||[])];
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const STORE="ombre-builds-v1";
const ACTIVE="ombre-active-build-v1";
const deep=x=>JSON.parse(JSON.stringify(x));
const get=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||"null")??fallback}catch{return fallback}};
const store=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};

function loadBuilds(){
 const stored=get(STORE,null);
 if(Array.isArray(stored)&&stored.length)return stored.slice(0,60).map(normalizeBuild);
 const initial=INITIAL_BUILDS.map(normalizeBuild);
 const old=get("ombre-spell-calibration",[]);
 if(Array.isArray(old))for(const item of old)if(item?.id)initial[0].calibration[item.id]=item;
 const selected=get("ombre-variants-v03",[]);
 if(Array.isArray(selected))initial[0].variants=normalizeBuild({...initial[0],variants:selected}).variants;
 return initial;
}
let builds=loadBuilds(),activeId=get(ACTIVE,"sram-air-pvm"),current=null,model=null,spells=[],result=null,currentJob=null;
let teamModule=null;
const calculateLabel=$("#calculate").innerHTML;
function saveBuilds(){store(STORE,builds);}
function cancelCalculation(){
 if(!currentJob)return;
 currentJob.worker?.terminate();
 currentJob=null;
 $("#calculate").innerHTML=calculateLabel;
 $("#calculate").setAttribute("aria-busy","false");
}
function appliedSettings(){
 const keys=["ap","turns","resistance","resistanceTerre","resistanceFeu","resistanceEau","resistanceNeutre","distance","inLine","lineOfSight","criticals","triggerTraps","triggerOnPush","comploteurContact","enemyLowHp"];
 const values=Object.fromEntries(keys.map(k=>{
  const el=document.getElementById(k)||document.querySelector('[name="'+k+'"]');
  return [k,!el?DEFAULT_SETTINGS[k]:el.type==="checkbox"?el.checked:Number(el.value)];
 }));
 values.variants=model.pairs.map((pair,i)=>document.querySelector('[data-variant="'+i+'"]')?.value||current.variants[i]);
 values.variantPairs=model.pairs;
 values.defaultVariants=model.defaultVariants;
 values.classId=model.id;
 return values;
}
function saveActiveSettings(){
 if(!current||!model)return;
 const state=appliedSettings();
 current.ap=state.ap;current.turns=state.turns;current.distance=state.distance;current.variants=state.variants;
 saveBuilds();
}
function applyCalibration(){
 spells=prepareBuildSpells(current,model);
}
function renderProfileSelect(){
 const el=$("#profile-selector");
 el.innerHTML=builds.map(b=>'<option value="'+escapeHtml(b.id)+'"'+(b.id===current.id?' selected':'')+'>'+escapeHtml(b.character+" — "+b.name)+'</option>').join("");
}

let pinnedCombat=null,pinOpening=false;

let pinnedAssist=null,assistPinOpening=false;
function assistTopStatus(message=""){
 const status=$("#assist-top-status");
 status.textContent=message;status.hidden=!message;
}
function updateAssistTopPin(){
 const button=$("#assist-pin-top");
 const active=!!pinnedAssist&&!pinnedAssist.window.closed;
 button.disabled=assistPinOpening;
 button.setAttribute("aria-pressed",String(active));
 button.title=active?"Retirer l'épingle":"Garder le combat assisté au premier plan";
 button.textContent=active?"📌":"📌";
}
async function toggleAssistTopPin(){
 if(pinnedAssist&&!pinnedAssist.window.closed){pinnedAssist.close();return;}
 if(!current)return;
 if(!canPinAssist(window)){assistTopStatus(pinAssistUnsupported);return;}
 if(assistPinOpening)return;
 // Snapshot before launching so the independent PiP iframe can replay actions.
 refreshAssistContext();
 const id=current.id;
 assistPinOpening=true;updateAssistTopPin();assistTopStatus("");
 try{
  const pin=await openAssistPin(window,id,()=>{
   pinnedAssist=null;updateAssistTopPin();
  });
  pinnedAssist=pin;
  closeAssistDrawer();
 }catch(e){assistTopStatus("Impossible d’épingler : "+(e.message||String(e)));}
 finally{assistPinOpening=false;updateAssistTopPin();}
}
function assistIsOpen(){return $("#assist-drawer").classList.contains("is-open");}
function refreshAssistContext(){
 if(!current||!model)return;
 try{saveAssistContext(localStorage,current,appliedSettings(),spells);}
 catch(e){$("#status").textContent="Mode assisté : "+(e.message||String(e));}
}
function openAssistDrawer(){
 if(!current)return;
 // Snapshot of selected variants, current settings and calibrated damage rows.
 saveActiveSettings();
 refreshAssistContext();
 const url=new URL("./combat-assiste.html",window.location.href);
 url.searchParams.set("build",current.id);
 const frame=$("#assist-frame");
 if(frame.src!==url.href)frame.src=url.href;
 $("#assist-drawer").classList.add("is-open");
 $("#assist-drawer").setAttribute("aria-hidden","false");
 $("#assist-open").setAttribute("aria-expanded","true");
}
function closeAssistDrawer(){
 $("#assist-drawer").classList.remove("is-open");
 $("#assist-drawer").setAttribute("aria-hidden","true");
 $("#assist-open").setAttribute("aria-expanded","false");
}

// New multi-target panel shares this build and calibrated rows, not the mono session.
function multiIsOpen(){return $("#multi-drawer").classList.contains("is-open");}
function refreshMultiContext(){
 if(!current||!model)return;
 try{return saveMultiContext(localStorage,current,appliedSettings(),spells);}
 catch(err){$("#status").textContent="Combat multi-cibles : "+(err.message||String(err));return false;}
}
function openMultiDrawer(){
 if(!current)return;
 saveActiveSettings();refreshMultiContext();
 const url=new URL("./multi-combat.html",window.location.href);
 url.searchParams.set("build",current.id);
 url.searchParams.set("embedded","ombre");
 const frame=$("#multi-frame");
 if(frame.src!==url.href)frame.src=url.href;
 $("#multi-drawer").classList.add("is-open");
 $("#multi-drawer").setAttribute("aria-hidden","false");
 $("#multi-open").setAttribute("aria-expanded","true");
}
function closeMultiDrawer(){
 $("#multi-drawer").classList.remove("is-open");
 $("#multi-drawer").setAttribute("aria-hidden","true");
 $("#multi-open").setAttribute("aria-expanded","false");
}
function openMultiPopout(){
 if(!current)return;
 saveActiveSettings();refreshMultiContext();
 const url=new URL("./multi-combat.html",window.location.href);
 url.searchParams.set("build",current.id);
 const popup=window.open(url.href,"_blank","popup=yes,width=1290,height=880,resizable=yes,scrollbars=yes");
 if(!popup){$("#status").textContent="Fenêtre bloquée : autorise les pop-ups pour OMBRE.";return;}
 closeMultiDrawer();
}
function combatSnapshot(){return current?getCombatRotation(localStorage,current.id):null;}
function updateCombatButtons(){
 const saved=combatSnapshot();
 const valid=!!saved&&saved.ap===current.ap&&saved.turns.length===current.turns;
 $("#combat-open").disabled=!valid;
 $("#combat-fab").hidden=!valid;
 if(!valid&&$("#combat-drawer").classList.contains("is-open"))closeCombatDrawer();
}
function closeCombatDrawer(){
 const panel=$("#combat-drawer");
 if(!panel)return;
 panel.classList.remove("is-open");
 panel.setAttribute("aria-hidden","true");
 $("#combat-open").setAttribute("aria-expanded","false");
 $("#combat-fab").setAttribute("aria-expanded","false");
}
function renderCombatDrawer(){
 const saved=combatSnapshot();
 if(!saved)return;
 const active=getCombatTurn(localStorage,current.id,saved.turns.length);
 $("#combat-build").textContent=saved.character+" · "+saved.name;
 $("#combat-info").textContent=saved.turns.length+" tours · "+saved.ap+" PA / tour";
 $("#combat-current").textContent="Tour "+active+" / "+saved.turns.length;
 $("#combat-prev").disabled=active<=1;
 $("#combat-next").disabled=active>=saved.turns.length;
 $("#combat-list").innerHTML=renderCombatTurns(saved,active);
 if($("#combat-drawer").classList.contains("is-open")){
  $("#combat-list").querySelector(".combat-turn.is-current")?.scrollIntoView({block:"nearest"});
 }
}
function openCombatDrawer(){
 updateCombatButtons();
 if(!combatSnapshot()||$("#combat-open").disabled)return;
 const panel=$("#combat-drawer");
 panel.classList.add("is-open");panel.setAttribute("aria-hidden","false");
 $("#combat-open").setAttribute("aria-expanded","true");
 $("#combat-fab").setAttribute("aria-expanded","true");
 renderCombatDrawer();
}
function chooseCombatTurn(turn){
 const saved=combatSnapshot();
 if(!saved)return;
 setCombatTurn(localStorage,current.id,turn,saved.turns.length);
 renderCombatDrawer();
 pinnedCombat?.refresh();
}
function invalidateCombatSnapshot(){
 if(!current)return;
 clearCombatRotation(localStorage,current.id);
 pinnedCombat?.refresh();
 updateCombatButtons();
}
function updatePinButton(){
 const pin=$("#combat-pin-drawer"),isPinned=!!pinnedCombat?.window&&!pinnedCombat.window.closed;
 pin.disabled=pinOpening;
 pin.setAttribute("aria-pressed",String(isPinned));
 pin.textContent=isPinned?"📌 Épinglée · retirer":"📌 Garder au premier plan";
}
function showPinMessage(message=""){
 const el=$("#combat-pin-status");
 el.textContent=message;
 el.hidden=!message;
}
async function toggleCombatPin(){
 if(pinnedCombat?.window&&!pinnedCombat.window.closed){pinnedCombat.close();return;}
 if(!canPinCombat(window)){showPinMessage(unsupportedPinText);return;}
 const saved=combatSnapshot();
 if(pinOpening||!saved)return;
 const id=current.id;
 pinOpening=true;updatePinButton();showPinMessage("");
 try{
  const controller=await openPinnedCombat(window,id,localStorage,{
   onSync:()=>{if(current?.id===id && $("#combat-drawer").classList.contains("is-open"))renderCombatDrawer();},
   onClose:()=>{pinnedCombat=null;updatePinButton();showPinMessage("");}
  });
  pinnedCombat=controller;
  showPinMessage("Fenêtre épinglée : garde cet onglet OMBRE ouvert.");
 }catch(error){
  showPinMessage("Impossible d’épingler : "+(error?.message||"fonction indisponible"));
 }finally{pinOpening=false;updatePinButton();}
}
function detachCombatWindow(){
 const saved=combatSnapshot();
 if(!saved)return;
 const url=new URL("./combat.html",window.location.href);
 url.searchParams.set("build",current.id);
 const pop=window.open(url.href,"_blank","popup=yes,width=420,height=730,resizable=yes,scrollbars=yes");
 if(!pop)$("#status").textContent="La fenêtre compacte a été bloquée. Autorise les pop-ups pour ce site.";
}

function renderBuilds(){
 $("#build-cards").innerHTML=renderBuildCards(builds,current.id,CLASSES);
}

function renderCharacterStats(){
 const root=$("#character-stats-grid");
 const stats=current.stats||{};
 const cells=[
  ["Vitalité et caractéristiques",[
   ["hitPoints","PV"],["actionPoints","PA réels"],["movementPoints","PM"],["rangeBonus","Portée"],
   ["strength","Force"],["intelligence","Intelligence"],["chance","Chance"],["agility","Agilité"],
   ["wisdom","Sagesse"],["power","Puissance"],["critical","Critique"],["summons","Invocations"]]],
  ["Dégâts du personnage",[
   ["flatDamage.Air","Dommages Air"],["flatDamage.Eau","Dommages Eau"],
   ["flatDamage.Terre","Dommages Terre"],["flatDamage.Feu","Dommages Feu"],
   ["flatDamage.Neutre","Dommages Neutre"],["criticalDamage","Dommages critiques"],
   ["spellDamagePercent","Dommages aux sorts (%)"]]],
  ["Résistances (%)",[
   ["resistPercent.Air","Air"],["resistPercent.Eau","Eau"],
   ["resistPercent.Terre","Terre"],["resistPercent.Feu","Feu"],["resistPercent.Neutre","Neutre"]]]
 ];
 root.innerHTML=cells.map(([heading,fields])=>'<div class="character-stat-section"><h3>'+
  escapeHtml(heading)+'</h3><div class="character-stat-fields">'+fields.map(([key,label])=>{
   const path=key.split(".");
   const raw=path.length===1?stats[path[0]]:stats[path[0]]?.[path[1]];
   const value=Number.isFinite(raw)?String(raw):"";
   return '<label><span>'+escapeHtml(label)+'</span><input type="number" step="1" inputmode="numeric" data-stat-key="'+key+
    '" value="'+escapeHtml(value)+'" placeholder="—"></label>';
  }).join("")+'</div></div>').join("");
 const note=document.querySelector("#character-stats-panel .microcopy");
 if(note)note.textContent=model.id==="sacrieur"
  ?"Sacrieur : les dégâts des sorts sont recalculés automatiquement à partir des statistiques ci-dessus (Agilité, Puissance, dommages élémentaires, critiques et % dommages aux sorts). Les données DofusBook servent uniquement à retrouver les jets de base. Les ajustements manuels des sorts restent prioritaires. Champs manquants : conservation des dégâts de référence."
  :"Sram : les caractéristiques sont enregistrées par build, mais la conversion automatique des lignes DofusBook nécessite encore les statistiques de la fiche source. Les dégâts de référence ou les calibrages manuels restent utilisés.";
}
function renderVariantPicker(){
 const picker=$("#variant-picker");
 picker.innerHTML=model.pairs.map((pair,i)=>{
  const chosen=pair.includes(current.variants[i])?current.variants[i]:model.defaultVariants[i];
  return '<div class="variant-option"><span class="variant-label">PAIRE '+String(i+1).padStart(2,"0")+'</span><div class="variant-duo">'+pair.map(name=>{
    const spell=spells.find(x=>x.name===name);
    return '<button type="button" class="variant-choice '+(name===chosen?'is-selected':'')+'" data-pair="'+i+'" data-choice="'+escapeHtml(name)+'" aria-pressed="'+(name===chosen)+'"><span>'+escapeHtml(name)+'</span><small>'+(spell?.pa??"?")+' PA</small></button>';
   }).join("")+'</div></div>';
 }).join("");
}

/** Vue en paires inspirée du menu de sorts DOFUS : les deux variantes
 * restent visibles, mais une seule est toujours sélectionnée. */
function spellbookSearchMatches(cat){
 const query=$("#spell-search").value.trim().toLocaleLowerCase("fr");
 const element=$("#spell-element").value, type=$("#spell-type").value;
 return (!query||[cat.name,cat.type,...cat.elements].join(" ").toLocaleLowerCase("fr").includes(query))&&
        (!element||(element==="aucun"?cat.elements.length===0:cat.elements.includes(element)))&&
        (!type||cat.type===type);
}
function spellbookElement(cat){
 const e=cat.elements?.[0]||"aucun";
 return ["Air","Terre","Feu","Eau","Neutre"].includes(e)?e.toLowerCase():"support";
}
function spellbookIcon(cat){
 const e=cat.elements?.[0]||"";
 if(cat.type==="Piège")return "◇";
 if(cat.type==="Poison")return "☣";
 if(cat.type==="Invocation")return "♟";
 if(cat.type==="Utilitaire"||!e)return "✦";
 return {"Air":"❯","Terre":"◆","Feu":"✹","Eau":"≈","Neutre":"✶"}[e]||"✧";
}
function spellbookOption(name,index){
 const cat=model.catalog.find(x=>x.name===name);
 const spell=spells.find(x=>x.name===name);
 if(!cat||!spell)return "";
 const chosen=current.variants[index]===name;
 const other=model.pairs[index].find(n=>n!==name);
 const first=cat.effects.find(e=>!e.cc);
 const buffs=spellBonuses(spell);
 const audit=SPELL_EFFECTS_AUDIT[model.id]?.[name];
 const tooltip=[
  cat.name,cat.pa+" PA",cat.range==="Non précisée"?"Portée variable":"PO "+cat.range,
  cat.type,
  first?first.kind+" "+first.element+" "+first.min+" à "+first.max:spell.utility||"Sort de soutien",
  ...buffs.map(b=>"+"+b.value+(b.unit||"")+" "+b.stat+" ("+b.duration+" tours, "+b.stacks+" cumul max)"),
  audit?"Effets recensés : "+audit.description:""
 ].filter(Boolean).join(" · ");
 return '<button type="button" class="spellbook-option '+(chosen?'is-equipped':'is-alternative')+
  '" data-spell-variant="'+escapeHtml(name)+'" data-spell-pair="'+index+'" aria-pressed="'+chosen+
  '" aria-label="'+escapeHtml("Équiper "+name+" à la place de "+other)+
  '" title="'+escapeHtml(tooltip)+'">'+
  '<span class="spellbook-level">Niv. '+cat.level+'</span>'+
  '<span class="spellbook-icon element-'+spellbookElement(cat)+'" aria-hidden="true">'+spellbookIcon(cat)+'</span>'+
  '<span class="spellbook-option-copy"><span class="spellbook-option-name">'+escapeHtml(name)+'</span>'+
  buffs.map(b=>'<span class="spellbook-option-effect">+'+b.value+(b.unit||"")+' '+escapeHtml(b.stat)+'</span>').join("")+'</span>'+
  '<span class="spellbook-option-pa">'+cat.pa+' PA</span>'+
  (chosen?'<span class="spellbook-option-check" aria-hidden="true">✓</span>':'')+
  '</button>';
}
function renderSpellbook(){
 if(!current||!model)return;
 const available=model.pairs.map((pair,index)=>({pair,index}))
  .filter(({pair})=>pair.some(name=>{
   const cat=model.catalog.find(x=>x.name===name);
   return cat&&spellbookSearchMatches(cat);
  }));
 const columns=[available.slice(0,Math.ceil(available.length/2)),available.slice(Math.ceil(available.length/2))];
 $("#spell-pair-grid").innerHTML=columns.map((column,i)=>
  '<div class="spellbook-column" aria-label="Colonne '+(i+1)+'">'+
  column.map(({pair,index})=>
    '<div class="spellbook-pair" role="group" aria-label="Paire de variantes '+(index+1)+'">'+
    spellbookOption(pair[0],index)+spellbookOption(pair[1],index)+'</div>'
   ).join("")+
  '</div>'
 ).join("");
 $("#spellbook-empty").hidden=available.length!==0;
 $("#spell-count").textContent=available.length+" paire"+(available.length>1?"s":"")+" affichée"+(available.length>1?"s":"")+" / "+model.pairs.length;
 const selected=model.pairs.filter((pair,i)=>pair.includes(current.variants[i])).length;
 $("#spellbook-selected-count").textContent=selected+" / "+model.pairs.length+" variantes";
 $("#spellbook-class-name").textContent=model.name.toLocaleUpperCase("fr");
 $("#spell-catalog-heading").textContent="SORTS DU "+model.name.toLocaleUpperCase("fr");

}
function invalidateRotationForVariant(){
 invalidateCombatSnapshot();
 if(currentJob)cancelCalculation();
 result=null;
 $("#total-stat").textContent="—";
 $("#direct-stat").textContent="—";
 $("#poison-stat").textContent="—";
 $("#explored-count").textContent="";
 $("#bar-chart").innerHTML='<p class="empty">Les variantes ont changé. Relance le calcul.</p>';
 $("#turn-results").innerHTML='<p class="muted">Le build a changé : recalcule sa rotation pour utiliser les nouveaux sorts.</p>';
 $("#copy-btn").disabled=true;
 $("#status").textContent="Variantes modifiées. Relance le calcul pour obtenir les meilleures rotations avec cette sélection.";
 if(assistIsOpen())refreshAssistContext();
 if(multiIsOpen())refreshMultiContext();
}
function selectSpellVariant(index,name){
 if(!model.pairs[index]?.includes(name))return false;
 if(current.variants[index]===name)return false;
 const replaced=current.variants[index];
 current.variants[index]=name;
 saveBuilds();
 invalidateRotationForVariant();
 renderVariantPicker();
 renderSpellbook();
 renderSpells();
 if(assistIsOpen())refreshAssistContext();
 $("#spellbook-selection-message").textContent=name+" équipé · "+replaced+" remplacé · build enregistré";
 return true;
}
function toggleSpellDetails(){
 const details=$("#spell-details");
 const opening=details.classList.contains("hidden");
 details.classList.toggle("hidden",!opening);
 const button=$("#spellbook-show-details");
 button.setAttribute("aria-expanded",String(opening));
 button.innerHTML=opening?'Masquer les dégâts et effets détaillés <span>⌃</span>':'Afficher les dégâts et les effets détaillés <span>⌄</span>';
 if(opening)renderSpells();
}

function renderSpells(){
 const query=$("#spell-search").value.trim().toLocaleLowerCase("fr");
 const element=$("#spell-element").value,type=$("#spell-type").value;
 const items=model.catalog.filter(c=>(!query||[c.name,c.type,...c.elements].join(" ").toLocaleLowerCase("fr").includes(query))&&(!element||(element==="aucun"?c.elements.length===0:c.elements.includes(element)))&&(!type||c.type===type));
 
 $("#spells-body").innerHTML=items.map(cat=>{
  const ix=spells.findIndex(s=>s.name===cat.name),s=spells[ix],first=cat.effects.find(e=>!e.cc);
  const selected=current.variants[s.variantGroup]===s.name;
  const audit=SPELL_EFFECTS_AUDIT[model.id]?.[cat.name];
  const summary=spellBonuses(s).length?"Buffs : "+spellBonuses(s).map(b=>"+"+b.value+(b.unit||"")+" "+b.stat).join(", ")+" · "+(s.status.buff?.duration||spellBonuses(s)[0].duration)+" tours":s.utility|| (first?first.kind+" "+first.element+" : "+first.min+"–"+first.max:"Soutien ou placement");
  const elements=cat.elements.length?cat.elements.map(e=>'<span class="element-tag element-'+e.toLowerCase()+'">'+escapeHtml(e)+'</span>').join(""):'<span class="element-tag">Soutien</span>';
  const effects=cat.effects.length?'<div class="catalog-subhead">DofusBook — jets du stuff de référence</div><div class="effect-lines">'+cat.effects.map(e=>'<div class="effect-row"><span>'+e.kind+" "+e.element+(e.cc?" CC":"")+'</span><strong>'+e.min+(e.max===e.min?"":" – "+e.max)+'</strong>'+(e.condition?'<small>'+escapeHtml(e.condition)+'</small>':'')+'</div>').join("")+'</div>':'<p class="muted">Aucune ligne de dégâts directs chiffrée sur DofusBook.</p>';
  const editable=!s.nonDirect?'<div class="calibration-box"><div class="catalog-subhead">Dégâts utilisés par OMBRE (build actif ou réglage manuel)</div><div class="calibration-grid">'+[["min","Normal min"],["max","Normal max"],["critMin","CC min"],["critMax","CC max"]].map(([key,label])=>'<label>'+label+'<input type="number" min="0" max="20000" data-spell="'+ix+'" data-field="'+key+'" value="'+s[key]+'"></label>').join("")+'</div></div>':'';
  const boost=s.status?.buff?'<div class="calibration-box"><div class="catalog-subhead">Bonus de sort pris en compte par le moteur</div><div class="calibration-grid"><label>Bonus '+(s.status.buff.unit||"")+' <input type="number" min="0" max="1000" data-spell="'+ix+'" data-field="buffValue" value="'+s.status.buff.value+'"></label><label>Durée <input type="number" min="1" max="10" data-spell="'+ix+'" data-field="buffDuration" value="'+s.status.buff.duration+'"></label></div></div>':'';
  const additionalBuffs=s.status?.extraBuffs?.length?'<div class="spell-audit-box"><div class="catalog-subhead">Bonus supplémentaires suivis</div>'+s.status.extraBuffs.map(b=>'<p>+'+b.value+(b.unit||"")+' '+escapeHtml(b.stat)+' · '+b.duration+' tours</p>').join("")+'<p class="microcopy">La Vitalité temporaire de Pacte de Sang modifie les PV actuels, les PV maximum et la Souffrance dans le simulateur Sacrieur.</p></div>':'';
  const auditNote=audit?'<div class="spell-audit-box"><div class="catalog-subhead">Effets recensés dans l’audit</div><p>'+escapeHtml(audit.description)+'</p><p class="microcopy">'+(audit.checked?'Effet général recoupé.':'Description à vérifier plus précisément.')+' <strong>Dans le calculateur :</strong> '+escapeHtml(audit.simulation||"effet secondaire non modélisé")+'. Les rangs et conditions doivent être vérifiés en jeu. <a href="'+escapeHtml(audit.source)+'" target="_blank" rel="noopener noreferrer">Voir la fiche OpenDofusDB ↗</a></p></div>':'';
  const isActiveClassVariant=selected?'<span class="catalog-tag tag-live">Variante équipée</span>':'<span class="catalog-tag">Variante non équipée</span>';
  return '<details class="catalog-entry"><summary><span class="catalog-main"><strong>'+escapeHtml(cat.name)+'</strong><span class="catalog-preview">'+escapeHtml(summary)+'</span></span><span class="catalog-meta">'+elements+'<span class="catalog-pa">'+cat.pa+' PA</span>'+isActiveClassVariant+'<span class="catalog-chevron">⌄</span></span></summary><div class="catalog-details"><div class="catalog-facts"><span>Niv. '+cat.level+'</span><span>PO '+escapeHtml(cat.range)+'</span>'+cat.details.map(d=>'<span>'+escapeHtml(d)+'</span>').join("")+'</div><p class="catalog-note">Une seule variante par paire. Ces effets sont documentés à titre indicatif et ne sont pas nécessairement tous intégrés au calcul de rotation.</p>'+auditNote+effects+editable+boost+additionalBuffs+'</div></details>';
 }).join("")||'<p class="muted">Aucun sort pour ces filtres.</p>';
}
function activateBuild(id){
 const next=builds.find(b=>b.id===id);if(!next)return;
 cancelCalculation();closeCombatDrawer();closeAssistDrawer();closeMultiDrawer();pinnedCombat?.close();pinnedAssist?.close();activeId=id;current=next;model=CLASSES[current.classId];
 applyCalibration();result=null;
 store(ACTIVE,id);
 document.documentElement.style.setProperty("--class-accent",model.color);
 $("#profile-glyph").textContent=model.glyph;
 $("#hero-glyph").textContent=model.glyph;
 $("#profile-heading").textContent=current.character+" · "+current.name;
 $("#profile-description").textContent=model.name+" · Niv. "+current.level+" · "+current.element+" · "+current.ap+" PA";
 $("#breadcrumb-class").textContent=model.name.toUpperCase();
 $("#hero-class").textContent=model.name+" · Niveau "+current.level;
 $("#hero-build").textContent=current.element+" / "+current.name;
 $("#hero-model").textContent="Modèle "+model.name;
 $("#spell-catalog-heading").textContent="SORTS DU "+model.name.toLocaleUpperCase("fr");
 const url=/^https:\/\/www\.dofusbook\.net\/desktop\/fr\/equipement\//.test(current.source)?current.source:model.source;
 $("#dofus-link").href=url;$("#catalog-dofus-link").href=url;
 $("#ap").value=current.ap;$("#ap-value").textContent=current.ap+" PA";
 $("#turns").value=current.turns;$("#turns-value").textContent=current.turns+" tours";
 $("#distance").value=current.distance;
 $("#summary-turns").textContent=current.turns;
 $("#calculate").innerHTML=calculateLabel;
 $("#total-stat").textContent="—";$("#direct-stat").textContent="—";$("#poison-stat").textContent="—";
 $("#bar-chart").innerHTML='<p class="empty">Lance le calcul pour afficher les dégâts.</p>';
 $("#turn-results").innerHTML='<p class="muted">Aucune simulation pour ce build. Lance le calcul pour commencer.</p>';
 $("#explored-count").textContent="";
 $("#status").textContent=model.id==="sacrieur"?"Sacrieur : dégâts recalculés depuis les statistiques du build actif lorsque renseignées. Souffrance et PV estimés ; carte et certains effets restent incomplets.":"Mode Sram expérimental : dégâts DofusBook de référence, carte et certaines interactions de pièges non simulées.";
 renderProfileSelect();renderBuilds();renderCharacterStats();renderVariantPicker();renderSpellbook();renderSpells();
 updateCombatButtons();
 $("#spellbook-selection-message").textContent="Variantes de "+current.character+" enregistrées pour ce build.";
}
function saveCalibration(){
 // Only save explicit edits: never persist all automatically computed rows,
 // otherwise later equipment/stat changes would be silently ignored.
 const baseline=new Map(prepareBuildSpells({...current,calibration:{}},model).map(s=>[s.id,s]));
 current.calibration={};
 for(const spell of spells){
  const original=baseline.get(spell.id);
  if(!original)continue;
  const edit={id:spell.id};
  for(const key of ["min","max","critMin","critMax","summonBase"])
   if(Number.isFinite(spell[key])&&spell[key]!==original[key])edit[key]=spell[key];
  if(spell.status?.buff&&original.status?.buff){
   const buf={};
   for(const key of ["value","duration"])
    if(Number.isFinite(spell.status.buff[key])&&spell.status.buff[key]!==original.status.buff[key])
     buf[key]=spell.status.buff[key];
   if(Object.keys(buf).length)edit.buff=buf;
  }
  if(Object.keys(edit).length>1)current.calibration[spell.id]=edit;
 }
 saveBuilds();
}

const effectMarkup=(effects=[],empty="Aucun effet actif")=>{
 const groups=groupActiveEffects(effects);
 if(!groups.length)return '<p class="active-effect-empty">'+escapeHtml(empty)+'</p>';
 return '<ul class="active-effect-list">'+groups.map(x=>{
  const value=effectValue(x);
  const count=x.stacks>1
   ?'<span class="active-effect-stacks">'+x.stacks+(x.sources.length===1?' cumuls':' sources')+'</span>'
   :"";
  return '<li class="active-effect-item effect-kind-'+escapeHtml(x.kind)+'">'+
   '<span class="active-effect-symbol" aria-hidden="true">'+({buff:"↗",debuff:"↘",poison:"☣",state:"◈"}[x.kind]||"◆")+'</span>'+
   '<div class="active-effect-details">'+
    '<div class="active-effect-main"><strong>'+escapeHtml(x.name)+'</strong>'+
    (value?'<span class="active-effect-value">'+escapeHtml(value)+'</span>':"")+'</div>'+
    '<div class="active-effect-meta"><span>'+escapeHtml(effectDuration(x))+'</span>'+count+'</div>'+
   '</div></li>';
 }).join("")+'</ul>';
};
const renderTurnEffects=t=>
 '<aside class="turn-effects-panel" aria-label="Effets actifs au tour '+t.number+'">'+
 '<div class="turn-effects-title"><span aria-hidden="true">✦</span> Effets actifs</div>'+
 '<div class="active-effects-group"><h4>Début du tour '+t.number+'</h4>'+
 effectMarkup(t.startEffects||[],"Aucun effet au début de ce tour")+'</div>'+
 '<div class="active-effects-group after-turn"><h4>Pour le tour '+(t.number+1)+'</h4>'+
 effectMarkup(t.nextEffects||[],"Aucun effet conservé pour le tour suivant")+'</div>'+
 '</aside>';
function render(){
 if(!result)return;
 $("#summary-turns").textContent=result.turns.length;
 $("#total-stat").textContent=fmt(result.total);$("#direct-stat").textContent=fmt(result.immediate);$("#poison-stat").textContent=fmt(result.poison);
 $("#explored-count").textContent=result.considered+" variantes actives / "+result.fullCatalog+" sorts · "+fmt(result.explored)+" actions évaluées";
 const max=Math.max(1,...result.turns.map(x=>x.total));
 $("#bar-chart").innerHTML=result.turns.map(t=>
  '<div class="bar-column"><div class="bar-amount">'+fmt(t.total)+'</div>'+
  '<div class="bar-plot" style="height:'+Math.max(3,t.total/max*115)+'px">'+
   '<div class="bar-segment bar-poison" style="height:'+(t.total?t.poison/t.total*100:0)+'%"></div>'+
   '<div class="bar-segment bar-direct" style="height:'+(t.total?t.immediate/t.total*100:0)+'%"></div>'+
  '</div><div class="bar-label">T'+t.number+'</div></div>').join("");
 $("#turn-results").innerHTML=result.turns.map(t=>
  '<article class="turn-card">'+
   '<div class="turn-card-head"><span class="turn-label"><span class="turn-num">'+t.number+'</span> Tour '+t.number+
    ' · '+t.spent+'/'+result.settings.ap+' PA</span>'+
    '<span class="turn-score">'+fmt(t.total)+' <small>dégâts estimés</small></span></div>'+
   '<div class="turn-card-body">'+
    '<div class="turn-card-main">'+
     '<div class="spell-chips">'+(t.actions.map(a=>'<span class="spell-chip" title="'+escapeHtml(a.notes.join(" · "))+'">'+escapeHtml(a.name)+' <b>'+a.pa+' PA</b></span>').join("")||"Passer le tour")+'</div>'+
     '<div class="turn-breakdown">Direct : '+fmt(t.immediate)+' · Différé : '+fmt(t.poison)+'</div>'+
     (t.actions.some(a=>a.notes.length)?'<div class="turn-notes">'+t.actions.flatMap(a=>a.notes.map(n=>'<span>'+escapeHtml(a.name+" : "+n)+'</span>')).join("")+'</div>':"")+
    '</div>'+
    renderTurnEffects(t)+
   '</div>'+
  '</article>').join("");
 $("#copy-btn").disabled=false;
}

function calculate(){
 if(currentJob){cancelCalculation();$("#status").textContent="Calcul interrompu.";return;}
 saveActiveSettings();const cfg=appliedSettings(),id=current.id,job={worker:null};currentJob=job;
 $("#calculate").innerHTML="✕ Annuler le calcul";$("#calculate").setAttribute("aria-busy","true");
 $("#status").textContent="Calcul en cours… 0 / "+cfg.turns+" tours";
 function finish(error,outcome){
  if(currentJob!==job||current.id!==id)return;
  cancelCalculation();
  if(error){$("#status").textContent="Erreur : "+(error.message||String(error));return;}
  result=outcome;render();
  try{const snapshot=packCombatRotation(current,outcome);storeCombatRotation(localStorage,snapshot);setCombatTurn(localStorage,current.id,1,snapshot.turns.length);}catch(err){console.warn("Rotation compacte non sauvegardée",err);}
  updateCombatButtons();
  if($("#combat-drawer").classList.contains("is-open"))renderCombatDrawer();
  pinnedCombat?.refresh();
  $("#status").textContent="Simulation "+model.name+" sur "+outcome.turns.length+" tours terminée. Dégâts approximatifs"+(model.id==="sacrieur"?" — Souffrance et PV non modélisés":"")+".";
 }
 try{
  if(typeof Worker==="undefined"){setTimeout(()=>{if(currentJob!==job)return;try{finish(null,optimize(cfg,spells))}catch(e){finish(e)}},30);}
  else {
   job.worker=new Worker(new URL("./worker.js?v=3.2",import.meta.url),{type:"module"});
   job.worker.onmessage=e=>{if(currentJob!==job)return;const m=e.data||{};if(m.type==="progress")$("#status").textContent="Tour "+m.progress.turn+"/"+cfg.turns+" · "+fmt(m.progress.explored)+" actions testées";else if(m.type==="complete")finish(null,m.result);else if(m.type==="error")finish(new Error(m.message));};
   job.worker.onerror=e=>{e.preventDefault?.();finish(new Error(e.message||"Erreur du calcul en arrière-plan"))};
   job.worker.postMessage({settings:cfg,spells});
  }
 }catch(e){finish(e)}
}
function tab(name){$$(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));$$(".tab-panel").forEach(el=>el.classList.toggle("hidden",el.id!=="tab-"+name));if(name==="team")teamModule?.refresh();}
function cloneBuild(id){
 const from=builds.find(b=>b.id===id);if(!from)return;
 saveActiveSettings();
 const newBuild=normalizeBuild({...deep(from),id:"custom-"+Date.now()+"-"+Math.floor(Math.random()*1e6),name:from.name+" (copie)"},builds.length);
 builds.push(newBuild);saveBuilds();activateBuild(newBuild.id);tab("builds");
}
function renameBuild(id){
 const b=builds.find(x=>x.id===id);if(!b)return;
 const name=window.prompt("Nouveau nom de build :",b.name);
 if(name===null||!name.trim())return;
 b.name=name.trim().slice(0,60);saveBuilds();activateBuild(b.id);
}
function deleteBuild(){
 if(builds.length<=1){alert("Tu dois conserver au moins un build.");return;}
 if(!window.confirm("Supprimer définitivement ce build enregistré dans ce navigateur ?"))return;
 clearCombatRotation(localStorage,current.id);builds=builds.filter(b=>b.id!==current.id);saveBuilds();activateBuild(builds[0].id);tab("builds");
}
function copyRotation(){
 if(!result)return;
 const output=["OMBRE — "+current.character+" / "+current.name+" — "+result.settings.ap+" PA / "+result.turns.length+" tours","Stuff "+current.source,"Estimation : "+fmt(result.total),...result.turns.map(t=>"T"+t.number+" : "+t.actions.map(a=>a.name+" ("+a.pa+" PA)").join(" → ")+" | "+fmt(t.total)+" dégâts")].join("\n");
 navigator.clipboard?.writeText(output).then(()=>{$("#copy-btn").textContent="✓ Copié";setTimeout(()=>$("#copy-btn").textContent="⧉ Copier",1500)}).catch(()=>prompt("Copier",output));
}
$("#assist-open").addEventListener("click",openAssistDrawer);
$("#multi-open").addEventListener("click",openMultiDrawer);
$("#multi-close").addEventListener("click",closeMultiDrawer);
$("#multi-popout").addEventListener("click",openMultiPopout);
$("#assist-pin-top").addEventListener("click",toggleAssistTopPin);
$("#assist-close").addEventListener("click",closeAssistDrawer);
window.addEventListener("message",event=>{
 if(event.origin!==window.location.origin)return;
 if(event.source!==$("#assist-frame").contentWindow)return;
 if(event.data?.type==="ombre:assist-popout-opened")closeAssistDrawer();
});
$("#combat-open").addEventListener("click",openCombatDrawer);
$("#combat-fab").addEventListener("click",openCombatDrawer);
$("#combat-close").addEventListener("click",closeCombatDrawer);
$("#combat-prev").addEventListener("click",()=>chooseCombatTurn(getCombatTurn(localStorage,current.id,combatSnapshot()?.turns.length||1)-1));
$("#combat-next").addEventListener("click",()=>chooseCombatTurn(getCombatTurn(localStorage,current.id,combatSnapshot()?.turns.length||1)+1));
$("#combat-list").addEventListener("click",e=>{
 const target=e.target.closest("button[data-combat-turn]");
 if(target)chooseCombatTurn(Number(target.dataset.combatTurn));
});
$("#combat-popout").addEventListener("click",detachCombatWindow);
$("#combat-pin-drawer").addEventListener("click",toggleCombatPin);
document.addEventListener("keydown",e=>{
 if(e.key==="Escape" && $("#combat-drawer").classList.contains("is-open"))closeCombatDrawer();
 if(e.key==="Escape" && assistIsOpen())closeAssistDrawer();
 if(e.key==="Escape" && multiIsOpen())closeMultiDrawer();
});
window.addEventListener("storage",e=>{
 if((e.key===COMBAT_TURNS||e.key===COMBAT_STORE)&&$("#combat-drawer").classList.contains("is-open"))renderCombatDrawer();
 if(e.key===COMBAT_TURNS||e.key===COMBAT_STORE)pinnedCombat?.refresh(true);
 if(e.key===COMBAT_STORE)updateCombatButtons();
});
$("#profile-selector").addEventListener("change",e=>activateBuild(e.target.value));
$("#profile-add").addEventListener("click",()=>{tab("builds");$("#build-character").focus()});
$("#profile-clone").addEventListener("click",()=>cloneBuild(current.id));
$("#build-cards").addEventListener("click",e=>{
 const button=e.target.closest("button");if(!button)return;
 if(button.dataset.openBuild)activateBuild(button.dataset.openBuild);
 if(button.dataset.cloneBuild)cloneBuild(button.dataset.cloneBuild);
 if(button.dataset.renameBuild)renameBuild(button.dataset.renameBuild);
});
$("#character-stats-grid").addEventListener("change",event=>{
 const input=event.target.closest("input[data-stat-key]");
 if(!input||!current)return;
 const path=input.dataset.statKey.split(".");
 if(!current.stats)current.stats={source:"manuel"};
 const number=input.value.trim()===""?null:Number(input.value);
 if(path.length===1){
  if(number===null||!Number.isFinite(number))delete current.stats[path[0]];
  else current.stats[path[0]]=number;
 }else{
  if(!current.stats[path[0]])current.stats[path[0]]={};
  if(number===null||!Number.isFinite(number))delete current.stats[path[0]][path[1]];
  else current.stats[path[0]][path[1]]=number;
 }
 current.stats.source="manuel";
 current.stats=sanitizeCharacterStats(current.stats);
 saveBuilds();
 applyCalibration();
 result=null;
 cancelCalculation();
 invalidateCombatSnapshot();
 renderSpells();
 renderSpellbook();
 if(assistIsOpen())refreshAssistContext();
 if(multiIsOpen())refreshMultiContext();
 renderCharacterStats();
 $("#status").textContent="Statistiques enregistrées : dégâts recalculés pour ce build lorsque les données de référence sont disponibles.";
});
$("#build-form").addEventListener("submit",e=>{
 e.preventDefault();
 const cls=CLASSES[$("#build-class").value];if(!cls)return;
 const source=$("#build-source").value.trim();
 const b=normalizeBuild({id:"custom-"+Date.now()+"-"+Math.floor(Math.random()*1e5),classId:cls.id,character:$("#build-character").value.trim(),name:$("#build-name").value.trim(),element:$("#build-element").value,level:200,source:source||cls.source,variants:cls.defaultVariants,ap:12,turns:10});
 builds.push(b);saveBuilds();activateBuild(b.id);$("#build-form").reset();tab("optimize");
});
$("#build-delete").addEventListener("click",deleteBuild);
$("#variant-picker").addEventListener("click",e=>{
 const button=e.target.closest("[data-pair]");if(!button)return;
 const i=Number(button.dataset.pair),choice=button.dataset.choice;
 if(!model.pairs[i]?.includes(choice))return;
 selectSpellVariant(i,choice);
});
$("#spell-pair-grid").addEventListener("click",e=>{
 const choice=e.target.closest("button[data-spell-variant]");
 if(!choice)return;
 selectSpellVariant(Number(choice.dataset.spellPair),choice.dataset.spellVariant);
});
$("#spellbook-reset-filters").addEventListener("click",()=>{
 $("#spell-search").value="";$("#spell-element").value="";$("#spell-type").value="";
 renderSpellbook();renderSpells();
});
$("#spellbook-show-details").addEventListener("click",toggleSpellDetails);
$("#spell-search").addEventListener("input",()=>{renderSpellbook();renderSpells();});
$("#spell-element").addEventListener("change",()=>{renderSpellbook();renderSpells();});
$("#spell-type").addEventListener("change",()=>{renderSpellbook();renderSpells();});
$("#spells-body").addEventListener("input",e=>{
 const input=e.target;if(!input.matches("input[data-spell]"))return;
 const s=spells[Number(input.dataset.spell)],field=input.dataset.field,val=Math.max(0,Number(input.value)||0);
 if(!s)return;
 if(["min","max","critMin","critMax"].includes(field))s[field]=val;
 if(field==="buffValue"&&s.status.buff)s.status.buff.value=val;
 if(field==="buffDuration"&&s.status.buff)s.status.buff.duration=Math.max(1,val);
 if(multiIsOpen())refreshMultiContext();
});
$$(".nav-btn").forEach(b=>b.addEventListener("click",()=>tab(b.dataset.tab)));
$("#tab-optimize .params-panel").addEventListener("change",()=>{invalidateCombatSnapshot();if(assistIsOpen())refreshAssistContext();if(multiIsOpen())refreshMultiContext();});
$("#distance").addEventListener("change",e=>{if(current){current.distance=Number(e.target.value);saveBuilds();}});
for(const id of ["ap","turns"])$("#"+id).addEventListener("input",e=>{
 $("#"+id+"-value").textContent=e.target.value+" "+(id==="ap"?"PA":"tours");
 if(current){current[id]=Number(e.target.value);saveBuilds();invalidateCombatSnapshot();if(assistIsOpen())refreshAssistContext();if(multiIsOpen())refreshMultiContext();}
});
$("#calculate").addEventListener("click",calculate);
$("#copy-btn").addEventListener("click",copyRotation);
$("#save-spells").addEventListener("click",()=>{saveCalibration();invalidateCombatSnapshot();if(multiIsOpen())refreshMultiContext();tab("optimize");if(currentJob)cancelCalculation();calculate();});
$("#reset-spells").addEventListener("click",()=>{current.calibration={};saveBuilds();applyCalibration();renderSpells();invalidateCombatSnapshot();if(multiIsOpen())refreshMultiContext();});
activateBuild(builds.find(b=>b.id===activeId)?.id||builds[0].id);
teamModule=mountTeamModule({getBuilds:()=>builds});
updatePinButton();
updateAssistTopPin();
