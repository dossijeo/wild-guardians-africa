// QA only: reuse the existing static contact atlas for a small direct-light
// attenuation as well as ambient occlusion. No new map or world data.
export function applyGroundContactIntegration(world){
 const materials=new Set(world.terrainMeshes.map(m=>m.material));
 for(const material of materials){
  const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
   compile(shader,renderer);
   const anchor='vec3 groundLit=nativeGroundLight4(';
   if(!shader.fragmentShader.includes(anchor))throw Error('Ground light anchor missing');
   shader.fragmentShader=shader.fragmentShader.replace(anchor,'groundVisibility*=mix(1.,nativeContact4(vToonWorld),.75);\n        '+anchor);
  };
  material.customProgramCacheKey=()=>cache()+'|qa-ground-contact-integration';material.needsUpdate=true;
 }
 return {materials:materials.size,contactBytes:world.contacts.texture.image.data.byteLength,newTextures:0,newGeometry:0,extraContactFetchPerGroundFragment:1,directContactMix:.75};
}
