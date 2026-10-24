// Keep QA overrides explicit while adopting measured reuse only in Mangroves.
export function streamingOptions(biome,search=globalThis.location?.search??''){
 const q=new URLSearchParams(search),mangrove=biome==='manglares';
 const enabled=(name,on='1')=>{const value=q.get(name);return value===null||value==='auto'?mangrove:value===on;};
 const waterBed=mangrove&&enabled('waterBedWorker');
 return {waterBed,waterShore:waterBed&&enabled('waterShoreWorker'),batchEviction:enabled('chunkEviction','batch'),warmObstruction:enabled('warmObstruction'),retainPrograms:enabled('retainPrograms')};
}
