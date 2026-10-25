/**
 * Manual team mode. The sequential combat engine remains the ONLY source of
 * truth: each click is replayed through playSequentialTeam, so PA, cooldowns,
 * buffs, initiative order and poison ticks match automated combat.
 *
 * Drafts are ephemeral. Only after every actor ends their turn is the
 * computed round committed as the next previous result.
 */
import {playSequentialTeam} from "./team-sequential.js?v=3.29";
import {eligible,castSpell} from "./engine.js?v=3.26";

const sortContexts=contexts=>contexts.slice().sort((a,b)=>{
 const ia=a.build.initiative,ib=b.build.initiative;
 return (ia==null?1:0)-(ib==null?1:0)||
  (ib??0)-(ia??0)||
  contexts.indexOf(a)-contexts.indexOf(b);
});
const round=n=>Math.round((Number(n)||0)*10)/10;
const isSelected=(spell,ctx)=>spell.isWeapon===true||
 ctx.settings.variants?.[spell.variantGroup]===spell.name;
const knownIcons=Object.freeze({
 // Official Dofus iconId, verified against the OpenDofusDB spell page.
 "Yams":"https://api.openddb.dev/static/spell/2x/sort_13413.png",
 "Griffe Joueuse":"https://api.openddb.dev/static/spell/2x/sort_12313.png",
 "Baraka":"https://api.openddb.dev/static/spell/2x/sort_13396.png",
 "Tout ou Rien":"https://api.openddb.dev/static/spell/2x/sort_13459.png",
 "Kraps":"https://api.openddb.dev/static/spell/2x/sort_12337.png",
 "Rekop":"https://api.openddb.dev/static/spell/2x/sort_12316.png",
 "Furie":"https://api.openddb.dev/static/spell/2x/sort_11949.png",
 "Mutilation":"https://api.openddb.dev/static/spell/2x/sort_11934.png",
 "Pacte de Sang":"https://api.openddb.dev/static/spell/2x/sort_11977.png",
 "Assaut":"https://api.openddb.dev/static/spell/2x/sort_11939.png",
 "Épidémie":"https://api.openddb.dev/static/spell/2x/sort_12017.png",
 "Arnaque":"https://api.openddb.dev/static/spell/2x/sort_13801.png",
 "Manigance":"https://api.openddb.dev/static/spell/2x/sort_12982.png",
 "Fourvoiement":"https://api.openddb.dev/static/spell/2x/sort_11994.png"
});
export function manualSpellIcon(spell){
 return knownIcons[spell?.name]||null;
}
export function newManualDraft(contexts,target,previous=null){
 if(!Array.isArray(contexts)||!contexts.length||contexts.length>8)
  throw Error("Sélectionne entre un et huit personnages.");
 if(previous?.finished)throw Error("Le combat est terminé : recommence au tour 1.");
 const ids=contexts.map(x=>x?.build?.id);
 if(new Set(ids).size!==ids.length||ids.some(x=>!x))throw Error("Équipe invalide.");
 const draft={previous,actions:Object.fromEntries(ids.map(id=>[id,[]])),paOverrides:{},cursor:0};
 previewManualDraft(contexts,target,draft); // validate stored turn and signature
 return draft;
}
export function previewManualDraft(contexts,target,draft){
 if(!draft||!Array.isArray(contexts)||!contexts.length)throw Error("Combat manuel absent.");
 const ordered=sortContexts(contexts);
 if(draft.cursor<0||draft.cursor>=ordered.length)
  throw Error("Personnage courant invalide.");
 const preview=playSequentialTeam(contexts,target,()=>{},{
  previous:draft.previous,oneRound:true,
  manualOverrides:draft.actions,manualPaOverrides:draft.paOverrides||{},
  manualPreview:true,manualCursor:draft.cursor
 });
 const current=ordered[draft.cursor],id=current.build.id;
 const state=preview.previewStates?.[id];
 if(!state)throw Error("État du personnage indisponible.");
 const actor=preview.turns.at(-1).actors.find(a=>a.id===id);
 return {result:preview,current,actor,state,order:ordered};
}
export function manualSpellChoices(contexts,target,draft){
 const {current,state}=previewManualDraft(contexts,target,draft);
 const choices=current.spells.filter(spell=>isSelected(spell,current)).map(spell=>{
  const allowed=eligible(spell,state,current.settings);
  if(!allowed){
   let reason="Indisponible";
   if(spell.status?.unsupported)reason="Effet non simulé";
   else if((state.used[spell.id]||0)>=spell.maxPerTurn)reason="Lancers épuisés";
   else if(state.turn<(state.ready[spell.id]||1))
    reason="Relance : tour "+(state.ready[spell.id]||1);
   else if(spell.pa>state.pa)reason="PA insuffisants";
   else if(!isSelected(spell,current))reason="Variante non équipée";
   else reason="Portée ou conditions";
   return {id:String(spell.id),name:spell.name,pa:spell.pa,
    enabled:false,reason,damage:0,delayed:0,utility:0,score:0,
    icon:manualSpellIcon(spell),isWeapon:!!spell.isWeapon};
  }
  try{
   const next=castSpell(state,spell,current.settings);
   const damage=round(next.total-state.total);
   // Deferred poison is not treated as guaranteed: expose separately.
   const oldDots=new Set(Object.keys(state.dots||{}));
   const delayed=round(Object.entries(next.dots||{}).reduce((sum,[id,dot])=>
    sum+(oldDots.has(id)?0:Math.max(0,Number(dot.base)||0)),0));
   const newBuffs=next.buffs.filter(buff=>
    !state.buffs.some(prev=>prev.key===buff.key&&prev.until===buff.until&&prev.amount===buff.amount));
   const utility=round(newBuffs.reduce((sum,buff)=>{
    const duration=Math.max(1,Math.min(4,buff.until-state.turn+1));
    const v=Math.abs(Number(buff.amount)||0);
    if(["Critique","Puissance","Dommages","Dommages finaux","Dommages Critiques","Air","Eau","Terre","Feu"].includes(buff.stat))
     return sum+v*duration*(buff.stat==="Dommages finaux"?8:buff.stat==="Critique"?7:1.6);
    if(buff.stat==="Vitalité")return sum+Math.min(v,200)*.3;
    return sum+v*.12;
   },0));
   const cardValue=current.settings.classId==="ecaflip"?
    Math.max(0,(next.ecaHand||[]).length-(state.ecaHand||[]).length)*85:0;
   const score=round(damage+delayed*.7+utility+cardValue+
    ((spell.status?.vulnerability||0)>1?220:0)+
    (spell.status?.buff?.duration>0?40:0));
   return {id:String(spell.id),name:spell.name,pa:spell.pa,
    enabled:true,reason:score>=damage+50?"Buff, cartes ou effet utile":"Attaque disponible",
    damage,delayed,utility,score,icon:manualSpellIcon(spell),
    isWeapon:!!spell.isWeapon};
  }catch{
   return {id:String(spell.id),name:spell.name,pa:spell.pa,
    enabled:false,reason:"Calcul non disponible",damage:0,delayed:0,
    utility:0,score:0,icon:manualSpellIcon(spell),isWeapon:!!spell.isWeapon};
  }
 }).sort((a,b)=>Number(b.enabled)-Number(a.enabled)||
  b.score-a.score||a.pa-b.pa||a.name.localeCompare(b.name,"fr"));
 return choices;
}
/**
 * Adjust PA ONLY for the actor currently being played. 1-30 PA represents
 * the total available at the start of their turn, including team bonuses.
 * This does not overwrite build PA or any previous/next turn.
 * If chosen spells no longer fit, the change is rejected rather than silently
 * dropping spells.
 */
export function setManualTurnPA(contexts,target,draft,value){
 const pa=Number(value);
 if(!Number.isInteger(pa)||pa<1||pa>30)
  throw Error("Choisis un nombre entier de PA entre 1 et 30.");
 const {current,state,actor}=previewManualDraft(contexts,target,draft);
 const before=Number(draft.paOverrides?.[current.build.id]??actor.availablePA);
 if(pa===before)return draft;
 const updated={...draft,paOverrides:{...(draft.paOverrides||{}),
  [current.build.id]:pa}};
 try{
  previewManualDraft(contexts,target,updated);
 }catch(error){
  throw Error("Impossible de définir "+pa+" PA avec ces sorts déjà choisis. "+
   "Annule le dernier sort ou augmente les PA. "+error.message);
 }
 return updated;
}
export function chooseManualSpell(contexts,target,draft,spellId){
 const options=manualSpellChoices(contexts,target,draft);
 const selected=options.find(x=>x.id===String(spellId));
 if(!selected?.enabled)throw Error(selected?.reason||"Sort non disponible.");
 const {current}=previewManualDraft(contexts,target,draft);
 return {...draft,actions:{...draft.actions,
  [current.build.id]:[...(draft.actions[current.build.id]||[]),selected.id]}};
}
export function undoManualSpell(contexts,target,draft){
 const {current}=previewManualDraft(contexts,target,draft);
 const id=current.build.id,actions=draft.actions[id]||[];
 if(!actions.length)return draft;
 return {...draft,actions:{...draft.actions,[id]:actions.slice(0,-1)}};
}
export function resetManualActor(contexts,target,draft){
 const {current}=previewManualDraft(contexts,target,draft);
 return {...draft,actions:{...draft.actions,[current.build.id]:[]}};
}
export function nextManualActor(contexts,target,draft){
 const {order,result}=previewManualDraft(contexts,target,draft);
 if(draft.cursor<order.length-1){
  return {draft:{...draft,cursor:draft.cursor+1},result:null};
 }
 // A full team round is now committed, *exactly once*.
 const committed=playSequentialTeam(contexts,target,()=>{},{
  previous:draft.previous,oneRound:true,manualOverrides:draft.actions,
  manualPaOverrides:draft.paOverrides||{}
 });
 return {draft:null,result:committed};
}
