// Laboratory hypothesis only. Preserve the geometry attributes and morph target
// counts used by Three r180's key, but omit morph buffer object identities from
// the *pipeline* key. NodeBuilder and render-object cache keys remain untouched.
// This does not prove binding layout compatibility and is not production code.
export function pipelineGeometryKey(geometry){
 let key='';
 for(const name of Object.keys(geometry.attributes).sort()){
  const attribute=geometry.attributes[name];key+=name+',';
  if(attribute.data)key+=attribute.data.stride+',';
  if(attribute.offset)key+=attribute.offset+',';
  if(attribute.itemSize)key+=attribute.itemSize+',';
  if(attribute.normalized)key+='n,';
 }
 for(const name of Object.keys(geometry.morphAttributes).sort()){
  key+='morph-'+name+',';
  for(const unused of geometry.morphAttributes[name])key+='*,';
 }
 if(geometry.index)key+='index,';
 return key;
}
export function installExperimentalMorphPipelineKey(backend,onUse=()=>{}){
 const original=backend.getRenderCacheKey;
 backend.getRenderCacheKey=function(renderObject){
  if(!Object.keys(renderObject.geometry.morphAttributes).length)return original.call(this,renderObject);
  const own=Object.hasOwn(renderObject,'getGeometryCacheKey'),prior=renderObject.getGeometryCacheKey;
  try{renderObject.getGeometryCacheKey=()=>pipelineGeometryKey(renderObject.geometry);onUse();return original.call(this,renderObject);}
  finally{if(own)renderObject.getGeometryCacheKey=prior;else delete renderObject.getGeometryCacheKey;}
 };
 return ()=>{backend.getRenderCacheKey=original;};
}
