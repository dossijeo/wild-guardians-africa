// Extends the existing audit's intercepted modules. Production files are read,
// never written. Fail closed when an upstream integration changes an anchor.
export function rewriteA5Module(kind,source){
  const replacements={
    pair:[['const group=new THREE.Group();group.visible=false;group.add(model,far.mesh);',"const group=new THREE.Group();group.visible=false;group.add(model,far.mesh);globalThis.__a5Audit?.pair({source,model,impostor:far.mesh,group});"]],
    coverage:[['return owner;',"const a5Status=owner.status;owner.status=()=>({...a5Status(),qaNonresidentChunks:[...nonresident.keys()]});globalThis.__a5Audit?.coverage(owner);return owner;"]],
    assets:[['return {async slots(){','const a5Atlas={async slots(){'],['await prepareWebGpuTexture({renderer,texture,',"globalThis.__a5Audit?.atlasImage(texture,path);await prepareWebGpuTexture({renderer,texture,"],['status(){return {closed,slots:records.size,retained:[...records.values()].reduce((sum,record)=>sum+record.refs,0)};}};', 'status(){return {closed,slots:records.size,retained:[...records.values()].reduce((sum,record)=>sum+record.refs,0)};}};globalThis.__a5Audit?.atlas(a5Atlas);return a5Atlas;']],
    admission:[['deferRelease(object,release){',"deferRelease(object,release){globalThis.__a5Audit?.releaseScheduled(object);const a5Release=release;release=()=>{const result=a5Release();globalThis.__a5Audit?.releaseCompleted(object);return result;};"]],
    fixture:[['qaResourceTrace:resourceTrace,','qaResourceTrace:resourceTrace,qaA5:globalThis.__a5Audit?.snapshot(lastScene,lastRenderer),']],
  }[kind];
  if(!replacements)throw Error('Unknown A5 module');
  for(const [anchor,value]of replacements){if(source.split(anchor).length!==2)throw Error('A5 '+kind+' observer anchor missing or ambiguous');source=source.replace(anchor,value);}
  if(kind==='fixture')source="import '/tools/guardian/migration-support/a5-observer.js';\n"+source;
  return source;
}
