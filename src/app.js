import {DEFAULT_SETTINGS,SOURCE_URL} from "./spells.js";
import {SIM_SPELLS,DEFAULT_VARIANTS,VARIANT_PAIRS} from "./sim-spells.js";
import {SRAM_CATALOG} from "./sram-catalog.js";
import {optimize} from "./engine.js";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],spells=SIM_SPELLS.map(s=>({...s}));
const fmt=n=>new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(n||0);
let result=null;
function settings(){
 const names=["ap","turns","resistance","resistanceTerre","resistanceFeu","resistanceEau","resistanceNeutre","distance","inLine","lineOfSight","criticals","triggerTraps","triggerOnPush","comploteurContact","enemyLowHp"];
 const values=Object.fromEntries(names.map(k=>{
  const e=document.getElementById(k)||document.querySelector('[name="'+k+'"]');
  return [k,!e?DEFAULT_SETTINGS[k]:e.type==="checkbox"?e.checked:["number","range"].includes(e.type)||e.tagName==="SELECT"?Number(e.value):e.value];
 }));
 values.variants=VARIANT_PAIRS.map((pair,i)=>document.querySelector('[data-variant="'+i+'"]')?.value||DEFAULT_VARIANTS[i]);
 return values;
}
function variantPicker(){
 let saved=[];
 try{saved=JSON.parse(localStorage.getItem("ombre-variants-v03")||"[]");}catch{}
 const picker=document.getElementById("variant-picker");
 picker.innerHTML=VARIANT_PAIRS.map((pair,i)=>{
   const choice=pair.includes(saved[i])?saved[i]:DEFAULT_VARIANTS[i];
   return '<label class="variant-option"><span>Paire '+(i+1)+'</span><select data-variant="'+i+'" aria-label="Variante paire '+(i+1)+'">'+pair.map(n=>'<option value="'+escapeHtml(n)+'"'+(n===choice?' selected':'')+'>'+escapeHtml(n)+'</option>').join("")+'</select></label>';
 }).join("");
 picker.addEventListener("change",()=>{try{localStorage.setItem("ombre-variants-v03",JSON.stringify(settings().variants));}catch{}});
}
function render(){
 if(!result)return;
 $("#total-stat").textContent=fmt(result.total);
 const horizon=$("#summary-turns");if(horizon)horizon.textContent=String(result.turns.length);
 $("#direct-stat").textContent=fmt(result.immediate);
 $("#poison-stat").textContent=fmt(result.poison);
 $("#explored-count").textContent=result.considered+"/"+result.fullCatalog+" variantes de sorts testables · "+fmt(result.explored)+" actions explorées";
 const max=Math.max(1,...result.turns.map(x=>x.total));
 $("#bar-chart").innerHTML=result.turns.map(t=>'<div class="bar-column"><div class="bar-amount">'+fmt(t.total)+'</div><div class="bar-plot" style="height:'+Math.max(2,t.total/max*105)+'px"><div class="bar-segment bar-poison" style="height:'+(t.total?t.poison/t.total*100:0)+'%"></div><div class="bar-segment bar-direct" style="height:'+(t.total?t.immediate/t.total*100:0)+'%"></div></div><div class="bar-label">Tour '+t.number+'</div></div>').join("");
 $("#turn-results").innerHTML=result.turns.map(t=>
 '<article class="turn-card"><div class="turn-card-head"><span class="turn-label"><span class="turn-num">'+t.number+'</span> Tour '+t.number+' · '+t.spent+'/'+result.settings.ap+' PA</span><span class="turn-score">'+fmt(t.total)+' <small>dégâts estimés</small></span></div><div class="spell-chips">'+
 (t.actions.map(a=>'<span class="spell-chip" title="'+escapeHtml(a.notes.join(" · "))+'">'+escapeHtml(a.name)+' <b>'+a.pa+' PA</b></span>').join("")||"Passer le tour")+
 '</div><div class="turn-breakdown">Direct : '+fmt(t.immediate)+' · Effets différés : '+fmt(t.poison)+'</div>'+
 (t.actions.some(a=>a.notes.length)?'<div class="turn-notes">'+t.actions.flatMap(a=>a.notes.map(n=>escapeHtml(a.name)+" : "+escapeHtml(n))).map(n=>'<span>'+n+'</span>').join("")+'</div>':"")+
 '</article>').join("");
 $("#copy-btn").disabled=false;
}

let currentJob=null;
const calculateLabel=$("#calculate").innerHTML;
function setCalculationBusy(active){
 const button=$("#calculate");
 button.innerHTML=active?"✕ Annuler le calcul":calculateLabel;
 button.setAttribute("aria-busy",active?"true":"false");
}
function calculate(){
 // Le bouton sert aussi à interrompre une simulation longue.
 if(currentJob){
  currentJob.worker?.terminate();
  currentJob=null;
  setCalculationBusy(false);
  $("#status").textContent="Calcul interrompu. Tu peux modifier les paramètres puis relancer.";
  return;
 }
 const cfg=settings();
 const job={worker:null};currentJob=job;
 const status=$("#status");
 setCalculationBusy(true);
 status.textContent="Calcul en cours : 0 / "+cfg.turns+" tours analysés…";
 const finish=(error,outcome)=>{
  if(currentJob!==job)return;
  job.worker?.terminate();
  currentJob=null;
  setCalculationBusy(false);
  if(error){status.textContent="Erreur de calcul : "+(error.message||String(error));return;}
  result=outcome;
  render();
  status.textContent="Simulation terminée sur "+outcome.turns.length+" tours. Dégâts théoriques monocibles : effets de carte et certaines mécaniques restent approximatifs.";
 };
 try{
  if(typeof Worker==="undefined"){
   // Repli pour un navigateur ne prenant pas en charge les modules Worker.
   setTimeout(()=>{
    if(currentJob!==job)return;
    try{finish(null,optimize(cfg,spells));}catch(error){finish(error);}
   },30);
  }else{
   job.worker=new Worker(new URL("./worker.js",import.meta.url),{type:"module"});
   job.worker.onmessage=event=>{
    if(currentJob!==job)return;
    const message=event.data||{};
    if(message.type==="progress"){
     status.textContent="Calcul du tour "+message.progress.turn+" / "+cfg.turns+"… "+fmt(message.progress.explored)+" actions explorées.";
    }else if(message.type==="complete"){finish(null,message.result);}
    else if(message.type==="error"){finish(new Error(message.message||"Erreur du moteur"));}
   };
   job.worker.onerror=event=>{
    event.preventDefault?.();
    finish(new Error(event.message||"Impossible de démarrer le moteur en arrière-plan."));
   };
   job.worker.postMessage({settings:cfg,spells});
  }
 }catch(error){finish(error);}
}
function tab(name){$$(".nav-btn").forEach(e=>e.classList.toggle("active",e.dataset.tab===name));$$(".tab-panel").forEach(e=>e.classList.toggle("hidden",e.id!=="tab-"+name));}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
function renderSpells(){
  const query=document.getElementById("spell-search")?.value.trim().toLocaleLowerCase("fr")||"";
  const element=document.getElementById("spell-element")?.value||"";
  const type=document.getElementById("spell-type")?.value||"";
  const visible=SRAM_CATALOG.filter(c=> 
    (!query||[c.name,c.type,...c.elements].join(" ").toLocaleLowerCase("fr").includes(query)) &&
    (!element||(element==="aucun"?c.elements.length===0:c.elements.includes(element))) &&
    (!type||c.type===type)
  );
  document.getElementById("spell-count").textContent=`${visible.length} sort${visible.length!==1?"s":""} affiché${visible.length!==1?"s":""} sur ${SRAM_CATALOG.length}`;
  document.getElementById("spells-body").innerHTML=visible.map(c=>{
    const simIndex=spells.findIndex(s=>s.name===c.name),sim=spells[simIndex];
    const first=c.effects.find(e=>!e.cc);
    const summary=sim?.status?.buff?`Buff +${sim.status.buff.value} ${sim.status.buff.stat} · ${sim.status.buff.duration} tours`:sim?.status?.summon?"Explosion différée (si contact)":first?`${first.kind} ${first.element} : ${first.min}${first.max!==first.min?"–"+first.max:""}`:sim?.utility||"Sort de soutien / placement";
    const el=c.elements.length?c.elements.map(e=>`<span class="element-tag element-${e.toLowerCase()}">${escapeHtml(e)}</span>`).join(""):`<span class="element-tag">Sans élément</span>`;
    const effects=c.effects.length?`<div class="effect-lines"><div class="catalog-subhead">Lignes de dégâts et conditions sur DofusBook</div>${c.effects.map(e=>`<div class="effect-row"><span class="effect-label">${escapeHtml(e.kind)} ${escapeHtml(e.element)}${e.cc?' <b>CC</b>':""}</span><strong>${e.min}${e.max!==e.min?" – "+e.max:""}</strong>${e.condition?`<small>${escapeHtml(e.condition)}</small>`:""}</div>`).join("")}</div>`:'<p class="muted">Ce sort n’a pas de dégâts élémentaires chiffrés sur la fiche consultée. Son utilité (buff, placement, invisibilité, invocation, etc.) doit être prise en compte séparément.</p>';
    const calibration=sim&&!sim.nonDirect?`<div class="calibration-box"><div class="catalog-subhead">Réglage utilisé par le simulateur expérimental</div><p class="microcopy">Ce bloc calibre la rotation sur la durée choisie ; les lignes de dégâts DofusBook ci-dessus restent la référence affichée.</p><div class="calibration-grid">${[["min","Normal min"],["max","Normal max"],["critMin","CC min"],["critMax","CC max"]].map(([k,label])=>`<label>${label}<input type="number" min="0" max="20000" value="${sim[k]}" data-spell="${simIndex}" data-field="${k}" aria-label="${escapeHtml(c.name+" "+label)}"></label>`).join("")}</div></div>`:"";
    const info=[`Niv. ${c.level}`,`${c.pa} PA`,`PO ${escapeHtml(c.range)}`,...c.details,c.critChance!==null?`${c.critChance}% CC total`:""].filter(Boolean);
    return `<details class="catalog-entry"><summary><span class="catalog-main"><strong>${escapeHtml(c.name)}</strong><span class="catalog-preview">${escapeHtml(summary)}${c.effects.filter(e=>!e.cc).length>1?" · plusieurs conditions":""}</span></span><span class="catalog-meta">${el}<span class="catalog-pa">${c.pa} PA</span><span class="catalog-tag ${sim?"tag-live":""}">${sim?"Dans le moteur":"Catalogue"}</span><span class="catalog-chevron">⌄</span></span></summary><div class="catalog-details"><div class="catalog-facts">${info.map(x=>`<span>${x}</span>`).join("")}</div><p class="catalog-note">Type : ${escapeHtml(c.type)} · Les valeurs conditionnelles et les variantes peuvent différer selon la situation.</p>${effects}${calibration}${sim?.status?.buff?`<p class="catalog-note"><strong>Buff dans la simulation :</strong> +${sim.status.buff.value} ${escapeHtml(sim.status.buff.stat)} pendant ${sim.status.buff.duration} tours (cumul maximal : ${sim.status.buff.stacks}).</p>`:""}${sim?.utility?`<p class="catalog-note">Effet suivi : ${escapeHtml(sim.utility)}</p>`:""}</div></details>`;
  }).join("")||'<p class="muted">Aucun sort ne correspond à ces filtres.</p>';
}
function copy(){if(!result)return;const t=["OMBRE — "+result.settings.ap+" PA, "+result.settings.turns+" tours",SOURCE_URL,"Dégâts théoriques : "+fmt(result.total),...result.turns.map(x=>"T"+x.number+" ("+x.spent+" PA) : "+x.actions.map(a=>a.name+" ("+a.pa+" PA)").join(" → ")+" | Direct "+fmt(x.immediate)+" | Poisons "+fmt(x.poison))].join("\n");navigator.clipboard?.writeText(t).then(()=>{$("#copy-btn").textContent="✓ Copié";setTimeout(()=>$("#copy-btn").textContent="⧉ Copier",1400)}).catch(()=>prompt("Copier",t));}
try{for(const s of JSON.parse(localStorage.getItem("ombre-spell-calibration")||"[]")){const x=spells.find(a=>a.id===s.id);if(x)for(const k of ["min","max","critMin","critMax"])if(Number.isFinite(s[k])&&s[k]>=0)x[k]=s[k];}}catch{}
variantPicker();renderSpells();["spell-search","spell-element","spell-type"].forEach(id=>document.getElementById(id)?.addEventListener("input",renderSpells));$("#spells-body").addEventListener("input",event=>{const target=event.target;if(target instanceof HTMLInputElement&&target.dataset.spell!==undefined){const index=Number(target.dataset.spell),field=target.dataset.field;if(spells[index]&&["min","max","critMin","critMax"].includes(field)&&target.value!==""){spells[index][field]=Math.max(0,Number(target.value)||0);}}});$$(".nav-btn").forEach(b=>b.addEventListener("click",()=>tab(b.dataset.tab)));for(const id of ["ap","turns"]){const el=$("#"+id);el?.addEventListener("input",()=>{$("#"+id+"-value").textContent=el.value+" "+(id==="ap"?"PA":"tours");});}$("#calculate").addEventListener("click",calculate);$("#copy-btn").addEventListener("click",copy);$("#save-spells").addEventListener("click",()=>{try{localStorage.setItem("ombre-spell-calibration",JSON.stringify(spells.map(s=>({id:s.id,min:s.min,max:s.max,critMin:s.critMin,critMax:s.critMax}))));}catch{}tab("optimize");calculate();});$("#reset-spells").addEventListener("click",()=>{SIM_SPELLS.forEach((s,i)=>{for(const k of ["min","max","critMin","critMax"])spells[i][k]=s[k];});localStorage.removeItem("ombre-spell-calibration");renderSpells();});calculate();