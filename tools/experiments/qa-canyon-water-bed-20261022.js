import * as THREE from 'three';
import {canyonFrame,hashCell} from '../../src/world/terrain.js';
export function prepareCanyonWater(world,geometry,cx,cz,material=world.fluidMaterial){
 if(world.state.biome!=='gran-canon')return;
 const position=geometry.attributes.position,data=new Float32Array(position.count*2),field=world.nav.field;
 for(let i=0;i<position.count;i++){const x=position.getX(i)+cx*48,z=position.getZ(i)+cz*48;data[i*2]=x-field.riverX(z);data[i*2+1]=canyonFrame(field,z).waterHalf;}
 geometry.setAttribute('qaBank',new THREE.BufferAttribute(data,2));
 const m=material;if(m.userData.qaBank)return;m.userData.qaBank=true;
 const compile=m.onBeforeCompile,key=m.customProgramCacheKey();
 m.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);
  shader.uniforms.uQaBed={value:world.biomeGround.layerTextures[1]};shader.uniforms.uQaBedSeed={value:new THREE.Vector2(hashCell(field.seed,0,1,417)/4294967296,hashCell(field.seed,1,0,417)/4294967296)};
  shader.vertexShader='attribute vec2 qaBank;varying vec2 vQaBank;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvQaBank=qaBank;');
  const anchor='vec3 base=uInk0*.72;';if(!shader.fragmentShader.includes(anchor))throw Error('Water base anchor missing');
  shader.fragmentShader='varying vec2 vQaBank;uniform sampler2D uQaBed;uniform vec2 uQaBedSeed;\n'+shader.fragmentShader.replace(anchor,`float bedDepth=max(0.,.92-1.05*smoothstep(1.7,vQaBank.y+.6,abs(vQaBank.x)));
 vec2 bedUV=mat2(.8,-.6,.6,.8)*worldPatternPosition(worldP).xz/30.+uQaBedSeed;
 vec3 bed=texture2D(uQaBed,bedUV).rgb*vec3(1.,.83,.59);
 float bedVisibility=exp(-bedDepth*3.4/max(abs(V.y),.3));
 vec3 base=mix(uInk0*.72,bed*.72,bedVisibility*.92);`);

 };m.customProgramCacheKey=()=>key+'|qa-canyon-bank-bed';m.needsUpdate=true;
}
