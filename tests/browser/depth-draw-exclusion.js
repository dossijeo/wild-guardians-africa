// QA only: withhold a mesh's actual depth submissions without replacing shaders,
// materials or scene membership. Other targets (color/shadows) are untouched.
export function withExcludedDepthObject(world,objectId,render){
 if(typeof objectId!=='string'||!objectId.length||objectId.length>200)throw Error('Invalid depth object selector');
 const renderer=world.renderer,original=renderer.renderBufferDirect;let skipped=0;
 renderer.renderBufferDirect=function(camera,scene,geometry,material,object,group){
  if(renderer.getRenderTarget()===world.destructionPass.smokeDepth&&object.uuid===objectId){skipped++;return;}
  return original.call(this,camera,scene,geometry,material,object,group);
 };
 try{return {value:render(),skipped};}finally{renderer.renderBufferDirect=original;}
}
