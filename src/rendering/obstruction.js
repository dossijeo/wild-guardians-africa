import * as THREE from 'three';
import {SLOTS} from '../world/terrain.js';
import {obstructionRecord,obstructionFrame,obstructionVisibility,coverageThreshold} from './obstruction-source.js';

// Geometry views retain the shared immutable vertex/index arrays and add only
// a private per-instance coverage buffer. Materials remain shared across chunks.
export function obstructionGeometry(geometry,instances,prototype,slot,fullGeometry=geometry){
  if(!prototype.min||!prototype.max){
    if(!fullGeometry.boundingBox)fullGeometry.computeBoundingBox();
    prototype={...prototype,min:fullGeometry.boundingBox.min.toArray(),max:fullGeometry.boundingBox.max.toArray()};
  }
  if(slot===19||(prototype.group??SLOTS[slot].g)===2||prototype.max[1]-prototype.min[1]<=.72)return geometry;
  const view=new THREE.BufferGeometry();view.index=geometry.index;
  for(const [key,attribute] of Object.entries(geometry.attributes))view.setAttribute(key,attribute);
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

export function updateObstructions(chunks,camera,target,dt,{enabled=true,distance=7,snap=false}={}){
  const frame=obstructionFrame(camera.position.toArray(),target.toArray(),THREE.MathUtils.degToRad(camera.fov),camera.aspect,distance);
  const stats={hidden:0,fading:0,affected:0};dt=Math.max(0,Math.min(.12,dt));
  for(const group of chunks.values())for(const mesh of group.children){
    const fade=mesh.geometry?.userData.obstruction;if(!fade)continue;let dirty=false;
    for(let i=0;i<fade.records.length;i++){
      const desired=enabled?obstructionVisibility(fade.records[i],frame):1,old=fade.attribute.array[i],rate=desired<old?16:7;
      let value=snap||fade.fresh?desired:old+(desired-old)*(1-Math.exp(-dt*rate));
      if(Math.abs(value-desired)<.008)value=desired;if(value<.002)value=0;if(value>.998)value=1;
      if(Math.abs(value-old)>.0001){fade.attribute.array[i]=value;dirty=true;}
      if(value<.999){stats.affected++;if(value<.002)stats.hidden++;else stats.fading++;}
    }
    fade.fresh=false;if(dirty)fade.attribute.needsUpdate=true;
  }
  return stats;
}
