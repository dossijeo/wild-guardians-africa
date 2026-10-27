// QA-only surface-light study. Keep painted bands at their original scale;
// replace the two broad wave-normal components with pond-sized wavelengths.
export function applyPondWaveNormal(world){
 const materials=new Set();world.scene.traverse(mesh=>{
  if(mesh.isMesh&&mesh.userData.nativeFluid==='asset'&&mesh.material?.userData.paintUniforms)materials.add(mesh.material);
 });
 if(!materials.size)throw Error('No resident asset-water materials');
 for(const material of materials){
  const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
   compile(shader,renderer);
   const a='.040*sin(worldPatternPosition(worldP).x*.43+worldPatternPosition(worldP).z*.18+uTime*.40)',b='.040*cos(worldPatternPosition(worldP).z*.37-worldPatternPosition(worldP).x*.16-uTime*.32)';
   if(!shader.fragmentShader.includes(a)||!shader.fragmentShader.includes(b))throw Error('Wave normal anchors missing');
   shader.fragmentShader=shader.fragmentShader.replace(a,'.14*sin(worldPatternPosition(worldP).x*3.1+worldPatternPosition(worldP).z*1.3+uTime*.72)').replace(b,'.11*cos(worldPatternPosition(worldP).z*2.7-worldPatternPosition(worldP).x*.9-uTime*.60)');
  };
  material.customProgramCacheKey=()=>cache()+'|qa-pond-wave-normal';material.needsUpdate=true;
 }
 return {materials:materials.size,paintScaleUnchanged:.55,newTextures:0,newGeometry:0,trigonometricComponents:[2,2],normalSlopeAmplitude:[.14,.11]};
}
