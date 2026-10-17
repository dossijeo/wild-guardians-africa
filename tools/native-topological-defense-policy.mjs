import * as Game from '../src/simulation/game.js';
import {createCropEnclosurePlanner} from
  '../src/world/hierarchical-wasm/spatial-crop-enclosure-plan.js';
import {numberOf} from '../src/simulation/money.js';
import {permission} from '../src/simulation/rules.js';
import {HIRING_RESERVE} from '../src/simulation/budget.js';

// Campaign-only policy. Wild Engine proposes and certifies geometry; the bot
// decides whether to save for it and purchases the entire quoted enclosure.
export function createNativeTopologicalDefensePolicy({session,advice,material='zarzas',
  startDay=2,minimumReplanSeconds=60,measure=null}={}){
  if(!session||!advice)throw TypeError('Wild Engine session and advice are required');
  const timed=(kind,fn)=>{
    if(!measure)return fn();
    const start=performance.now();
    try{return fn();}finally{measure(kind,performance.now()-start);}
  };
  let capitalTarget=0,dirty=true,waitForFunds=0,nextPlanAt=0,
    lastGroupBounds=null;
  const history=[];
  return {
    reserve:state=>state.day>=startDay?capitalTarget:0,
    onWorldEvent(event,state){
      if(!['CrateDelivered','CropPlaced','CropDestroyed','WallChainBuilt',
        'WallRemoved','StructureRuined','RepairApplied','PlacementCommitted']
        .includes(event.type))return;
      if(event.type==='CrateDelivered'){
        if(!waitForFunds||numberOf(state.ledger.balance)<waitForFunds)return;
      }
      if(event.type==='CropPlaced'&&lastGroupBounds){
        const crop=state.plants.at(-1)?.id===event.targetId?
          state.plants.at(-1):state.plants.find(item=>item.id===event.targetId);
        if(crop&&crop.x>=lastGroupBounds.minX&&
          crop.x<=lastGroupBounds.maxX&&crop.z>=lastGroupBounds.minZ&&
          crop.z<=lastGroupBounds.maxZ)return;
      }
      dirty=true;
    },
    onCropProtectionChanged(change){
      if(change.protection!=='protected')dirty=true;
    },
    act(state,nav,{command,reserve:protectedCash}){
      if(state.day<startDay||state.raid||!permission(state,'wall')||
        !dirty||state.elapsed<nextPlanAt)return 0;
      dirty=false;
      nextPlanAt=state.elapsed+minimumReplanSeconds;
      const group=timed('defense.nativeGroups',()=>
        advice.getUnprotectedCropGroups()[0]);
      if(!group){capitalTarget=0;return 0;}
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
        capitalTarget=0;waitForFunds=0;history.push(row);return 0;
      }
      capitalTarget=plan.cost;
      const available=numberOf(state.ledger.balance)-
        Math.max(HIRING_RESERVE,protectedCash??0);
      if(available<plan.cost){row.reason='saving-for-complete-enclosure';
        waitForFunds=Math.max(HIRING_RESERVE,protectedCash??0)+plan.cost;
        history.push(row);return 0;}
      waitForFunds=0;
      // The prepared quote is accepted only while its state/revisions match.
      // No partial maxPieces purchase is permitted for a certified closure.
      const options={smooth:false,snap:false,preparedPlan:plan.preparedPlan};
      const built=timed('defense.buildWallChain',()=>Game.buildWallChain(state,
        command('wall'),material,plan.points,nav,options));
      if(built){row.paidCost=plan.cost;row.paidPieces=plan.modules.length;
        row.ids=plan.modules.map(piece=>piece.id);capitalTarget=0;}
      else row.reason='build-rejected';
      history.push(row);
      return built?1:0;
    },
    report:()=>structuredClone({material,startDay,capitalTarget,waitForFunds,history,
      paidCost:history.reduce((sum,row)=>sum+row.paidCost,0),
      paidPieces:history.reduce((sum,row)=>sum+row.paidPieces,0),
      scope:'Full certified native enclosure; unknown proposals never purchased'})
  };
}
