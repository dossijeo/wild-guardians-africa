import descriptor from '../../content/manifests/crop-partition-runtime.json' with {type:'json'};
export {descriptor as cropRuntimeDescriptor};
const logicalPath=url=>{try{const value=new URL(url,'http://localhost/'),index=value.pathname.lastIndexOf('/assets/');return index<0?null:value.pathname.slice(index+1)+value.hash;}catch{return null;}};
export function cropCollectionKind(url){const path=logicalPath(url);for(const [kind,value] of Object.entries(descriptor.collections))if(path===value.slice(1))return kind;return null;}
// Historical logical aliases remain supported by Assets; their old payloads
// are archived offline and are deliberately absent from runtime packages.
export function cropHistoricalKind(url){const path=logicalPath(url);return descriptor.replaced.find(record=>path===record.source||path===record.runtime)?.kind??null;}
export function runtimeGeometryManifest(manifest){
 const retired=new Set(descriptor.replaced.map(record=>record.source));
 return {...manifest,records:[...manifest.records.filter(record=>!retired.has(record.source)),...descriptor.runtimeAssets.filter(row=>row.kind==='partition').map(row=>({source:row.path,runtime:row.path,afterBytes:row.bytes,runtimeSha256:row.sha256,partition:true}))]};
}
