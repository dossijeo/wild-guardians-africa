import {applyMaterialStudy as applySand} from './qa-desert-aerial-sand.js';
export async function applyMaterialStudy(world,options={}){
 const audit=await applySand(world,options),seen=new WeakSet();
 function bind(material){
  if(seen.has(material)||material.userData.groundBiome!=='desert'||!material.userData.biomeGround)return;seen.add(material);
  const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);
   const anchor='float edge=max(1.-smoothstep(.10,.36,nv),smoothstep(.26,.58,length(fwidth(N))*2.0));';
   if(!shader.fragmentShader.includes(anchor))throw Error('Sand ink anchor missing');
   shader.fragmentShader='vec3 qaSandGeometricNormal;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('float groundRough,groundWet;','float groundRough,groundWet;qaSandGeometricNormal=toonN;').replace(anchor,'float edge=max(1.-smoothstep(.10,.36,nv),smoothstep(.26,.58,length(fwidth(qaSandGeometricNormal))*2.0));');
  };material.customProgramCacheKey=()=>cache()+'|macro-ink';material.needsUpdate=true;
 }
 world.scene.traverse(o=>{for(const material of [].concat(o.material??[]))bind(material)});
 const register=world.toon.material;world.toon.material=function(material){const result=register.call(this,material);bind(material);return result;};
 return {...audit,inkNormal:'geometric only'};
}
