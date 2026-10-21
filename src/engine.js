import {SIM_SPELLS,DEFAULT_VARIANTS,VARIANT_PAIRS} from "./sim-spells.js";
import {DEFAULT_SETTINGS} from "./spells.js";
// Monocible, sans carte : estimation paramétrée, PAS simulateur du serveur DOFUS.
// Un état contient PA, variantes, buffs, altérations, pièges et poisons.
// Toutes les 44 actions existent, mais des effets de placement nécessitent des hypothèses.
const round=n=>Math.round(n*10)/10;
const clamp=(v,a,b,d=a)=>Math.min(b,Math.max(a,Number.isFinite(+v)?+v:d));
const cpy=x=>({...x,used:{...x.used},ready:{...x.ready},buffs:x.buffs.map(b=>({...b})),invocations:x.invocations.map(x=>({...x})),dots:Object.fromEntries(Object.entries(x.dots).map(([k,v])=>[k,{...v}])),traps:x.traps.map(p=>({...p})),actions:x.actions.slice(),turns:x.turns.slice()});
export function cleanSettings(input={}){
 const c={...DEFAULT_SETTINGS,...input};
 c.ap=clamp(c.ap,6,20,12);c.turns=clamp(c.turns,1,10,10);c.distance=clamp(c.distance,0,30,3);
 c.beamWidth=clamp(c.beamWidth,8,80,24);c.resistance=clamp(c.resistance,0,90,0);
 c.resistances={Air:c.resistance,Terre:clamp(c.resistanceTerre,0,90,0),Feu:clamp(c.resistanceFeu,0,90,0),Eau:clamp(c.resistanceEau,0,90,0),Neutre:clamp(c.resistanceNeutre,0,90,0)};
 c.enemyLowHp=!!c.enemyLowHp;c.inLine=!!c.inLine;c.lineOfSight=!!c.lineOfSight;c.criticals=!!c.criticals;
 c.triggerTraps=!!c.triggerTraps;c.triggerOnPush=!!c.triggerOnPush;c.comploteurContact=!!c.comploteurContact;
 c.variantPairs=Array.isArray(c.variantPairs)&&c.variantPairs.length===22?c.variantPairs:VARIANT_PAIRS;
 const fallback=c.variantPairs.map((pair,i)=>pair.includes(c.defaultVariants?.[i])?c.defaultVariants[i]:(c.variantPairs===VARIANT_PAIRS?DEFAULT_VARIANTS[i]:pair[0]));
 c.variants=c.variantPairs.map((pair,i)=>pair.includes(c.variants?.[i])?c.variants[i]:fallback[i]);
 return c;
}
export function initialState(input={}){
 const c=cleanSettings(input);
 return {turn:1,pa:c.ap,used:{},ready:{},buffs:[],dots:{},traps:[],charges:0,trapActivatedThisTurn:false,concentrationExpires:0,enemyDebuff:{multiplier:1,expires:0},visible:true,position:c.distance,invocations:[],total:0,immediate:0,delayed:0,turnDamage:0,actions:[],turns:[],warnings:[],};
}
const buffsNow=s=>s.buffs.filter(b=>b.until>=s.turn);
function selected(spell,c){return c.variants[spell.variantGroup]===spell.name;}
function effectivePA(spell,s){return spell.name==="Perfidie"?Math.max(2,spell.pa-Math.min(4,s.charges)):spell.pa;}
export function eligible(spell,s,c){
 if(!selected(spell,c)||effectivePA(spell,s)>s.pa|| (s.used[spell.id]||0)>=spell.maxPerTurn||s.turn<(s.ready[spell.id]||1))return false;
 const dist=spell.target==="self"||spell.target==="tile"?Math.max(spell.minRange,Math.min(s.position,spell.range)):s.position;
 if(dist<spell.minRange||dist>spell.range)return false;
 if(spell.lineOnly&&!c.inLine)return false;
 if(spell.los&&!c.lineOfSight)return false;
 // A single enemy is being modeled, so 'per target' limits also apply.
 if(spell.perTarget&&(s.used[spell.id]||0)>=spell.perTarget)return false;
 if(spell.name==="Comploteur"&&s.invocations.some(x=>x.kind==="Comploteur"))return false;
 return true;
}
function directRow(spell,c,s){
 // The DofusBook lines for low HP, charges etc. are exclusive cases.
 // User-adjusted normal / crit values serve as the default baseline.
 let norm=(spell.min+spell.max)/2, crit=(spell.critMin+spell.critMax)/2;
 if(c.enemyLowHp&&["Attaque Mortelle","Piège Mortel"].includes(spell.name)){
  norm*=1.22;crit*=1.22; // approximated ratio from the conditional DofusBook lines.
 }
 if(spell.name==="Chausse-trappe"){norm+=s.charges*29;crit+=s.charges*29;}
 const p=c.criticals?spell.critChance:0;
 return (1-p)*norm+p*crit;
}
function damage(spell,s,c,override=null){
 const row=override??directRow(spell,c,s);
 const element=spell.element||"Air";
 const buff=buffsNow(s).reduce((tot,b)=>{
  if(b.stat==="Dommages")return tot+b.amount;
  if(b.stat==="Puissance"||b.stat===element)return tot+b.amount*spell.baseDamage/100;
  return tot;
 },0);
 const vulner=s.enemyDebuff.expires>=s.turn?s.enemyDebuff.multiplier:1;
 return Math.max(0,(row+buff)*(1-(c.resistances[element]||0)/100)*vulner);
}
function addDamage(s,n,delayed=false){if(!Number.isFinite(n)||n<=0)return;n=round(n);s.total+=n;s.turnDamage+=n;if(delayed)s.delayed+=n;else{s.immediate+=n;s.turnImmediate=(s.turnImmediate||0)+n;}}
function addBuff(s,key,stat,amount,duration,maxStacks){
 const previous=s.buffs.filter(b=>b.key===key);
 if(previous.length>=maxStacks){const replace=previous.sort((a,b)=>a.until-b.until)[0];s.buffs.splice(s.buffs.indexOf(replace),1);}
 s.buffs.push({key,stat,amount,until:s.turn+duration-1});
}
function dot(s,spell,c){
 const d=spell.status.poison;
 s.dots[spell.id]={name:spell.name,element:spell.element,phase:d.phase,left:d.duration,
  base:damage(spell,s,c),source:spell.name};
}
function trapActivation(s,c){
 const p=s.traps.shift();
 if(!p)return;
 const d=damage(p.spell,s,c,p.base);
 addDamage(s,d);
 s.charges=Math.min(5,s.charges+1);
 for(const summon of s.invocations)if(summon.kind==="Comploteur")summon.charges=Math.min(5,summon.charges+1);
 if(s.dots["12933"]&&!s.trapActivatedThisTurn){
  const tox=s.dots["12933"];tox.left=2;
  tox.base+=Math.max(0,112*(1-c.resistances.Air/100));
  s.trapActivatedThisTurn=true;
 }
 if(s.concentrationExpires>=s.turn){
  // DofusBook shows 403 vol Air in the supplied build. This is a
  // single-target proxy, not a complete per-trap effect simulator.
  const concentration=SIM_SPELLS.find(x=>x.name==="Concentration de Chakra");
  const m=concentration?403*(1-c.resistances.Air/100):0;
  addDamage(s,m);
 }
 if(p.spell.status.poisonOnTrap){
  const x=p.spell.status.poisonOnTrap;
  s.dots["trap-"+p.spell.id]={name:p.spell.name,phase:x.phase,left:x.duration,base:d,element:p.spell.element};
 }
 if(s.ready["12940"]>s.turn+1)s.ready["12940"]--;
}
export function castSpell(origin,spell,input={}){
 const c=cleanSettings(input);const s=cpy(origin);
 if(!eligible(spell,s,c))throw Error("Lancer impossible : "+spell.name);
 const cost=effectivePA(spell,s);
 s.pa-=cost;s.used[spell.id]=(s.used[spell.id]||0)+1;
 if(spell.cooldown)s.ready[spell.id]=s.turn+spell.cooldown;
 const action={id:spell.id,name:spell.name,pa:cost,immediate:0,notes:[]};
 s.actions.push(action);const prior=s.total;
 const {name,status}=spell;
 if(spell.isTrap){
  s.traps.push({spell,base:directRow(spell,c,s)});
  action.notes.push("Piège posé");
  if(c.triggerTraps){trapActivation(s,c);action.notes.push("Déclenchement supposé");}
 }else if(status.poison){dot(s,spell,c);action.notes.push("Poison différé");}
 else if(!spell.nonDirect&&spell.min>0){addDamage(s,damage(spell,s,c));}
 if(status.buff){
  const b=status.buff;
  addBuff(s,name,b.stat,b.value,b.duration,b.stacks);
  action.notes.push("Buff +"+b.value+" "+b.stat+" ("+b.duration+" tours)");
 }
 if(status.vulnerability){
  const rate=name==="Marque Mortuaire"?1.02+0.02*Math.min(4,s.charges):status.vulnerability;
  s.enemyDebuff={multiplier:Math.max(s.enemyDebuff.expires>=s.turn?s.enemyDebuff.multiplier:1,rate),expires:s.turn+(status.vulnerabilityTurns||1)-1};
  action.notes.push("Cible : dommages reçus ×"+rate.toFixed(2));
 }
 if(status.invisible){s.visible=false;action.notes.push("Invisibilité (protection non chiffrée)");}
 if(name==="Concentration de Chakra"){s.concentrationExpires=s.turn;action.notes.push("Vol Air supplémentaire sur piège activé");}
 if(name==="Comploteur"){s.invocations.push({kind:name,turn:s.turn,charges:0});action.notes.push("Explosion différée, si contact supposé");}
 if(name==="Double"){s.invocations.push({kind:name,turn:s.turn});action.notes.push("Placement : effet DPS non chiffré");}
 if(name==="Peur"){s.position=Math.min(30,s.position+2);action.notes.push("Distance cible +2 cases (sans obstacle)");if(c.triggerOnPush&&s.traps.length){trapActivation(s,c);action.notes.push("Un piège déclenché par poussée (hypothèse)");}}
 if(status.move&&name!=="Peur"){s.position=Math.min(30,s.position+status.move);action.notes.push("Distance cible +"+status.move+" cases (sans obstacle)");if(c.triggerOnPush&&s.traps.length){trapActivation(s,c);action.notes.push("Un piège déclenché par déplacement (hypothèse)");}}
 if(status.spendTrapCharges){s.charges=0;}
 if(!spell.nonDirect&&!spell.isTrap&&!status.poison&&spell.min>0)s.visible=true; // attaques directes dévoilent; les poisons conservent l’invisibilité
 if(["Méprise","Marque Mortuaire","Concentration de Chakra"].includes(name))s.visible=true;
 action.immediate=round(s.total-prior);
 if(!action.immediate&&!action.notes.length)action.notes.push(status.utility||"Contrôle / placement : aucun dégât monocible vérifiable");
 return s;
}
export function endTurn(original,input={}){
 const c=cleanSettings(input);const s=cpy(original);s.turnImmediate=s.turnImmediate||0;
 const ticks=[];let poison=0;
 // We place both start- and end-of-enemy-turn events in the same
 // simulation round: their exact initiative timing is not modeled.
 for(const phase of ["start","end"]){
  for(const [id,p] of Object.entries(s.dots)){
   if(p.phase!==phase)continue;
   let n=p.base;
     addDamage(s,n,true);poison+=round(n);ticks.push({id,name:p.name,phase,damage:round(n)});
   p.left--;
   if(p.left<=0)delete s.dots[id];
  }
 }
 const summons=[];
 for(const summon of s.invocations){
  if(summon.kind==="Comploteur"&&s.turn-summon.turn>=2){
   if(c.comploteurContact){
    const x=SIM_SPELLS.find(e=>e.name==="Comploteur");
    const d=damage(x,s,c,x.summonBase+summon.charges*149);
    addDamage(s,d,true);poison+=round(d);ticks.push({name:"Comploteur",phase:"end",damage:round(d)});
   }
  }else if(summon.kind==="Double"&&s.turn-summon.turn>=1){
   // Exchange + PM affects positioning but not an automatic hit.
  }else summons.push(summon);
 }
 s.invocations=summons;
 s.turns.push({number:s.turn,actions:s.actions,spent:c.ap-s.pa,immediate:round(s.turnImmediate),poison:round(poison),total:round(s.turnDamage),ticks,activeBuff:buffsNow(s).map(x=>x.key)});
 s.turn++;s.pa=c.ap;s.used={};s.actions=[];s.turnDamage=0;s.turnImmediate=0;s.trapActivatedThisTurn=false;
 s.buffs=s.buffs.filter(b=>b.until>=s.turn);
 // Sacrieur Mutilation: progressive Power approximation (+50 to +150).
 for(const buff of s.buffs){if(buff.key==="Mutilation")buff.amount=Math.min(150,buff.amount+50);}
 s.traps=s.traps.slice(-12);
 if(s.enemyDebuff.expires<s.turn)s.enemyDebuff={multiplier:1,expires:0};
 return s;
}
function potential(s,c){
 let a=s.total;const remaining=c.turns-s.turn+1;
 if(remaining>0)for(const p of Object.values(s.dots))a+=p.base*Math.min(remaining,p.left);
 if(remaining>0){a+=buffsNow(s).reduce((v,b)=>v+(b.stat==="Dommages"?b.amount*2:b.amount*.15)*Math.min(remaining,b.until-s.turn+1),0);}
 if(c.triggerOnPush)a+=s.traps.reduce((sum,t)=>sum+Math.max(0,t.base)*.15,0);
 return a;
}
function signature(s){
 return [s.turn,s.pa,Object.entries(s.used).sort().join(":"),Object.entries(s.ready).sort().join(":"),
 s.buffs.map(b=>b.key+","+b.amount+","+b.until).sort().join("/"),Object.values(s.dots).map(p=>p.name+","+p.left+","+Math.round(p.base)).sort().join("/"),
 s.traps.map(t=>t.spell.id).sort().join("/"),s.charges,s.trapActivatedThisTurn,
 s.concentrationExpires,s.visible,s.position,s.enemyDebuff.multiplier,s.enemyDebuff.expires,s.invocations.map(x=>x.kind+","+x.turn+","+x.charges).join("/"),
 ].join("|");
}
function prune(states,width,c){
 const seen=new Map();for(const s of states){const k=signature(s);if(!seen.has(k)||s.total>seen.get(k).total)seen.set(k,s);}
 return [...seen.values()].sort((a,b)=>potential(b,c)-potential(a,c)).slice(0,width);
}
export function optimize(input={},allSpells=SIM_SPELLS,onProgress=null){
 const c=cleanSettings(input);
 const spells=allSpells.filter(x=>selected(x,c));let beam=[initialState(c)],explored=0;
 for(let turn=1;turn<=c.turns;turn++){
  const finished=[];
  for(const seed of beam){
   let frontier=[seed];
   for(let step=0;step<Math.ceil(c.ap/2)+1;step++){
    const grown=[];
    for(const current of frontier){
     finished.push(endTurn(current,c)); // unused PA are allowed
     for(const spell of spells){if(!eligible(spell,current,c))continue;explored++;grown.push(castSpell(current,spell,c));}
    }
    if(!grown.length)break;
    frontier=prune(grown,Math.max(c.beamWidth*3,35),c);
   }
  }
  beam=prune(finished,c.beamWidth,c);
  if(typeof onProgress==="function")onProgress({turn,turns:c.turns,explored,bestDamage:round(beam[0]?.total||0)});
 }
 const best=beam.sort((a,b)=>b.total-a.total)[0];
 return {settings:c,explored,total:round(best.total),immediate:round(best.immediate),poison:round(best.delayed),average:round(best.total/c.turns),
 turns:best.turns,considered:spells.length,fullCatalog:allSpells.length,
 assumptions:["Modèle monocible sans carte ni obstacles","DofusBook : dégâts du stuff fourni, buff/stat scaling approximatif","Déclenchement des pièges et contact Comploteur seulement si options activées","Les effets purement défensifs/placement ne donnent aucun DPS automatiquement"],estimate:true};
}
