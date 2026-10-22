import * as THREE from 'three';
import {canyonFrame} from '../../src/world/terrain.js';
import {toonFunctions} from '../../src/rendering/african-toon-source.js';
export function prepareCanyonWater(world,geometry,cx,cz,material=world.fluidMaterial){
 if(world.state.biome!=='gran-canon')return;
 const p=geometry.attributes.position,data=new Float32Array(p.count*2),field=world.nav.field;
 for(let i=0;i<p.count;i++){const x=p.getX(i)+cx*48,z=p.getZ(i)+cz*48;data[i*2]=x-field.riverX(z);data[i*2+1]=canyonFrame(field,z).waterHalf;}
 geometry.setAttribute('qaBank',new THREE.BufferAttribute(data,2));
 if(material.userData.qaTransparentBank)return;material.userData.qaTransparentBank=true;
 material.transparent=true;material.depthWrite=false;material.forceSinglePass=true;
 const compile=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);
 shader.vertexShader='attribute vec2 qaBank;varying vec2 vQaBank;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvQaBank=qaBank;');
 shader.fragmentShader=toonFunctions.slice(0,toonFunctions.indexOf('vec3 toLinear4'))+'varying vec2 vQaBank;\n'+shader.fragmentShader;
 const anchor='#include <opaque_fragment>';if(!shader.fragmentShader.includes(anchor))throw Error('Transparent bank anchor missing');
 shader.fragmentShader=shader.fragmentShader.replace(anchor,`float qaDepth=max(0.,.92-1.05*smoothstep(1.7,vQaBank.y+.6,abs(vQaBank.x)));
 vec3 qaWP=worldPatternPosition(vPaintWorld);
 float qaWidth=mix(.30,.75,materialNoise(vec3(qaWP.x*.38,0.,qaWP.z*.38)));
 diffuseColor.a*=smoothstep(0.,qaWidth,qaDepth);
 `+anchor);
 };material.customProgramCacheKey=()=>key+'|qa-transparent-bank';material.needsUpdate=true;
}
