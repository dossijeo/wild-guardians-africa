// QA only: JS asset ownership and native texture object metadata, not GPU bytes.
export function loadingAssetInventory(world){
 const textures=[];let geometryObjects=0,materialObjects=0;
 for(const resource of world.assets.ownedResources){
  if(resource.isTexture){const image=resource.image;const properties=world.renderer.properties.get(resource);textures.push({id:resource.id,name:resource.name,width:image?.width??null,height:image?.height??null,format:resource.format,type:resource.type,colorSpace:resource.colorSpace,mipmaps:resource.mipmaps?.length??0,generateMipmaps:resource.generateMipmaps,initialized:!!properties.__webglTexture,imageSource:typeof image?.src==='string'?image.src:null});}
  else if(resource.isBufferGeometry)geometryObjects++;
  else if(resource.isMaterial)materialObjects++;
 }
 return {scope:'Asset-collection ownership only. Texture initialized flag observes the pinned Three r180 properties record, without GL queries; dimensions/format are metadata, not measured GPU storage. Excludes sky/render-target/crop clones outside this asset owner.',textures,geometryObjects,materialObjects,modelSources:[...world.assets.modelSources.keys()]};
}
