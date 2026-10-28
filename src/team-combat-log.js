/**
 * Lightweight, persistent battle diagnostics for the chronological team engine.
 * Logs record observable simulated state transitions, not real game combat.
 * Pure formatting helpers are shared by the compact header and copied report.
 */
const round=n=>Math.round((Number(n)||0)*10)/10;
const text=x=>String(x??"");
const buffName=b=>text(b.key||b.stat||"Effet");
const buffKey=b=>[buffName(b),b.stat,b.amount,b.until].join("|");
const buffInfo=b=>buffName(b)+(Number.isFinite(b.amount)?" "+(b.amount>0?"+":"")+round(b.amount)+(b.unit||""):"")+
 (Number.isFinite(b.until)&&b.until<Number.MAX_SAFE_INTEGER?" (jusqu'au T"+b.until+")":"");
const cards=s=>({hand:(s.ecaHand||[]).length,table:(s.ecaTable||[]).length});
const dotNames=s=>Object.values(s.dots||{}).filter(d=>d.left>0).map(d=>d.name).sort();
function changes(before,after){
 const notices=[];
 const prior=new Map((before.buffs||[]).map(b=>[buffKey(b),b]));
 const current=new Map((after.buffs||[]).map(b=>[buffKey(b),b]));
 for(const [k,b] of current)if(!prior.has(k))notices.push("Buff : "+buffInfo(b));
 for(const [k,b] of prior)if(!current.has(k)&&!((after.buffs||[]).some(c=>c.key===b.key)))
  notices.push("Effet retiré : "+buffName(b));
 const preDots=dotNames(before),postDots=dotNames(after);
 for(const name of postDots)if(!preDots.includes(name))notices.push("Poison posé : "+name);
 const a=cards(before),b=cards(after);
 if(a.hand!==b.hand||a.table!==b.table)
  notices.push("Cartes : main "+a.hand+"→"+b.hand+", table "+a.table+"→"+b.table);
 if(before.sacrierHealth&&after.sacrierHealth&&(
  before.sacrierHealth.hp!==after.sacrierHealth.hp||
  before.sacrierHealth.maxHp!==after.sacrierHealth.maxHp))
  notices.push("PV "+Math.round(before.sacrierHealth.hp)+"/"+Math.round(before.sacrierHealth.maxHp)+
   " → "+Math.round(after.sacrierHealth.hp)+"/"+Math.round(after.sacrierHealth.maxHp));
 return notices;
}
export function combatCastLog(before,after,spell,executed,damage){
 const alerts=[];
 if(spell.name==="Manigance"&&(before.buffs||[]).some(b=>
  (b.key==="Manigance"||text(b.key).startsWith("Manigance:"))&&b.until>=before.turn))
  alerts.push("Manigance relancée pendant son effet actif");
 const gross=Number(executed?.pa??spell.pa??0);
 return {
  name:text(executed?.name||spell.name),pa:gross,
  remainingPA:after.pa,
  damage:round(damage),
  notes:[...new Set([...(executed?.notes||[]),...changes(before,after)])].slice(0,16),
  alerts
 };
}
export function combatEndLog(before,after){
 const end=after.turns?.at(-1);
 const notes=[];
 const expired=(before.buffs||[]).filter(b=>b.until<after.turn);
 for(const buff of expired)notes.push("Buff expiré : "+buffName(buff));
 if(end?.ticks?.length)for(const tick of end.ticks)
  notes.push("Déclenchement différé : "+text(tick.name)+" +"+round(tick.damage)+" dégâts");
 if(before.sacrierHealth&&after.sacrierHealth&&
    before.sacrierHealth.maxHp!==after.sacrierHealth.maxHp)
  notes.push("PV max après expiration : "+Math.round(after.sacrierHealth.hp)+"/"+
   Math.round(after.sacrierHealth.maxHp));
 const a=cards(before),b=cards(after);
 if(a.hand!==b.hand||a.table!==b.table)
  notes.push("Cartes tour suivant : main "+a.hand+"→"+b.hand+", table "+a.table+"→"+b.table);
 return {delayed:round(after.total-before.total),notes:notes.slice(0,30),
  activeBuffs:(after.buffs||[]).filter(b=>b.until>=after.turn).map(buffInfo).slice(0,20),
  poisons:dotNames(after).slice(0,20),
  nextHealth:after.sacrierHealth?{
   hp:round(after.sacrierHealth.hp),maxHp:round(after.sacrierHealth.maxHp),
   suffering:after.sacrierHealth.suffering}:null
 };
}
const actionList=a=>Array.isArray(a.log?.casts)?a.log.casts:
 (a.actions||[]).map(s=>({name:s.name,pa:s.pa,damage:null,notes:[],alerts:[]}));
export function combatReportText(result,selectedTurn=null){
 if(!result?.turns?.length)return "OMBRE — aucun tour calculé.";
 const lines=["OMBRE — JOURNAL DE COMBAT (simulation)",
  "Tours calculés : "+result.turns.length+" | Dégâts équipe cumulés : "+round(result.theoretical),
  "Stratégie : "+(result.session?.teamStrategy?.mode||"non précisée")+
   " | horizon "+(result.session?.teamStrategy?.horizon||"non précisé"),
  "Les dégâts sont des estimations. Les effets de placement et les attaques ennemies ne sont pas simulés.",""];
 const turns=selectedTurn?result.turns.filter(t=>t.number===selectedTurn):result.turns;
 for(const turn of turns){
  lines.push("=== TOUR "+turn.number+" | équipe : "+round(turn.theoretical)+" dégâts ===");
  for(const actor of turn.actors||[]){
   lines.push("["+actor.character+"] "+round(actor.damage)+" dégâts (directs "+
    round(actor.direct)+", différés "+round(actor.poison)+") | PA "+
    round(actor.spent)+"/"+round(actor.availablePA??0)+
    (actor.log?.plan?" | Plan : "+actor.log.plan:""));
   const list=actionList(actor);
   if(!list.length)lines.push("  — aucune action");
   for(const [index,action] of list.entries()){
    lines.push("  "+(index+1)+". "+action.name+" ["+round(action.pa)+" PA]"+
     (action.damage===null?"":" | +"+round(action.damage)+" dégâts immédiats")+
     (action.remainingPA===undefined?"":" | PA restants "+round(action.remainingPA)));
    for(const n of action.notes||[])lines.push("     • "+n);
    for(const warning of action.alerts||[])lines.push("     ⚠ "+warning);
   }
   if(actor.log?.end){
    const end=actor.log.end;
    lines.push("  Fin de tour : +"+round(end.delayed)+" dégâts différés");
    for(const note of end.notes||[])lines.push("     • "+note);
    if(end.activeBuffs?.length)lines.push("  Buffs actifs au prochain tour : "+end.activeBuffs.join(", "));
    if(end.poisons?.length)lines.push("  Poisons en attente : "+end.poisons.join(", "));
   }
   if(actor.health)lines.push("  PV en fin de tour : "+round(actor.health.hp)+"/"+
    round(actor.health.maxHp)+" | Souffrance "+actor.health.suffering);
  }
  lines.push("");
 }
 return lines.join("\n");
}
const escapeHtml=s=>text(s).replace(/[&<>"']/g,c=>({
 "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));
export function renderCombatLog(result,selectedTurn){
 if(!result?.turns?.length)return '<div class="team-log-empty">Calcule un tour pour voir chaque action et ses effets.</div>';
 const turn=result.turns.find(t=>t.number===selectedTurn)||result.turns.at(-1);
 const actors=turn.actors||[];
 const alerts=actors.flatMap(a=>actionList(a).flatMap(s=>s.alerts||[]));
 const brief=actors.map(a=>'<div class="team-log-brief-line"><b>'+escapeHtml(a.character)+'</b> '+
  '<span>'+escapeHtml(actionList(a).map(c=>c.name).join(" → ")||"Aucune action")+'</span>'+
  '<strong>+'+round(a.damage)+'</strong></div>').join("");
 const details=actors.map(a=>'<section class="team-log-actor"><div class="team-log-actor-head"><strong>'+
  escapeHtml(a.character)+'</strong><span>'+round(a.spent)+'/'+round(a.availablePA??0)+
  ' PA · '+round(a.damage)+' dégâts</span></div>'+
  (a.log?.plan?'<p class="team-log-plan">Plan : '+escapeHtml(a.log.plan)+'</p>':'')+
  '<ol>'+actionList(a).map(action=>'<li><b>'+escapeHtml(action.name)+
   '</b> <span>'+round(action.pa)+' PA'+
   (action.damage===null?"":" · +"+round(action.damage)+" directs")+
   (action.remainingPA===undefined?"":" · reste "+round(action.remainingPA)+" PA")+'</span>'+
   (action.notes?.length?'<small>'+action.notes.map(escapeHtml).join(" · ")+'</small>':'')+
   (action.alerts?.length?'<small class="team-log-warning">⚠ '+
    action.alerts.map(escapeHtml).join(" · ")+'</small>':'')+'</li>').join("")+'</ol>'+
  (a.log?.end?'<p class="team-log-end">Fin de tour : +'+round(a.log.end.delayed)+
    ' différés'+(a.log.end.notes.length?' · '+a.log.end.notes.map(escapeHtml).join(" · "):'')+
    (a.log.end.activeBuffs.length?' · Buffs actifs : '+a.log.end.activeBuffs.map(escapeHtml).join(", "):'')+
   '</p>':'')+'</section>').join("");
 return '<div class="team-log-top"><strong>☷ Journal · Tour '+turn.number+
  '</strong><span>'+round(turn.theoretical)+' dégâts équipe'+
  (alerts.length?' · <em>⚠ '+alerts.length+' alerte(s)</em>':'')+'</span>'+
  '<button type="button" data-team-copy-log title="Copier tous les tours calculés avec les détails de chaque action">⧉ Copier les logs</button></div>'+
  '<div class="team-log-brief">'+brief+'</div>'+
  '<details class="team-log-details"><summary>Afficher le détail des sorts et des effets</summary>'+
  '<div class="team-log-detail-content">'+details+'</div></details>';
}
