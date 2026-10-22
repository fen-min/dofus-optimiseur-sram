/**
 * Experimental multi-target tactical sandbox for OMBRE.
 * Independent from the existing single-target assisted combat.
 * Fixed 9x9 abstract cells, Manhattan distance, no obstacles or line of sight.
 * AOE templates are USER-ADJUSTABLE hypotheses, NOT official DOFUS hitboxes.
 */
import {initialState,castSpell,endTurn,cleanSettings} from "./engine.js?v=1.8";

export const SIZE=9;
export const MULTI_STORE="ombre-multi-battle-v1";
export const MAX_MONSTERS=8;
export const SHAPES={
 single:"Une cible",
 cross1:"Croix 1 case (estimée)",
 square1:"Carré 1 case (estimé)",
 circle2:"Rayon 2 cases (estimé)",
 line2:"Ligne 2 cases (estimée)"
};
const aoeHints=new Set([
 "Fourvoiement","Furie","Nervosité","Douleur Cuisante","Carnage",
 "Désolation","Déchaînement","Bain de Sang","Dissolution","Afflux",
 "Condensation","Hécatombe","Immolation","Folie Sanguinaire",
 "Fulgurance","Décimation","Ravage","Projection","Supplice","Absorption",
 "Couronne d'Épines","Épidémie","Larcin","Fourberie","Cruauté"
]);
export function defaultShape(spell){
 if(spell?.isTrap||spell?.status?.poison)return "single";
 return aoeHints.has(spell?.name)?"cross1":"single";
}
export const round=n=>Math.round(n*10)/10;
export const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export const inGrid=p=>p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.y>=0&&p.x<SIZE&&p.y<SIZE;
export function makeBoard(){
 return {hero:{x:3,y:4},monsters:[
  {id:"m1",x:5,y:4,hp:10000},
  {id:"m2",x:5,y:5,hp:10000},
  {id:"m3",x:6,y:4,hp:10000}
 ],shapes:{}};
}
export function validateBoard(input){
 const b=input||{},hero=inGrid(b.hero)?{x:b.hero.x,y:b.hero.y}:{x:3,y:4};
 const seen=new Set([hero.x+","+hero.y]);
 const monsters=[];
 for(const e of Array.isArray(b.monsters)?b.monsters:[]){
  if(monsters.length>=MAX_MONSTERS)break;
  if(!inGrid(e))continue;
  const key=e.x+","+e.y;
  if(seen.has(key))continue;
  seen.add(key);
  monsters.push({id:"m"+(monsters.length+1),x:e.x,y:e.y,hp:Math.max(100,Math.min(1000000,Math.floor(Number(e.hp)||10000)))});
 }
 const shapes={};
 for(const [name,value] of Object.entries(b.shapes||{}))if(SHAPES[value])shapes[name]=value;
 return {hero,monsters,shapes};
}
export function shapeHits(center,monster,shape,hero){
 const dx=Math.abs(center.x-monster.x),dy=Math.abs(center.y-monster.y);
 if(shape==="cross1")return dx+dy<=1;
 if(shape==="square1")return Math.max(dx,dy)<=1;
 if(shape==="circle2")return dx+dy<=2;
 if(shape==="line2"){
  const horizontal= Math.abs(center.x-hero.x)>=Math.abs(center.y-hero.y);
  return horizontal?(monster.y===center.y&&dx<=2):(monster.x===center.x&&dy<=2);
 }
 return dx===0&&dy===0;
}
export function selectedSpells(context){
 const settings=context.settings;
 return context.spells.filter(s=>settings.variants?.[s.variantGroup]===s.name);
}
function clone(v){return JSON.parse(JSON.stringify(v));}
function affected(state,spell,center){
 if(!center)return [];
 const shape=state.board.shapes[spell.name]||defaultShape(spell);
 return state.monsters.filter(e=>e.hp>0&&shapeHits(center,e,shape,state.board.hero));
}
export function possibleTargets(state,spell){
 if(spell.target==="self")return [null];
 // Summons, traps and untargeted tile spells require a true combat map:
 // they can be tracked as manual actions, but aren't damage candidates.
 const out=[];
 for(const e of state.monsters){
  if(e.hp<=0)continue;
  const center={x:e.x,y:e.y};
  const d=dist(state.board.hero,center);
  if(d<spell.minRange||d>spell.range)continue;
  if(spell.lineOnly&&state.board.hero.x!==center.x&&state.board.hero.y!==center.y)continue;
  out.push(center);
 }
 // Abstract AOE may be centered on empty cells only if user chose an area.
 // We deliberately limit the search to enemy-centered spells: exact
 // empty-cell cast restrictions (including LOS) aren't implemented.
 return out;
}
export function makeState(context,board){
 const b=validateBoard(board),settings=cleanSettings({...context.settings,
  inLine:true,lineOfSight:true,triggerTraps:false,triggerOnPush:false,
  comploteurContact:false});
 return {engine:initialState(settings),settings,board:b,
  monsters:b.monsters.map(e=>({...e,maxHp:e.hp,dots:[],damage:0})),
  targetUses:{},total:0,turnTotals:[],actions:[],warnings:[]};
}
function buffDamageFactor(before,spell,settings,enemy){
 const norm=(spell.min+spell.max)/2,crit=(spell.critMin+spell.critMax)/2;
 const bonusCrit=before.buffs.filter(b=>b.until>=before.turn&&b.stat==="Critique").reduce((n,b)=>n+b.amount,0);
 const p=settings.criticals?Math.max(0,Math.min(1,spell.critChance+bonusCrit/100)):0;
 const row=norm*(1-p)+crit*p;
 const buffs=before.buffs.filter(b=>b.until>=before.turn);
 const stat=buffs.reduce((n,b)=>n+(b.stat==="Dommages"?b.amount:
  (b.stat===spell.element||b.stat==="Puissance")?b.amount*(spell.baseDamage||0)/100:0),0);
 const final=1+buffs.filter(b=>b.stat==="Dommages finaux").reduce((n,b)=>n+b.amount,0)/100;
 return Math.max(0,(row+stat)*final*(1-(settings.resistances[spell.element]||0)/100)*(enemy?.vulnerable||1));
}
function validCast(state,spell,center){
 const e=state.engine,c=state.settings;
 if(e.turn>c.turns||!c.variants.includes(spell.name))return false;
 if(!Number.isFinite(spell.pa)||spell.pa>e.pa)return false;
 if((e.used[spell.id]||0)>=(spell.maxPerTurn||1)||e.turn<(e.ready[spell.id]||1))return false;
 if(spell.name==="Perfidie")return false; // variable cost by traps is not modeled
 if(spell.isTrap||spell.target==="tile")return false; // no automatic trap impacts
 if(spell.target!=="self"){
  if(!center||!possibleTargets(state,spell).some(p=>p.x===center.x&&p.y===center.y))return false;
  const direct=state.monsters.find(m=>m.x===center.x&&m.y===center.y);
  if(direct&&(state.targetUses[spell.id+":"+direct.id]||0)>=(spell.perTarget||spell.maxPerTurn||1))return false;
 }
 return true;
}
export function legalActions(state,context){
 const moves=[];
 for(const spell of selectedSpells(context)){
  if(spell.isTrap||spell.target==="tile"||spell.name==="Perfidie")continue;
  const candidates=possibleTargets(state,spell);
  for(const center of candidates)if(validCast(state,spell,center)){
   const targets=spell.target==="self"?[]:affected(state,spell,center);
   // Do not recommend a targetless offensive cast.
   if(spell.target!=="self"&&!targets.length)continue;
   moves.push({spell,center,targets:targets.map(t=>t.id)});
  }
 }
 return moves;
}
function applyHit(e,value){
 const actual=Math.min(e.hp,Math.max(0,round(value)));
 e.hp=round(Math.max(0,e.hp-actual));e.damage=round(e.damage+actual);
 return actual;
}
export function applyAction(original,spell,center,context){
 if(!validCast(original,spell,center))throw Error("Sort indisponible pour cette position, cette variante, ou ces PA.");
 const s=clone(original),before=s.engine;
 const touched=spell.target==="self"?[]:affected(s,spell,center);
 const target=touched.find(e=>e.x===center?.x&&e.y===center?.y)||touched[0];
 const point=spell.target==="self"?s.board.hero:center;
 const d=spell.target==="self"?0:dist(s.board.hero,point);
 const forEngine={...s.settings,distance:d,inLine:true,lineOfSight:true,
  triggerTraps:false,triggerOnPush:false};
 // Monocible source engine's target debuff and DOT must not leak across
 // different enemies. Their per-monster simplified equivalents live here.
 const engineState=clone(before);
 engineState.position=d;
 engineState.dots={};
 engineState.enemyDebuff={multiplier:1,expires:0};
 // Per-target limits are tracked separately while per-turn limits stay global.
 const priorUses=before.used[spell.id]||0;
 const focusKey=spell.id+":"+target?.id;
 engineState.used[spell.id]=Math.min(priorUses,s.targetUses[focusKey]||0);
 if((engineState.used[spell.id]||0)>=spell.maxPerTurn)engineState.used[spell.id]=priorUses;
 let result;
 try{result=castSpell(engineState,spell,forEngine);}
 catch(err){throw Error("Lancer non simulable : "+spell.name+" ("+err.message+")");}
 result.used[spell.id]=priorUses+1;
 result.dots={}; // handled per target, not globally
 result.enemyDebuff={multiplier:1,expires:0};
 result.position=before.position; // abstract grid doesn't move entities
 s.engine=result;
 if(target)s.targetUses[focusKey]=(s.targetUses[focusKey]||0)+1;
 let total=0;
 const direct=spell.nonDirect||spell.isTrap||spell.status?.poison?0:
  Math.max(0,result.total-before.total);
 for(const e of touched){
  if(e.hp<=0)continue;
  if(spell.status?.poison){
   const pd=spell.status.poison;
   // Per-target, non-propagating proxy. The spell's DofusBook damage row
   // is treated as the damage of ONE tick (not immediate damage).
   const amount=buffDamageFactor(before,spell,s.settings,e);
   e.dots=e.dots.filter(x=>x.id!==spell.id);
   e.dots.push({id:spell.id,name:spell.name,amount:round(amount),left:pd.duration,phase:pd.phase});
  }else{
   // The native engine returns the baseline for a single target.
   // Extra targets in estimated AOE share its damage without inventing
   // attenuation values or the exact zone.
   total+=applyHit(e,direct);
  }
 }
 s.total=round(s.total+total);
 const action={name:spell.name,pa:result.actions.at(-1)?.pa??spell.pa,
  center:center?{x:center.x,y:center.y}:null,
  targets:touched.map(m=>m.id),damage:round(total),
  approximate:(spell.target!=="self"&&(s.board.shapes[spell.name]||defaultShape(spell))!=="single")||!!spell.status?.poison};
 s.actions.push(action);
 return s;
}
export function finishTurn(original){
 const s=clone(original);
 let poison=0;
 for(const m of s.monsters){
  if(m.hp<=0){m.dots=[];continue;}
  for(const dot of m.dots){
   poison+=applyHit(m,dot.amount);
   dot.left-=1;
  }
  m.dots=m.dots.filter(d=>d.left>0);
 }
 s.total=round(s.total+poison);
 const previous=s.turnTotals.at(-1)?.cumulative||0;
 s.turnTotals.push({turn:s.engine.turn,actions:s.actions,spent:s.actions.reduce((n,a)=>n+a.pa,0),
  direct:round(s.total-previous-poison),poison:round(poison),
  total:round(s.total-previous),cumulative:s.total});
 s.engine=endTurn({...s.engine,dots:{},enemyDebuff:{multiplier:1,expires:0}},s.settings);
 s.actions=[];s.targetUses={};
 return s;
}
export function replay(context,board,history){
 let s=makeState(context,board);
 for(const actions of history.finished||[]){
  if(s.engine.turn> s.settings.turns)break;
  for(const item of actions){
   const spell=context.spells.find(x=>x.name===item.name);
   if(!spell)throw Error("Sort inconnu : "+item.name);
   s=applyAction(s,spell,item.center,context);
  }
  s=finishTurn(s);
 }
 for(const item of history.current||[]){
  const spell=context.spells.find(x=>x.name===item.name);
  if(!spell)throw Error("Sort inconnu : "+item.name);
  s=applyAction(s,spell,item.center,context);
 }
 return s;
}
export function newHistory(){return {finished:[],current:[]};}
export function addManual(context,board,history,spellName,center){
 const spell=context.spells.find(x=>x.name===spellName);
 if(!spell)throw Error("Sort introuvable");
 const state=replay(context,board,history);
 const next=applyAction(state,spell,center,context);
 return {finished:history.finished.map(t=>t.slice()),current:[
  ...history.current,{name:spellName,center:center?{...center}:null}
 ]};
}
export function nextTurn(history){return {finished:[...history.finished,history.current],current:[]};}
export function undo(history){
 if(history.current.length)return {...history,current:history.current.slice(0,-1)};
 if(history.finished.length)return {finished:history.finished.slice(0,-1),
  current:history.finished.at(-1).slice(0,-1)};
 return history;
}
function signature(s){
 const buffs=s.engine.buffs.map(b=>[b.key,b.amount,b.until]).sort().join("/");
 return [s.engine.turn,s.engine.pa,Object.entries(s.engine.used).sort(),
  Object.entries(s.engine.ready).sort(),buffs,
  s.monsters.map(m=>[m.id,Math.round(m.hp/50),m.dots.map(d=>d.id+":"+d.left).join("/")]),
  Object.entries(s.targetUses).sort()].join("|");
}
function potential(s){
 const remaining=s.settings.turns-s.engine.turn+1;
 return s.total+
  s.monsters.reduce((n,m)=>n+(m.hp>0?m.dots.reduce((a,d)=>a+Math.min(d.left,remaining)*Math.min(d.amount,m.hp),0):0),0)+
  s.engine.buffs.filter(b=>b.until>=s.engine.turn).reduce((n,b)=>
   n+(["Air","Eau","Terre","Feu","Puissance","Dommages","Dommages finaux","Critique"].includes(b.stat)?
    Math.min(remaining,b.until-s.engine.turn+1)*Math.max(0,b.amount)*.14:0),0);
}
function prune(states,width){
 const map=new Map();
 for(const state of states){const key=signature(state);const prev=map.get(key);if(!prev||state.total>prev.total)map.set(key,state);}
 return [...map.values()].sort((a,b)=>potential(b)-potential(a)).slice(0,width);
}
export function optimizeMulti(context,board,seed,{beamWidth=7,onProgress=null}={}){
 if(!seed)throw Error("État de départ manquant");
 let beam=[seed],explored=0;
 const startTurn=seed.engine.turn;
 for(let turn=startTurn;turn<=seed.settings.turns;turn++){
  const ended=[];
  for(const state of beam){
   let layer=[state];
   // Avoid branching infinitely on free/utility actions.
   const steps=Math.min(10,Math.max(2,Math.ceil(state.engine.pa/2)+1));
   for(let step=0;step<steps;step++){
    const grown=[];
    for(const candidate of layer){
     ended.push(finishTurn(candidate));
     for(const action of legalActions(candidate,context)){
      explored++;
      try{grown.push(applyAction(candidate,action.spell,action.center,context));}catch{}
     }
    }
    if(!grown.length)break;
    layer=prune(grown,beamWidth);
   }
  }
  beam=prune(ended,beamWidth);
  if(!beam.length)break;
  if(onProgress)onProgress({turn,explored,best:round(beam[0].total)});
 }
 const best=beam.sort((a,b)=>b.total-a.total)[0];
 return {total:round(best?.total||seed.total),explored,
  current:best?.turnTotals.find(t=>t.turn===startTurn)||null,
  future:best?.turnTotals.filter(t=>t.turn>startTurn)||[],
  targetDamage:best?.monsters.map(e=>({id:e.id,damage:e.damage,remainingHp:e.hp}))||[],
  approximate:true};
}
