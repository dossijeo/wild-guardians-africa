// QA: retain albedo/roughness and native geometry; expose existing sand normals.
export function applyMaterialStudy(world){
 if(world.state.biome!=='desierto')return {control:true};
 const seen=new WeakSet();
 const patch=material=>{
  if(seen.has(material)||!material.userData.biomeGround||material.userData.biomeGround.uGroundMapped.value<.5)return;
  seen.add(material);const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
   compile.call(material,shader,renderer);
   const edits=[
    ['rough=.98;normalAmount=.010*up;','rough=.98;normalAmount=.10*up;'],
    ['float tileLum=dot(tile,vec3(.299,.587,.114));','if(desert&&needDetail<=.001&&uGroundMicro>.001)tileN=textureGrad(uGroundNormal,uv,du,dv).rgb;\n float tileLum=dot(tile,vec3(.299,.587,.114));'],
    ['mix(.60,1.,uGroundDetail)*fineFade;','mix(.60,1.,uGroundDetail)*(desert?(1.-smoothstep(.08,.45,pixelSpan)):fineFade);'],
    ['float microLight=clamp(dot(N,uLightDir)-dot(Ng,uLightDir),-.14,.14);',`if(desert){
      vec2 p=worldPatternPosition(worldP).xz,wind=vec2(.93,.3676),crossWind=vec2(-.3676,.93);
      float warp=dot(p,crossWind)*.8,phase=dot(p,wind)*8.8+sin(warp)*1.4+sin(dot(p,vec2(.27,.43)))*2.8;
      vec2 direction=wind*8.8+crossWind*(cos(warp)*1.12)+vec2(.27,.43)*cos(dot(p,vec2(.27,.43)))*2.8;
      float patchiness=.25+.75*smoothstep(.25,.8,meso);
      float rippleFade=(1.-smoothstep(.08,.22,pixelSpan))*up*(1.-wear)*patchiness;
      vec2 heightSlope=direction*(cos(phase)*.010+cos(phase*2.)*.002);
      vec3 ripple=vec3(heightSlope.x,0.,heightSlope.y);ripple-=Ng*dot(Ng,ripple);
      vec3 detailNormal=normalize(N-ripple*rippleFade);
      float detailLight=clamp(dot(detailNormal,uLightDir)-dot(baseNormal,uLightDir),-.16,.16);
      paint*=1.+detailLight*.8;
      N=baseNormal;
     }
     float microLight=clamp(dot(N,uLightDir)-dot(Ng,uLightDir),-.14,.14);`],
   ];
   for(const [from,to] of edits){if(!shader.fragmentShader.includes(from))throw Error('Desert normal shader anchor missing: '+from);shader.fragmentShader=shader.fragmentShader.replace(from,to);}
  };
  material.customProgramCacheKey=()=>cache()+'|qa-desert-ripples-soft';material.needsUpdate=true;
 };
 world.terrainMeshes.forEach(m=>patch(m.material));
 const register=world.toon.material;
 world.toon.material=function(material){const result=register.call(this,material);patch(material);return result;};
 return {rippleWavelength:Math.PI*2/8.8,normalAmount:.10,fade:[.08,.45],newTextures:0,newGeometry:0,extraNormalSample:'Only when legacy detail sampling has faded out; resident desert only'};
}
