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
  shader.fragmentShader=`varying vec2 vQaBank;
float waterHash(vec2 p);
float bankNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(waterHash(i),waterHash(i+vec2(1,0)),f.x),mix(waterHash(i+vec2(0,1)),waterHash(i+vec2(1,1)),f.x),f.y);}
`+shader.fragmentShader.replace(anchor,`vec2 bankWorld=worldPatternPosition(worldP).xz;
 float deposit=bankNoise(bankWorld*.65);
 float bankWidth=2.0+5.0*bankNoise(bankWorld*.13);
 float bankDistance=max(0.,vQaBank.y-abs(vQaBank.x));
 float shelf=bankWidth*(.2+.8*smoothstep(.28,.72,deposit));
 float shallow=1.-smoothstep(shelf-.45,shelf+.65,bankDistance);
 float detailFade=1.-smoothstep(.12,.65,length(fwidth(bankWorld)));
 float grains=bankNoise(bankWorld*3.5);
 float sediment=mix(.5,deposit*.45+grains*.55,detailFade);
 vec3 shallowColor=mix(vec3(.26,.28,.21),vec3(.63,.49,.30),smoothstep(.18,.83,sediment));
 vec3 base=mix(uInk0*.72,shallowColor,shallow*.94);`);
 };m.customProgramCacheKey=()=>key+'|qa-canyon-bank-granular';m.needsUpdate=true;
}
