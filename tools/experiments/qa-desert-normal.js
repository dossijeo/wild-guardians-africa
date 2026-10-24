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
    ['rough=.98;normalAmount=.010*up;','rough=.98;normalAmount=.28*up;'],
    ['float tileLum=dot(tile,vec3(.299,.587,.114));','if(desert&&needDetail<=.001&&uGroundMicro>.001)tileN=textureGrad(uGroundNormal,uv,du,dv).rgb;\n float tileLum=dot(tile,vec3(.299,.587,.114));'],
    ['mix(.60,1.,uGroundDetail)*fineFade;','mix(.60,1.,uGroundDetail)*(desert?(1.-smoothstep(.08,.45,pixelSpan)):fineFade);'],
   ];
   for(const [from,to] of edits){if(!shader.fragmentShader.includes(from))throw Error('Desert normal shader anchor missing: '+from);shader.fragmentShader=shader.fragmentShader.replace(from,to);}
  };
  material.customProgramCacheKey=()=>cache()+'|qa-desert-normal';material.needsUpdate=true;
 };
 world.terrainMeshes.forEach(m=>patch(m.material));
 const register=world.toon.material;
 world.toon.material=function(material){const result=register.call(this,material);patch(material);return result;};
 return {normalAmount:.28,fade:[.08,.45],newTextures:0,newGeometry:0,extraNormalSample:'Only when legacy detail sampling has faded out; resident desert only'};
}
