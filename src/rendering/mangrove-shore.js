import * as THREE from 'three';
export function prepareMangroveBank(world,geometry,cx,cz,material=world.fluidMaterial,preparedShore=null){
 if(world.state.biome!=='manglares'||!mangroveShoreEnabled())return;
 const pos=geometry.attributes.position,data=preparedShore??new Float32Array(pos.count),field=world.nav.field;
 if(data.length!==pos.count)throw Error('Invalid prepared water shore');
 if(!preparedShore)for(let i=0;i<pos.count;i++){const info=field.waterInfo(pos.getX(i)+cx*48,pos.getZ(i)+cz*48);data[i]=info.inside?info.shore:0;}
 geometry.setAttribute('wetShore',new THREE.BufferAttribute(data,1));
 if(material.userData.wetShore)return;material.userData.wetShore=true;
 const compile=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);
 shader.vertexShader='attribute float wetShore;varying float vWetShore;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWetShore=wetShore;');
 const anchor='vec3 base=uInk0*.72;';if(!shader.fragmentShader.includes(anchor))throw Error('Mangrove water base anchor missing');
 shader.fragmentShader=`varying float vWetShore;
float waterHash(vec2 p);
float wetNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(waterHash(i),waterHash(i+vec2(1.,0.)),f.x),mix(waterHash(i+vec2(0.,1.)),waterHash(i+vec2(1.)),f.x),f.y);}
`+shader.fragmentShader.replace(anchor,`vec2 bankWorld=worldPatternPosition(worldP).xz;float detailFade=1.-smoothstep(.15,.7,length(fwidth(bankWorld)));vec3 base=uInk0*.72;if(vWetShore<3.5){float deposit=wetNoise(bankWorld*.31);float fine=wetNoise(bankWorld*1.4);fine=mix(.5,fine,detailFade);float width=mix(.35,3.5,smoothstep(.25,.80,deposit));float shallow=(1.-smoothstep(0.,width,vWetShore))*smoothstep(.18,.65,deposit);vec3 sediment=mix(vec3(.23,.37,.27),vec3(.42,.48,.28),fine);base=mix(uInk0*.72,sediment,shallow*.85);}`);
 };material.customProgramCacheKey=()=>key+'|mangrove-shore-v1';material.needsUpdate=true;
}

export function mangroveShoreEnabled(search=globalThis.location?.search??''){const q=new URLSearchParams(search);return q.get('visualLab')==='global-lighting'&&q.get('mangroveSubstrate')==='full'&&q.get('mangroveShore')==='sediment';}
export function createShoreMask(field,bo){const data=new Uint8Array(35*35);for(let z=0;z<35;z++)for(let x=0;x<35;x++)data[z*35+x]=Math.round(Math.min(1,field.waterInfo(bo.minX+(x-1)*1.5,bo.minZ+(z-1)*1.5).shore/8)*255);const texture=new THREE.DataTexture(data,35,35,THREE.RedFormat);texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.unpackAlignment=1;texture.needsUpdate=true;return texture;}
