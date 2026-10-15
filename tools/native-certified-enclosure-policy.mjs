// Experimental virtual-player spending policy. Wild Engine certifies the
// physical enclosure; ordinary game commands remain the only way to pay/build.
import * as Game from '../src/simulation/game.js';
import {numberOf} from '../src/simulation/money.js';
import {permission} from '../src/simulation/rules.js';
import {HIRING_RESERVE} from '../src/simulation/budget.js';
import {createCropEnclosurePlanner} from '../src/world/hierarchical-wasm/spatial-crop-enclosure-plan.js';

export function createNativeCertifiedEnclosurePolicy(state,nav,advice,
  {startDay=2,material='zarzas',seedBuffer=30,measure=null}={}){
  if(!advice?.getUnprotectedCropGroups||!nav?.withWallPreview)
    throw TypeError('Certified defense requires Wild Engine crop groups and previews');
  const planner=createCropEnclosurePlanner(state,nav,advice);
  const history=[],owned=new Set();
  let candidate=null,reserved=0,protectedCash=HIRING_RESERVE;
  let scanPending=true,incomePending=true,repairPending=true;
  let awaitingTopology=null;
  let protectionWakes=0,plans=0,groupQueries=0,builds=0,repairRequests=0;
  const timed=(kind,fn)=>{
    if(!measure)return fn();
    const began=performance.now();
    try{return fn();}finally{measure(kind,performance.now()-began);}
  };
  const reserve=s=>Math.min(reserved,Math.max(0,
    numberOf(s.ledger.balance)-protectedCash));
  const onGameEvent=event=>{
    if(['WallChainBuilt','WallRemoved','StructureRuined',
      'PlacementCommitted'].includes(event.type)){
      scanPending=true;repairPending=true;
      candidate=null;reserved=0;awaitingTopology=null;
    }else if(['CropPlaced','CropDestroyed','CropPicked'].includes(event.type)){
      // Crop churn may change group membership. A cached quote is never used
      // for purchase without a fresh native certification at that boundary.
      if(!candidate&&!awaitingTopology)scanPending=true;
    }else if(event.type==='CrateDelivered')incomePending=true;
    else if(['StructureHit','RepairApplied'].includes(event.type))
      repairPending=true;
  };
  const onCropProtectionChanged=change=>{
    if(change.groupId===awaitingTopology&&change.previous==='unknown'&&
      change.protection!=='unknown'){
      awaitingTopology=null;scanPending=true;
    }
    if(change.previous!=='protected'||change.protection!=='unprotected')return;
    protectionWakes++;
    scanPending=true;candidate=null;reserved=0;awaitingTopology=null;
  };
  const repair=(s,{command})=>{
    if(!repairPending)return 0;
    repairPending=false;
    const damaged=timed('certified.damagedWalls',()=>advice.getDamagedWalls());
    let requested=0;
    for(const item of damaged){
      if(!owned.has(item.id)||!['intact','ruined'].includes(item.status))continue;
      if(s.tasks.some(task=>task.kind==='repair'&&task.targetId===item.id))continue;
      const payment=item.paidCoins;
      if(!Number.isFinite(payment)||numberOf(s.ledger.balance)<
        protectedCash+reserved+payment)continue;
      const before=s.tasks.length;
      Game.requestRepair(s,command('repair'),item.id);
      if(s.tasks.length>before){requested++;repairRequests++;}
    }
    return requested;
  };
  const search=(s)=>{
    if(!scanPending)return;
    scanPending=false;
    const groups=timed('certified.groups',()=>
      advice.getUnprotectedCropGroups());
    groupQueries++;
    candidate=null;
    // The native service orders groups by agricultural value. One funded
    // investment decision must not evaluate every group in a growing farm.
    const group=groups.find(item=>item.protection==='unprotected');
    if(!group){
      awaitingTopology=groups.find(item=>item.protection==='unknown')?.id??null;
      return;
    }
    const plan=timed('certified.plan',()=>
      planner.planCropEnclosure(group.id,{material}));
    plans++;
    if(plan.status==='ready'&&plan.cost>0){
      candidate={groupId:group.id,cost:plan.cost,points:plan.points};
      awaitingTopology=null;
      history.push({day:s.day,time:s.time,kind:'plan',groupId:group.id,
        cost:plan.cost,modules:plan.modules.length});
      incomePending=true;
      return;
    }
    awaitingTopology=group.id;
    history.push({day:s.day,time:s.time,kind:'awaiting-topology',
      groupId:group.id,status:plan.status,reason:plan.reason});
  };
  const act=(s,activeNav,{command,reserve:cash})=>{
    if(s.day<startDay||s.raid||!permission(s,'wall'))return 0;
    protectedCash=Math.max(HIRING_RESERVE,cash);
    let actions=repair(s,{command});
    search(s);
    if(!candidate)return actions;
    if(incomePending){
      incomePending=false;
      reserved=Math.min(candidate.cost,Math.max(reserved,
        numberOf(s.ledger.balance)-protectedCash-seedBuffer));
    }
    if(numberOf(s.ledger.balance)<candidate.cost+protectedCash)return actions;
    const plan=timed('certified.revalidate',()=>
      planner.planCropEnclosure(candidate.groupId,{material}));
    plans++;
    if(plan.status!=='ready'||plan.cost<=0){
      history.push({day:s.day,time:s.time,kind:'stale',
        groupId:candidate.groupId,status:plan.status});
      candidate=null;reserved=0;scanPending=true;return actions;
    }
    candidate={groupId:plan.groupId,cost:plan.cost,points:plan.points};
    if(numberOf(s.ledger.balance)<plan.cost+protectedCash)return actions;
    const options={smooth:false,snap:false};
    const quote=timed('certified.purchaseQuote',()=>
      Game.previewWallChain(s,material,plan.points,activeNav,options));
    if(quote.cost!==plan.cost||quote.pieces.length!==plan.modules.length){
      history.push({day:s.day,time:s.time,kind:'stale-quote',
        groupId:plan.groupId});
      candidate=null;reserved=0;scanPending=true;return actions;
    }
    const paid=timed('certified.build',()=>Game.buildWallChain(s,
      command('wall'),material,plan.points,activeNav,
      {...options,preparedPlan:quote}));
    if(!paid)return actions;
    builds++;actions++;
    for(const piece of quote.pieces)owned.add(piece.id);
    history.push({day:s.day,time:s.time,kind:'built',groupId:plan.groupId,
      cost:quote.cost,pieces:quote.pieces.length,gates:quote.gates});
    candidate=null;reserved=0;scanPending=true;repairPending=true;
    return actions;
  };
  return {act,reserve,onGameEvent,onCropProtectionChanged,
    report:()=>structuredClone({startDay,material,seedBuffer,candidate,
      reserved,awaitingTopology,protectionWakes,plans,groupQueries,builds,repairRequests,
      history,scope:'Certified complete native crop-group plans; paid ordinary wall commands only'})};
}
