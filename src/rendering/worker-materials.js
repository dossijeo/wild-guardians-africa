// The older male's authored body atlas lacks the matte metadata already present
// on olderFemale. Apply the same response without changing tools or face maps.
export function prepareWorkerMaterials(model,profile){
 if(profile!=='olderMale')return;
 model.traverse(mesh=>{
  if(!mesh.isMesh)return;
  for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
   if(material.name!=='BakedMaterial')continue;
   material.userData.matteWorkerBody=true;
   material.roughness=.88;
   material.metalness=0;
  }
 });
}
