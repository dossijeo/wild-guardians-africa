import * as THREE from 'three';
import {canyonFrame} from '../../src/world/terrain.js';
export function prepareCanyonWater(world,geometry,cx,cz){
 if(world.state.biome!=='gran-canon')return;
 const position=geometry.attributes.position,data=new Float32Array(position.count*2),field=world.nav.field;
 for(let i=0;i<position.count;i++){const x=position.getX(i)+cx*48,z=position.getZ(i)+cz*48;data[i*2]=x-field.riverX(z);data[i*2+1]=canyonFrame(field,z).waterHalf;}
 geometry.setAttribute('qaBank',new THREE.BufferAttribute(data,2));
 const m=world.fluidMaterial;if(m.userData.qaBank)return;m.userData.qaBank=true;
 const compile=m.onBeforeCompile,key=m.customProgramCacheKey();
 m.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);
  shader.vertexShader='attribute vec2 qaBank;varying vec2 vQaBank;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvQaBank=qaBank;');
  const anchor='vec3 base=uInk0*.72;';if(!shader.fragmentShader.includes(anchor))throw Error('Water base anchor missing');
  shader.fragmentShader='varying vec2 vQaBank;\n'+shader.fragmentShader.replace(anchor,`float shallow=smoothstep(vQaBank.y-3.,vQaBank.y+.6,abs(vQaBank.x));
 vec3 base=mix(uInk0*.72,vec3(.22,.55,.47),shallow*.78);`);
 };m.customProgramCacheKey=()=>key+'|qa-canyon-bank-depth';m.needsUpdate=true;
}
