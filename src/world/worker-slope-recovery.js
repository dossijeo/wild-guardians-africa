import {fluidAt} from './fluid-placement.js';
import {navigationPathKey} from './raid-navigation-warmth.js';
import {evictOldest} from './fifo-eviction.js';

const failed=new WeakMap();
// Recovery only, never a relaxed rule for ordinary route planning. Historical
// fractional connectors can strand a returning worker just beyond the slope
// boundary. Permit a short, continuously improving exit, not a cliff crossing.
const MAX_SLOPE=.51,MAX_EXIT=.5,SAMPLE=.025;
function samples(radius){return [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]];}
function slopeAt(nav,x,z){
 if(!nav.field.canyon)return nav.field.slope(x,z);
 return Math.hypot(nav.workerSurface(x+.8,z)-nav.workerSurface(x-.8,z),nav.workerSurface(x,z+.8)-nav.workerSurface(x,z-.8))/1.6;
}
export function workerSlopeRecoveryPath(nav,start,end,radius=.28){
 if(!nav.field||!nav.testSegmentClear||!nav.workerMotionClear)return null;
 let memo=failed.get(nav);
 if(!memo||memo.version!==nav.version){memo={version:nav.version,keys:new Set()};failed.set(nav,memo);}
 const key=navigationPathKey(start,end,radius,null,true,16);
 if(memo.keys.has(key))return null;
 const reject=()=>{if(memo.keys.size>=4096)evictOldest(memo.keys);memo.keys.add(key);return null;};
 const offsets=samples(radius);
 const dry=(x,z)=>nav.field.canyon||offsets.every(([dx,dz])=>!fluidAt(nav.field,x+dx,z+dz));
 const slope=(x,z)=>Math.max(...offsets.map(([dx,dz])=>slopeAt(nav,x+dx,z+dz)));
 const initial=slope(start.x,start.z);
 if(!Number.isFinite(initial)||initial<=.5||initial>MAX_SLOPE||!dry(start.x,start.z))return reject();
 // Keep native swept props, structures, gate leaves and fluids. Only the
 // marginal slope violation is checked separately at finer intervals below.
 const collision=Object.assign(Object.create(nav),{terrainValid:(x,z)=>dry(x,z),segmentCache:new Map()});
 for(let step=1;step<=MAX_EXIT/.1;step++)for(let angle=0;angle<32;angle++){
  const length=step*.1,a=angle*Math.PI/16,point={x:start.x+Math.sin(a)*length,z:start.z+Math.cos(a)*length};
  if(!nav.walkable(point.x,point.z,radius,null,true)||!collision.workerMotionClear(start,point,radius))continue;
  const count=Math.ceil(length/SAMPLE);let prior=initial,valid=true;
  for(let i=1;i<=count;i++){
   const x=start.x+(point.x-start.x)*i/count,z=start.z+(point.z-start.z)*i/count,value=slope(x,z);
   if(!Number.isFinite(value)||!dry(x,z)||Math.max(0,value-.5)>Math.max(0,prior-.5)+1e-10){valid=false;break;}
   prior=value;
  }
  if(!valid)continue;
  const tail=nav.path(point,end,radius,null,true);if(tail)return [point,...tail];
 }
 return reject();
}
