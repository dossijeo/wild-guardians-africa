import * as THREE from 'three';
import {canyonFrame} from '../../src/world/terrain.js';
export function prepareCanyonWater(world,geometry,cx,cz,material=world.fluidMaterial){
 if(world.state.biome!=='gran-canon')return;
 const position=geometry.attributes.position,data=new Float32Array(position.count*2),field=world.nav.field;
 for(let i=0;i<position.count;i++){const x=position.getX(i)+cx*48,z=position.getZ(i)+cz*48;data[i*2]=x-field.riverX(z);data[i*2+1]=canyonFrame(field,z).waterHalf;}
 geometry.setAttribute('qaBank',new THREE.BufferAttribute(data,2));
 const m=material;if(m.userData.qaBank)return;m.userData.qaBank=true;
 const compile=m.onBeforeCompile,key=m.customProgramCacheKey();
 m.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);
  shader.vertexShader='attribute vec2 qaBank;varying vec2 vQaBank;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvQaBank=qaBank;');
  const anchor='vec3 base=uInk0*.72;';if(!shader.fragmentShader.includes(anchor))throw Error('Water base anchor missing');
  shader.fragmentShader='varying vec2 vQaBank;\n'+shader.fragmentShader.replace(anchor,`vec2 bankWorld=worldPatternPosition(worldP).xz;
 float bankWidth=5.0+1.1*sin(bankWorld.y*.19)+.55*sin(bankWorld.y*.53+bankWorld.x*.11);
 float bankDistance=max(0.,vQaBank.y-abs(vQaBank.x));
 float shallow=1.-smoothstep(.0,bankWidth,bankDistance);
 vec3 base=mix(uInk0*.72,vec3(.34,.62,.43),shallow*.94);`);
 };m.customProgramCacheKey=()=>key+'|qa-canyon-bank-structured';m.needsUpdate=true;
}
