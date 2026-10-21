/**
 * Regroupement de présentation UNIQUEMENT : ne modifie pas les calculs.
 * Deux Furies forment un bonus +6 % avec deux cumuls ; deux sorts distincts
 * qui donnent de la Puissance sont affichés comme deux sources.
 * Les durées différentes restent visibles sous forme de plage.
 */
export function groupActiveEffects(effects=[]){
 const groups=new Map();
 for(const effect of effects){
  if(!effect || !effect.name)continue;
  const key=effect.kind==="buff"||effect.kind==="debuff"
   ?[effect.kind,effect.name,effect.unit||""].join("|")
   :[effect.kind,effect.name,effect.source||""].join("|");
  if(!groups.has(key)){
   groups.set(key,{
    kind:effect.kind,name:effect.name,
    amount:typeof effect.amount==="number"?effect.amount:null,
    unit:effect.unit||"",sources:[effect.source||effect.name],
    stacks:1,remainingMin:effect.remaining??null,
    remainingMax:effect.remaining??null,
    stage:effect.stage??null,maxStage:effect.maxStage??null
   });
   continue;
  }
  const group=groups.get(key);
  group.stacks++;
  if(typeof effect.amount==="number")group.amount=(group.amount||0)+effect.amount;
  const source=effect.source||effect.name;
  if(!group.sources.includes(source))group.sources.push(source);
  if(typeof effect.remaining==="number"){
   group.remainingMin=group.remainingMin===null?effect.remaining:Math.min(group.remainingMin,effect.remaining);
   group.remainingMax=group.remainingMax===null?effect.remaining:Math.max(group.remainingMax,effect.remaining);
  }
 }
 const order={buff:0,debuff:1,poison:2,state:3};
 return [...groups.values()].sort((a,b)=>(order[a.kind]??4)-(order[b.kind]??4) || a.name.localeCompare(b.name,"fr"));
}

export function effectDuration(effect){
 const a=effect.remainingMin,b=effect.remainingMax;
 if(a===null||b===null)return "Durée simplifiée";
 if(a!==b)return a+"–"+b+" tours";
 return a+" tour"+(a>1?"s":"");
}
export function effectValue(effect){
 if(effect.stage!==null)return effect.stage+"/"+effect.maxStage;
 if(effect.amount===null)return "";
 const value=Math.round(effect.amount*10)/10;
 return (value>=0?"+":"")+value+(effect.unit==="%"?" %":"");
}
