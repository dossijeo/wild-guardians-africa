// Terrain may be published as a stable group containing ground and water.
// Picking must inspect visible descendants, not only direct scene children.
export function visibleTerrainMeshes(scene){
 const meshes=[];
 scene.traverseVisible(object=>{if(object.isMesh&&object.userData.ground)meshes.push(object);});
 return meshes;
}
