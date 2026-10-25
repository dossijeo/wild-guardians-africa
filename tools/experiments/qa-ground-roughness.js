// QA dry ground response; preserve albedo, normal, AO and geometry.
export function applyMaterialStudy(world){
 for(const material of new Set(world.terrainMeshes.map(m=>m.material))){
  const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
   compile(shader,renderer);
   const anchor='rough=baseRough;';
   if(!shader.fragmentShader.includes(anchor))throw Error('Ground roughness anchor missing');
   shader.fragmentShader=shader.fragmentShader.replace(anchor,'if(!moss&&!rock)baseRough=max(baseRough,.86);rough=baseRough;');
  };
  material.customProgramCacheKey=()=>cache()+'|qa-ground-roughness';material.needsUpdate=true;
 }
 return {newTextures:0,newGeometry:0,minDryRoughness:.86,scope:'Savanna, River turf and Canyon mapped floor; moss, volcanic rock and legacy desert unchanged'};
}
