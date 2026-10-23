/**
 * Combat d'équipe chronologique. Chaque acteur choisit ses sorts à SON tour,
 * en tenant compte de la cible et des états laissés par les actions précédentes.
 * Les tours individuels ne sont jamais planifiés à l'avance sur 50 tours.
 */
import {initialState,cleanSettings,eligible,castSpell,endTurn,optimizeFromState} from "./engine.js?v=3.2";

const round=n=>Math.round((Number(n)||0)*10)/10;
const offensive=new Set(["Puissance","Dommages","Dommages finaux","Critique","Air","Terre","Feu","Eau","Neutre"]);
const emptyDebuff=()=>({multiplier:1,expires:0});
const activeDebuff=(effect,turn)=>effect&&effect.expires>=turn?effect:emptyDebuff();

function orderContexts(contexts){
 return contexts.map((ctx,index)=>({ctx,index,state:initialState(ctx.settings),trials:0,
  spells:new Map(ctx.spells.map(s=>[String(s.id),s]))}))
 .sort((a,b)=>{
  const ai=a.ctx.build.initiative,bi=b.ctx.build.initiative;
  return (ai===null?1:0)-(bi===null?1:0)||
   (bi??0)-(ai??0)||a.index-b.index;
 });
}
function evaluateTrial(ctx,state,settings,forcedSpell=null){
 let seed=state;
 if(forcedSpell){
  if(!eligible(forcedSpell,seed,settings))return null;
  seed=castSpell(seed,forcedSpell,settings);
 }
 const result=optimizeFromState(settings,ctx.spells,seed);
 const turn=result.turns[state.turn-1];
 return turn?{actions:turn.actions,score:result.total-state.total,
  first:turn.total,label:forcedSpell?"Ouverture "+forcedSpell.name:"Rotation dynamique"}:null;
}
function better(a,b,remainingHp){
 if(!a)return false;
 if(!b)return true;
 const score=Math.min(remainingHp,Math.max(0,a.score));
 const previous=Math.min(remainingHp,Math.max(0,b.score));
 if(score>previous+.01)return true;
 if(Math.abs(score-previous)<=.01 && a.first>b.first+.01)return true;
 return false;
}
function selectedBuffs(ctx,state,settings){
 return ctx.spells.filter(s=>s.nonDirect&&s.target==="self"&&
  s.status?.buff&&offensive.has(s.status.buff.stat)&&
  s.status.buff.value>0&&eligible(s,state,settings))
  .sort((a,b)=>((b.status.buff.value||0)/Math.max(1,b.pa))-
                 ((a.status.buff.value||0)/Math.max(1,a.pa))).slice(0,2);
}
function replay(seed,actions,ctx){
 let state=seed;
 for(const action of actions){
  const spell=ctx.spells.find(s=>String(s.id)===String(action.id));
  if(!spell||!eligible(spell,state,ctx.settings))return null;
  state=castSpell(state,spell,ctx.settings);
 }
 return state;
}
function improveCurrentBuffOrder(actions,ctx,state){
 if(!actions.length)return actions;
 let best=actions.slice();
 let current=replay(state,best,ctx);
 if(!current)return [];
 for(let i=1;i<actions.length;i++){
  const spell=ctx.spells.find(s=>String(s.id)===String(actions[i].id));
  if(!spell?.nonDirect||spell.target!=="self"||!spell.status?.buff||
    !offensive.has(spell.status.buff.stat)||spell.status.buff.value<=0)continue;
  const trial=best.slice(),[buff]=trial.splice(i,1);
  trial.unshift(buff);
  const proposed=replay(state,trial,ctx);
  if(proposed&&proposed.total>current.total+.01){best=trial;current=proposed;}
 }
 return best;
}
function planCurrentTurn(entry,remainingHp){
 const {ctx,state}=entry;
 const turn=state.turn;
 // Court horizon pour valoriser les buffs, mais seul CE tour est joué.
 // En fin de combat, une ouverture inutile ne doit pas être forcée.
 const depth=turn===1?3:2;
 const settings=cleanSettings({...ctx.settings,
  turns:Math.min(ctx.settings.turns,turn+depth-1),
  beamWidth:8,refreshTimedBuffs:false});
 let best=evaluateTrial(ctx,state,settings);
 entry.trials++;
 if(turn>1){
  const kept=cleanSettings({...settings,refreshTimedBuffs:true});
  const maintenance=evaluateTrial(ctx,state,kept);
  entry.trials++;
  if(better(maintenance,best,remainingHp))best=maintenance;
 }
 if(turn===1&&ctx.settings.turns>1){
  for(const spell of selectedBuffs(ctx,state,settings)){
   const trial=evaluateTrial(ctx,state,settings,spell);
   entry.trials++;
   if(better(trial,best,remainingHp))best=trial;
  }
 }
 return {actions:improveCurrentBuffOrder(best?.actions||[],ctx,state),
  label:best?.label||"Rotation dynamique"};
}
function blankActor(entry,remainingHp){
 const b=entry.ctx.build;
 return {id:b.id,character:b.character,initiative:b.initiative,
  actions:[],spent:0,direct:0,poison:0,damage:0,health:null,
  remainingHp,defeated:remainingHp<=0};
}

/**
 * Parcours : T1 joueur 1 -> joueur 2 -> ... -> T2 joueur 1 -> ...
 * Cible, vulnérabilités, dégâts et effets persistants sont transmis dans
 * cet ordre. Le moteur individuel gère PV, buffs, relances, poisons.
 */
export function playSequentialTeam(contexts,target,onProgress=()=>{}){
 const entries=orderContexts(contexts);
 const members=entries.map(({ctx})=>({
  id:ctx.build.id,character:ctx.build.character,name:ctx.build.name,
  initiative:ctx.build.initiative,ap:ctx.build.ap,
  strategy:"séquentiel",strategiesTested:0,chosenOpening:null,
  estimated:0,direct:0,poison:0
 }));
 const turns=[];
 let remainingHp=target.hp,theoretical=0,directTotal=0,poisonTotal=0,shared=emptyDebuff();
 let effective=0;
 for(let turn=1;turn<=target.turns;turn++){
  if(remainingHp<=0)break;
  const actors=[],roundStart=remainingHp;
  for(let index=0;index<entries.length;index++){
   const entry=entries[index],actor=blankActor(entry,remainingHp);
   if(remainingHp>0){
    // L'effet placé sur la cible par un allié profite aux suivants.
    // Les effets de soutien sur les alliés ne sont pas encore modélisés.
    entry.state.enemyDebuff={...activeDebuff(shared,turn)};
    const plan=planCurrentTurn(entry,remainingHp);
    let played=0;
    for(const action of plan.actions){
     if(remainingHp<=0)break;
     const spell=entry.spells.get(String(action.id));
     if(!spell||!eligible(spell,entry.state,entry.ctx.settings))continue;
     const before=entry.state.total;
     entry.state=castSpell(entry.state,spell,entry.ctx.settings);
     const delta=round(Math.max(0,entry.state.total-before));
     actor.direct=round(actor.direct+delta);
     actor.damage=round(actor.damage+delta);
     remainingHp=round(Math.max(0,remainingHp-delta));
     shared={...activeDebuff(entry.state.enemyDebuff,turn)};
     const executed=entry.state.actions.at(-1);
     actor.actions.push({name:executed.name,pa:executed.pa,
      autoRefreshed:executed.notes?.includes("Relance automatique : buff expiré")||false});
     played+=executed.pa;
    }
    // Les poisons en attente évoluent après le tour de leur lanceur.
    // Si la cible est morte, aucun nouveau tick ne lui est compté.
    const beforeEnd=entry.state.total;
    entry.state=endTurn(entry.state,entry.ctx.settings);
    const delayed=remainingHp>0?round(Math.max(0,entry.state.total-beforeEnd)):0;
    actor.poison=delayed;
    actor.damage=round(actor.damage+delayed);
    remainingHp=round(Math.max(0,remainingHp-delayed));
    actor.spent=played;
    actor.remainingHp=remainingHp;
    actor.defeated=remainingHp<=0;
    actor.health=entry.state.turns.at(-1)?.sacrierEndHealth||null;
    if(turn===1&&plan.label.startsWith("Ouverture"))members[index].chosenOpening=plan.label.slice(10);
    members[index].strategiesTested=entry.trials;
    members[index].estimated=round(members[index].estimated+actor.damage);
    members[index].direct=round(members[index].direct+actor.direct);
    members[index].poison=round(members[index].poison+actor.poison);
    theoretical=round(theoretical+actor.damage);
    directTotal=round(directTotal+actor.direct);
    poisonTotal=round(poisonTotal+actor.poison);
   }
   actors.push(actor);
   onProgress({character:entry.ctx.build.character,index:index+1,
    count:entries.length,turn,turns:target.turns,scenario:"Ordre d’initiative"});
  }
  const dealt=round(actors.reduce((total,a)=>total+a.damage,0));
  effective=round(target.hp-remainingHp);
  turns.push({number:turn,actors,theoretical:dealt,remainingHp,
   cappedDamage:effective,roundStartHp:roundStart});
  if(shared.expires<turn+1)shared=emptyDebuff();
 }
 return {target,members,turns,theoretical:round(theoretical),direct:round(directTotal),
  poison:round(poisonTotal),effective:round(effective),
  overkill:round(Math.max(0,theoretical-effective)),
  averagePerTurn:round(theoretical/Math.max(1,turns.length)),
  warnings:[
   "Tours joués dans l’ordre d’initiative, puis passage au tour suivant. Chaque personnage recalcule ses sorts lorsque vient son tour.",
   "PV de la cible communs : la simulation s’arrête à sa défaite. Buffs, relances, PV et effets personnels restent mémorisés d’un tour à l’autre.",
   "Les vulnérabilités modélisées de la cible sont transmises aux personnages suivants.",
   "L’optimisation utilise un horizon court pour valoriser les buffs : meilleur choix estimé, pas optimum mathématique garanti.",
   "Les buffs et soins lancés sur les alliés, le placement, les attaques ennemies et le calendrier exact des déclenchements de poisons ne sont pas encore simulés.",
   "Les dégâts sont des estimations fondées sur les statistiques du build actif ; les jets de base et arrondis peuvent encore différer du jeu."
  ],approximate:true};
}
