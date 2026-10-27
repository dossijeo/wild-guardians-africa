// QA only. Resolve ownership once per preparation pass, outside timed uploads.
// This deliberately adds traversal overhead: never use this run as an A/B result.
export function textureOwnership(scene, assets) {
 const owners=new Map();
 const add=(texture,owner)=>{if(!texture?.isTexture)return;const key=texture.source??texture;let rows=owners.get(key);if(!rows)owners.set(key,rows=new Set());rows.add(owner);};
 const visit=(root,prefix)=>root?.traverse(object=>{
  for(const material of [object.material,object.customDepthMaterial,object.customDistanceMaterial].flat().filter(Boolean)){
   for(const [slot,value] of Object.entries(material))add(value,`${prefix}:${object.name||object.type}:${material.name||material.type}:${slot}`);
   for(const [slot,uniform] of Object.entries(material.uniforms??{}))add(uniform.value,`${prefix}:${object.name||object.type}:${material.name||material.type}:uniform.${slot}`);
  }
 });
 visit(scene,'resident');
 for(const [url,gltf] of assets?.modelSources??[])visit(gltf.scene,url);
 return texture=>[...(owners.get(texture.source??texture)??[])];
}
const seen=new WeakMap();
export function measureTextureUpload(renderer,texture,owners){
 let records=seen.get(renderer);if(!records)seen.set(renderer,records=new WeakMap());
 const previous=records.get(texture),properties=renderer.properties.get(texture);
 const beforeVersion=properties.__version,initialized=!!properties.__webglTexture;
 const start=performance.now();renderer.initTexture(texture);const ms=performance.now()-start;
 records.set(texture,{version:texture.version,at:start});
 const image=texture.image;
 (globalThis.qaLoadingTextureUploads??=[]).push({ms,name:texture.name,uuid:texture.uuid,sourceUuid:texture.source?.uuid,version:texture.version,beforeVersion,initialized,previous:previous??null,owners:owners(texture),width:image?.width,height:image?.height,imageType:image?.constructor?.name,src:image?.currentSrc??image?.src??null,colorSpace:texture.colorSpace,mipmaps:texture.generateMipmaps,flipY:texture.flipY,premultiplyAlpha:texture.premultiplyAlpha});
}
