// QA only: actual transformed vertices, not just placement anchors.
export function auditBankCover(world){
 const mesh=world.groundDetails.mesh,position=mesh.geometry.attributes.position;
 mesh.updateMatrixWorld(true);const matrix=new mesh.matrixWorld.constructor(),v=world.camera.position.clone();
 const blockers=[...world.state.plants.filter(p=>p.alive!==false),...world.state.structures.filter(s=>s.status!=='ruined'),...world.state.villages];
 const result={instances:mesh.count,verticesPerInstance:position.count,wetAnchors:0,waterOverhangInstances:0,blockedFootprintInstances:0,samples:[]};
 for(let i=0;i<mesh.count;i++){
  mesh.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld);const e=matrix.elements,x=e[12],z=e[14];
  if(world.nav.field.waterInfo(x,z).inside)result.wetAnchors++;
  const near=blockers.filter(p=>Math.hypot(x-p.x,z-p.z)<12);let water=false,blocked=false;
  for(let j=0;j<position.count;j++){v.fromBufferAttribute(position,j).applyMatrix4(matrix);water ||=world.nav.field.waterInfo(v.x,v.z).inside;
   blocked ||=near.some(p=>(v.x-p.x)**2+(v.z-p.z)**2<(p.kind==='wall'?1.45:p.kind==='center'?9:p.buildings?80:1.8));
  }
  result.waterOverhangInstances+=Number(water);result.blockedFootprintInstances+=Number(blocked);
  if((water||blocked)&&result.samples.length<10)result.samples.push({x,z,water,blocked});
 }
 return result;
}
