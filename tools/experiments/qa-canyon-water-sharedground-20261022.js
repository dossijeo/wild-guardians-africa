import {patchCanyonSand} from '../../src/rendering/global-canyon-sand.js';
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
 const groundUniforms=world.biomeGround.uniforms(cx,cz,null,{mapped:false});
 const compile=m.onBeforeCompile,key=m.customProgramCacheKey();
 m.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);Object.assign(shader.uniforms,groundUniforms);
  shader.uniforms.uQaGravel={value:world.biomeGround.textures[0]};shader.uniforms.uQaBedNormal={value:world.biomeGround.layerTextures[0]};shader.uniforms.uQaBed={value:world.biomeGround.layerTextures[1]};shader.uniforms.uQaBedSeed={value:new THREE.Vector2(hashCell(field.seed,0,1,417)/4294967296,hashCell(field.seed,1,0,417)/4294967296)};
  shader.vertexShader='attribute vec2 qaBank;varying vec2 vQaBank;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvQaBank=qaBank;');
  const anchor='vec3 base=uInk0*.72;';if(!shader.fragmentShader.includes(anchor))throw Error('Water base anchor missing');
  shader.fragmentShader=toonFunctions.slice(0,toonFunctions.indexOf('vec3 toLinear4'))+'varying vec2 vQaBank;uniform sampler2D uQaBed,uQaBedNormal,uQaGravel;uniform vec2 uQaBedSeed;\n'+shader.fragmentShader.replace(anchor,`float bedDepth=max(0.,.92-1.05*smoothstep(1.7,vQaBank.y+.6,abs(vQaBank.x)));
 vec3 bed=vec3(.5),bedN=vec3(0.,1.,0.);float bedRough=1.,bedWet=0.;
 groundMaterial417(worldP-vec3(0.,bedDepth,0.),vec3(0.,1.,0.),bed,bedN,bedRough,bedWet);
 float bedVisibility=exp(-bedDepth*3.4/max(abs(V.y),.3));
 vec3 base=uInk0*.72;`);

  const lighting='lit=mix(lit,reflection*.75,';if(!shader.fragmentShader.includes(lighting))throw Error('Water reflection anchor missing');
  shader.fragmentShader=shader.fragmentShader.replace(lighting,` vec3 bedAlbedo=toLinear4(bed);
 vec3 bedSun=mix(vec3(3.65,3.30,2.78),vec3(.22,.36,.66)*uNightLight,uNight);
 vec3 bedAmbient=mix(vec3(.55,.63,.67),vec3(.095,.17,.32)*uNightLight,uNight);
 vec3 bedLit=brdf4(bedN,V,uLightDir,bedAlbedo,max(.86,bedRough),0.)*bedSun*visibility*exp(-bedDepth*1.2)+bedAlbedo*bedAmbient*materialAO410*(.76+.24*clamp(bedN.y,0.,1.));
 lit=mix(lit,bedLit,bedVisibility*.92);
 `+lighting);
  const sentinel='float biomeAO=nativeContact4(vToonWorld)*materialAO410;';
  let ground=patchCanyonSand(groundMaterialFunctions+sentinel,true,true);
  ground=ground.slice(0,ground.lastIndexOf('biomeSpec*='));
  shader.fragmentShader=shader.fragmentShader.replace('vec3 nativeFluid4(','const float uBiome=4.;const float uGroundDetail=1.;\n'+ground+'\nvec3 nativeFluid4(');
 };m.customProgramCacheKey=()=>key+'|qa-canyon-bank-sharedground';m.needsUpdate=true;
}
