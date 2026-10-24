import * as THREE from 'three';
export function prepareMangroveBank(world,geometry,cx,cz,material=world.fluidMaterial){
 if(world.state.biome!=='manglares')return;
 const pos=geometry.attributes.position,data=new Float32Array(pos.count),field=world.nav.field;
 for(let i=0;i<pos.count;i++){const info=field.waterInfo(pos.getX(i)+cx*48,pos.getZ(i)+cz*48);data[i]=info.inside?info.shore:0;}
 geometry.setAttribute('qaWetShore',new THREE.BufferAttribute(data,1));
 if(material.userData.qaWetShore)return;material.userData.qaWetShore=true;
 const compile=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);
 shader.vertexShader='attribute float qaWetShore;varying float vQaWetShore;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvQaWetShore=qaWetShore;');
 const anchor='vec3 base=uInk0*.72;';if(!shader.fragmentShader.includes(anchor))throw Error('Mangrove water base anchor missing');
 shader.fragmentShader='varying float vQaWetShore;\n'+shader.fragmentShader.replace(anchor,`float shallow=1.-smoothstep(0.,2.2,vQaWetShore);vec3 base=mix(uInk0*.72,vec3(.20,.29,.15),shallow*.85);`);
 };material.customProgramCacheKey=()=>key+'|qa-mangrove-shallow-v1';material.needsUpdate=true;
}
