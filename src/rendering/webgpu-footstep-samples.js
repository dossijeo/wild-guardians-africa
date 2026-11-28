import { Matrix4 } from 'three/src/math/Matrix4.js';
import { Quaternion } from 'three/src/math/Quaternion.js';
import { Vector3 } from 'three/src/math/Vector3.js';
import { createNativeVfx } from './vfx-native.js';

export const FOOTSTEP_SAMPLE_HZ = 60;
export const FOOTSTEP_SAMPLE_FRAMES = 97;
export const FOOTSTEP_SAMPLE_WIDTH = 44;
export const FOOTSTEP_SPRITE_SLOTS = 4;
export const FOOTSTEP_RIGID_SLOTS = 4;

// Presentation-only clone. Native RNG, particle arrays and checkpoint schemas
// are untouched. Identity follows each spawned object for its whole lifetime,
// never its packed index (packing sorts and expiration splices those arrays).
export function bakeWebGpuFootstep({ rects, surface }) {
 if (rects?.smoke?.length !== 1 || typeof surface !== 'function') throw TypeError('Invalid footstep sample inputs');
 const native = createNativeVfx('dust', rects, { stepMode:true, surface, softParticleDepth:false, worldLights:false });
 const data = new Float32Array(FOOTSTEP_SAMPLE_WIDTH * FOOTSTEP_SAMPLE_FRAMES * 4);
 const sprites = new Map(), rigids = new Map(), spans = [], matrix = new Matrix4(), position = new Vector3(), quaternion = new Quaternion(), scale = new Vector3();
 const lastQuaternion = new Map();
 function id(map, object, count, kind) {
  if (!map.has(object)) { if (map.size >= count) throw Error('Footstep topology exceeds the bounded sample contract'); const slot=map.size; map.set(object,slot); spans.push({kind,slot,birth:native.time,death:1.6}); }
  return map.get(object);
 }
 for (let frame=0; frame<FOOTSTEP_SAMPLE_FRAMES; frame++) {
  if (frame) native.advance(1/FOOTSTEP_SAMPLE_HZ);
  const row=frame*FOOTSTEP_SAMPLE_WIDTH*4;
  for (const item of native.sprites()) {
   const part=native.parts.find(value=>value.p===item.p);
   if (!part) throw Error('Footstep contains a procedural sprite');
   const slot=id(sprites,part,FOOTSTEP_SPRITE_SLOTS,'sprite'), offset=row+slot*28, frames=rects[item.tex];
   if (!frames?.length) throw Error('Footstep atlas frame unavailable');
   const phase=Math.max(0,Math.min(item.frame??0,frames.length-1)), first=Math.floor(phase);
   data.set(item.p,offset); data.set(item.size,offset+3); data[offset+5]=item.angle??0;
   data.set(frames[first],offset+6); data.set(frames[Math.min(first+1,frames.length-1)],offset+10);
   data.set(item.col,offset+14); data[offset+17]=item.alpha;
   data.set([phase-first,item.orient??0,item.emit??0,item.soft??0,...(item.dir??[0,1,0])],offset+18);
  }
  const packed=native.rigidInstances().soil; let packedIndex=0;
  for (const rigid of native.rigids) {
   if (rigid.kind!=='soil') throw Error('Unsupported footstep rigid');
   const slot=id(rigids,rigid,FOOTSTEP_RIGID_SLOTS,'rigid'), offset=row+112+slot*16;
   matrix.fromArray(packed.data,packedIndex++*23).decompose(position,quaternion,scale);
   const previous=lastQuaternion.get(slot);
   if(previous&&previous.dot(quaternion)<0)quaternion.set(-quaternion.x,-quaternion.y,-quaternion.z,-quaternion.w);
   lastQuaternion.set(slot,quaternion.clone());
   data.set(position.toArray(),offset); data[offset+3]=1; data.set(quaternion.toArray(),offset+4); data.set(scale.toArray(),offset+8); data[offset+11]=1; data.set(rigid.col,offset+12);
  }
  for(const [object,slot] of sprites)if(!native.parts.includes(object)){const span=spans.find(s=>s.kind==='sprite'&&s.slot===slot);span.death=Math.min(span.death,frame/60);}
  for(const [object,slot] of rigids)if(!native.rigids.includes(object)){const span=spans.find(s=>s.kind==='rigid'&&s.slot===slot);span.death=Math.min(span.death,frame/60);}
 }
 // Absent endpoints retain the nearest pose, with only visibility fading.
 // Never interpolate a dying particle's position toward the world origin.
 for(const span of spans){const stride=span.kind==='sprite'?28:16,base=span.kind==='sprite'?span.slot*28:112+span.slot*16,first=Math.max(1,Math.round(span.birth*60)),last=Math.min(96,Math.round(span.death*60)-1);
  for(let frame=0;frame<97;frame++)if(frame<first||frame>last){const source=(frame<first?first:last)*176+base,offset=frame*176+base;data.copyWithin(offset,source,source+stride);if(span.kind==='sprite')data[offset+17]=0;else{data[offset+3]=0;data.fill(0,offset+8,offset+12);}}
 }
 native.clear();
 return Object.freeze({data,width:FOOTSTEP_SAMPLE_WIDTH,height:FOOTSTEP_SAMPLE_FRAMES,hz:60,duration:1.6,spriteCount:sprites.size,rigidCount:rigids.size,spans:Object.freeze(spans.map(Object.freeze))});
}
