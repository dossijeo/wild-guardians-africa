import {quoteWallChain} from '../../simulation/game.js';
import {proposeHybridEnclosure} from './spatial-hybrid-enclosure-prototype.js';
import {inspectSelfClosedQuote} from './spatial-topological-enclosure-prototype.js';

// Game-specific planning service over Wild Engine's crop groups and topology.
// A quote never changes the game. The preview is certified against the native
// animal graph, including doors, natural barriers and resident-sector gaps.
export function createCropEnclosurePlanner(state,nav,bridge,session=null){
  if(!state||!nav?.wallWorkerReachability||!bridge?.getUnprotectedCropGroups)
    throw TypeError('A live game, Wild Engine navigation and crop index are required');
  const marginSteps=[2.5,4.5,7];
  const resultFor=(group,material,margin)=>{
    const b=group.bounds;
    const loX=b.minX-margin,loZ=b.minZ-margin;
    const hiX=b.maxX+margin,hiZ=b.maxZ+margin;
    const points=[[loX,loZ],[hiX,loZ],[hiX,hiZ],[loX,hiZ],[loX,loZ]];
    let quote;
    try{quote=quoteWallChain(state,material,points,nav,{smooth:false,snap:false});}
    catch(error){return {status:error.name==='SpatialChunkUnavailable'?'unknown':'blocked',
      reason:error.name==='SpatialChunkUnavailable'?'missing-sector':error.message,points};}
    const gaps=[...quote.blockedPieces.map(piece=>({x:piece.x,z:piece.z,reason:'physical-obstacle'})),
      ...quote.blockedCrops.map(piece=>({x:piece.x,z:piece.z,reason:'crop'}))];
    if(!quote.pieces.length)return {status:'blocked',reason:'no-placeable-modules',points,gaps};
    // A speculative quote cannot be synchronized into the confirmed graph.
    // The placed wall loop certifies a continuous animal barrier; a native
    // positive-only overlay certifies worker access through its gate. Natural
    // joins without a complete physical proof remain unknown.
    const crops=state.plants.filter(crop=>crop.alive&&
      group.cropIds.includes(crop.id));
    const loop=inspectSelfClosedQuote(quote,state.structures,crops);
    const replaced=quote.previewPieces.filter(piece=>state.structures.some(
      existing=>existing.id===piece.id&&existing.kind==='wall'&&
        existing.status!=='ruined')).map(piece=>piece.id);
    const access=state.villages.every(village=>{
      const entry=village.entry??village;
      // Legacy layouts may place their nominal village coordinate inside a
      // building. The ordinary construction quote has no access obligation
      // from such a non-occupiable origin either.
      if(!nav.walkable(entry.x,entry.z,.28,null,true))return true;
      const out=nav.wallWorkerReachability(entry,crops,
        quote.previewPieces,quote.suppressed,false,replaced);
      const back=nav.wallWorkerReachability(entry,crops,
        quote.previewPieces,quote.suppressed,true,replaced);
      return crops.every((_,i)=>out?.[i]==='found'&&back?.[i]==='found');
    });
    const status=loop.status==='closed-wall-loop'&&access?'ready':'unknown';
    return {status,reason:status==='ready'?null:
      !access?'worker-access-unproved':'uncertified-topology',
      points,gaps,modules:quote.pieces,cost:quote.cost,
      gates:quote.gates,previewPieces:quote.previewPieces,
      suppressed:quote.suppressed,updates:quote.updates,
      expectedSlots:quote.expectedSlots.length,
      revision:group.revision};
  };
  return {
    planCropEnclosure(groupId,{material='zarzas',method='rectangular'}={}){
      const group=bridge.getUnprotectedCropGroups({includeProtected:true})
        .find(candidate=>candidate.id===groupId);
      if(!group)return {status:'blocked',reason:'group-changed'};
      if(group.protection==='protected')return {status:'protected',groupId,revision:group.revision};
      if(method!=='rectangular'&&method!=='hybrid'&&method!=='topological')
        throw TypeError('Unknown enclosure planning method');
      if(method!=='rectangular'){
        const ids=new Set(group.cropIds);
        // Native crop groups encode agricultural adjacency, not the physical
        // clearance a wall module needs. Include neighboring living crops in
        // the local search window so a cut cannot run through another group.
        const b=group.bounds,near=12;
        const crops=state.plants.filter(plant=>plant.alive&&
          (ids.has(plant.id)||plant.x>=b.minX-near&&
            plant.x<=b.maxX+near&&plant.z>=b.minZ-near&&
            plant.z<=b.maxZ+near));
        if(crops.length&&crops.length<=256&&session){
          const candidate=proposeHybridEnclosure({state,nav,session,crops,material});
          if(candidate.status==='protected'){
            const {strokes,preparedPlan,...proof}=candidate.chosen;
            if(!preparedPlan)return {status:'protected',reason:null,
              kind:proof.kind,proof,groupId,material,revision:group.revision};
            return {status:'ready',reason:null,kind:proof.kind,
              points:strokes,gaps:[],modules:preparedPlan.pieces,
              cost:preparedPlan.cost,gates:preparedPlan.gates,
              previewPieces:preparedPlan.previewPieces,
              suppressed:preparedPlan.suppressed,
              updates:preparedPlan.updates,
              expectedSlots:preparedPlan.expectedSlots.length,
              preparedPlan,proof,groupId,material,revision:group.revision,
              planId:`${groupId}:${material}:${group.revision.crops}:${group.revision.topology
                .map(item=>item.topology).join('.')}:${preparedPlan.cost}`};
          }
          if(method==='topological')return {...candidate,groupId,material,
            revision:group.revision};
        }else if(method==='topological')return {status:'unknown',
          reason:!session?'native-session-unavailable':
            crops.length>256?'group-exceeds-local-cut-budget':'group-changed',groupId};
      }
      const plans=[];
      for(const margin of marginSteps){
        const candidate=resultFor(group,material,margin);
        plans.push(candidate);
        // The first physically certified ring is a deterministic, local plan.
        // Searching for a globally cheapest shape would repeat expensive gate
        // and worker-route checks for a speculative purchase.
        if(candidate.status==='ready')break;
      }
      const selected=plans.find(plan=>plan.status==='ready')??
        plans.find(plan=>plan.status==='unknown')??
        plans.filter(plan=>plan.modules?.length).sort((a,b)=>b.modules.length-a.modules.length)[0]??plans[0];
      return {...selected,groupId,material,
        planId:`${groupId}:${material}:${group.revision.crops}:${group.revision.topology
          .map(item=>item.topology).join('.')}:${selected?.cost??0}`};
    }
  };
}
