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
 shader.fragmentShader=`varying float vQaWetShore;
float waterHash(vec2 p);
float wetNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(waterHash(i),waterHash(i+vec2(1.,0.)),f.x),mix(waterHash(i+vec2(0.,1.)),waterHash(i+vec2(1.)),f.x),f.y);}
`+shader.fragmentShader.replace(anchor,`vec2 bankWorld=worldPatternPosition(worldP).xz;float detailFade=1.-smoothstep(.15,.7,length(fwidth(bankWorld)));vec3 base=uInk0*.72;if(vQaWetShore<3.5){float deposit=wetNoise(bankWorld*.31);float fine=wetNoise(bankWorld*1.4);fine=mix(.5,fine,detailFade);float width=mix(.35,3.5,smoothstep(.25,.80,deposit));float shallow=(1.-smoothstep(0.,width,vQaWetShore))*smoothstep(.18,.65,deposit);vec3 sediment=mix(vec3(.23,.37,.27),vec3(.42,.48,.28),fine);base=mix(uInk0*.72,sediment,shallow*.85);}`);
 };material.customProgramCacheKey=()=>key+'|qa-mangrove-sediment-gated-v1';material.needsUpdate=true;
}
