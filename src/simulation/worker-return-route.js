import {navigationPathKey} from '../world/raid-navigation-warmth.js';
import {evictOldest} from '../world/fifo-eviction.js';
const searches=new WeakMap();
const MAX_ACTIVE=8,MAX_SLICES=4096;
// Returning people may need to leave the default 16-cell search corridor.
// Wider bounds are not relaxed collision: use the same native worker view,
// gate graph and swept edges. Keep at most eight resumable searches per world.
export function workerReturnRoute(nav,actor,end,radius=.28){
 if(!['fleeing','returning','incapacitated'].includes(actor.status)||!nav.findPathSteps)return null;
 let memo=searches.get(nav);
 if(!memo||memo.version!==nav.version){memo={version:nav.version,active:new Map(),failed:new Set()};searches.set(nav,memo);}
 const key=navigationPathKey(actor,end,radius,null,true,32)+JSON.stringify(actor.terrainAvoidance??[]);
 if(memo.failed.has(key))return null;
 for(const [body,attempt] of memo.active)if(body.x!==attempt.x||body.z!==attempt.z||body.path?.length||!['fleeing','returning','incapacitated'].includes(body.status))memo.active.delete(body);
 let attempt=memo.active.get(actor);
 if(attempt?.key!==key){
  memo.active.delete(actor);if(memo.active.size>=MAX_ACTIVE)return null;
  const view=nav.workerNavigationView?.(actor,radius,null)??nav;
  attempt={key,x:actor.x,z:actor.z,slices:0,view,iterator:view.findPathSteps({x:actor.x,z:actor.z},{x:end.x,z:end.z},radius,null,true,32)};
  memo.active.set(actor,attempt);
 }
 // Native iterator yields every eight popped nodes. No synchronous drain.
 const step=attempt.iterator.next();attempt.slices++;
 if(!step.done&&attempt.slices<MAX_SLICES)return null;
 memo.active.delete(actor);
 if(step.done&&step.value)return attempt.view.smoothPath?.(actor,step.value,radius,null,true)??step.value;
 if(memo.failed.size>=4096)evictOldest(memo.failed);memo.failed.add(key);return null;
}
