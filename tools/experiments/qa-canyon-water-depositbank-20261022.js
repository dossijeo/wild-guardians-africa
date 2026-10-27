import * as THREE from 'three';
import * as base from './qa-canyon-water-worldbank-20261022.js';
const colors={'sabana':[.36,.28,.12],'gran-rio':[.42,.38,.24],'manglares':[.20,.27,.14],'gran-canon':[.42,.27,.12]};
function sediment(world,material){
 const color=colors[world.state.biome];if(!color||!material?.transparent)return;
 const compile=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);shader.uniforms.qaSediment={value:new THREE.Vector3(...color)};
 shader.fragmentShader='uniform vec3 qaSediment;\n'+shader.fragmentShader;
 const anchor='vec3 base=uInk0*.72;';if(!shader.fragmentShader.includes(anchor))throw Error('Sediment base anchor missing');
 shader.fragmentShader=shader.fragmentShader.replace(anchor,`vec3 base=uInk0*.72;
 vec2 qsUV=(worldPatternPosition(worldP).xz-qaBedBounds.xy)/qaBedBounds.zw;
 qsUV=(qsUV*(qaBedSize-1.)+.5)/qaBedSize;
 vec2 qsEncoded=texture2D(qaBed,qsUV).rg;
 float qsHeight=qaBedRange.x+dot(qsEncoded,vec2(65280.,255.))/65535.*qaBedRange.y;
 float qsDepth=max(0.,worldP.y-qsHeight);
 float qsBand=1.-smoothstep(.12,.42,qsDepth);
 qsBand*=smoothstep(.38,.70,qaShoreNoise(worldPatternPosition(worldP).xz*.27));
 float qsGrain=qaShoreNoise(worldPatternPosition(worldP).xz*1.4);
 base=mix(base,qaSediment*mix(.8,1.2,qsGrain),qsBand*.75);
 `);
 };material.customProgramCacheKey=()=>key+'|sediment-water-v1';material.needsUpdate=true;
}
export function prepareCanyonWater(world,geometry,cx,cz,material=world.fluidMaterial){base.prepareCanyonWater(world,geometry,cx,cz,material);sediment(world,geometry.userData.qaMaterial);}
export function prepareAssetWater(world,mesh,cx,cz){base.prepareAssetWater(world,mesh,cx,cz);sediment(world,mesh.material);}
