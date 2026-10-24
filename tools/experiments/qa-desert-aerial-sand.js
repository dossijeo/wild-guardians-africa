import * as THREE from 'three';
// QA only: irregular CC0 sand ripples, preserving the existing warm terrain paint.
export async function applyMaterialStudy(world,options={}){
 if(world.state.biome!=='desierto')throw Error('Desert only');
 const retired=[];
 for(const [index,name] of (options.normalOnly?[[1,'nor_gl']]:[[0,'Diffuse'],[1,'nor_gl']])){
  const image=new Image();image.src='/docs/qa/global-visual-lab/desert-aerial-sand/'+name+'.png';await image.decode();
  const previous=world.biomeGround.textures[index],replacement=previous.clone();replacement.source=new THREE.Source(image);replacement.needsUpdate=true;world.biomeGround.textures[index]=replacement;retired.push(previous);
 }
 Object.assign(world.biomeGround.tile,{scale:1/30,normalBoost:1,relief:0,jitter:0});
 const seen=new WeakSet();let bound=0;
 function bind(material){
  if(seen.has(material)||material.userData.groundBiome!=='desert'||!material.userData.biomeGround)return;
  seen.add(material);bound++;const uniforms=material.userData.biomeGround;for(const [key,index] of [['uGroundDetailMap',0],['uGroundNormal',1],['uLayerSandBase',0],['uLayerSandNormal',1]])if(uniforms[key])uniforms[key].value=world.biomeGround.textures[index];material.userData.biomeGround.uGroundParams.value.x=1/30;material.userData.biomeGround.uGroundParams.value.z=1;material.userData.biomeGround.uGroundParams.value.w=0;
  const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);
   const edits=[
    ...(options.normalOnly?[["tile=textureGrad(uGroundDetailMap,uv,du,dv).rgb;","if(!desert)tile=textureGrad(uGroundDetailMap,uv,du,dv).rgb;"]]:[]),
    ['float needDetail=(desert||canyon)?grainFade:fineFade;','float needDetail=desert?(1.-smoothstep(.15,.65,pixelSpan)):canyon?grainFade:fineFade;'],
    ['rough=.98;normalAmount=.010*up;','rough=.98;normalAmount=.65*up*(1.-wear*.85);'],
    ['mix(.60,1.,uGroundDetail)*fineFade;','mix(.60,1.,uGroundDetail)*(desert?needDetail:fineFade);'],
    ['N=normalize(baseNormal-slope*normalAmount);',`N=normalize(baseNormal-slope*normalAmount);
     if(desert){vec3 T=normalize(vec3(.8,0.,.6)-Ng*dot(Ng,vec3(.8,0.,.6)));vec3 B=normalize(cross(Ng,T));vec3 mapN=tileN*2.-1.;N=normalize(T*mapN.x*normalAmount+B*mapN.y*normalAmount+Ng*max(mapN.z,.08));}`]
   ];
   for(const [from,to] of edits){if(!shader.fragmentShader.includes(from))throw Error('Sand anchor missing: '+from);shader.fragmentShader=shader.fragmentShader.replace(from,to);}
  };material.customProgramCacheKey=()=>cache()+'|qa-desert-aerial-sand|'+Boolean(options.normalOnly);material.needsUpdate=true;
 }
 world.scene.traverse(o=>{for(const material of [].concat(o.material??[]))bind(material)});
 const register=world.toon.material;world.toon.material=function(material){const result=register.call(this,material);bind(material);return result;};
 for(const texture of retired)texture.dispose();
 return {bound,scale:1/30,normalStrength:.65,replacementTextureObjects:retired.length,netTextureObjects:0,newGeometry:0,source:'Poly Haven aerial_beach_01, Rob Tuytel, CC0'};
}
