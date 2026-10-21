// Diagnostic only: timings from a traced run are not performance evidence.
export function installDrawTrace(world){
 const renderer=world.renderer,original=renderer.renderBufferDirect;
 const trace={enabled:false,rows:[]};world.qaDrawTrace=trace;
 renderer.renderBufferDirect=function(camera,scene,geometry,material,object,group){
  if(!trace.enabled)return original.apply(this,arguments);
  const before={...renderer.info.render};
  const result=original.apply(this,arguments);
  if(renderer.info.render.calls!==before.calls){
   const path=[];for(let node=object;node;node=node.parent)
    if(node.userData.entityId||node.name)path.push(node.userData.entityId??node.name);
   trace.rows.push({path,camera:camera.type,geometry:geometry.name,
    vertices:geometry.attributes.position?.count,indices:geometry.index?.count,
    instances:object.isInstancedMesh?object.count:null,
    position:object.matrixWorld.elements.slice(12,15),
    calls:renderer.info.render.calls-before.calls,
    triangles:renderer.info.render.triangles-before.triangles});
  }
  return result;
 };
}
