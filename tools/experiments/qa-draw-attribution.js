// QA only: count actual submitted work, not geometry capacity. No GPU timing.
export function attributeDraws(world){
 const r=world.renderer,original=r.renderBufferDirect,auto=r.info.autoReset,rows=[];
 r.info.autoReset=false;r.info.reset();
 const hook=function(camera,scene,geometry,material,object,group){
  const before={...r.info.render};
  const target=r.getRenderTarget();
  const path=[];for(let o=object;o&&path.length<6;o=o.parent)path.push(o.name||o.type);
  try{return original.apply(this,arguments);}finally{
   rows.push({object:object.name||object.type,path,material:material.name||material.type,ground:!!material.userData?.biomeGround,instanced:!!object.isInstancedMesh||!!geometry.isInstancedBufferGeometry,target:target?`${target.width}x${target.height}`:'screen',depth:!!material.isMeshDepthMaterial||!!material.isMeshDistanceMaterial,calls:r.info.render.calls-before.calls,triangles:r.info.render.triangles-before.triangles});
  }
 };
 r.renderBufferDirect=hook;
 try{world.render(1/30);return {rows,total:{...r.info.render},glError:r.getContext().getError()};}
 finally{if(r.renderBufferDirect===hook)r.renderBufferDirect=original;r.info.autoReset=auto;}
}
