// QA only: align daytime ground fill with the existing per-biome shade palette
// used by props. Keep direct light, night light, texture and normals unchanged.
export function applyGroundShadeCoherence(world){
 const shade='vec3('+world.toon.artUniforms.uArtShade.value.toArray().map(v=>v.toFixed(6)).join(',')+')';
 const materials=new Set(world.terrainMeshes.map(m=>m.material));
 for(const material of materials){
  const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
   compile(shader,renderer);
   const mapped='vec3 biomeAmbient=mix(vec3(.55,.63,.67),';
   const legacy='vec3 ambient=mix(groundFill,skyFill,clamp(N.y*.5+.5,0.,1.));';
   if(!shader.fragmentShader.includes(legacy))throw Error('Legacy ambient anchor missing');
   shader.fragmentShader=shader.fragmentShader.replace(mapped,'vec3 biomeAmbient=mix('+shade+',').replace(legacy,legacy+'\n ambient=mix('+shade+',ambient,uNight);');
  };
  material.customProgramCacheKey=()=>cache()+'|qa-ground-shade-coherence|'+shade;material.needsUpdate=true;
 }
 return {materials:materials.size,newTextures:0,newGeometry:0,nightUnchanged:true,fill:'existing biome prop shade palette'};
}
