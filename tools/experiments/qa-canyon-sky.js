// QA canyon ambient response: reduce upper-sky contribution on steep faces.
export function applyMaterialStudy(world){
 if(world.state.biome!=='gran-canon')return {control:true};
 for(const material of new Set(world.terrainMeshes.map(m=>m.material))){
  const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
   compile(shader,renderer);
   const anchor='(.76+.24*clamp(toonN.y,0.,1.))';
   if(!shader.fragmentShader.includes(anchor))throw Error('Canyon ambient anchor missing');
   shader.fragmentShader=shader.fragmentShader.replace(anchor,'mix(.38+.62*clamp(toonN.y,0.,1.),.76+.24*clamp(toonN.y,0.,1.),uNight)');
  };
  material.customProgramCacheKey=()=>cache()+'|qa-canyon-sky';material.needsUpdate=true;
 }
 return {newTextures:0,newGeometry:0,scope:'Daytime ambient sky contribution on steep Canyon terrain; direct sun, shadows, bands and night unchanged'};
}
