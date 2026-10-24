// QA-only palette correction. Preserve source detail, normal, AO and roughness.
export function applyMaterialStudy(world){
 if(world.state.biome!=='volcanes')return {control:true};
 for(const material of new Set(world.terrainMeshes.map(m=>m.material))){
  const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
   compile(shader,renderer);
   const anchor='if(rock)tex=pow(max(tex,vec3(.001)),vec3(.91));';
   if(!shader.fragmentShader.includes(anchor))throw Error('Volcanic albedo anchor missing');
   shader.fragmentShader=shader.fragmentShader.replace(anchor,'if(rock){float charcoal=dot(tex,vec3(.2126,.7152,.0722));tex=mix(vec3(charcoal)*vec3(1.10,.99,.88),tex,.18);tex=pow(max(tex,vec3(.001)),vec3(.91));}');
  };
  material.customProgramCacheKey=()=>cache()+'|qa-volcanic-charcoal';material.needsUpdate=true;
 }
 return {newTextures:0,newGeometry:0,scope:'Neutral warm charcoal albedo; original normals and roughness; no added emission'};
}
