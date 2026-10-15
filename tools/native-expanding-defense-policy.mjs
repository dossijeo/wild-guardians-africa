// Native campaign player policy only: paid new pieces/ordinary repair commands.
import * as Game from '../src/simulation/game.js';
import {centerFootprint} from '../src/world/centers.js';
import {wallStroke} from '../src/world/wall-layout.js';
import {numberOf} from '../src/simulation/money.js';
import {permission,operational,wallSpec} from '../src/simulation/rules.js';
import {HIRING_RESERVE} from '../src/simulation/budget.js';
import {createCropEnclosurePlanner} from '../src/world/hierarchical-wasm/spatial-crop-enclosure-plan.js';
export function createNativeExpandingDefensePolicy({startDay=2,material='zarzas',interval=30,repairWalls=true,reserveMode='none',measure=null,preparedQuotes=true,spatialAdvice=null}={}){
 if(!['none','next-stroke','full-enclosure'].includes(reserveMode))throw Error('Invalid defense reserve mode');
 const timed=(kind,fn)=>{
  if(!measure)return fn();
  const start=performance.now();
  try{return fn();}finally{measure(kind,performance.now()-start);}
 };
 const cost=wallSpec(material).cost;let nextAttempt=0,capitalTarget=0,built=null,repairRequests=0;
 let savedPlan=null,savingsCommitted=0;
 const nativeEvents=Boolean(spatialAdvice&&reserveMode==='full-enclosure');
 let needsPlan=false,needsFunds=nativeEvents,needsRepair=nativeEvents;
 let exposedGroups=new Map();
 const onProtectionEvent=event=>{
  if(event.type==='crop-protection-reset'){
   savedPlan=null;exposedGroups.clear();needsPlan=false;needsRepair=true;
  }else if(event.type==='crop-groups-updated'){
   exposedGroups=new Map(event.groups.filter(group=>group.protection==='unprotected')
    .map(group=>[group.id,group]));
  }else if(event.type==='crop-group-unprotected'){
   if(!savedPlan)needsPlan=true;
  }else if(event.type==='crop-group-protected'){
   if(savedPlan?.groupId===event.group.id){savedPlan=null;capitalTarget=0;needsPlan=exposedGroups.size>0;}
  }else if(event.type==='funds-changed'){
   if(savedPlan?.proposal.status==='ready'&&event.income>0)
    savingsCommitted=Math.min(savedPlan.proposal.cost,
      savingsCommitted+Math.floor(event.income*.5));
   if(event.delta>0||event.income>0)needsFunds=true;
  }
  else if(event.type==='structure-damaged')needsRepair=true;
  else if(event.type==='day-start'&&event.day>=startDay){
   if(!savedPlan&&exposedGroups.size)needsPlan=true;
   needsRepair=true;
  }
 };
 let stopProtection=null;
 const history=[],owned=new Set();
 const reserve=s=>{
  if(reserveMode==='none'||s.day<startDay)return 0;
  if(!nativeEvents)return capitalTarget;
  // Earmark a share of settled deliveries. In distress, seeds outrank walls.
  const living=s.plants.reduce((count,crop)=>count+Number(crop.alive),0);
  if(living<Math.max(6,s.workers.length*2))return 0;
  return Math.min(capitalTarget,savingsCommitted);
 };
 const needsAction=s=>nativeEvents?s.day>=startDay&&
  (needsPlan||needsFunds||needsRepair):true;
 function act(s,nav,{command,reserve:protectedCash}){
  if(s.day<startDay||!permission(s,'wall')||s.raid||!needsAction(s))return 0;
  if(nativeEvents&&!stopProtection)
   stopProtection=spatialAdvice.observeCropProtection(onProtectionEvent);
  if(!nativeEvents){
   if(s.elapsed<nextAttempt)return 0;
   nextAttempt=s.elapsed+interval;
  }
  const replan=needsPlan;
  needsPlan=false;needsFunds=false;needsRepair=false;
  if(!Number.isFinite(protectedCash)||protectedCash<0)throw Error('Invalid protected cash');
  protectedCash=Math.max(protectedCash,HIRING_RESERVE);
  let pending=s.tasks.filter(t=>t.kind==='repair').reduce((n,t)=>{const p=s.structures.find(p=>p.id===t.targetId);return n+(p?Math.ceil(numberOf(Game.repairCost(p))):0);},0);
  // Request native repairs, but do not count uncompleted requests as useful work.
  const damaged=spatialAdvice?spatialAdvice.getDamagedWalls()
   .sort((a,b)=>Number(a.id.split('-').at(-1))-Number(b.id.split('-').at(-1)))
   .map(item=>s.structures.find(wall=>wall.id===item.id)).filter(Boolean):s.structures;
  for(const wall of damaged)if(repairWalls&&owned.has(wall.id)&&['intact','ruined'].includes(wall.status)&&wall.hp<wall.maxHp*.8&&!s.tasks.some(t=>t.kind==='repair'&&t.targetId===wall.id)){
   const payment=Math.ceil(numberOf(Game.repairCost(wall)));
   if(numberOf(s.ledger.balance)>=protectedCash+pending+payment){Game.requestRepair(s,command('repair'),wall.id);repairRequests++;pending+=payment;}
  }
  if(spatialAdvice&&reserveMode==='full-enclosure'){
   // Only a confirmed topology/residency notification invalidates the saved
   // plan. Crop turnover and ordinary ticks do not re-certify its perimeter.
   if(!savedPlan&&!replan)return 0;
   if(replan){
    const group=[...exposedGroups.values()].sort((a,b)=>
     b.value-a.value||a.id.localeCompare(b.id))[0];
    if(!group){capitalTarget=0;return 0;}
    const proposal=timed('defense.nativeEnclosure',()=>
      createCropEnclosurePlanner(s,nav,spatialAdvice).planCropEnclosure(group.id,{material}));
    savedPlan={groupId:group.id,bounds:group.bounds,proposal,
     topologyEpoch:spatialAdvice.topologyEpoch?.()};
   }
   let {groupId,proposal}=savedPlan;
   if(!replan&&proposal.status!=='ready')return 0;
   const row={day:s.day,time:s.time,elapsed:s.elapsed,groupId,
    planId:proposal.planId,status:proposal.status,expectedSlots:proposal.expectedSlots??0,
    paidPieces:0,paidCost:0,gaps:proposal.gaps??[],bounds:proposal.points?.length?
      [proposal.points[0][0],proposal.points[0][1],proposal.points[2][0],proposal.points[2][1]]:null};
   // A partial or unknown certificate is not a wall purchase. The bot keeps
   // the money available until Wild Engine can propose a complete enclosure.
   if(proposal.status!=='ready'||!proposal.modules?.length){
    capitalTarget=0;row.reason=proposal.reason??proposal.status;
    history.push(row);return 0;
   }
   capitalTarget=proposal.cost;
   if(numberOf(s.ledger.balance)<protectedCash+pending+proposal.cost){
    row.reason='saving-for-complete-enclosure';row.targetCost=proposal.cost;
    history.push(row);return 0;
   }
   if(savedPlan.topologyEpoch!==spatialAdvice.topologyEpoch?.()){
    savedPlan=null;capitalTarget=0;needsPlan=true;
    row.reason='enclosure-topology-changed-before-purchase';
    history.push(row);return 0;
   }
   // The planned plot remains useful after harvest. The native certificate
   // persists while topology is unchanged; do not shrink the ring around
   // whichever crops happen to remain on the purchase day.
   const options={smooth:false,snap:false};
   const quote=timed('defense.previewWallChain',()=>
     Game.previewWallChain(s,material,proposal.points,nav,options));
   const shape=pieces=>pieces.map(piece=>[
     piece.x,piece.z,piece.yaw,piece.baseScaleX,Boolean(piece.gate)]
     .join(':')).sort().join('|');
   if(quote.cost!==proposal.cost||shape(quote.pieces)!==shape(proposal.modules)){
    savedPlan=null;capitalTarget=0;needsPlan=true;
    row.reason='saved-enclosure-quote-changed';history.push(row);return 0;
   }
   if(timed('defense.buildWallChain',()=>Game.buildWallChain(s,command('wall'),
     material,proposal.points,nav,{...options,...preparedQuotes?{preparedPlan:quote}:{}}))){
    row.paidPieces=quote.pieces.length;row.paidCost=quote.cost;
    row.ids=quote.pieces.map(piece=>piece.id);row.gates=quote.gates;
    for(const id of row.ids)owned.add(id);
    built={day:s.day,groupId,cost:quote.cost,pieces:quote.pieces.length,
      ids:[...owned]};capitalTarget=0;savingsCommitted=0;
    savedPlan=null;history.push(row);return 1;
   }
   row.reason='complete-enclosure-purchase-rejected';history.push(row);return 0;
  }
  const land=[...s.plants.filter(p=>p.alive),...s.structures.filter(operational).flatMap(c=>centerFootprint(c,s).footprint)];
  if(!land.length)return 0;
  const raw=land.reduce((b,p)=>[Math.min(b[0],p.x),Math.min(b[1],p.z),Math.max(b[2],p.x),Math.max(b[3],p.z)],[Infinity,Infinity,-Infinity,-Infinity]);
  // Fixed grid prevents tiny plot changes from generating near-duplicate rings.
  const next=[Math.floor((raw[0]-3)/6)*6,Math.floor((raw[1]-3)/6)*6,Math.ceil((raw[2]+3)/6)*6,Math.ceil((raw[3]+3)/6)*6];
  const previous=history.at(-1)?.bounds;
  const bounds=previous?[Math.min(previous[0],next[0]),Math.min(previous[1],next[1]),Math.max(previous[2],next[2]),Math.max(previous[3],next[3])]:next;
  const [x0,z0,x1,z1]=bounds,points=[[x0,z0],[x1,z0],[x1,z1],[x0,z1],[x0,z0]],options={smooth:false,snap:false};
  const slots=timed('defense.wallStroke',()=>wallStroke(points,s.structures,options)),funds=Math.max(0,numberOf(s.ledger.balance)-protectedCash-pending),maxPieces=Math.floor(funds/cost);
  capitalTarget=slots.length*cost;
  const row={day:s.day,time:s.time,elapsed:s.elapsed,bounds,expectedSlots:slots.length,availablePieces:maxPieces,paidPieces:0,paidCost:0,gaps:[]};
  if(!maxPieces){row.reason='budget';history.push(row);return 0;}
  const plan=timed('defense.previewWallChain',()=>Game.previewWallChain(s,material,points,nav,{...options,maxPieces}));
  const planned=new Set(plan.pieces.map(p=>`${p.x},${p.z}`));
  for(const slot of slots)if(!planned.has(`${slot.x},${slot.z}`)){
   const piece={kind:'wall',material,gate:false,baseScaleX:slot.scaleX,x:slot.x,z:slot.z,yaw:-slot.angle};
   const check=timed('defense.wallPlacement',()=>nav.wallPlacement(piece));
   row.gaps.push({x:slot.x,z:slot.z,reason:!check.valid?check.reason??'native-placement':plan.pieces.length>=maxPieces?'budget-limit':'crop-overlap-or-native-omission'});
  }
  if(plan.pieces.length&&timed('defense.buildWallChain',()=>Game.buildWallChain(s,command('wall'),material,points,nav,{...options,maxPieces,...preparedQuotes?{preparedPlan:plan}:{}}))){
   row.paidPieces=plan.pieces.length;row.paidCost=plan.cost;row.ids=plan.pieces.map(p=>p.id);row.gates=plan.gates;
   for(const id of row.ids){if(!s.structures.some(w=>w.id===id&&w.kind==='wall'))throw Error('Preview ID does not name an actual paid wall');owned.add(id);}
   built={day:s.day,bounds,points,cost:plan.cost,pieces:plan.pieces.length,expectedPieces:slots.length,ids:[...owned]};history.push(row);return 1;
  }
  row.reason='no-new-legal-pieces';history.push(row);return 0;
 }
 return {reserve,act,needsAction,dispose:()=>stopProtection?.(),report:s=>structuredClone({startDay,material,reserveMode,repairWalls,capitalTarget,savingsCommitted,built,history,repairRequests,paidCost:history.reduce((n,r)=>n+r.paidCost,0),paidPieces:history.reduce((n,r)=>n+r.paidPieces,0),scope:'Paid expanding native perimeters; actual interception not established by construction alone; repairs requested never counted as completion'})};
}
