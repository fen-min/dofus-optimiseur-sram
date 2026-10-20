export const SOURCE_URL="https://www.dofusbook.net/desktop/fr/equipement/16093814-db/sorts";
export const DEFAULT_SETTINGS={ap:12,turns:10,resistance:0,distance:3,inLine:true,lineOfSight:true,criticals:true,triggerTraps:false,agiBuffDuration:2,variantToxines:true,variantFourvoiement:true,variantInsidieux:true,beamWidth:24};
export const SPELLS=[
{id:"arnaque",name:"Arnaque",pa:3,minRange:1,range:6,lineOnly:true,los:true,maxPerTurn:2,min:645,max:701,critMin:763,critMax:838,critChance:.26,agiBase:26.5,icon:"✦"},
{id:"fourvoiement",name:"Fourvoiement",pa:4,minRange:0,range:5,lineOnly:false,los:true,maxPerTurn:2,min:776,max:850,critMin:912,critMax:1006,critChance:.31,agiBase:34,icon:"✸"},
{id:"toxines",name:"Toxines",pa:3,minRange:1,range:7,lineOnly:false,los:true,maxPerTurn:1,min:310,max:347,critMin:310,critMax:347,critChance:0,agiBase:8,icon:"☣"},
{id:"epidemie",name:"Épidémie",pa:4,minRange:0,range:6,lineOnly:true,los:true,maxPerTurn:1,min:850,max:925,critMin:850,critMax:925,critChance:0,agiBase:38,icon:"◈"},
{id:"injection",name:"Injection Toxique",pa:5,minRange:1,range:5,lineOnly:false,los:true,maxPerTurn:1,min:701,max:776,critMin:838,critMax:912,critChance:.36,agiBase:30,icon:"✳"},
{id:"insidieux",name:"Piège Insidieux",pa:2,minRange:1,range:6,lineOnly:false,los:false,maxPerTurn:1,min:329,max:347,critMin:329,critMax:347,critChance:0,agiBase:8.5,icon:"◇"},
{id:"repulsif",name:"Piège Répulsif",pa:2,minRange:1,range:7,lineOnly:false,los:false,maxPerTurn:2,min:440,max:496,critMin:440,critMax:496,critChance:0,agiBase:15.5,icon:"⟡"}
];