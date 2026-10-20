// QA-only: expose more of the existing atlas normal on foliage pixels.
export function applyMaterialStudy(world){
 const seen=new WeakSet();
 const patch=material=>{
  if(!material?.userData.artBounds||material.userData.nativeSurface?.type!==1||seen.has(material))return;
  seen.add(material);const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
   compile.call(material,shader,renderer);
   const from='mix(.68,.10,toonLeaf)',to='mix(.68,.35,toonLeaf)';
   if(!shader.fragmentShader.includes(from))throw Error('Foliage normal anchor missing');
   shader.fragmentShader=shader.fragmentShader.replace(from,to);
  };
  material.customProgramCacheKey=()=>cache()+'|qa-foliage-normal';material.needsUpdate=true;
 };
 world.scene.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])patch(m)});
 const register=world.toon.material;world.toon.material=function(material){const result=register.call(this,material);patch(material);return result;};
 return {newTextures:0,newGeometry:0,scope:'Native surface type 1; existing per-pixel leaf mask',normalMix:.35,canopyNormalUnchanged:true};
}
