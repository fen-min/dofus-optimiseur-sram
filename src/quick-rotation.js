/** Compact combat checklist; intentionally excludes damages and status effects. */
export const escapeQuickText=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
export function quickTurns(result){
 if(!result||!Array.isArray(result.turns))return [];
 const maxPA=Number.isFinite(+result.settings?.ap)?+result.settings.ap:0;
 return result.turns.map((t,i)=>({
  number:Number.isInteger(t.number)?t.number:i+1,
  spent:Number.isFinite(+t.spent)?+t.spent:0,
  maxPA,spells:Array.isArray(t.actions)?t.actions.map(a=>({
   name:String(a.name??"Sort inconnu"),pa:Number.isFinite(+a.pa)?+a.pa:0
  })):[]
 }));
}
export function quickRotationText(turns,title="Rotation"){
 return [title,...turns.map(t=>"Tour "+t.number+" · "+t.spent+"/"+t.maxPA+" PA : "+(
  t.spells.map(s=>s.name+" ("+s.pa+" PA)").join(" → ")||"Passer le tour"
 ))].join("\n");
}
export function renderQuickRows(turns,currentNumber=1){
 return turns.map(t=>
  '<button type="button" class="quick-turn'+(currentNumber===t.number?' current':'')+
  '" data-quick-turn="'+t.number+'" aria-pressed="'+(currentNumber===t.number)+'">'+
  '<span class="quick-turn-head"><strong>Tour '+t.number+'</strong><small>'+
  t.spent+'/'+t.maxPA+' PA</small></span>'+
  '<span class="quick-spells">'+(t.spells.length?t.spells.map(s=>
   '<span class="quick-spell">'+escapeQuickText(s.name)+
   '<span class="quick-spell-pa">'+s.pa+' PA</span></span>').join(""):
   '<span class="quick-spell-pass">Passer le tour</span>')+'</span></button>'
 ).join("");
}
/** Entire self-contained mini-window; only created from a direct user click. */
export function quickPopupDocument(turns,title){
 const name=escapeQuickText(title);
 const rows=renderQuickRows(turns,turns[0]?.number||1);
 return '<!doctype html><html lang="fr"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>OMBRE — '+name+'</title><style>'+
  ':root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#101420;color:#f7f3ff;font:13px/1.45 system-ui,Segoe UI,sans-serif}'+
  'header{position:sticky;top:0;background:#1d2232;border-bottom:1px solid #50506c;padding:13px 15px;z-index:2}h1{font-size:16px;margin:0}header p{font-size:11px;color:#bcb8cb;margin:3px 0 0}'+
  'main{padding:12px;display:grid;gap:9px}.quick-turn{display:block;width:100%;background:#202537;color:inherit;text-align:left;border:1px solid #41445d;border-radius:10px;padding:10px;cursor:pointer}'+
  '.quick-turn.current{border-color:#c4a9ff;background:#2c2948;box-shadow:inset 3px 0 #c4a9ff}.quick-turn-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;gap:8px}'+
  '.quick-turn-head strong{color:#f0dfff}.quick-turn-head small{font-size:11px;color:#d7c4ff}.quick-spells{display:flex;gap:5px;flex-wrap:wrap}.quick-spell{border:1px solid #595078;border-radius:7px;background:#28223e;padding:5px 7px;font-size:12px}'+
  '.quick-spell-pa{margin-left:6px;color:#c6b3fc;font-size:10px;white-space:nowrap}.quick-spell-pass{color:#c4bbd0;font-style:italic}'+
  '</style></head><body><header><h1>⚔ Rotation rapide · '+turns.length+' tours</h1><p>'+name+' — clique sur un tour pour le surligner</p></header><main id="turns">'+rows+'</main>'+
  '<script>document.getElementById("turns").addEventListener("click",function(e){var b=e.target.closest("[data-quick-turn]");if(!b)return;'+
  'document.querySelectorAll(".quick-turn").forEach(function(x){x.classList.remove("current");x.setAttribute("aria-pressed","false")});b.classList.add("current");b.setAttribute("aria-pressed","true");});<\/script>'+
  '</body></html>';
}
