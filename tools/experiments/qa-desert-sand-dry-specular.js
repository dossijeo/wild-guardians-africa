import {applyMaterialStudy as applySand} from './qa-desert-aerial-sand-normal-only.js';
// QA only: preserve ripple normals and diffuse lighting, but avoid a broad
// stylized specular band on nearly fully rough sand. Other materials untouched.
export async function applyMaterialStudy(world){
 const audit=await applySand(world),seen=new WeakSet();
 function bind(material){
  if(seen.has(material)||material.userData.groundBiome!=='desert'||!material.userData.biomeGround)return;
  seen.add(material);const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=function(shader,renderer){
   compile.call(this,shader,renderer);
   const from='float specBand=smoothstep(.62,.88,spec)*(1.-rough*.40);';
   if(!shader.fragmentShader.includes(from))throw Error('Dry sand specular anchor missing');
   shader.fragmentShader=shader.fragmentShader.replace(from,'float specBand=smoothstep(.62,.88,spec)*(1.-rough)*(1.-rough);');
  };material.customProgramCacheKey=()=>cache()+'|dry-sand-specular';material.needsUpdate=true;
 }
 world.scene.traverse(o=>{for(const m of [].concat(o.material??[]))bind(m)});
 const register=world.toon.material;world.toon.material=function(m){const result=register.call(this,m);bind(m);return result};
 return {...audit,specular:'squared smoothness, terrain only',extraTextures:0,extraPasses:0};
}
