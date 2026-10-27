// Post-measurement diagnostic, intentionally includes the original slow query.
export function verifyFarWaterPredicate(world){
 const meshes=world.scene.getObjectsByProperty('isMesh',true).filter(m=>m.userData.farGround&&m.geometry.attributes.aFarWater);
 const report={meshes:meshes.length,vertices:0,seamVertices:0,wet:0,dry:0,mismatches:0};
 for(const mesh of meshes){const p=mesh.geometry.attributes.position.array,a=mesh.geometry.attributes.aFarWater.array;
  // configureNativeFarSeamGeometry intentionally writes zero: the bridge uses
  // the shared fragment mask, not the sampled main-ground attribute.
  if(mesh.userData.farGroundSeam){report.seamVertices+=a.length;for(const value of a)if(value!==0)report.mismatches++;continue;}
  for(let i=0;i<a.length;i++){const x=p[i*3],z=p[i*3+2],expected=world.nav.field.waterInfo(x,z).inside?1:0,fast=world.nav.field.fluidInside(x,z)?1:0;report.vertices++;expected?report.wet++:report.dry++;if(a[i]!==expected||fast!==expected)report.mismatches++;}
 }
 if(!report.vertices||report.mismatches)throw Error('Far-water attribute equivalence failed '+JSON.stringify(report));
 return report;
}
