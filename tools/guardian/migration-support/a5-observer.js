// QA-only extension of native-worker-world-audit-worker's existing inventories.
// Weak references and scalar records never own/release product resources.
const ids=new WeakMap(),watched=new WeakSet(),disposed=new Set(),hashes=new WeakMap(),pairs=[],events=[],atlases=[],textures=[];
let nextId=0,coverage=null,rendererRef=null,cancelChunk=null;
const id=o=>{if(!o)return null;if(!ids.has(o))ids.set(o,++nextId);return ids.get(o);};
const now=()=>performance.timeOrigin+performance.now();
function event(kind,data={}){events.push({index:events.length,at:now(),kind,...data});}
function watch(o,kind){if(!o||watched.has(o))return;watched.add(o);const identity=id(o);o.addEventListener('dispose',()=>{disposed.add(identity);event(kind,{identity});});}
function fields(mesh){return {...mesh.geometry.attributes,index:mesh.geometry.index,...(mesh.instanceMatrix?{instanceMatrix:mesh.instanceMatrix}:{} )};}
function storage(a){return a?.isInterleavedBufferAttribute?a.data:a;}
function bytes(a){const v=storage(a)?.array;return v?new Uint8Array(v.buffer,v.byteOffset,v.byteLength):null;}
function sameBytes(a,b){const x=bytes(a),y=bytes(b);if(!x||!y||x.length!==y.length)return false;for(let i=0;i<x.length;i++)if(x[i]!==y[i])return false;return true;}
function contentHash(a){const s=storage(a),v=s?.array;if(!v)return null;const old=hashes.get(s);if(old?.array===v&&old.version===s.version)return old.hash;let h=2166136261;for(const b of bytes(a)){h^=b;h=Math.imul(h,16777619)>>>0;}hashes.set(s,{array:v,version:s.version,hash:h});return h;}
function attributes(mesh,renderer){return Object.entries(fields(mesh)).filter(([,a])=>a).map(([name,a])=>{
  const s=storage(a),v=s.array;
  return {name,attribute:id(a),storage:id(s),cpuBuffer:id(v?.buffer),byteOffset:v?.byteOffset??null,bytes:v?.byteLength??null,itemSize:a.itemSize,version:s.version,hash:contentHash(a),reference:renderer?.backend.get(s).buffer?.__remoteGpuId??null};
});}
function meshRow(mesh,renderer){return {mesh:mesh.id,geometry:id(mesh.geometry),geometryId:mesh.geometry.id,material:id(mesh.material),materialId:mesh.material.id,geometryDisposed:disposed.has(id(mesh.geometry)),materialDisposed:disposed.has(id(mesh.material)),attributes:attributes(mesh,renderer)};}
export const a5Audit={
  atlas(owner){atlases.push(new WeakRef(owner));},
  atlasImage(texture,path){watch(texture,'texture-dispose');textures.push({identity:id(texture),texture:new WeakRef(texture),path,width:texture.image?.width,height:texture.image?.height});globalThis.__auditTextureOrigins?.set(texture,{namespace:'a5-far-atlas',path});},
  pair({source,model,impostor,group}){
    const sourceFields=fields(source),modelFields=fields(model),seen=new Set();let copiedCpuBytes=0;
    const copies=Object.entries(sourceFields).filter(([,a])=>a).map(([name,a])=>{
      const b=modelFields[name],sa=storage(a),sb=storage(b),x=sa?.array,y=sb?.array;
      if(y&&x&&x.buffer!==y.buffer&&!seen.has(y.buffer)){copiedCpuBytes+=y.byteLength;seen.add(y.buffer);}
      return {name,attributeShared:a===b,cpuBufferShared:!!x&&!!y&&x.buffer===y.buffer,bytesEqual:sameBytes(a,b),bytes:x?.byteLength??null};
    });
    const cx=source.position.x/48,cz=source.position.z/48;
    const row={id:group.id,cx,cz,owned:[model.geometry,impostor.geometry,model.material,impostor.material].map(id),source:new WeakRef(source),model:new WeakRef(model),impostor:new WeakRef(impostor),group:new WeakRef(group),copies,copiedCpuBytes};pairs.push(row);
    for(const [mesh,kind]of [[source,'source'],[model,'model'],[impostor,'impostor']]){
      watch(mesh.geometry,'geometry-dispose');watch(mesh.material,'material-dispose');
      globalThis.__auditObjectOrigins?.set(mesh,{namespace:'a5-far-'+kind,pair:group.id,cx,cz,source:source.id});
    }
    event('pair-created',{pair:group.id,cx,cz,source:source.id,model:model.id,impostor:impostor.id,copiedCpuBytes});
    if(cancelChunk&&cancelChunk.cx===cx&&cancelChunk.cz===cz){cancelChunk=null;queueMicrotask(()=>{event('cancel-request',{pair:group.id,cx,cz});coverage?.deref()?.invalidate({reason:'a5-cancel-candidate',chunks:[{cx,cz}]});});}
  },
  coverage(owner){if(coverage?.deref()&&coverage.deref()!==owner)throw Error('A5 expected the original single coverage owner');coverage=new WeakRef(owner);event('coverage-observed');},
  releaseScheduled(object){event('release-scheduled',{object:object.id});},
  releaseCompleted(object){event('release-completed',{object:object.id});},
  invalidate(chunk,{cancelCandidate=false}={}){
    if(!Number.isSafeInteger(chunk?.cx)||!Number.isSafeInteger(chunk?.cz))throw Error('Invalid A5 chunk');
    const owner=coverage?.deref();if(!owner||owner.status().closed)throw Error('A5 coverage unavailable');
    cancelChunk=cancelCandidate?chunk:null;event('local-invalidation',{...chunk,cancelCandidate});owner.invalidate({reason:'a5-local-revalidation',chunks:[chunk]});
  },
  async retireCoverage(){const owner=coverage?.deref();if(!owner)throw Error('A5 coverage unavailable');owner.dispose();event('coverage-retired');},
  async drain(){const renderer=rendererRef?.deref();if(!renderer)throw Error('A5 renderer unavailable');await renderer.backend.device.queue.onSubmittedWorkDone();event('queue-drained');return true;},
  snapshot(scene,renderer){
    if(renderer)rendererRef=new WeakRef(renderer);
    const live=[],retired=[],missing=[];
    for(const p of pairs){const source=p.source.deref(),model=p.model.deref(),impostor=p.impostor.deref(),group=p.group.deref();
      if(p.owned.every(identity=>disposed.has(identity))){retired.push(p.id);continue;}
      if(!model||!impostor){missing.push(p.id);continue;}
      const row={id:p.id,cx:p.cx,cz:p.cz,attached:!!group?.parent,visible:!!group?.visible,source:source?meshRow(source,renderer):null,model:meshRow(model,renderer),impostor:meshRow(impostor,renderer),copies:p.copies,copiedCpuBytes:p.copiedCpuBytes};
      if(row.model.geometryDisposed&&row.impostor.geometryDisposed)retired.push(p.id);else live.push(row);
    }
    return {version:1,scope:'Instrumented ownership inventory; no GPU timing or driver-memory measurement',coverage:coverage?.deref()?.status()??null,nonresidentChunks:coverage?.deref()?.status().qaNonresidentChunks??[],atlases:atlases.map(r=>r.deref()?.status()??null),textures:textures.map(t=>({identity:t.identity,path:t.path,width:t.width,height:t.height,disposed:disposed.has(t.identity),reference:t.texture.deref()&&renderer?.backend.get(t.texture.deref()).texture?.__remoteGpuId||null})),live,retired,missing,events:events.slice(),createdPairs:pairs.length,copiedCpuBytes:pairs.reduce((n,p)=>n+p.copiedCpuBytes,0)};
  },
};
globalThis.__a5Audit=a5Audit;
