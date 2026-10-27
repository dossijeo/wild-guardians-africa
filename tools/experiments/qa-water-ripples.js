export function applyMaterialStudy(world){
 const materials=new Set();world.scene.traverse(o=>{if(o.isMesh&&o.material?.userData?.paintUniforms&&o.material.userData.paintUniforms.uSurfaceLava.value<.5)materials.add(o.material)});
 for(const material of materials){const previous=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);material.onBeforeCompile=(shader,renderer)=>{
  previous(shader,renderer);
  const old='vec3 wn=normalize(vec3(.040*sin(worldPatternPosition(worldP).x*.43+worldPatternPosition(worldP).z*.18+uTime*.40),1.,.040*cos(worldPatternPosition(worldP).z*.37-worldPatternPosition(worldP).x*.16-uTime*.32)));';
  if(!shader.fragmentShader.includes(old))throw Error('Water ripple shader anchor missing');
  shader.fragmentShader=shader.fragmentShader.replace(old,`vec2 rippleP=worldPatternPosition(worldP).xz;
   vec3 wn=normalize(vec3(.075*sin(rippleP.x*1.9+rippleP.y*.7+uTime*1.1)+.035*sin(rippleP.y*3.8-rippleP.x*1.3-uTime*.8),1.,.065*cos(rippleP.y*1.7-rippleP.x*.9-uTime*.9)+.025*cos(rippleP.x*4.2+rippleP.y*2.3+uTime*.7)));`)
   .replace('vec3 base=mix(uInk1,paint,.42)*.72;','vec3 base=mix(uInk1,paint,.12)*.72;')
   .replace('clamp(f*.78,.03,.75)','clamp(f*.78,.10,.75)');
 };
 material.customProgramCacheKey=()=>key()+'|qa-water-ripples';material.needsUpdate=true;
 }
 return {materials:materials.size,newTextures:0,newGeometry:0,newDraws:0,lavaUnchanged:true,worldLocked:true};
}
