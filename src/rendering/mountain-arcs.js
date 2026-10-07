import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Decorative composition: no collider, world ID, shadow or gameplay state.
// Width is measured along the arc, so the artwork retains its physical ratio.
export function createMountainArcGeometry(radius,layout){
 if(!Number.isFinite(radius)||radius<=0||!Array.isArray(layout)||!layout.length||layout.length>16)throw Error('Invalid mountain arc layout');
 for(const arc of layout){
  if(![arc.angle,arc.height,arc.aspect,arc.baseY,arc.baseline].every(Number.isFinite)||arc.height<=0||arc.aspect<=0||arc.baseline<0||arc.baseline>1||arc.height*arc.aspect/radius>Math.PI)throw Error('Invalid mountain arc proportions');
  if(!Array.isArray(arc.uv)||arc.uv.length!==4||!arc.uv.every(v=>Number.isFinite(v)&&v>=0&&v<=1)||arc.uv[0]>=arc.uv[2]||arc.uv[1]>=arc.uv[3])throw Error('Invalid mountain arc atlas cell');
 }
 const pieces=[];
 try{
  for(const arc of layout){
   const span=arc.height*arc.aspect/radius;
   const geometry=new THREE.CylinderGeometry(radius,radius,arc.height,12,1,true,arc.angle-span/2,span);
   pieces.push(geometry);
   const uv=geometry.attributes.uv,positions=geometry.attributes.position,localHeight=new Float32Array(uv.count);
   // Baseline is the source sprite's foot measured from its bottom edge.
   const centre=arc.baseY+arc.height*(.5-arc.baseline);
   for(let i=0;i<uv.count;i++){
    const u=uv.getX(i),v=uv.getY(i);localHeight[i]=v;
    uv.setXY(i,arc.uv[0]+u*(arc.uv[2]-arc.uv[0]),arc.uv[1]+v*(arc.uv[3]-arc.uv[1]));
    positions.setY(i,positions.getY(i)+centre);
   }
   geometry.setAttribute('backdropHeight',new THREE.BufferAttribute(localHeight,1));
  }
  const merged=mergeGeometries(pieces,false);
  if(!merged)throw Error('Unable to batch mountain arcs');
  merged.computeBoundingBox();merged.computeBoundingSphere();return merged;
 }finally{for(const geometry of pieces)geometry.dispose();}
}
