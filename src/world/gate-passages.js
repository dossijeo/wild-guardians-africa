import {nativeGateFrames} from './gate-frames-native.js';
const cache=new WeakMap();
// Closed wooden/thorn leaves still require articulation before their frame
// can use this same physical passage contract.
export function gateFrameFootprints(entity){
  const source=entity.gate&&nativeGateFrames[entity.material];if(!source)return null;
  const key=[entity.x,entity.z,entity.yaw??0,entity.baseScaleX??1,entity.material].join(':');
  if(cache.get(entity)?.key===key)return cache.get(entity).frames;
  const c=Math.cos(entity.yaw??0),s=Math.sin(entity.yaw??0),sx=1.4*(entity.baseScaleX??1);
  const frames=source.map(side=>side.map(([x,z])=>({x:entity.x+x*sx*c+z*1.4*s,z:entity.z-x*sx*s+z*1.4*c})));
  cache.set(entity,{key,frames});return frames;
}
