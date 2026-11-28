import {Frustum, Sphere} from 'three';

// The sprite shader samples scene depth only when iParams.w (softness) > 0.
// Keep a conservative local-space sphere for every possible billboard mode.
export class VfxDepthDemand {
 constructor(){this.frustum=new Frustum();this.sphere=new Sphere();}
 required(data,count,clipMatrix){
  this.frustum.setFromProjectionMatrix(clipMatrix);
  for(let i=0;i<count;i++){
   const o=i*25;if(!(data[o+21]>0))continue;
   this.sphere.center.fromArray(data,o);
   // Corners rotate BEFORE nonuniform size in the native shader.
   this.sphere.radius=Math.max(Math.abs(data[o+3]),Math.abs(data[o+4]))*Math.SQRT1_2;
   if(this.frustum.intersectsSphere(this.sphere))return true;
  }
  return false;
 }
}
