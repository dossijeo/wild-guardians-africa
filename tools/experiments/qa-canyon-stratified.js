import * as THREE from 'three';
export async function applyMaterialStudy(world){
 if(world.state.biome!=='gran-canon')return {control:true};
 const path='/assets/visual-lab/cliff_side-Diffuse.jpg';
 const map=(await world.assets.texture(path,false)).clone();map.wrapS=map.wrapT=THREE.RepeatWrapping;map.minFilter=THREE.LinearMipmapLinearFilter;map.anisotropy=8;map.needsUpdate=true;
 const normalMap=(await world.assets.texture('/assets/visual-lab/cliff_side-nor_gl.png',false)).clone();normalMap.wrapS=normalMap.wrapT=THREE.RepeatWrapping;normalMap.minFilter=THREE.LinearMipmapLinearFilter;normalMap.anisotropy=8;normalMap.needsUpdate=true;
 const materials=[...new Set(world.terrainMeshes.map(m=>m.material))];let owners=materials.length;
 for(const material of materials){
  let disposed=false;material.addEventListener('dispose',()=>{if(!disposed){disposed=true;if(--owners===0){map.dispose();normalMap.dispose();}}});
  const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
   compile(shader,renderer);shader.uniforms.uCliffRock={value:map};shader.uniforms.uCliffNormal={value:normalMap};shader.fragmentShader='uniform sampler2D uCliffRock,uCliffNormal;\n'+shader.fragmentShader;
   const anchor='original=mix(original,stone,smoothstep(1.4,4.,h)*.90);';
   if(!shader.fragmentShader.includes(anchor))throw Error('Canyon rock albedo anchor missing');
   shader.fragmentShader=shader.fragmentShader.replace(anchor,anchor+`
    float rockWall=(1.-canyonFlat)*smoothstep(1.4,4.,h);
    if(rockWall>.001){
     vec3 rockP=worldPatternPosition(worldP);
     vec3 a=texture(uCliffRock,vec2(rockP.z*sign(Ng.x),-rockP.y)*vec2(.125,.125)).rgb;
     vec3 b=texture(uCliffRock,vec2(rockP.x*sign(Ng.z),rockP.y)*vec2(.125,.125)).rgb;
     float weight=abs(Ng.x)/max(abs(Ng.x)+abs(Ng.z),.001);
     float rockLum=dot(mix(b,a,weight),vec3(.2126,.7152,.0722));
     vec3 rockColor=original*clamp(rockLum*2.8+.25,.32,1.35);
     original=mix(original,rockColor,rockWall*.85);
    }
   `);
   const normalAnchor='N=sampleTurfN410(Ng,mapN,uGroundParams.z*uGroundMicro*amount*normalFade);';
   if(!shader.fragmentShader.includes(normalAnchor))throw Error('Canyon rock normal anchor missing');
   shader.fragmentShader=shader.fragmentShader.replace(normalAnchor,normalAnchor+`
    if(canyon){
     float wallMask=(1.-canyonFlat)*smoothstep(1.4,4.,worldP.y-3.28);
     if(wallMask>.001){
      vec3 p=worldPatternPosition(worldP);
      vec3 a=texture(uCliffNormal,vec2(p.z*sign(Ng.x),-p.y)*vec2(.125,.125)).rgb*2.-1.;
      vec3 b=texture(uCliffNormal,vec2(p.x*sign(Ng.z),p.y)*vec2(.125,.125)).rgb*2.-1.;
      float weight=abs(Ng.x)/max(abs(Ng.x)+abs(Ng.z),.001);
      vec3 slope=mix(vec3(b.x*sign(Ng.z),b.y,0.)/max(b.z,.3),vec3(0.,-a.y,a.x*sign(Ng.x))/max(a.z,.3),weight);
      slope-=Ng*dot(slope,Ng);N=normalize(N+slope*.45*wallMask*normalFade);
     }
    }
   `);
  };
  material.customProgramCacheKey=()=>cache()+'|qa-canyon-stratified';material.needsUpdate=true;
 }
 return {newTextures:2,newGeometry:0,source:path,scope:'Poly Haven Cliff Side grayscale modulation and normals, 8m repeat; warm base palette and original silhouettes retained',limitations:'Resident materials only; no streaming binding'};
}
