// QA-only mip footprint study. No geometry or simulation changes.
export function applyMaterialStudy(world){
 for(const material of new Set(world.terrainMeshes.map(m=>m.material))){
  const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
   compile(shader,renderer);
   const anchor='vec2 dx=dFdx(uv),dy=dFdy(uv);';
   if(!shader.fragmentShader.includes(anchor))throw Error('Ground footprint anchor missing');
   shader.fragmentShader=shader.fragmentShader.replaceAll(anchor,'vec2 dx=dFdx(uv)*3.,dy=dFdy(uv)*3.;');
  };
  material.customProgramCacheKey=()=>cache()+'|qa-ground-frequency';material.needsUpdate=true;
 }
 return {newTextures:0,newGeometry:0,scope:'Threefold texture gradient footprint for albedo, normal and ARH; preserves mean palette and world UV scale'};
}
