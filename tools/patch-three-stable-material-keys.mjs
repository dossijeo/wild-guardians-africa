// Keep Three's exact material key semantics; only ownership/reuse changes.
export function patchStableMaterialKeys(source){
 const start='\t\tlet cacheKey = material.customProgramCacheKey();',end='\n\t\tcacheKey += this.clippingContextCacheKey + \',\';';
 const marker='\t\tconst buildMaterialKey = () => {';
 if(source.includes(marker))return source;
 const a=source.indexOf(start),b=source.indexOf(end,a);
 if(a<0||b<0||source.indexOf(start,a+1)!==-1)throw Error('Unexpected Three material key implementation');
 const body=source.slice(a,b);
 return source.slice(0,a)+marker+'\n'+body+'\n\t\treturn cacheKey;\n\t\t};\n\t\tlet cacheKey = renderer._wgMaterialKeys ? renderer._wgMaterialKeys.get( material, buildMaterialKey ) : buildMaterialKey();\n'+source.slice(b);
}
