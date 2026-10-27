import {Frustum,Matrix4,Sphere} from 'three';

// Experimental admission predicate, not a renderer or resource owner.
// Local frustum planes also support nonuniform/sheared effect transforms.
export function createSoftDepthVisibility(){
 const frustum=new Frustum(),vp=new Matrix4(),clip=new Matrix4(),sphere=new Sphere();
 return function needsCapture(world,camera){
  if([...world.destructionPass.buildings].some(b=>b.effects.native.smoke.length))return true;
  camera.updateWorldMatrix(true,false);
  vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  let seen=false;
  for(const fx of world.vfxLibrary.instances){
   if(fx.stopped||!fx.softParticleDepth||!fx.parent)continue;
   fx.updateWorldMatrix(true,false);
   clip.multiplyMatrices(vp,fx.matrixWorld);
   if(!clip.elements.every(Number.isFinite)||Math.abs(fx.matrixWorld.determinant())<1e-12)return true;
   frustum.setFromProjectionMatrix(clip);
   const data=fx.spriteBuffer.array,count=fx.sprites.geometry.instanceCount;
   for(let i=0;i<count;i++){
    const o=i*25;if(!(data[o+21]>0))continue;seen=true;
    sphere.center.set(data[o],data[o+1],data[o+2]);
    sphere.radius=Math.SQRT1_2*Math.hypot(data[o+3],data[o+4]);
    if(!Number.isFinite(sphere.center.x+sphere.center.y+sphere.center.z+sphere.radius))return true;
    if(frustum.intersectsSphere(sphere))return true;
   }
  }
  // Unknown/no recognized consumer: retain the original pass.
  return !seen;
 };
}

export function installSoftDepthVisibility(world){
 const owner=world.destructionPass,original=owner.captureDepth,needsCapture=createSoftDepthVisibility();
 const stats={requested:0,skipped:0};
 const wrapped=function(camera,scene){stats.requested++;if(!needsCapture(world,camera)){stats.skipped++;return;}return original.call(this,camera,scene);};
 owner.captureDepth=wrapped;
 return ()=>{if(owner.captureDepth===wrapped)owner.captureDepth=original;return stats;};
}
