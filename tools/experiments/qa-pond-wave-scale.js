// QA-only dimensional study: reuse the native painted-water recipe.
// At scale .55, its row spacing is 1/(.45*.55)=4.04 world metres.
// At scale 2.2 it is 1.01 m, allowing multiple strokes across a small pond.
export function applyPondWaveScale(world){
 const materials=new Set();world.scene.traverse(mesh=>{
  if(mesh.isMesh&&mesh.userData.nativeFluid==='asset'&&mesh.material?.userData.paintUniforms)materials.add(mesh.material);
 });
 if(!materials.size)throw Error('No resident asset-water materials');
 for(const material of materials)material.userData.paintUniforms.uWaterScale.value=2.2;
 return {materials:materials.size,waterScale:[.55,2.2],rowSpacingMetres:[1/(.45*.55),1/(.45*2.2)],newTextures:0,newGeometry:0,newShaderFeatures:0};
}
