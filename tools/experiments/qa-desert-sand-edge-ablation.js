import {applyMaterialStudy as applySand} from './qa-desert-aerial-sand-normal-only.js';
export async function applyMaterialStudy(world){
 const audit=await applySand(world),mode={value:0},seen=new WeakSet();
 function bind(material){
  if(seen.has(material)||material.userData.groundBiome!=='desert'||!material.userData.biomeGround)return;
  seen.add(material);const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=function(shader,renderer){
   compile.call(this,shader,renderer);shader.uniforms.uQaSandMode=mode;
   shader.fragmentShader='uniform float uQaSandMode;float qaSandWear;\n'+shader.fragmentShader;
   const edits=[
    ['float meso=ctx.g,wear=ctx.a*up;','float meso=ctx.g,wear=ctx.a*up;qaSandWear=wear;'],
    ['normalAmount=.65*up*(1.-wear*.85);','normalAmount=.65*up*(uQaSandMode<.5?(1.-wear*.85):uQaSandMode<1.5?1.:uQaSandMode<2.5?(1.-smoothstep(.02,.4,wear)):(1.-wear*.85));'],
    ['float metal,float nv,vec3 worldP){','float metal,float nv,vec3 worldP){if(uQaSandMode>2.5&&uQaSandMode<3.5){N=qaSandGeometricNormal;nv=max(dot(N,V),0.);}'],
    ['float specBand=smoothstep(.62,.88,spec)*(1.-rough*.40);','float specBand=smoothstep(.62,.88,spec)*(1.-rough*.40);if(uQaSandMode>4.5)specBand=0.;'],
    ['#include <dithering_fragment>','#include <dithering_fragment>\nif(uQaSandMode>3.5&&uQaSandMode<4.5)gl_FragColor=vec4(vec3(qaSandWear),1.);']
   ];
   for(const [a,b]of edits){if(!shader.fragmentShader.includes(a))throw Error('Sand ablation anchor missing: '+a);shader.fragmentShader=shader.fragmentShader.replace(a,b)}
  };material.customProgramCacheKey=()=>cache()+'|sand-edge-ablation';material.needsUpdate=true;
 }
 world.scene.traverse(o=>{for(const m of [].concat(o.material??[]))bind(m)});
 const register=world.toon.material;world.toon.material=function(m){const result=register.call(this,m);bind(m);return result};
 return {...audit,setMode(value){mode.value=value}};
}
