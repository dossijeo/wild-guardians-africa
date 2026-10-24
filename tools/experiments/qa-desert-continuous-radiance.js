// QA only: test existing native ground radiance without the final toon reconstruction.
export function applyMaterialStudy(world){
 if(world.state.biome!=='desierto')throw Error('Desert only');
 const seen=new WeakSet();let bound=0;
 const anchor='outgoingLight=toLinear4(africanToon4(groundLit,groundAlbedo,toonN,toonV,uLightDir,groundReflection,groundRough,groundVisibility,0.,groundWet,0.,max(dot(toonN,toonV),0.),worldPatternPosition(vToonWorld)));';
 function bind(material){
  if(seen.has(material)||!material.userData.toonGround||material.userData.groundBiome!=='desert')return;
  seen.add(material);bound++;const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);if(!shader.fragmentShader.includes(anchor))throw Error('Desert radiance output anchor missing');shader.fragmentShader=shader.fragmentShader.replace(anchor,'outgoingLight=toLinear4(filmic4(groundLit));');};
  material.customProgramCacheKey=()=>cache()+'|qa-desert-continuous-radiance';material.needsUpdate=true;
 }
 world.scene.traverse(o=>{for(const m of [].concat(o.material??[]))bind(m)});
 const register=world.toon.material;world.toon.material=function(material){const result=register.call(this,material);bind(material);return result;};
 return {bound,newTextures:0,newGeometry:0,scope:'Desert ground and horizon; native BRDF, shadow, contact AO, day/night preserved; final toon reconstruction bypassed'};
}
