// Node-only experiment: never edits or replaces the production source on disk.
export async function load(url,context,nextLoad){
 const result=await nextLoad(url,context);
 if(process.env.MOBILE_COORDINATION_EXPERIMENT==='1'&&url.endsWith('/src/simulation/actor-motion.js')){
  let source=String(result.source);
  const anchor='const blockedDetours=new WeakMap();',needle='if(String(actor.id)<String(opposing.id)&&yieldPoint(opposing,actor,state.workers.includes(opposing)))return;';
  if(!source.includes(anchor)||!source.includes(needle))throw Error('Coordinated yield experiment hooks changed');
  source=source.replace(anchor,anchor+'\nconst labYieldRequests=new WeakMap();').replace(needle,`if(String(actor.id)<String(opposing.id)){
    const point=yieldPoint(opposing,actor,state.workers.includes(opposing));
    if(point){
      const prior=labYieldRequests.get(opposing);
      if(['walking','entering','retreating','returning','fleeing'].includes(opposing.status)&&opposing.path?.length&&opposing.path[0]!==prior){
        opposing.path=[point,...opposing.path];labYieldRequests.set(opposing,point);
        nav.motionObserver?.({kind:'coordinatedYield',actorId:opposing.id,forActor:actor.id,elapsed:state.elapsed});
      }
      return;
    }
  }`);
  return {...result,source,shortCircuit:true};
 }
 if(process.env.MOBILE_PHASE_EXPERIMENT!=='1'||!url.endsWith('/src/simulation/game.js'))return result;
 let source=String(result.source);
 const condition='if((stationarySeconds>=3||destinationStallSeconds>=12)&&',phase='const phased=(w.mobilePhaseRemaining??0)>0;';
 if(!source.includes(condition)||!source.includes(phase))throw Error('Mobile phase experiment hooks changed');
 source=source.replace(condition,'if(false&&(stationarySeconds>=3||destinationStallSeconds>=12)&&').replace(phase,'const phased=false;');
 return {...result,source,shortCircuit:true};
}
