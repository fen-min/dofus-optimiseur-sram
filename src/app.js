import {DEFAULT_SETTINGS} from "./spells.js";
import {CLASSES,INITIAL_BUILDS,normalizeBuild} from "./classes.js";
import {optimize} from "./engine.js";

const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const fmt=value=>new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(value||0);
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
 spells=model.spells.map(x=>({...x,status:deep(x.status||{})}));
 for(const s of spells){const item=current.calibration[s.id];if(!item)continue;
  for(const k of ["min","max","critMin","critMax","summonBase"])if(Number.isFinite(item[k])&&item[k]>=0)s[k]=item[k];
  if(s.status.buff&&item.buff)for(const k of ["value","duration"])if(Number.isFinite(item.buff[k])&&item.buff[k]>=0)s.status.buff[k]=item.buff[k];
 }
}
function renderProfileSelect(){
 const el=$("#profile-selector");
 el.innerHTML=builds.map(b=>'<option value="'+escapeHtml(b.id)+'"'+(b.id===current.id?' selected':'')+'>'+escapeHtml(b.character+" — "+b.name)+'</option>').join("");
}
function renderBuilds(){
 const root=$("#build-cards");
 root.innerHTML=builds.map(b=>{
  const cls=CLASSES[b.classId],active=b.id===current.id;
  return '<article class="build-card '+(active?'is-active':'')+'"><div class="build-avatar" style="--card-accent:'+cls.color+'">'+cls.glyph+'</div>'+
   '<div class="build-data"><span class="build-label">'+escapeHtml(cls.name)+' · '+escapeHtml(b.element)+' · Niv. '+b.level+'</span>'+
   '<h3>'+escapeHtml(b.character)+'</h3><p>'+escapeHtml(b.name)+'</p>'+
   '<small>'+b.ap+' PA · '+b.turns+' tours · '+b.variants.length+' variantes sélectionnées</small></div>'+
   '<div class="build-card-actions"><button type="button" data-open-build="'+escapeHtml(b.id)+'">'+(active?'Actif ✓':'Sélectionner')+'</button>'+
   '<button type="button" data-clone-build="'+escapeHtml(b.id)+'" aria-label="Dupliquer le build">⧉</button>'+
   '<button type="button" data-rename-build="'+escapeHtml(b.id)+'">Renommer</button></div></article>';
 }).join("");
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
 const buff=spell.status?.buff;
 const tooltip=[
  cat.name,cat.pa+" PA",cat.range==="Non précisée"?"Portée variable":"PO "+cat.range,
  cat.type,
  first?first.kind+" "+first.element+" "+first.min+" à "+first.max:spell.utility||"Sort de soutien",
  buff?"+"+buff.value+(buff.unit||"")+" "+buff.stat+" ("+buff.duration+" tours, "+buff.stacks+" cumuls)":""
 ].filter(Boolean).join(" · ");
 return '<button type="button" class="spellbook-option '+(chosen?'is-equipped':'is-alternative')+
  '" data-spell-variant="'+escapeHtml(name)+'" data-spell-pair="'+index+'" aria-pressed="'+chosen+
  '" aria-label="'+escapeHtml("Équiper "+name+" à la place de "+other)+
  '" title="'+escapeHtml(tooltip)+'">'+
  '<span class="spellbook-level">Niv. '+cat.level+'</span>'+
  '<span class="spellbook-icon element-'+spellbookElement(cat)+'" aria-hidden="true">'+spellbookIcon(cat)+'</span>'+
  '<span class="spellbook-option-copy"><span class="spellbook-option-name">'+escapeHtml(name)+'</span>'+
  (buff?'<span class="spellbook-option-effect">+'+buff.value+(buff.unit||"")+' '+escapeHtml(buff.stat)+'</span>':'')+'</span>'+
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
  const summary=s.status?.buff?"Buff : +"+s.status.buff.value+(s.status.buff.unit||"")+" "+s.status.buff.stat+" · "+s.status.buff.duration+" tours":s.utility|| (first?first.kind+" "+first.element+" : "+first.min+"–"+first.max:"Soutien ou placement");
  const elements=cat.elements.length?cat.elements.map(e=>'<span class="element-tag element-'+e.toLowerCase()+'">'+escapeHtml(e)+'</span>').join(""):'<span class="element-tag">Soutien</span>';
  const effects=cat.effects.length?'<div class="effect-lines">'+cat.effects.map(e=>'<div class="effect-row"><span>'+e.kind+" "+e.element+(e.cc?" CC":"")+'</span><strong>'+e.min+(e.max===e.min?"":" – "+e.max)+'</strong>'+(e.condition?'<small>'+escapeHtml(e.condition)+'</small>':'')+'</div>').join("")+'</div>':'<p class="muted">Aucune ligne de dégâts directs chiffrée sur DofusBook.</p>';
  const editable=!s.nonDirect?'<div class="calibration-box"><div class="catalog-subhead">Dégâts utilisés par le calculateur</div><div class="calibration-grid">'+[["min","Normal min"],["max","Normal max"],["critMin","CC min"],["critMax","CC max"]].map(([key,label])=>'<label>'+label+'<input type="number" min="0" max="20000" data-spell="'+ix+'" data-field="'+key+'" value="'+s[key]+'"></label>').join("")+'</div></div>':'';
  const boost=s.status?.buff?'<div class="calibration-box"><div class="catalog-subhead">Bonus de sort pris en compte par le moteur</div><div class="calibration-grid"><label>Bonus '+(s.status.buff.unit||"")+' <input type="number" min="0" max="1000" data-spell="'+ix+'" data-field="buffValue" value="'+s.status.buff.value+'"></label><label>Durée <input type="number" min="1" max="10" data-spell="'+ix+'" data-field="buffDuration" value="'+s.status.buff.duration+'"></label></div></div>':'';
  const isActiveClassVariant=selected?'<span class="catalog-tag tag-live">Variante équipée</span>':'<span class="catalog-tag">Variante non équipée</span>';
  return '<details class="catalog-entry"><summary><span class="catalog-main"><strong>'+escapeHtml(cat.name)+'</strong><span class="catalog-preview">'+escapeHtml(summary)+'</span></span><span class="catalog-meta">'+elements+'<span class="catalog-pa">'+cat.pa+' PA</span>'+isActiveClassVariant+'<span class="catalog-chevron">⌄</span></span></summary><div class="catalog-details"><div class="catalog-facts"><span>Niv. '+cat.level+'</span><span>PO '+escapeHtml(cat.range)+'</span>'+cat.details.map(d=>'<span>'+escapeHtml(d)+'</span>').join("")+'</div><p class="catalog-note">Une seule variante par paire. Les dégâts et certains effets secondaires ne sont pas encore intégralement vérifiés. Furie : bonus final confirmé par capture, mais zone non simulée.</p>'+effects+editable+boost+'</div></details>';
 }).join("")||'<p class="muted">Aucun sort pour ces filtres.</p>';
}
function activateBuild(id){
 const next=builds.find(b=>b.id===id);if(!next)return;
 cancelCalculation();activeId=id;current=next;model=CLASSES[current.classId];
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
 $("#status").textContent=model.id==="sacrieur"?"Mode Sacrieur expérimental : Souffrance, pertes de PV, soins et certains effets sont incomplets. Les dégâts sont uniquement indicatifs.":"Mode Sram expérimental : la carte, les placements et certaines interactions de pièges ne sont pas simulés.";
 renderProfileSelect();renderBuilds();renderVariantPicker();renderSpellbook();renderSpells();
 $("#spellbook-selection-message").textContent="Variantes de "+current.character+" enregistrées pour ce build.";
}
function saveCalibration(){
 current.calibration={};
 for(const spell of spells)current.calibration[spell.id]={id:spell.id,min:spell.min,max:spell.max,critMin:spell.critMin,critMax:spell.critMax,
  buff:spell.status?.buff?{value:spell.status.buff.value,duration:spell.status.buff.duration}:undefined};
 saveBuilds();
}
function render(){
 if(!result)return;
 $("#summary-turns").textContent=result.turns.length;
 $("#total-stat").textContent=fmt(result.total);$("#direct-stat").textContent=fmt(result.immediate);$("#poison-stat").textContent=fmt(result.poison);
 $("#explored-count").textContent=result.considered+" variantes actives / "+result.fullCatalog+" sorts · "+fmt(result.explored)+" actions évaluées";
 const max=Math.max(1,...result.turns.map(x=>x.total));
 $("#bar-chart").innerHTML=result.turns.map(t=>'<div class="bar-column"><div class="bar-amount">'+fmt(t.total)+'</div><div class="bar-plot" style="height:'+Math.max(3,t.total/max*115)+'px"><div class="bar-segment bar-poison" style="height:'+(t.total?t.poison/t.total*100:0)+'%"></div><div class="bar-segment bar-direct" style="height:'+(t.total?t.immediate/t.total*100:0)+'%"></div></div><div class="bar-label">T'+t.number+'</div></div>').join("");
 $("#turn-results").innerHTML=result.turns.map(t=>'<article class="turn-card"><div class="turn-card-head"><span class="turn-label"><span class="turn-num">'+t.number+'</span> Tour '+t.number+' · '+t.spent+'/'+result.settings.ap+' PA</span><span class="turn-score">'+fmt(t.total)+' <small>dégâts estimés</small></span></div><div class="spell-chips">'+(t.actions.map(a=>'<span class="spell-chip" title="'+escapeHtml(a.notes.join(" · "))+'">'+escapeHtml(a.name)+' <b>'+a.pa+' PA</b></span>').join("")||"Passer le tour")+'</div><div class="turn-breakdown">Direct : '+fmt(t.immediate)+' · Différé : '+fmt(t.poison)+'</div>'+(t.actions.some(a=>a.notes.length)?'<div class="turn-notes">'+t.actions.flatMap(a=>a.notes.map(n=>'<span>'+escapeHtml(a.name+" : "+n)+'</span>')).join("")+'</div>':'')+'</article>').join("");
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
  $("#status").textContent="Simulation "+model.name+" sur "+outcome.turns.length+" tours terminée. Dégâts approximatifs"+(model.id==="sacrieur"?" — Souffrance et PV non modélisés":"")+".";
 }
 try{
  if(typeof Worker==="undefined"){setTimeout(()=>{if(currentJob!==job)return;try{finish(null,optimize(cfg,spells))}catch(e){finish(e)}},30);}
  else {
   job.worker=new Worker(new URL("./worker.js",import.meta.url),{type:"module"});
   job.worker.onmessage=e=>{if(currentJob!==job)return;const m=e.data||{};if(m.type==="progress")$("#status").textContent="Tour "+m.progress.turn+"/"+cfg.turns+" · "+fmt(m.progress.explored)+" actions testées";else if(m.type==="complete")finish(null,m.result);else if(m.type==="error")finish(new Error(m.message));};
   job.worker.onerror=e=>{e.preventDefault?.();finish(new Error(e.message||"Erreur du calcul en arrière-plan"))};
   job.worker.postMessage({settings:cfg,spells});
  }
 }catch(e){finish(e)}
}
function tab(name){$$(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));$$(".tab-panel").forEach(el=>el.classList.toggle("hidden",el.id!=="tab-"+name));}
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
 builds=builds.filter(b=>b.id!==current.id);saveBuilds();activateBuild(builds[0].id);tab("builds");
}
function copyRotation(){
 if(!result)return;
 const output=["OMBRE — "+current.character+" / "+current.name+" — "+result.settings.ap+" PA / "+result.turns.length+" tours","Stuff "+current.source,"Estimation : "+fmt(result.total),...result.turns.map(t=>"T"+t.number+" : "+t.actions.map(a=>a.name+" ("+a.pa+" PA)").join(" → ")+" | "+fmt(t.total)+" dégâts")].join("\n");
 navigator.clipboard?.writeText(output).then(()=>{$("#copy-btn").textContent="✓ Copié";setTimeout(()=>$("#copy-btn").textContent="⧉ Copier",1500)}).catch(()=>prompt("Copier",output));
}
$("#profile-selector").addEventListener("change",e=>activateBuild(e.target.value));
$("#profile-add").addEventListener("click",()=>{tab("builds");$("#build-character").focus()});
$("#profile-clone").addEventListener("click",()=>cloneBuild(current.id));
$("#build-cards").addEventListener("click",e=>{
 const button=e.target.closest("button");if(!button)return;
 if(button.dataset.openBuild)activateBuild(button.dataset.openBuild);
 if(button.dataset.cloneBuild)cloneBuild(button.dataset.cloneBuild);
 if(button.dataset.renameBuild)renameBuild(button.dataset.renameBuild);
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
});
$$(".nav-btn").forEach(b=>b.addEventListener("click",()=>tab(b.dataset.tab)));
$("#distance").addEventListener("change",e=>{if(current){current.distance=Number(e.target.value);saveBuilds();}});
for(const id of ["ap","turns"])$("#"+id).addEventListener("input",e=>{
 $("#"+id+"-value").textContent=e.target.value+" "+(id==="ap"?"PA":"tours");
 if(current){current[id]=Number(e.target.value);saveBuilds();}
});
$("#calculate").addEventListener("click",calculate);
$("#copy-btn").addEventListener("click",copyRotation);
$("#save-spells").addEventListener("click",()=>{saveCalibration();tab("optimize");if(currentJob)cancelCalculation();calculate();});
$("#reset-spells").addEventListener("click",()=>{current.calibration={};saveBuilds();applyCalibration();renderSpells();});
activateBuild(builds.find(b=>b.id===activeId)?.id||builds[0].id);
