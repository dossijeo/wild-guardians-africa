export function applyMaterialStudy(world){
 const materials=new Set();world.scene.traverse(o=>{if(o.isMesh&&o.material?.userData?.paintUniforms&&o.material.userData.paintUniforms.uSurfaceLava.value<.5)materials.add(o.material)});
 for(const material of materials){const previous=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);material.onBeforeCompile=(shader,renderer)=>{
  previous(shader,renderer);
  const old='vec3 wn=normalize(vec3(.040*sin(worldPatternPosition(worldP).x*.43+worldPatternPosition(worldP).z*.18+uTime*.40),1.,.040*cos(worldPatternPosition(worldP).z*.37-worldPatternPosition(worldP).x*.16-uTime*.32)));';
  if(!shader.fragmentShader.includes(old))throw Error('Water ripple shader anchor missing');
  shader.fragmentShader=shader.fragmentShader.replace('float waterAA(',`vec2 qaWaterSlope(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f),du=6.*f*(1.-f);float a=waterHash(i),b=waterHash(i+vec2(1.,0.)),c=waterHash(i+vec2(0.,1.)),d=waterHash(i+vec2(1.,1.));return du*vec2(b-a+(a-b-c+d)*u.y,c-a+(a-b-c+d)*u.x);}
float waterAA(`).replace(old,`vec2 rippleP=worldPatternPosition(worldP).xz+uSeedOffset;
   vec2 slope=.17*qaWaterSlope(rippleP*1.05+vec2(uTime*.12,uTime*.07))+.065*qaWaterSlope(rippleP*2.7+vec2(-uTime*.16,uTime*.10));
   vec3 wn=normalize(vec3(slope.x,1.,slope.y));`)
   .replace('vec3 paint=paintedWater(wp,.001);vec3 base=mix(uInk1,paint,.42)*.72;','vec3 base=uInk0*.72;')
   .replace('environment4(reflect(-V,wn),.22)','environment4(reflect(-V,wn),.10)')
   .replace('clamp(f*.78,.03,.75)','clamp(f*.78,.18,.75)');
 };
 material.customProgramCacheKey=()=>key()+'|qa-water-surface-lean';material.needsUpdate=true;
 }
 return {materials:materials.size,newTextures:0,newGeometry:0,newDraws:0,lavaUnchanged:true,worldLocked:true};
}
