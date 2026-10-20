// QA artistic shadow palette; no claim of physical indirect illumination.
export function applyMaterialStudy(world){
 if(world.state.biome!=='gran-canon')throw Error('Canyon only');
 const old=[.22,.27,.36],warm=[.38,.255,.18],l=[.2126,.7152,.0722];
 const lum=a=>a.reduce((s,v,i)=>s+v*l[i],0),scale=lum(old)/lum(warm),color=warm.map(v=>v*scale);
 const anchor='vec3 biomeDirect=brdf4(toonN,toonV,uLightDir,groundAlbedo,groundRough,0.)*biomeSun*groundVisibility;';
 const materials=new Set(world.terrainMeshes.map(m=>m.material));
 for(const material of materials){const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
 material.onBeforeCompile=(shader,renderer)=>{compile(shader,renderer);if(!shader.fragmentShader.includes(anchor))throw Error('Mapped illumination anchor missing');shader.fragmentShader=shader.fragmentShader.replace(anchor,`
 float qaWarmWeight=smoothstep(0.,1.,clamp((1.-groundVisibility)/.93,0.,1.))*(1.-uNight)*smoothstep(.74,.96,toonN.y);
 biomeAmbient=mix(biomeAmbient,vec3(${color.join(',')}),qaWarmWeight);
 `+anchor);};material.customProgramCacheKey=()=>cache()+'|qa-canyon-warm-floor';material.needsUpdate=true;}
 return {old,warm:color,oldLuminance:lum(old),warmLuminance:lum(color),materials:materials.size,newTextures:0,newGeometry:0};
}
