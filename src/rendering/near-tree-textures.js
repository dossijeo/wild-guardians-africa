import * as THREE from 'three';
import {nativeLodBins} from './lod-source.js';

// Far standby levels use the original three geometry/material variants.
export function originalTreeLevels(levels){return levels[0]?.userData?.nearTextureDistance?levels.slice(1):levels;}
export function originalTreeLevel(level,prototype){return prototype.nearTextureDistance?Math.max(0,level-1):level;}

export function removeReviewedTreeTriangles(geometry,triangles){
  if(!triangles?.length)return;
  const source=geometry.index;
  if(!source||source.count%3)throw Error('Cleanup requires triangle indices');
  const removed=new Set(triangles);
  if(removed.size!==triangles.length||triangles.some(i=>!Number.isInteger(i)||i<0||i>=source.count/3))throw Error('Invalid tree cleanup selection');
  const indices=new source.array.constructor(source.count-triangles.length*3);let offset=0;
  for(let triangle=0;triangle<source.count/3;triangle++)if(!removed.has(triangle)){
    indices.set(source.array.subarray(triangle*3,triangle*3+3),offset);offset+=3;
  }
  geometry.setIndex(new THREE.BufferAttribute(indices,1));
}

// Retain every original triangle and attribute. Split only vertices whose new
// UV seams differ; old UV/tangents still drive the original normal atlas.
export function nearTreeGeometry(source,cornerUV){
  if(!source.index||cornerUV.length!==source.index.count*2||!cornerUV.every(Number.isFinite))throw Error('Invalid near-tree corner UVs');
  const vertices=[],uv=[],indices=[],lookup=new Map();
  for(let corner=0;corner<source.index.count;corner++){
    const original=source.index.array[corner],u=cornerUV[corner*2],v=cornerUV[corner*2+1],key=`${original}:${u}:${v}`;
    let index=lookup.get(key);
    if(index===undefined){index=vertices.length;lookup.set(key,index);vertices.push(original);uv.push(u,v);}
    indices.push(index);
  }
  const geometry=new THREE.BufferGeometry();
  for(const [name,attribute]of Object.entries(source.attributes)){
    if(attribute.isInterleavedBufferAttribute)throw Error('Unsupported packed near-tree attribute');
    const values=new attribute.array.constructor(vertices.length*attribute.itemSize);
    vertices.forEach((original,i)=>values.set(attribute.array.subarray(original*attribute.itemSize,(original+1)*attribute.itemSize),i*attribute.itemSize));
    geometry.setAttribute(name,new THREE.BufferAttribute(values,attribute.itemSize,attribute.normalized));
  }
  geometry.setAttribute('uv1',new THREE.Float32BufferAttribute(uv,2));
  geometry.setIndex(indices);geometry.boundingBox=source.boundingBox.clone();geometry.boundingSphere=source.boundingSphere.clone();
  return geometry;
}

export function nearTreeLodBins(instances,prototype,group,eye,quality,levels){
  const distance=prototype.nearTextureDistance;
  if(!distance)return nativeLodBins(instances,prototype,group,eye,quality,levels);
  const original=nativeLodBins(instances,prototype,group,eye,quality,levels-1),bins=[[],...original.map(()=>[])];
  for(const [level,order]of original.entries())for(const i of order){
    const p=instances[i],radius=Math.max(prototype.size[0]*p.sx,prototype.size[2]*p.sz)*.25;
    const d=Math.max(0,Math.hypot(p.x-eye[0],p.y+prototype.centerY*p.sy-eye[1],p.z-eye[2])-radius);
    bins[d<distance?0:level+1].push(i);
  }
  return bins;
}
