import * as THREE from 'three';
export async function applyMaterialStudy(world,{normals=true,softBands=false}={}){
 if(world.state.biome!=='gran-canon')return {control:true};
 const path='/assets/visual-lab/cliff_side-Diffuse.jpg';
 const map=(await world.assets.texture(path,false)).clone();map.wrapS=map.wrapT=THREE.RepeatWrapping;map.minFilter=THREE.LinearMipmapLinearFilter;map.anisotropy=8;map.needsUpdate=true;
 const normalMap=normals?(await world.assets.texture('/assets/visual-lab/cliff_side-nor_gl.png',false)).clone():null;if(normalMap){normalMap.wrapS=normalMap.wrapT=THREE.RepeatWrapping;normalMap.minFilter=THREE.LinearMipmapLinearFilter;normalMap.anisotropy=8;normalMap.needsUpdate=true;}
 const getMaterials=()=>[...new Set([...world.terrainMeshes,...(world.horizon?.group?.children??[]).filter(m=>m.userData.nativeHorizon==='terrain')].map(m=>m.material))];const seen=new WeakSet(),programs=new WeakMap();let patched=0,enabled=true;
 const bind=()=>{for(const material of getMaterials()){if(seen.has(material))continue;seen.add(material);patched++;

  const before=[material.onBeforeCompile,material.customProgramCacheKey];
  const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
   compile(shader,renderer);shader.uniforms.uCliffRock={value:map};if(normals)shader.uniforms.uCliffNormal={value:normalMap};shader.fragmentShader='uniform sampler2D uCliffRock,uCliffNormal;\n'+shader.fragmentShader;
   if(softBands){const bands='pale*.72+thin*.32';if(!shader.fragmentShader.includes(bands))throw Error('Canyon band anchor missing');shader.fragmentShader=shader.fragmentShader.replaceAll(bands,'pale*.24+thin*.10');}
   const anchor='original=mix(original,stone,smoothstep(1.4,4.,h)*.90);';
   if(!shader.fragmentShader.includes(anchor))throw Error('Canyon rock albedo anchor missing');
   shader.fragmentShader=shader.fragmentShader.replace(anchor,anchor+`
    float rockWall=(1.-canyonFlat)*smoothstep(1.4,4.,h);
    if(rockWall>.001){
     vec3 rockP=worldPatternPosition(worldP);
     bool xAxis=abs(Ng.x)>abs(Ng.z);
     vec2 rockUV=xAxis?vec2(rockP.z*sign(Ng.x),-rockP.y):vec2(rockP.x*sign(Ng.z),rockP.y);
     float rockLum=dot(texture(uCliffRock,rockUV*.125).rgb,vec3(.2126,.7152,.0722));
     vec3 rockColor=original*clamp(rockLum*2.8+.25,.32,1.35);
     original=mix(original,rockColor,rockWall*.85);
    }
   `);
   if(normals){const normalAnchor='N=sampleTurfN410(Ng,mapN,uGroundParams.z*uGroundMicro*amount*normalFade);';
   if(!shader.fragmentShader.includes(normalAnchor))throw Error('Canyon rock normal anchor missing');
   shader.fragmentShader=shader.fragmentShader.replace(normalAnchor,normalAnchor+`
    if(canyon){
     float wallMask=(1.-canyonFlat)*smoothstep(1.4,4.,worldP.y-3.28);
     if(wallMask>.001){
      vec3 p=worldPatternPosition(worldP);
      bool xAxis=abs(Ng.x)>abs(Ng.z);
      vec2 rockUV=xAxis?vec2(p.z*sign(Ng.x),-p.y):vec2(p.x*sign(Ng.z),p.y);
      vec3 n=texture(uCliffNormal,rockUV*.125).rgb*2.-1.;
      vec3 slope=(xAxis?vec3(0.,-n.y,n.x*sign(Ng.x)):vec3(n.x*sign(Ng.z),n.y,0.))/max(n.z,.3);
      slope-=Ng*dot(slope,Ng);N=normalize(N+slope*.45*wallMask*normalFade);
     }
    }
   `);
   }
  };
  material.customProgramCacheKey=()=>cache()+'|qa-canyon-dominant|normals='+normals+'|softBands='+softBands;material.needsUpdate=true;
  programs.set(material,[before,[material.onBeforeCompile,material.customProgramCacheKey]]);
  if(!enabled)[material.onBeforeCompile,material.customProgramCacheKey]=before;
 }
 };bind();
 world.qaCliffSetEnabled=(value)=>{enabled=!!value;bind();for(const m of getMaterials()){[m.onBeforeCompile,m.customProgramCacheKey]=programs.get(m)[enabled?1:0];m.needsUpdate=true;}};
 const draw=world.drawWorldFrame;world.drawWorldFrame=function(...args){bind();return draw.apply(this,args)};
 const dispose=world.dispose;let released=false;world.dispose=function(...args){try{return dispose.apply(this,args)}finally{if(!released){released=true;map.dispose();normalMap?.dispose();}}};
 world.qaCliffBinding=()=>({patched,resident:getMaterials().length,allBound:getMaterials().every(m=>seen.has(m))});
 return {newTextures:normals?2:1,newGeometry:0,source:path,normals,softBands,scope:'Poly Haven Cliff Side grayscale modulation and normals, 8m repeat, dominant axis; warm base palette and original silhouettes retained',limitations:'QA draw hook binds new terrain and horizon materials; shared maps released at world disposal'};
}
