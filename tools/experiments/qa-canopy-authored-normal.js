// QA-only recovery of existing atlas detail in three savanna tree slots.
// Keep the broad crown envelope, palette, bark, geometry and original maps.
export function applyCanopyAuthoredNormal(world){
 const slots=[0,1,2],selected=new Set(slots.flatMap(i=>world.prototypes[i].map(mesh=>mesh.material)));
 const audit=[];
 for(const material of selected){
  if(!material.normalMap)throw Error('Tree has no authored normal map');
  const beforeCompile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
   beforeCompile(shader,renderer);
   const original='mix(.68,.10,toonLeaf)';
   if(!shader.fragmentShader.includes(original))throw Error('Canopy normal blend anchor missing');
   shader.fragmentShader=shader.fragmentShader.replace(original,'mix(.68,.48,toonLeaf)');
  };
  material.customProgramCacheKey=()=>cache()+'|qa-canopy-authored-normal';material.needsUpdate=true;
  audit.push({normalScale:material.normalScale.toArray(),normalImage:material.normalMap.image?.src??null});
 }
 return {slots,materials:selected.size,leafNormalMix:[.10,.48],envelopeMix:.60,addedMaps:0,addedGeometry:0,audit};
}
