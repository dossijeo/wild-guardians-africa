import * as THREE from 'three';
export async function applyMaterialStudy(world){
 if(world.state.biome!=='gran-canon')return {control:true};
 const path='/assets/7d387e01cad601ce49c35d9d9161f7f8f097de0e32e60f8f2108ae1787854ccf.jpg';
 const map=(await world.assets.texture(path,false)).clone();map.wrapS=map.wrapT=THREE.RepeatWrapping;map.minFilter=THREE.LinearMipmapLinearFilter;map.anisotropy=8;map.needsUpdate=true;
 const materials=[...new Set(world.terrainMeshes.map(m=>m.material))];let owners=materials.length;
 for(const material of materials){
  let disposed=false;material.addEventListener('dispose',()=>{if(!disposed){disposed=true;if(--owners===0)map.dispose();}});
  const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
   compile(shader,renderer);shader.uniforms.uCliffRock={value:map};shader.fragmentShader='uniform sampler2D uCliffRock;\n'+shader.fragmentShader;
   const anchor='original=mix(original,stone,smoothstep(1.4,4.,h)*.90);';
   if(!shader.fragmentShader.includes(anchor))throw Error('Canyon rock albedo anchor missing');
   shader.fragmentShader=shader.fragmentShader.replace(anchor,anchor+`
    float rockWall=(1.-canyonFlat)*smoothstep(1.4,4.,h);
    if(rockWall>.001){
     vec3 rockP=worldPatternPosition(worldP);
     vec3 a=texture(uCliffRock,rockP.zy*vec2(.22,.38)).rgb;
     vec3 b=texture(uCliffRock,rockP.xy*vec2(.22,.38)).rgb;
     float weight=abs(Ng.x)/max(abs(Ng.x)+abs(Ng.z),.001);
     float rockLum=dot(mix(b,a,weight),vec3(.2126,.7152,.0722));
     original*=1.+clamp((rockLum-.28)*1.2,-.24,.16)*rockWall;
    }
   `);
  };
  material.customProgramCacheKey=()=>cache()+'|qa-canyon-rock-texture';material.needsUpdate=true;
 }
 return {newTextures:1,newGeometry:0,source:path,scope:'Existing Rock035 albedo used as bounded grayscale wall modulation; original bands, normals and silhouettes retained',limitations:'Resident materials only; no streaming binding'};
}
