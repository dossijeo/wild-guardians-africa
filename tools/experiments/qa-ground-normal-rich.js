// QA: preserve sharp albedo and AO; increase only normal-map strength.
export function applyMaterialStudy(world){
 for(const material of new Set(world.terrainMeshes.map(m=>m.material))){
  const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
   compile(shader,renderer);
   const anchor='mapN.xy*=strength;';
   if(!shader.fragmentShader.includes(anchor))throw Error('Ground normal anchor missing');
   shader.fragmentShader=shader.fragmentShader.replace(anchor,'mapN.xy*=strength*1.6;');
  };
  material.customProgramCacheKey=()=>cache()+'|qa-ground-normal-rich';material.needsUpdate=true;
 }
 return {newTextures:0,newGeometry:0,normalStrengthMultiplier:1.6,scope:'Normal-map tangent slopes only; albedo, AO, parallax and geometric normal unchanged'};
}
