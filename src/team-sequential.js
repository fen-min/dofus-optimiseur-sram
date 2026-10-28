/**
 * Combat d'équipe chronologique. Chaque acteur choisit ses sorts à SON tour,
 * en tenant compte de la cible et des états laissés par les actions précédentes.
 * Les tours individuels ne sont jamais planifiés à l'avance sur 50 tours.
 */
import {initialState,cleanSettings,eligible,castSpell,endTurn,optimizeFromState} from "./engine.js?v=3.56";
import {estimatedCardFutureValue} from "./ecaflip-cards.js?v=3.24";
import {theoreticalCriticalRate,activeTurquoiseBonus} from "./critical.js?v=3.22";
import {planLongTeamTurn,cleanTeamStrategy} from "./team-long-plan.js?v=3.56";
import {sacrierCastAboveFloor,sacrierHealthAboveFloor} from "./sacrier-safety.js?v=3.32";
import {planSacrierAuditedDps} from "./sacrier-dps-rotation.js?v=3.56";
import {planAuditedKarutaTurn} from "./karuta-fifteen-plan.js?v=3.56";
import {sramAuditedPlan} from "./sram-audited-plan.js?v=3.56";
import {combatCastLog,combatEndLog} from "./team-combat-log.js?v=3.44";
import {chooseTeamTenOpening,teamTenCurrentPlan} from "./team-audited-ten-plan.js?v=3.63";

const round=n=>Math.round((Number(n)||0)*10)/10;
const offensive=new Set(["Puissance","Dommages","Dommages finaux","Critique","Air","Terre","Feu","Eau","Neutre"]);
const emptyDebuff=()=>({multiplier:1,expires:0});
const activeDebuff=(effect,turn)=>effect&&effect.expires>=turn?effect:emptyDebuff();

/**
 * Compact deterministic fingerprint of the actual battle configuration,
 * including selected variants, equipment damage, stats, AP and initiative.
 * This prevents continuing a saved round using a modified build.
 */
function combatConfigurationSignature(entries){
 const payload=JSON.stringify(entries.map(({ctx})=>[ctx.build,ctx.settings,ctx.spells]));
 let hash=2166136261;
 for(let i=0;i<payload.length;i++){
  hash=Math.imul(hash^payload.charCodeAt(i),16777619);
 }
 return "v1-"+payload.length+"-"+(hash>>>0).toString(16);
}
function orderContexts(contexts){
 return contexts.map((ctx,index)=>({ctx,index,state:initialState(ctx.settings),trials:0,
  teamBuffs:[],currentPA:ctx.settings.ap,
  spells:new Map(ctx.spells.map(s=>[String(s.id),s]))}))
 .sort((a,b)=>{
  const ai=a.ctx.build.initiative,bi=b.ctx.build.initiative;
  return (ai===null?1:0)-(bi===null?1:0)||
   (bi??0)-(ai??0)||a.index-b.index;
 });
}
/**
 * Valeur analytique d'un buff sur sa durée restante.
 *
 * Cela n'exécute AUCUN tour futur : les seuls dégâts réellement simulés
 * restent ceux du tour courant. On estime les frappes qui pourraient profiter
 * du buff, puis on réduit cette estimation pour l'incertitude de rotation.
 */
function estimatedBuffDamagePerRound(ctx,buff){
 const amount=Number(buff.amount)||0;
 if(amount<=0)return 0;
 let pa=Number(ctx.settings.ap)||12,total=0;
 const attacks=ctx.spells.filter(spell=>
  (spell.isWeapon===true||ctx.settings.variants?.[spell.variantGroup]===spell.name) &&
  !spell.nonDirect&&!spell.isTrap&&!spell.status?.poison&&
  Number(spell.pa)>0&&Number(spell.max)>0
 ).map(spell=>{
  let increment=0;
  if(buff.stat==="Dommages")increment=amount;
  else if(buff.stat==="Puissance"||buff.stat===spell.element)
   increment=amount*(Number(spell.baseDamage)||0)/100;
  else if(buff.stat==="Dommages finaux")
   increment=amount*((Number(spell.min)||0)+(Number(spell.max)||0))/200;
  else if(buff.stat==="Critique")
   increment=amount*Math.max(0,((Number(spell.critMin)||0)+(Number(spell.critMax)||0)-
    (Number(spell.min)||0)-(Number(spell.max)||0)))/200;
  increment*=1-(Number(ctx.settings.resistances?.[spell.element])||0)/100;
  const limit=Math.max(0,Math.min(
   Number(spell.maxPerTurn)||1,Number(spell.perTarget)||Number(spell.maxPerTurn)||1));
  return {cost:spell.pa,increment:Math.max(0,increment),limit};
 }).filter(x=>x.increment>0).sort((a,b)=>b.increment/b.cost-a.increment/a.cost);
 for(const attack of attacks){
  const uses=Math.min(attack.limit,Math.floor(pa/attack.cost));
  pa-=uses*attack.cost;
  total+=uses*attack.increment;
 }
 // Un buff ne garantit ni la portée ni la rotation exacte des prochains tours.
 return total*0.75;
}
function projectedCarryoverValue(ctx,state,actions){
 if(!actions?.length)return 0;
 let after=state;
 try{
  for(const action of actions){
   const spell=ctx.spells.find(s=>String(s.id)===String(action.id));
   if(!spell||!eligible(spell,after,ctx.settings))return 0;
   after=castSpell(after,spell,ctx.settings);
  }
 }catch{return 0;}
 const current=state.turn;
 const remaining=Math.max(0,ctx.settings.turns-current);
 if(!remaining)return 0;
 const lifetime=buff=>{
  const turns=Math.max(0,Math.min(remaining,buff.until-current));
  if(!turns||!offensive.has(buff.stat))return 0;
  return turns*estimatedBuffDamagePerRound(ctx,buff);
 };
 const before=state.buffs.reduce((sum,b)=>sum+lifetime(b),0);
 const value=after.buffs.reduce((sum,b)=>sum+lifetime(b),0);
 const cards=ctx.settings.classId==="ecaflip"?
   estimatedCardFutureValue(after.ecaHand,ctx.settings.ecaflipStats)-
   estimatedCardFutureValue(state.ecaHand,ctx.settings.ecaflipStats):0;
 return Math.max(0,value-before+cards);
}
function evaluateTrial(ctx,state,settings,forcedSpell=null){
 let seed=state;
 const forced=forcedSpell?(Array.isArray(forcedSpell)?forcedSpell:[forcedSpell]):[];
 for(const spell of forced){
  if(!eligible(spell,seed,settings))return null;
  seed=castSpell(seed,spell,settings);
 }
 const result=optimizeFromState(settings,ctx.spells,seed);
 const turn=result.turns[state.turn-1];
 if(!turn)return null;
 const score=result.total-state.total;
 const carry=projectedCarryoverValue(ctx,state,turn.actions);
 return {actions:turn.actions,score,carry,strategicScore:score+carry,
  first:turn.total,label:forced.length?"Ouverture "+forced.map(x=>x.name).join(" + "):"Rotation dynamique"};
}
function better(a,b,remainingHp){
 if(!a)return false;
 if(!b)return true;
 const score=Math.min(remainingHp,Math.max(0,a.score))+Math.max(0,a.carry||0);
 const previous=Math.min(remainingHp,Math.max(0,b.score))+Math.max(0,b.carry||0);
 if(score>previous+.01)return true;
 if(Math.abs(score-previous)<=.01 && a.first>b.first+.01)return true;
 return false;
}
function selectedBuffs(ctx,state,settings){
 const amount=spell=>spell.status?.buff?.value||
  spell.ecaflipCriticalRateBuff?.critical||0;
 return ctx.spells.filter(spell=>(
  (spell.status?.buff&&offensive.has(spell.status.buff.stat)&&spell.status.buff.value>0)||
  (spell.ecaflipCriticalRateBuff?.critical>0)
 )&&eligible(spell,state,settings)&&
  (!spell.nonDirect||!state.buffs.some(buff=>
   buff.until>=state.turn&&(buff.key===spell.name||buff.key.startsWith(spell.name+":")))))
  .sort((a,b)=>amount(b)/Math.max(1,b.pa)-amount(a)/Math.max(1,a.pa)).slice(0,5);
}
/** Crit reliability is a strategic criterion, not a fictitious damage bonus.
 * No action of a subsequent turn is simulated here.
 */
/** Four-Trèfle plan: Valet (Yams), Dame (Kraps), Roi (Griffe Joueuse),
 * As (Infortune), then Baraka / Tout ou Rien / Rekop. Only this round runs.
 * The strategy bonus is NOT displayed as inflicted damage.
 */
const ROYAL_CLUB_GENERATORS=[
 [2,"Yams"],[3,"Kraps"],[4,"Griffe Joueuse"],[5,"Infortune"]
];
function royalClubReady(ctx){
 if(ctx.settings.classId!=="ecaflip")return false;
 return [...ROYAL_CLUB_GENERATORS.map(([,name])=>name),
  "Baraka","Tout ou Rien","Rekop"].every(name=>
   ctx.spells.some(sp=>sp.name===name&&
    ctx.settings.variants?.[sp.variantGroup]===name));
}
function clubRanks(cards){
 return new Set((cards||[]).filter(c=>c.suit==="club").map(c=>c.rank));
}
function fullClubs(cards){return [2,3,4,5].every(r=>clubRanks(cards).has(r));}
function royalClubCount(state){
 return Math.max(clubRanks(state.ecaHand).size,clubRanks(state.ecaTable).size);
}
/** Cyclical objective: keeping four clubs during a cooldown is as useful as
 * obtaining them; spending them with Rekop counts as success ONLY if
 * Tout ou Rien has recovered the table, not if Rekop was used prematurely.
 * Strategic scores NEVER enter the DPS totals.
 */
function royalClubGoalScore(ctx,state,actions){
 if(!royalClubReady(ctx)||!actions?.length)return 0;
 const after=replay(state,actions,ctx);
 if(!after)return 0;
 const names=actions.map(a=>a.name);
 const rekop=names.lastIndexOf("Rekop");
 if(rekop>=0){
  // Proper cash-out: the full suit was played via Baraka, then recovered
  // via Tout ou Rien and consumed by Rekop. A play from a previous
  // turn can live in the Table while the cooldown runs.
  const recovered=names.slice(0,rekop).includes("Tout ou Rien");
  const played=names.slice(0,rekop).includes("Baraka")||
   fullClubs(state.ecaTable);
  if(recovered&&played)return 650;
  // Preserve full royal hands; waiting one turn for Tout ou Rien is better
  // than spending them with an ordinary Rekop and breaking the cycle.
  return state.turn>=ctx.settings.turns?-250:-4400;
 }
 const before=royalClubCount(state),now=royalClubCount(after);
 // Mixed hands fill the 4 available slots and make the royal straight
 // unattainable until cards are played/discarded.
 const blocked=after.ecaHand.length>=4&&!fullClubs(after.ecaHand)&&
  after.ecaHand.some(card=>card.suit!=="club")&&!fullClubs(after.ecaTable);
 if(blocked)return -4500;
 return (now*now-before*before)*220;
}
function ecaflipRoyalPrefixes(ctx,state){
 if(!royalClubReady(ctx))return [];
 const hand=clubRanks(state.ecaHand);
 const table=clubRanks(state.ecaTable);
 const full=ranks=>[2,3,4,5].every(rank=>ranks.has(rank));
 const get=name=>ctx.spells.find(x=>x.name===name);
 const map=names=>names.map(get).filter(Boolean);
 const prefixes=[];
 if(full(hand)){
  prefixes.push(map(["Baraka","Tout ou Rien","Rekop"]));
  // Tout ou Rien may be on cooldown on the round immediately following
  // a completed combo. Playing Baraka now saves all four cards in Table,
  // where Tout ou Rien can restore them on the next round.
  prefixes.push(map(["Baraka"]));
 }
 if(full(table))prefixes.push(map(["Tout ou Rien","Rekop"]));
 if(!full(hand)){
  const missing=ROYAL_CLUB_GENERATORS
   .filter(([rank])=>!hand.has(rank)).map(([,name])=>name);
  let ap=state.pa,sequence=[];
  for(const name of missing){
   const sp=get(name);
   if(sp&&sp.pa<=ap){sequence.push(sp);ap-=sp.pa;}
  }
  if(sequence.length)prefixes.push(sequence);
  if(hand.size===0){
   const together=map(["Yams","Yams","Kraps","Griffe Joueuse"]);
   if(together.length===4)prefixes.push(together);
  }
 }
 return prefixes.filter(prefix=>prefix.length>0);
}
function criticalGoalScore(ctx,state,actions){
 if(ctx.settings.classId!=="ecaflip"||!actions?.length)return 0;
 const attacks=ctx.spells.filter(sp=>
  (sp.isWeapon||ctx.settings.variants?.[sp.variantGroup]===sp.name)&&
  (sp.min>0||sp.ecaflipRekop)&&!sp.nonDirect&&sp.critChance>0);
 if(!attacks.length)return 0;
 const before=Math.min(...attacks.map(sp=>theoreticalCriticalRate(sp,state)));
 if(before>=1-1e-8)return 0;
 const after=replay(state,actions,ctx);
 if(!after)return 0;
 const reached=Math.min(...attacks.map(sp=>theoreticalCriticalRate(sp,after)));
 const gain=Math.max(0,reached-before);
 const remaining=Math.max(0,ctx.settings.turns-state.turn);
 return gain*(remaining>0?1800:350)+(reached>=1-1e-8?150:0);
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
/**
 * Estimation de la contribution d'un malus de résistance/vulnérabilité à
 * l'équipe pour les alliés qui joueront encore CE tour. Aucune action du
 * tour suivant n'est exécutée.
 */
function estimateAllyDirectDamage(entry){
 const turn=entry.state.turn;
 const ap=appliedPa(entry,turn);
 const state={...entry.state,pa:ap};
 const c=entry.ctx.settings;
 const options=entry.ctx.spells.filter(spell=>
  !spell.nonDirect&&!spell.isTrap&&!spell.status?.poison&&
  Number(spell.pa)>0&&Number(spell.max)>0&&eligible(spell,state,c)
 ).map(spell=>{
  const norm=(Number(spell.min)||0)+(Number(spell.max)||0);
  const crit=(Number(spell.critMin)||0)+(Number(spell.critMax)||0);
  const chance=c.criticals?Math.max(0,Math.min(1,spell.critChance||0)):0;
  const before=(norm*(1-chance)+crit*chance)/2;
  const res=Number(c.resistances?.[spell.element])||0;
  const total=Math.max(0,before*(1-res/100));
  const max=Math.min(Math.max(0,spell.maxPerTurn||0),Math.max(0,spell.perTarget||spell.maxPerTurn||0));
  return {pa:spell.pa,max,damage:total};
 }).filter(spell=>spell.damage>0).sort((a,b)=>b.damage/b.pa-a.damage/a.pa);
 let available=ap,damage=0;
 for(const spell of options){
  const casts=Math.min(spell.max,Math.floor(available/spell.pa));
  damage+=casts*spell.damage;
  available-=casts*spell.pa;
 }
 return damage;
}
function estimateTeamVulnerability(ctx,state,actions,following,remainingHp,potential){
 if(!following.length||!actions?.length||!ctx.spells.some(s=>s.status?.vulnerability))return 0;
 if(!actions.some(a=>ctx.spells.some(s=>s.id===a.id&&s.status?.vulnerability)))return 0;
 const after=replay(state,actions,ctx);
 if(!after)return 0;
 const current=state.turn;
 const before=activeDebuff(state.enemyDebuff,current).multiplier;
 const next=activeDebuff(after.enemyDebuff,current).multiplier;
 if(next<=before+0.001)return 0;
 let gain=0;
 for(const ally of following){
  if(!potential.has(ally))potential.set(ally,estimateAllyDirectDamage(ally));
  // Estimate instead of predicting the ally's next action: the ally will
  // still make its own decision when its initiative turn arrives.
  gain+=potential.get(ally)*(next/before-1);
 }
 return Math.min(remainingHp,Math.max(0,gain))*0.8;
}
/**
 * A build that explicitly equips a known self-buff has requested this
 * maintenance policy. Always test the buff as a legal first cast while it
 * is absent; don't inadvertently drop it just because a beam-width-8
 * damage-only search favors the Sacrier's Berserk/Furie burst.
 *
 * Weak/edited buffs (< threshold) and unequipped variants are NOT forced.
 * Each candidate still calculates ONLY the current turn; future effects
 * stay in the stored battle state.
 */
function preferredBuildBuff(entry,settings){
 const {ctx,state}=entry;
 const choice=ctx.settings.classId==="sacrieur"?
  {name:"Pacte de Sang",min:75}:ctx.settings.classId==="sram"?
  {name:"Manigance",min:12}:null;
 if(!choice)return null;
 const spell=ctx.spells.find(x=>x.name===choice.name&&
  ctx.settings.variants?.[x.variantGroup]===x.name&&
  x.status?.buff?.value>=choice.min&&x.status?.buff?.duration>=3);
 if(!spell||state.buffs.some(buff=>buff.until>=state.turn&&
    (buff.key===spell.name||buff.key.startsWith(spell.name+":"))))return null;
 return eligible(spell,state,settings)?spell:null;
}
/**
 * Enforce the configured Sacrieur health floor for automatic suggestions.
 * Manual choices stay free: the user may deliberately override a suggestion.
 * Also look ahead to Pacte expiration at the end of the current turn.
 */
function safeAutomaticActions(entry,plan,minHpPercent){
 if(entry.ctx.settings.classId!=="sacrieur"||!entry.state.sacrierHealth||minHpPercent<=0)
  return plan;
 const replay=actions=>{
  let state=entry.state,ok=true;
  for(const action of actions){
   const spell=entry.spells.get(String(action.id));
   if(!spell||!eligible(spell,state,entry.ctx.settings)){ok=false;break;}
   const next=castSpell(state,spell,entry.ctx.settings);
   if(!sacrierCastAboveFloor(state,spell,next,minHpPercent)){ok=false;break;}
   state=next;
  }
  return ok?state:null;
 };
 let kept=[],state=entry.state;
 for(const action of plan.actions||[]){
  const candidate=[...kept,action];
  const trial=replay(candidate);
  if(!trial)continue;
  kept=candidate;state=trial;
 }
 // If Pacte is about to expire, restore enough health before finishing
 // rather than suggesting a turn which would cross below the limit.
 const safeEnd=actions=>{
  const current=replay(actions);
  return current&&sacrierHealthAboveFloor(endTurn(current,entry.ctx.settings),minHpPercent);
 };
 if(!safeEnd(kept)){
  const heals=entry.ctx.spells.filter(sp=>
   (sp.isWeapon||entry.ctx.settings.variants?.[sp.variantGroup]===sp.name)&&
   (sp.lifeSteal||sp.weaponHits?.some(hit=>hit.lifeSteal)));
  let repaired=false;
  for(let attempt=0;attempt<3&&!repaired;attempt++){
   let winner=null,restored=-Infinity;
   for(const heal of heals){
    const test=[...kept,{id:heal.id}];
    const after=replay(test);
    if(!after)continue;
    const health=after.sacrierHealth?.hp||0;
    if(health>restored){winner=test;restored=health;}
   }
   if(!winner)break;
   kept=winner;
   repaired=!!safeEnd(kept);
  }
  if(!repaired&&!safeEnd(kept)){
   // No safe finish with this ordering; remove latest actions first.
   while(kept.length&&!safeEnd(kept))kept.pop();
  }
 }
 return {...plan,actions:kept};
}
export function planCurrentTurn(entry,remainingHp,following=[]){
 const {ctx,state}=entry;
 const turn=state.turn;
 // STRICT : la recherche est bornée au tour en train d'être joué.
 // Les prochains tours gardent leur état mais ne participent pas à la décision.
 const settings=cleanSettings({...ctx.settings,turns:turn,
  apByTurn:{...ctx.settings.apByTurn,[turn]:entry.currentPA},
  beamWidth:8,refreshTimedBuffs:false});
 const maintained=preferredBuildBuff(entry,settings);
 if(maintained){
  const trial=evaluateTrial(ctx,state,settings,maintained);
  entry.trials++;
  if(trial?.actions?.some(action=>String(action.id)===String(maintained.id)))
   return {actions:improveCurrentBuffOrder(trial.actions,ctx,state),
    label:"Entretien "+maintained.name,settings};
 }
 let best=evaluateTrial(ctx,state,settings);
 entry.trials++;
 const potentials=new Map();
 const value=(trial,extra=0)=>trial?Math.min(remainingHp,Math.max(0,trial.score))+
  Math.max(0,trial.carry||0)+
  estimateTeamVulnerability(ctx,state,trial.actions,following,remainingHp,potentials)+
   criticalGoalScore(ctx,state,trial.actions)+
   royalClubGoalScore(ctx,state,trial.actions)+extra:-Infinity;
 let bestScore=value(best);
 const consider=(trial,extra=0)=>{
  const score=value(trial,extra);
  if(score>bestScore+.01){best=trial;bestScore=score;}
 };
 if(turn>1){
  const maintained=evaluateTrial(ctx,state,cleanSettings({...settings,refreshTimedBuffs:true}));
  entry.trials++;
  consider(maintained);
 }
 // Les buffs personnels et vols de caractéristiques sont estimés sur leur
 // durée, sans exécuter les tours futurs.
 for(const spell of selectedBuffs(ctx,state,settings)){
  const trial=evaluateTrial(ctx,state,settings,spell);
  entry.trials++;
  consider(trial);
  // Tester également deux Yams comme UNE ouverture du tour courant :
  // atteindre 100% est un objectif, sans calculer T+1.
  if(ctx.settings.classId==="ecaflip"&&spell.ecaflipCriticalRateBuff&&
    theoreticalCriticalRate(spell,state)<1-1e-8){
   const two=evaluateTrial(ctx,state,settings,[spell,spell]);
   entry.trials++;
   consider(two);
  }
 }
 // Compare the 4-club combo against direct DPS using THIS round only.
 for(const seq of ecaflipRoyalPrefixes(ctx,state)){
  const trial=evaluateTrial(ctx,state,settings,seq);
  entry.trials++;
  consider(trial);
 }
 // Une vulnérabilité peut coûter du DPS à son lanceur mais être supérieure
 // pour l'équipe : tester explicitement les ouvertures qui en appliquent.
 for(const spell of ctx.spells.filter(x=>x.status?.vulnerability&&
  Number(x.status.vulnerability)>1&&eligible(x,state,settings)).slice(0,5)){
  const trial=evaluateTrial(ctx,state,settings,spell);
  entry.trials++;
  consider(trial);
 }
 // Les +PA soutiennent les personnages suivants dans le même tour.
 for(const spell of ctx.spells.filter(x=>!!paTeamBuff(x)&&eligible(x,state,settings)).slice(0,3)){
  const bonus=paTeamBuff(spell);
  const recipients=following.filter(x=>targetsTeamBuff(bonus,entry,x));
  const alreadyPlayed=entry.everyone.filter(x=>x!==entry&&
   !following.includes(x)&&targetsTeamBuff(bonus,entry,x));
  // Les alliés déjà passés ne bénéficient du buff qu'à leur prochain
  // tour. On n'anticipe PAS ce tour : c'est une simple estimation
  // tirée des valeurs des sorts disponibles et de la durée du buff.
  const currentGain=recipients.reduce((sum,ally)=>sum+estimatePaGain(ally,bonus.value,remainingHp),0);
  const nextGain=turn<ctx.settings.turns&&bonus.duration>1?
   alreadyPlayed.reduce((sum,ally)=>sum+roughPaValue(ally,bonus.value),0):0;
  const gain=currentGain+nextGain;
  if(gain<=0)continue;
  const trial=evaluateTrial(ctx,state,settings,spell);
  entry.trials++;
  if(!trial)continue;
  consider(trial,gain);
 }
 return {actions:improveCurrentBuffOrder(best?.actions||[],ctx,state),
  label:best?.label||"Rotation dynamique",settings};
}
function paTeamBuff(spell){
 const buff=spell.status?.teamBuff||spell.status?.allyBuff;
 const stat=String(buff?.stat||"").toUpperCase();
 if(!["PA","AP","ACTIONPOINTS"].includes(stat))return null;
 const value=Number(buff.value),duration=Number(buff.duration);
 if(!Number.isInteger(value)||value<=0||value>20||
    !Number.isInteger(duration)||duration<=0||duration>50)return null;
 return {value,duration,targets:buff.targets||"allies"};
}
function targetsTeamBuff(buff,source,recipient){
 if(source===recipient)return buff.targets==="team"||buff.targets==="all";
 return ["allies","team","all","others"].includes(buff.targets);
}
function activePaBonus(entry,turn){
 entry.teamBuffs=entry.teamBuffs.filter(b=>b.until>=turn);
 return entry.teamBuffs.reduce((sum,b)=>sum+b.value,0);
}
function basePa(entry,turn){return Number(entry.ctx.settings.apByTurn?.[turn]??entry.ctx.settings.ap);}
function appliedPa(entry,turn,extra=0){
 return Math.max(1,Math.min(30,basePa(entry,turn)+activePaBonus(entry,turn)+extra));
}
function estimatePaGain(ally,bonus,remainingHp){
 const turn=ally.state.turn;
 if(turn<1||turn>ally.ctx.settings.turns)return 0;
 const run=extra=>{
  const pa=appliedPa(ally,turn,extra);
  const settings=cleanSettings({...ally.ctx.settings,turns:turn,
   apByTurn:{...ally.ctx.settings.apByTurn,[turn]:pa},beamWidth:8,refreshTimedBuffs:false});
  const result=optimizeFromState(settings,ally.ctx.spells,{...ally.state,pa});
  return result.turns[turn-1]?.total||0;
 };
 return Math.max(0,Math.min(remainingHp,run(bonus)-run(0)));
}
function roughPaValue(entry,bonus){
 // Aucun tour futur n'est exécuté. Valeur indicative d'un PA sur la base
 // des sorts déjà connus du build ; elle ne garantit pas la rotation optimale.
 const allowed=entry.ctx.spells.filter(s=>!s.nonDirect&&
  entry.ctx.settings.variants[s.variantGroup]===s.name&&s.pa>0&&s.max>0);
 const best=Math.max(0,...allowed.map(s=>((s.min+s.max)/2)/s.pa));
 return Math.max(0,bonus*best*.5);
}
function grantPaBuff(source,spell,entries,turn){
 const buff=paTeamBuff(spell);
 if(!buff)return;
 const key=source.ctx.build.id+":"+spell.id;
 for(const ally of entries){
  if(!targetsTeamBuff(buff,source,ally))continue;
  ally.teamBuffs=ally.teamBuffs.filter(x=>x.key!==key&&x.until>=turn);
  ally.teamBuffs.push({key,value:buff.value,until:turn+buff.duration-1});
 }
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
export function playSequentialTeam(contexts,target,onProgress=()=>{},options={}){
 const previous=options.previous||null;
 const entries=orderContexts(contexts);
 const configSignature=combatConfigurationSignature(entries);
 if(previous){
  if(!previous.session||!Array.isArray(previous.session.actors))
   throw Error("État précédent manquant : recommence au tour 1.");
  if(previous.session.configSignature!==configSignature)
   throw Error("Le build ou la composition de l'équipe a changé : recommence au tour 1.");
  const saved=new Map(previous.session.actors.map(actor=>[actor.id,actor]));
  if(saved.size!==entries.length)throw Error("La composition a changé : recommence au tour 1.");
  for(const entry of entries){
   const record=saved.get(entry.ctx.build.id);
   if(!record||record.state?.turn!==previous.turns.length+1)
    throw Error("État précédent incompatible : recommence au tour 1.");
   entry.state=record.state;
   entry.trials=record.trials||0;
   entry.teamBuffs=record.teamBuffs||[];
  }
 }
 const members=previous?structuredClone(previous.members):entries.map(({ctx})=>({
  id:ctx.build.id,character:ctx.build.character,name:ctx.build.name,
  initiative:ctx.build.initiative,ap:ctx.build.ap,
  strategy:"séquentiel",strategiesTested:0,chosenOpening:null,
  estimated:0,direct:0,poison:0
 }));
 for(const entry of entries)entry.everyone=entries;
 const turns=previous?structuredClone(previous.turns):[];
 let remainingHp=previous?previous.session.remainingHp:target.hp;
 let theoretical=previous?previous.theoretical:0;
 let directTotal=previous?previous.direct:0;
 let poisonTotal=previous?previous.poison:0;
 let shared=previous?previous.session.shared:emptyDebuff();
 let effective=previous?previous.effective:0;
 const stopAt=options.oneRound?Math.min(target.turns,turns.length+1):target.turns;
 const manualOverrides=options.manualOverrides||null;
 const manualPaOverrides=options.manualPaOverrides||null;
 // Compare the user's observed 10-turn line with the verified team candidate
 // using the CURRENT saved builds and the actual manual engine. Commit only
 // if the candidate is fully legal, safer than 50% Sacrier HP and does more
 // damage. Never reevaluate it on later clicks, which preserve this decision.
 let teamTenPlan=previous?
  (previous.session.teamTenPlan||null):
  (!manualOverrides?chooseTeamTenOpening(contexts,target,
   cleanTeamStrategy(options.teamStrategy||{mode:"fast"}),playSequentialTeam):null);
 const previewStates=options.manualPreview?{}:null;
 for(let turn=turns.length+1;turn<=stopAt;turn++){
  if(remainingHp<=0)break;
  const actors=[],roundStart=remainingHp;
  for(let index=0;index<entries.length;index++){
   const entry=entries[index],actor=blankActor(entry,remainingHp);
   if(remainingHp>0){
    // L'effet placé sur la cible par un allié profite aux suivants.
    // Les effets de soutien sur les alliés ne sont pas encore modélisés.
    entry.state.enemyDebuff={...activeDebuff(shared,turn)};
    // Manual PA selection is the total available at the start of this
    // character's current turn (including any already granted team buffs).
    // It never mutates the saved build or later rounds.
    const paOverride=manualOverrides?manualPaOverrides?.[entry.ctx.build.id]:null;
    entry.currentPA=paOverride===null||paOverride===undefined?
     appliedPa(entry,turn):Number(paOverride);
    if(!Number.isInteger(entry.currentPA)||entry.currentPA<1||entry.currentPA>30)
     throw Error("PA manuels invalides : choisis entre 1 et 30.");
    entry.state.pa=entry.currentPA;
    actor.availablePA=entry.currentPA;
    actor.paBonus=entry.currentPA-basePa(entry,turn);
    const plan=manualOverrides?{
    actions:(manualOverrides[entry.ctx.build.id]||[]).map(id=>({id})),
    settings:entry.ctx.settings,label:"Choix manuel"
   }:(()=>{
    const strategy=cleanTeamStrategy(options.teamStrategy||{mode:"fast"});
    if(teamTenPlan?.enabled&&turn<=10){
     const teamCandidate=teamTenCurrentPlan(entry,teamTenPlan,strategy);
     if(teamCandidate)return teamCandidate;
     // Do not blindly continue a preset after a build, AP or state change.
     teamTenPlan={...teamTenPlan,enabled:false,reason:
      "Rotation d’équipe abandonnée : un sort, une relance, les PA ou les PV ont changé."};
    }
    // The best manual Sram routes are validated against the actual cards,
    // buffs, poison and cooldown timeline before every recommendation.
    // Skip unnecessary beam searches when the validated route still applies.
    const sram=sramAuditedPlan(entry,strategy);
    if(sram)return sram;
    const fast=planCurrentTurn(entry,remainingHp,entries.slice(index+1));
    // Karuta's 15-round manual champion is state-validated on every turn.
    // When the build, cards, cooldowns or ally AP diverge, return to the
    // generic team planner without forcing an illegal/obsolete sequence.
    const karuta=planAuditedKarutaTurn(entry,strategy);
    const planned=karuta||(strategy.mode==="long"?
     planLongTeamTurn(entry,entries.slice(index+1),strategy,fast):fast);
    // The Sacrier has two audited Pacte DPS openings: one prioritizes a
    // three-round fight, the other delays Pacte for sustained 10-round DPS.
    // Compare them against the generic planner using actual simulated casts.
    const audited=planSacrierAuditedDps(entry,strategy,planned);
    const proposed=safeAutomaticActions(entry,audited||planned,strategy.minHpPercent);
    // Manigance lasts multiple rounds and has one stack. In the generic
    // fallback, do not spend 2 PA recasting an active Manigance.
    if(entry.ctx.settings.classId!=="sram"||strategy.mode!=="long")return proposed;
    let after=entry.state;
    const cleaned=[];
    for(const action of proposed.actions||[]){
     const spell=entry.spells.get(String(action.id));
     if(!spell)continue;
     if(spell.name==="Manigance"&&after.buffs.some(buff=>
       buff.until>=after.turn&&(buff.key==="Manigance"||
        buff.key.startsWith("Manigance:"))))continue;
     if(!eligible(spell,after,entry.ctx.settings))continue;
     cleaned.push(action);
     after=castSpell(after,spell,entry.ctx.settings);
    }
    return {...proposed,actions:cleaned};
   })();
    actor.log={plan:plan.label||"Rotation dynamique",casts:[],end:null};
    let played=0;
    for(const action of plan.actions){
     if(remainingHp<=0)break;
     const spell=entry.spells.get(String(action.id));
     if(!spell||!eligible(spell,entry.state,entry.ctx.settings)){
      if(manualOverrides)
       throw Error("Le sort manuel "+(spell?.name||String(action.id))+
        " n'est plus disponible avec les PA et effets de ce tour. Annule un sort ou augmente les PA.");
      continue;
     }
     const beforeState=entry.state;
     const before=beforeState.total;
     entry.state=castSpell(beforeState,spell,plan.settings);
     grantPaBuff(entry,spell,entries,turn);
     const delta=round(Math.max(0,entry.state.total-before));
     actor.direct=round(actor.direct+delta);
     actor.damage=round(actor.damage+delta);
     remainingHp=round(Math.max(0,remainingHp-delta));
     shared={...activeDebuff(entry.state.enemyDebuff,turn)};
     const executed=entry.state.actions.at(-1);
     actor.actions.push({name:executed.name,pa:executed.pa,
      autoRefreshed:executed.notes?.includes("Relance automatique : buff expiré")||false});
     actor.log.casts.push(combatCastLog(beforeState,entry.state,spell,executed,delta));
     played+=executed.pa;
    }
    // L'Écaflip peut récupérer des PA lors de ses lancers : « utilisés »
    // reflète la dépense NETTE, et non la somme brute des coûts affichés.
    // Garder la dépense brute séparée pour le diagnostic.
    actor.grossPA=played;
    actor.spent=Math.max(0,actor.availablePA-entry.state.pa);
    if(entry.ctx.settings.classId==="ecaflip"){
     const available=entry.ctx.spells.filter(sp=>
      (sp.isWeapon||entry.ctx.settings.variants?.[sp.variantGroup]===sp.name)&&
      !sp.nonDirect&&(sp.min>0||sp.ecaflipRekop)&&sp.critChance>0);
     if(available.length){
      actor.criticalRate=Math.min(...available.map(sp=>theoreticalCriticalRate(sp,entry.state)));
      actor.criticalGuaranteed=actor.criticalRate>=1-1e-8;
     }
     actor.turquoiseBonus=entry.ctx.settings.dofusTurquoise?
       activeTurquoiseBonus(entry.state):null;
    }
    // Les poisons en attente évoluent après le tour de leur lanceur.
    // Si la cible est morte, aucun nouveau tick ne lui est compté.
    if(previewStates)previewStates[entry.ctx.build.id]=structuredClone(entry.state);
    const beforeEndState=entry.state;
    const beforeEnd=entry.state.total;
    // A manual preview must never award a future actor's poison ticks
    // before the user actually completes that actor's turn.
    if(!(options.manualPreview&&index>=options.manualCursor))
     entry.state=endTurn(entry.state,plan.settings);
    const delayed=remainingHp>0?round(Math.max(0,entry.state.total-beforeEnd)):0;
    actor.log.end=combatEndLog(beforeEndState,entry.state);
    actor.poison=delayed;
    actor.damage=round(actor.damage+delayed);
    remainingHp=round(Math.max(0,remainingHp-delayed));
    actor.remainingHp=remainingHp;
    actor.defeated=remainingHp<=0;
    // After Pacte expiration, display actual carried-forward HP rather
    // than the pre-expiration snapshot from the end-turn summary.
    actor.health=entry.state.sacrierHealth?
     {...entry.state.sacrierHealth}:null;
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
 return {target,members,turns,...(previewStates?{previewStates}:{}),theoretical:round(theoretical),direct:round(directTotal),
  poison:round(poisonTotal),effective:round(effective),
  overkill:round(Math.max(0,theoretical-effective)),
  averagePerTurn:round(theoretical/Math.max(1,turns.length)),
  finished:remainingHp<=0||turns.length>=target.turns,
  session:{
   remainingHp,shared,configSignature,teamTenPlan,
   actors:entries.map(entry=>({
    id:entry.ctx.build.id,state:entry.state,trials:entry.trials,teamBuffs:entry.teamBuffs
   }))
  },
  warnings:[
   ...(teamTenPlan?.id?[
    teamTenPlan.enabled?
     "Rotation d’équipe validée sur les 10 premiers tours par comparaison avec la précédente rotation manuelle des mêmes builds ; ensuite retour aux choix dynamiques.":
     (teamTenPlan.reason||"Rotation testée non retenue ou interrompue.")
   ]:[]),
   "Tours joués dans l’ordre d’initiative, puis passage au tour suivant. Chaque personnage recalcule ses sorts lorsque vient son tour.",
   "PV de la cible communs : la simulation s’arrête à sa défaite. Buffs, relances, PV et effets personnels restent mémorisés d’un tour à l’autre.",
   "Les vulnérabilités modélisées de la cible sont transmises aux personnages suivants.",
   "Chaque décision simule uniquement le tour actuel. La rentabilité sur plusieurs tours des buffs est estimée analytiquement, sans exécuter les tours suivants. Les bonus de PA entre alliés sont suivis si leurs effets sont renseignés.",
   "Les autres buffs et soins alliés, le placement, les attaques ennemies et le calendrier exact des déclenchements de poisons ne sont pas encore simulés.",
   "Les dégâts sont des estimations fondées sur les statistiques du build actif ; les jets de base et arrondis peuvent encore différer du jeu."
  ],approximate:true};
}
