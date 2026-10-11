// Presentation only. Consume confirmed events once; never infer settlements
// from prices, future harvests or the displayed (abbreviated) coin counter.
export class GameJuiceModel {
 constructor(state){this.cursor=state.events.at(-1)?.id;this.cooldowns={...state.cooldowns};this.day=state.day;this.critical=new Set();}
 consume(state){
  const events=state.events,index=events.at(-1)?.id===this.cursor?events.length-1:events.findIndex(e=>e.id===this.cursor),fresh=index<0?events:events.slice(index+1),out=[];
  this.cursor=events.at(-1)?.id;
  if(this.day!==state.day){this.day=state.day;this.critical.clear();}
  let income=0n,expense=0n,entities;
  for(const e of fresh){
   const paymentId=e.type==='CrateDelivered'?`deliver:${e.targetId}`:e.type==='RepairApplied'?e.repair?.paymentId:e.paymentId;
   const settled=paymentId&&state.ledger.entries[paymentId];
   if(settled){if(settled.d!=='1')throw Error('Juice requires settled whole coins');const value=BigInt(settled.n);if(value>0n)income+=value;else expense+=value;}
   if(e.type==='Dawn'&&!state.result&&state.completedNights>0)out.push({kind:'dawn',night:state.completedNights});
   if(['CropPlaced','PlacementCommitted','WallChainBuilt','VillageFounded'].includes(e.type)){
    entities??=new Map([...state.plants,...state.structures].map(p=>[p.id,p]));
    const entity=entities.get(e.targetId);
    const point=e.presentation??entity;
    if(point)out.push({kind:'placement',crop:e.type==='CropPlaced',x:point.x,z:point.z});
   }
   if(e.type==='SpellActivated')out.push({kind:'magic',spell:e.kind,x:e.x,z:e.z});
   if(e.type==='StructureRuined')out.push({kind:'collapse',targetId:e.targetId});
   if(e.type==='StructureHit'&&e.structureHit&&e.structureHit.hp<=e.structureHit.maxHp*.3&&!this.critical.has(e.targetId)){
    this.critical.add(e.targetId);out.push({kind:'critical',targetId:e.targetId});
   }
  }
  for(const [kind,left] of Object.entries(state.cooldowns))if((this.cooldowns[kind]??0)>0&&left<=0)out.push({kind:'ready',spell:kind});
  this.cooldowns={...state.cooldowns};
  if(income)out.push({kind:'money',value:income});if(expense)out.push({kind:'money',value:expense});
  return out;
 }
}
