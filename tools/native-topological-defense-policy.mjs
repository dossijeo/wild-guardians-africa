import * as Game from '../src/simulation/game.js';
import {createCropEnclosurePlanner} from
  '../src/world/hierarchical-wasm/spatial-crop-enclosure-plan.js';
import {numberOf} from '../src/simulation/money.js';
import {operational,permission} from '../src/simulation/rules.js';
import {HIRING_RESERVE} from '../src/simulation/budget.js';

// Campaign-only policy. Wild Engine proposes and certifies geometry; the bot
// decides whether to save for it and purchases the entire quoted enclosure.
export function createNativeTopologicalDefensePolicy({session,advice,material='zarzas',
  startDay=2,minimumReplanSeconds=60,repairWalls=true,repairCenters=true,
  centerRepairThreshold=600,measure=null}={}){
  if(!session||!advice)throw TypeError('Wild Engine session and advice are required');
  const timed=(kind,fn)=>{
    if(!measure)return fn();
    const start=performance.now();
    try{return fn();}finally{measure(kind,performance.now()-start);}
  };
  let capitalTarget=0,dirty=true,waitForFunds=0,nextPlanAt=0,
    lastGroupBounds=null,repairDirty=true,repairWaitForFunds=0,
    repairRequests=0,conditionNotifications=0;
  const history=[],repairHistory=[],groupValues=new Map();
  const pendingRepairCost=state=>state.tasks.filter(task=>task.kind==='repair')
    .reduce((sum,task)=>{
      const target=state.structures.find(item=>item.id===task.targetId);
      return sum+(target?Math.ceil(numberOf(Game.repairCost(target))):0);
    },0);
  const requestRepairs=(state,{command,reserve,centerReserve})=>{
    if(!repairDirty||!repairWalls&&!repairCenters)return 0;
    repairDirty=false;repairWaitForFunds=0;
    if(!state.structures.some(operational))return 0;
    const pending=new Set(state.tasks.filter(task=>task.kind==='repair')
      .map(task=>task.targetId));
    let reserved=pendingRepairCost(state),requested=0;
    const centers=repairCenters?timed('defense.nativeDamagedCenters',()=>
      advice.getDamagedCenters()):[];
    const walls=repairWalls?timed('defense.nativeDamagedWalls',()=>
      advice.getDamagedWalls()):[];
    walls.sort((left,right)=>Number(right.status==='ruined')-
      Number(left.status==='ruined')||
      (groupValues.get(right.plannedGroupId)??0)-
      (groupValues.get(left.plannedGroupId)??0)||
      right.damageRatio-left.damageRatio||left.id.localeCompare(right.id));
    const candidates=[...centers.filter(item=>item.hp<centerRepairThreshold),
      ...walls.filter(item=>item.status==='ruined'||item.hp<item.maxHp*.8)];
    for(const item of candidates){
      if(pending.has(item.id))continue;
      const cashReserve=item.kind==='center'?centerReserve:reserve;
      const needed=cashReserve+reserved+item.paidCoins;
      if(numberOf(state.ledger.balance)<needed){
        repairWaitForFunds=repairWaitForFunds?
          Math.min(repairWaitForFunds,needed):needed;
        continue;
      }
      const before=state.tasks.length;
      if(Game.requestRepair(state,command('repair'),item.id)&&
        state.tasks.length>before){
        pending.add(item.id);reserved+=item.paidCoins;
        repairRequests++;requested++;
        repairHistory.push({day:state.day,time:state.time,id:item.id,
          kind:item.kind,estimatedCost:item.paidCoins,
          enclosureId:item.enclosureId??null,
          plannedGroupId:item.plannedGroupId??null});
      }
    }
    return requested;
  };
  return {
    reserve:state=>state.day>=startDay?capitalTarget:0,
    onWorldEvent(event,state){
      if(!['CrateDelivered','CropPlaced','CropDestroyed','WallChainBuilt',
        'WallRemoved','StructureRuined','RepairApplied','PlacementCommitted']
        .includes(event.type))return;
      if(event.type==='CrateDelivered'){
        if(repairWaitForFunds&&numberOf(state.ledger.balance)>=repairWaitForFunds)
          repairDirty=true;
        if(!waitForFunds||numberOf(state.ledger.balance)<waitForFunds)return;
      }
      if(event.type==='RepairApplied'&&
        event.repair?.previousStatus==='intact'){
        repairDirty=true;return;
      }
      if(event.type==='PlacementCommitted'&&event.kind==='center')
        repairDirty=true;
      if(event.type==='CropPlaced'&&lastGroupBounds){
        const crop=state.plants.at(-1)?.id===event.targetId?
          state.plants.at(-1):state.plants.find(item=>item.id===event.targetId);
        if(crop&&crop.x>=lastGroupBounds.minX&&
          crop.x<=lastGroupBounds.maxX&&crop.z>=lastGroupBounds.minZ&&
          crop.z<=lastGroupBounds.maxZ)return;
      }
      dirty=true;
    },
    onStructureConditionChanged(change){
      conditionNotifications++;
      if(['breach','ruined','removed'].includes(change.change))dirty=true;
      if(change.change==='repaired'){
        repairDirty=true;return;
      }
      if(!['damaged','breach','ruined'].includes(change.change))return;
      if(change.kind==='center'&&repairCenters&&
        change.hp<centerRepairThreshold||change.kind==='wall'&&repairWalls&&
        (change.status==='ruined'||change.hp<change.maxHp*.8))
        repairDirty=true;
    },
    onCropProtectionChanged(change){
      if(change.group?.value!==undefined)
        groupValues.set(change.groupId,change.group.value);
      if(change.protection!=='protected')dirty=true;
    },
    act(state,nav,{command,reserve:protectedCash,centerReserve=protectedCash}){
      if(state.raid)return 0;
      const repairs=requestRepairs(state,{command,
        reserve:Math.max(HIRING_RESERVE,protectedCash??0),
        centerReserve});
      if(state.day<startDay||!permission(state,'wall')||
        !dirty||state.elapsed<nextPlanAt)return repairs;
      dirty=false;
      nextPlanAt=state.elapsed+minimumReplanSeconds;
      const group=timed('defense.nativeGroups',()=>
        advice.getUnprotectedCropGroups()[0]);
      if(!group){capitalTarget=0;return repairs;}
      groupValues.set(group.id,group.value??0);
      lastGroupBounds={minX:group.bounds.minX-1,maxX:group.bounds.maxX+1,
        minZ:group.bounds.minZ-1,maxZ:group.bounds.maxZ+1};
      const planner=createCropEnclosurePlanner(state,nav,advice,session);
      const plan=timed('defense.nativeEnclosure',()=>
        planner.planCropEnclosure(group.id,{material,method:'topological'}));
      const row={day:state.day,time:state.time,groupId:group.id,
        kind:plan.kind??'uncertified-topology',status:plan.status,
        cost:plan.cost??0,modules:plan.modules?.length??0,
        paidCost:0,paidPieces:0,reason:plan.reason??null,
        attempts:plan.attempts?.map(item=>({kind:item.kind,status:item.status,
          reason:item.reason,modules:item.modules,cost:item.cost,
          gaps:item.gaps,expectedSlots:item.expectedSlots,
          movementFaces:item.movementFaces,attackMargin:item.attackMargin,
          exposedAttackMargin:item.exposedAttackMargin}))};
      if(plan.status!=='ready'||!plan.modules?.length){
        capitalTarget=0;waitForFunds=0;history.push(row);return repairs;
      }
      capitalTarget=plan.cost;
      const available=numberOf(state.ledger.balance)-
        Math.max(HIRING_RESERVE,protectedCash??0);
      if(available<plan.cost){row.reason='saving-for-complete-enclosure';
        waitForFunds=Math.max(HIRING_RESERVE,protectedCash??0)+plan.cost;
        history.push(row);return repairs;}
      waitForFunds=0;
      // The prepared quote is accepted only while its state/revisions match.
      // No partial maxPieces purchase is permitted for a certified closure.
      const options={smooth:false,snap:false,preparedPlan:plan.preparedPlan};
      const built=timed('defense.buildWallChain',()=>Game.buildWallChain(state,
        command('wall'),material,plan.points,nav,options));
      if(built){row.paidCost=plan.cost;row.paidPieces=plan.modules.length;
        row.ids=plan.modules.map(piece=>piece.id);capitalTarget=0;
        const enclosureId=`enclosure:${row.ids[0]}`;
        const ids=new Set(row.ids);
        for(const wall of state.structures)if(ids.has(wall.id)){
          wall.defenseEnclosureId=enclosureId;
          wall.defenseGroupId=group.id;
        }
        row.enclosureId=enclosureId;
      }
      else row.reason='build-rejected';
      history.push(row);
      return repairs+Number(!!built);
    },
    report:()=>structuredClone({material,startDay,capitalTarget,waitForFunds,history,
      repairRequests,repairWaitForFunds,repairHistory,
      conditionNotifications,
      paidCost:history.reduce((sum,row)=>sum+row.paidCost,0),
      paidPieces:history.reduce((sum,row)=>sum+row.paidPieces,0),
      scope:'Full certified native enclosure with event-driven paid repairs; unknown proposals never purchased'})
  };
}
