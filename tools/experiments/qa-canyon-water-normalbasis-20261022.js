import {groundMaterialFunctions} from '../../src/rendering/biome-material-source.js';
import {toonFunctions} from '../../src/rendering/african-toon-source.js';
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
  shader.uniforms.uQaGravel={value:world.biomeGround.textures[0]};shader.uniforms.uQaBedNormal={value:world.biomeGround.layerTextures[0]};shader.uniforms.uQaBed={value:world.biomeGround.layerTextures[1]};shader.uniforms.uQaBedSeed={value:new THREE.Vector2(hashCell(field.seed,0,1,417)/4294967296,hashCell(field.seed,1,0,417)/4294967296)};
  shader.vertexShader='attribute vec2 qaBank;varying vec2 vQaBank;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvQaBank=qaBank;');
  const anchor='vec3 base=uInk0*.72;';if(!shader.fragmentShader.includes(anchor))throw Error('Water base anchor missing');
  shader.fragmentShader=groundMaterialFunctions.slice(groundMaterialFunctions.indexOf('vec3 sampleTurfN410('),groundMaterialFunctions.indexOf('void groundMaterial417('))+toonFunctions.slice(0,toonFunctions.indexOf('vec3 toLinear4'))+'varying vec2 vQaBank;uniform sampler2D uQaBed,uQaBedNormal,uQaGravel;uniform vec2 uQaBedSeed;\n'+shader.fragmentShader.replace(anchor,`float bedDepth=max(0.,.92-1.05*smoothstep(1.7,vQaBank.y+.6,abs(vQaBank.x)));
 vec2 bedUV=mat2(.8,-.6,.6,.8)*worldPatternPosition(worldP).xz/30.+uQaBedSeed;
 vec3 wp=worldPatternPosition(worldP);
 float footprint=max(length(dFdx(wp)),length(dFdy(wp)));
 float deposit=mix(.55,smoothstep(.32,.62,materialNoise(vec3(wp.x*.10,0.,wp.z*.10))*.75+materialNoise(vec3(wp.x*.27,0.,wp.z*.27))*.25),mix(.35,1.,1.-smoothstep(.16,.65,footprint)));
 vec3 sand=texture2D(uQaBed,bedUV).rgb*vec3(1.,.83,.59);
 vec3 gravel=texture2D(uQaGravel,mat2(.8,-.6,.6,.8)*wp.xz*.08+uQaBedSeed).rgb;
 vec3 bed=mix(gravel,sand,deposit*.9);
 float bedVisibility=exp(-bedDepth*3.4/max(abs(V.y),.3));
 vec3 base=uInk0*.72;`);

  const lighting='lit=mix(lit,reflection*.75,';if(!shader.fragmentShader.includes(lighting))throw Error('Water reflection anchor missing');
  shader.fragmentShader=shader.fragmentShader.replace(lighting,`vec3 bn=texture2D(uQaBedNormal,bedUV).rgb*2.-1.;
 vec3 bedN=sampleTurfN410(vec3(0.,1.,0.),bn,.65);
 vec3 bedAlbedo=toLinear4(bed);
 vec3 bedSun=mix(vec3(3.65,3.30,2.78),vec3(.22,.36,.66)*uNightLight,uNight);
 vec3 bedAmbient=mix(vec3(.55,.63,.67),vec3(.095,.17,.32)*uNightLight,uNight);
 vec3 bedLit=brdf4(bedN,V,uLightDir,bedAlbedo,.98,0.)*bedSun*visibility*exp(-bedDepth*1.2)+bedAlbedo*bedAmbient;
 lit=mix(lit,bedLit,bedVisibility*.92);
 `+lighting);
 };m.customProgramCacheKey=()=>key+'|qa-canyon-bank-normalbasis';m.needsUpdate=true;
}
