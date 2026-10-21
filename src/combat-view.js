/**
 * Mode combat : résumé léger, par build, enregistré uniquement dans le navigateur.
 * Un tour conserve l'ordre exact des sorts trouvés par le moteur.
 * Les dégâts et les effets non vérifiés ne sont PAS affichés ici.
 */
export const COMBAT_STORE="ombre-quick-rotations-v1";
export const COMBAT_TURNS="ombre-quick-current-turn-v1";
const read=(storage,key)=>{
 try{const value=JSON.parse(storage.getItem(key)||"{}");return value&&typeof value==="object"&&!Array.isArray(value)?value:{};}
 catch{return {};}
};
const write=(storage,key,obj)=>{try{storage.setItem(key,JSON.stringify(obj));return true;}catch{return false;}};
export const escapeQuick=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const clamp=(n,min,max)=>Math.min(max,Math.max(min,Number.isFinite(+n)?Math.floor(+n):min));

export function packCombatRotation(build,result){
 if(!build?.id||!Array.isArray(result?.turns)||!result.turns.length)throw Error("Rotation absente");
 const budget=clamp(result.settings?.ap,1,30);
 return {
  version:1,buildId:String(build.id),classId:String(build.classId||""),
  character:String(build.character||"Personnage").slice(0,50),
  name:String(build.name||"Build").slice(0,70),
  ap:budget,savedAt:new Date().toISOString(),
  turns:result.turns.slice(0,10).map((turn,i)=>({
   number:i+1,spent:clamp(turn.spent,0,budget),
   actions:(turn.actions||[]).slice(0,20).map(action=>({
    name:String(action.name||"Sort").slice(0,70),pa:clamp(action.pa,0,budget)
   }))
  }))
 };
}
export function storeCombatRotation(storage,rotation){
 const all=read(storage,COMBAT_STORE);
 all[rotation.buildId]=rotation;
 return write(storage,COMBAT_STORE,all);
}
export function getCombatRotation(storage,buildId){
 const r=read(storage,COMBAT_STORE)[buildId];
 return r?.version===1 && Array.isArray(r.turns) && r.turns.length?r:null;
}
export function clearCombatRotation(storage,buildId){
 const all=read(storage,COMBAT_STORE),turns=read(storage,COMBAT_TURNS);
 delete all[buildId];delete turns[buildId];
 write(storage,COMBAT_STORE,all);write(storage,COMBAT_TURNS,turns);
}
export function getCombatTurn(storage,buildId,max=10){
 return clamp(read(storage,COMBAT_TURNS)[buildId]??1,1,max);
}
export function setCombatTurn(storage,buildId,turn,max=10){
 const all=read(storage,COMBAT_TURNS);
 all[buildId]=clamp(turn,1,max);
 return write(storage,COMBAT_TURNS,all);
}
export function renderCombatTurns(rotation,active=1){
 if(!rotation?.turns?.length)return '<p class="combat-empty">Calcule une rotation pour afficher les sorts.</p>';
 return rotation.turns.map(turn=>{
  const selected=turn.number===active;
  return '<button type="button" class="combat-turn'+(selected?' is-current':'')+'"'+
   ' data-combat-turn="'+turn.number+'" aria-current="'+(selected?'step':'false')+'">'+
   '<span class="combat-turn-heading"><span class="combat-turn-number">T'+turn.number+'</span>'+
   '<span class="combat-turn-pa">'+turn.spent+'/'+rotation.ap+' PA</span></span>'+
   '<span class="combat-actions">'+(turn.actions.length?
    turn.actions.map(a=>'<span class="combat-spell">'+escapeQuick(a.name)+
      '<span>'+a.pa+' PA</span></span>').join(""):'<span class="combat-skip">Passer le tour</span>')+
   '</span></button>';
 }).join("");
}
