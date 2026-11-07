import {Vector3} from 'three';
import {supportAnimalOnTerrain} from '../../src/rendering/animal-terrain-support.js';

// Reversible QA prototype, not a production support implementation.
// A bank only represents ordinary Walking; all other states fall back.
export function createContactBankCandidate(banks,enabled,world){
 const point=new Vector3(),stats={candidate:0,original:0,fallback:{},times:[]};
 const apply=(data,actor,surface)=>{
  const start=performance.now(),bank=banks[actor.species],model=data.model;
  let reason=null;
  if(!enabled)reason='reference';else if(!bank)reason='missing-bank';else if(data.name!=='Walking')reason='other-clip';else if(data.recoveryExit)reason='recovery-exit';else if(data.impactApplied)reason='impact';else if(world.beastPhysics?.entries?.has(actor.id))reason='physics';else if(!model.parent)reason='missing-parent';else if(Math.abs(model.quaternion.x)+Math.abs(model.quaternion.y)+Math.abs(model.quaternion.z)>1e-9||Math.abs(model.quaternion.w-1)>1e-9)reason='model-orientation';
  if(reason){stats.original++;stats.fallback[reason]=(stats.fallback[reason]??0)+1;const result=supportAnimalOnTerrain(data,surface);stats.times.push(performance.now()-start);return result;}
  const t=data.action.time%bank.duration;let lo=0;while(lo+1<bank.times.length&&bank.times[lo+1]<=t)lo++;const hi=Math.min(lo+1,bank.times.length-1),alpha=hi===lo?0:(t-bank.times[lo])/(bank.times[hi]-bank.times[lo]);
  model.parent.updateWorldMatrix(true,false);let lift=0;
  for(let i=0;i<bank.contacts;i++){const a=bank.samples[lo][i],b=bank.samples[hi][i];point.set(a[0]+(b[0]-a[0])*alpha,a[1]+(b[1]-a[1])*alpha,a[2]+(b[2]-a[2])*alpha).applyMatrix4(model.parent.matrixWorld);lift=Math.max(lift,.01+surface(point.x,point.z)-point.y);}
  if(lift>0){model.getWorldPosition(point);point.y+=lift;model.position.copy(model.parent.worldToLocal(point));model.updateMatrixWorld(true);}
  stats.candidate++;stats.times.push(performance.now()-start);return lift;
 };
 return {apply,stats};
}
