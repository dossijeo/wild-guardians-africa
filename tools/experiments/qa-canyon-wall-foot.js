// QA resident canyon material only; no geometry or authoritative-world edits.
export function applyMaterialStudy(world){
 if(world.state.biome!=='gran-canon')throw Error('Canyon only');
 const materials=new Set(world.terrainMeshes.map(m=>m.material));
 for(const material of materials){
  const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{compile(shader,renderer);
   const anchor='float rockWall=(1.-canyonFlat)*smoothstep(1.4,4.,h);';
   if(!shader.fragmentShader.includes(anchor))throw Error('Integrated cliff anchor missing');
   shader.fragmentShader=shader.fragmentShader.replace(anchor,'float rockWall=(1.-canyonFlat);');
  };
  material.customProgramCacheKey=()=>cache()+'|qa-canyon-wall-foot';material.needsUpdate=true;
 }
 return {materials:materials.size,newTextures:0,newGeometry:0,scope:'Resident wall color only; remove height fade of cliff texture, retain slope mask. More wall fragments may sample existing cliff texture.'};
}
