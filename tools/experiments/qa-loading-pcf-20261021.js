import * as THREE from 'three';
// QA only: one uniform switches kernels on exactly the same scene/program.
export function installLoadingPcf(d){
 const mode={value:0},materials=new Set();
 d.scene.traverse(mesh=>{for(const material of [mesh.material].flat().filter(Boolean)){
  if(materials.has(material)||!material.isMeshStandardMaterial)continue;materials.add(material);
  const compile=material.onBeforeCompile,key=material.customProgramCacheKey();
  material.onBeforeCompile=function(shader,renderer){
   compile.call(this,shader,renderer);
   shader.uniforms.uLoadingFourTap=mode;
   if(material===d.ground.material){
    // Transparent soil is intentionally not AfricanToon: it uses Three PCFSoft.
    let chunk=THREE.ShaderChunk.shadowmap_pars_fragment;
    const begin=chunk.indexOf('#elif defined( SHADOWMAP_TYPE_PCF_SOFT )'),finish=chunk.indexOf('#elif defined( SHADOWMAP_TYPE_VSM )',begin);
    if(begin<0||finish<begin)throw Error('Three soft PCF anchors missing');
    const branch=chunk.slice(begin,finish),body=branch.slice(branch.indexOf('\n')+1);
    const four=`if(uLoadingFourTap>.5){vec2 t=1./shadowMapSize;shadow=(texture2DCompare(shadowMap,shadowCoord.xy+vec2(-.5,-.5)*t,shadowCoord.z)+texture2DCompare(shadowMap,shadowCoord.xy+vec2(.5,-.5)*t,shadowCoord.z)+texture2DCompare(shadowMap,shadowCoord.xy+vec2(-.5,.5)*t,shadowCoord.z)+texture2DCompare(shadowMap,shadowCoord.xy+vec2(.5,.5)*t,shadowCoord.z))*.25;}else{${body}}`;
    chunk=chunk.slice(0,begin)+'#elif defined( SHADOWMAP_TYPE_PCF_SOFT )\n'+four+'\n'+chunk.slice(finish);
    shader.fragmentShader='uniform float uLoadingFourTap;\n'+shader.fragmentShader.replace('#include <shadowmap_pars_fragment>',chunk);return;
   }
   const start=shader.fragmentShader.indexOf(' {vec2 o=vec2'),end=shader.fragmentShader.indexOf(' // Fade the shadow map edges');
   if(start<0||end<start)throw Error('Native PCF anchors missing');
   const original=shader.fragmentShader.slice(start,end);
   const samples=original.match(/textureLod/g)?.length;if(samples!==9)throw Error('Expected nine native PCF taps');
   let four='';for(const x of [-.65,.65])for(const y of [-.65,.65])four+=`{vec2 o=vec2(${x.toFixed(2)},${y.toFixed(2)})*uNativeShadowTexel*1.15;v+=textureLod(uNativeShadowFiltered,vec3(p.xy+o,p.z+dot(slope,o)-bias),0.);}`;
   shader.fragmentShader='uniform float uLoadingFourTap;\n'+shader.fragmentShader.slice(0,start)+'if(uLoadingFourTap>.5){'+four+'v*=2.25;}else{'+original+'}\n'+shader.fragmentShader.slice(end);
   shader.uniforms.uLoadingFourTap=mode;
  };material.customProgramCacheKey=()=>key+'|qa-loading-pcf-ab';material.needsUpdate=true;
 }});
 return mode;
}
