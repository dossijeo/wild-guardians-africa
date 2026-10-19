// QA-only: reduce daytime fill under existing projected shadows.
export function applyGroundShadeCoherence(world){
 const biome=world.toon.uniforms.uBiome.value;
 if(biome===3||biome===5)return {control:true,biome};
 const shade='vec3('+world.toon.artUniforms.uArtShade.value.toArray().map(v=>v.toFixed(6)).join(',')+')';
 const materials=new Set(world.terrainMeshes.map(m=>m.material));
 for(const material of materials){
  const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
   compile(shader,renderer);
   const mapped='vec3 biomeAmbient=mix(vec3(.55,.63,.67),vec3(.095,.17,.32)*uNightLight,uNight);';
   const legacy='vec3 ambient=mix(groundFill,skyFill,clamp(N.y*.5+.5,0.,1.));';
   if(!shader.fragmentShader.includes(legacy))throw Error('Legacy ambient anchor missing');
   shader.fragmentShader=shader.fragmentShader.replace(mapped,mapped+'\n biomeAmbient=mix(biomeAmbient,'+shade+',smoothstep(0.,1.,clamp((1.-groundVisibility)/.93,0.,1.))*(1.-uNight));').replace(legacy,legacy+'\n ambient=mix(ambient,'+shade+',smoothstep(0.,1.,clamp((1.-visibility)/.93,0.,1.))*(1.-uNight));');
  };
  material.customProgramCacheKey=()=>cache()+'|qa-ground-shadow-fill|'+shade;material.needsUpdate=true;
 }
 return {materials:materials.size,newTextures:0,newGeometry:0,nightUnchanged:true,sunUnchanged:true};
}
