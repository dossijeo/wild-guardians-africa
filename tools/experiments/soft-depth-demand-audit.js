import {Frustum,Matrix4,Sphere} from 'three';

// Read-only QA. Never changes rendering or suppresses a depth capture.
export function installSoftDepthDemandAudit(world){
 const owner=world.destructionPass,original=owner.captureDepth,rows=[];
 const frustum=new Frustum(),matrix=new Matrix4(),sphere=new Sphere();
 const wrapped=function(camera,scene){
  const at=performance.now();
  frustum.setFromProjectionMatrix(matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  let soft=0,intersecting=0,uncertain=0;
  for(const fx of world.vfxLibrary.instances){
   if(fx.stopped||!fx.softParticleDepth||!fx.parent)continue;
   const data=fx.spriteBuffer.array,count=fx.sprites.geometry.instanceCount;
   for(let i=0;i<count;i++){
    const o=i*25;if(!(data[o+21]>0))continue;soft++;
    sphere.center.set(data[o],data[o+1],data[o+2]);
    // Rotation precedes anisotropic size in the shader. This radius encloses
    // every quad orientation; don't use a simple unrotated half diagonal.
    sphere.radius=Math.SQRT1_2*Math.hypot(data[o+3],data[o+4]);
    sphere.applyMatrix4(fx.matrixWorld);
    if(!Number.isFinite(sphere.center.x+sphere.center.y+sphere.center.z+sphere.radius)){uncertain++;continue;}
    if(frustum.intersectsSphere(sphere))intersecting++;
   }
  }
  const smoke=[...owner.buildings].some(b=>b.effects.native.smoke.length);
  const auditMs=performance.now()-at,start=performance.now();
  try{return original.call(this,camera,scene);}
  finally{rows.push({at,soft,intersecting,uncertain,smoke,auditMs,captureCpuMs:performance.now()-start,offscreenOnly:soft>0&&!intersecting&&!uncertain&&!smoke});}
 };
 owner.captureDepth=wrapped;
 return ()=>{if(owner.captureDepth===wrapped)owner.captureDepth=original;return rows;};
}
