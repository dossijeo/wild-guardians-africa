// V4 bridge topology is authored and baked before compression. Never rebuild
// these faces from the steady-state templates at runtime.
export async function loadCropBridges(data,loadModel){
  if(data.recipeVersion!==4)return data;
  const baked=await loadModel(data.bakedAsset),bakedTemplates=new Map();
  baked.scene.traverse(mesh=>{if(mesh.isMesh){
    const index=mesh.userData.bridgeIndex;
    if(!Number.isInteger(index)||index<0||index>=32||bakedTemplates.has(index))throw Error('Puente V4 ambiguo');
    bakedTemplates.set(index,mesh);
  }});
  if(bakedTemplates.size!==32)throw Error('Biblioteca V4 incompleta');
  return {...data,bakedTemplates};
}
