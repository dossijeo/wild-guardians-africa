// QA-only: soften light-band transitions on native foliage pixels, not geometry.
export function applyMaterialStudy(world){
 const seen=new WeakSet();
 const patch=material=>{
  if(!material?.userData.artBounds||material.userData.nativeSurface?.type!==1||seen.has(material))return;
  seen.add(material);const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
   compile.call(material,shader,renderer);
   const edits=[
    ['float middle=artStep416(.27,lightDrive,uArtShape.y);','float middle=artStep416(.27,lightDrive,mix(uArtShape.y,.18,leafMix));'],
    ['float high=artStep416(ground?.52:.66,lightDrive,ground?.10:uArtShape.y*.90);','float high=artStep416(ground?.52:.66,lightDrive,ground?.10:mix(uArtShape.y*.90,.16,leafMix));']
   ];
   for(const [from,to] of edits){if(!shader.fragmentShader.includes(from))throw Error('Foliage lighting anchor missing');shader.fragmentShader=shader.fragmentShader.replace(from,to);}
  };
  material.customProgramCacheKey=()=>cache()+'|qa-foliage-soft-light';material.needsUpdate=true;
 };
 world.scene.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])patch(m)});
 const register=world.toon.material;world.toon.material=function(material){const result=register.call(this,material);patch(material);return result;};
 return {newTextures:0,newGeometry:0,scope:'Native surface type 1; existing per-pixel leaf mask',midWidth:.18,highWidth:.16};
}
