import * as THREE from 'three';
import {SLOTS} from '../world/terrain.js';
import {obstructionRecord,obstructionFrame,obstructionVisibility,coverageThreshold} from './obstruction-source.js';

// Geometry views retain the shared immutable vertex/index arrays and add only
// private GPU identities and per-instance coverage. Disposing a changed slot
// cannot delete another slot or shadow proxy's vertex buffers. Materials are shared.
export function obstructionGeometry(geometry,instances,prototype,slot,fullGeometry=geometry){
  if(!prototype.min||!prototype.max){
    if(!fullGeometry.boundingBox)fullGeometry.computeBoundingBox();
    prototype={...prototype,min:fullGeometry.boundingBox.min.toArray(),max:fullGeometry.boundingBox.max.toArray()};
  }
  if(slot===19||(prototype.group??SLOTS[slot].g)===2||prototype.max[1]-prototype.min[1]<=.72)return geometry;
  const view=new THREE.BufferGeometry();
  if(geometry.index)view.setIndex(new THREE.BufferAttribute(geometry.index.array,geometry.index.itemSize,geometry.index.normalized));
  for(const [key,attribute] of Object.entries(geometry.attributes))view.setAttribute(key,new THREE.BufferAttribute(attribute.array,attribute.itemSize,attribute.normalized));
  view.groups=geometry.groups.map(group=>({...group}));view.drawRange={...geometry.drawRange};
  view.boundingBox=geometry.boundingBox?.clone()??null;view.boundingSphere=geometry.boundingSphere?.clone()??null;
  const attribute=new THREE.InstancedBufferAttribute(new Float32Array(instances.length).fill(1),1).setUsage(THREE.DynamicDrawUsage);
  view.setAttribute('nativeVisibility',attribute);
  view.userData.obstruction={records:instances.map(p=>obstructionRecord(p,prototype)),attribute,fresh:true};
  return view;
}

export function obstructionMaterial(material){
  if(material.userData.nativeObstruction)return;material.userData.nativeObstruction=true;
  material.defaultAttributeValues={...material.defaultAttributeValues,nativeVisibility:[1]};
  const previous=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
    previous.call(material,shader,renderer);
    shader.vertexShader='attribute float nativeVisibility;varying float vNativeVisibility;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvNativeVisibility=nativeVisibility;');
    shader.fragmentShader='varying float vNativeVisibility;\n'+coverageThreshold+'\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
      if(vNativeVisibility<.999){if(vNativeVisibility<.002||coverageThreshold(gl_FragCoord.xy)>=vNativeVisibility)discard;}`);
  };
  material.customProgramCacheKey=()=>cache()+'|native-obstruction';material.needsUpdate=true;
}

// Records belong to an immutable prop population. Replacing a suppressed slot
// creates another fade; weak ownership lets retired populations be collected.
const obstructionCaches=new WeakMap();
export function updateObstructions(chunks,camera,target,dt,{enabled=true,distance=7,snap=false}={}){
  const inputs=[...camera.position.toArray(),...target.toArray(),camera.fov,camera.aspect,distance,enabled];
  let frame;
  const stats={hidden:0,fading:0,affected:0};dt=Math.max(0,Math.min(.12,dt));
  for(const group of chunks.values()){
   const batches=group.userData?.lodBatches??[];
   const fades=[...batches.map(b=>b.fade),...group.children.filter(m=>!m.userData?.nativeLodBatch).map(m=>m.geometry?.userData.obstruction)];
   for(const fade of fades){
    if(!fade)continue;
    let cache=obstructionCaches.get(fade);
    const invalid=!cache||fade.fresh||cache.records!==fade.records||cache.desired.length!==fade.records.length||cache.array!==fade.attribute.array||cache.version!==fade.attribute.version||inputs.some((value,i)=>value!==cache.inputs[i]);
    if(invalid){
      if(enabled)frame??=obstructionFrame(camera.position.toArray(),target.toArray(),THREE.MathUtils.degToRad(camera.fov),camera.aspect,distance);
      cache={inputs,records:fade.records,array:fade.attribute.array,desired:fade.records.map(record=>enabled?obstructionVisibility(record,frame):1),settled:false};
      obstructionCaches.set(fade,cache);
    }
    if(cache.settled){for(const key of ['hidden','fading','affected'])stats[key]+=cache.stats[key];continue;}
    let dirty=false,settled=true;const counts={hidden:0,fading:0,affected:0};
    for(let i=0;i<fade.records.length;i++){
      const desired=cache.desired[i],old=fade.attribute.array[i],rate=desired<old?16:7;
      let value=snap||fade.fresh?desired:old+(desired-old)*(1-Math.exp(-dt*rate));
      if(Math.abs(value-desired)<.008)value=desired;if(value<.002)value=0;if(value>.998)value=1;
      if(Math.abs(value-old)>.0001){fade.attribute.array[i]=value;dirty=true;}
      if(value!==(desired<.002?0:desired>.998?1:desired))settled=false;
      if(value<.999){counts.affected++;if(value<.002)counts.hidden++;else counts.fading++;}
    }
    fade.fresh=false;if(dirty)fade.attribute.needsUpdate=true;
    cache.version=fade.attribute.version;cache.settled=settled;cache.stats=counts;
    for(const key of ['hidden','fading','affected'])stats[key]+=counts[key];
    if(dirty)for(const batch of batches)if(batch.fade===fade)batch.packCoverage();
   }
  }
  return stats;
}
