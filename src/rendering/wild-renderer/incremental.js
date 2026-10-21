import * as THREE from 'three';
import {WildRenderer} from './adapter.js';
export async function createIncrementalWildRenderer(url=new URL('./core.wasm',import.meta.url)){
 const {instance}=await WebAssembly.instantiate(await(await fetch(url)).arrayBuffer(),{wasi_snapshot_preview1:{proc_exit(code){throw Error(`Wild Renderer exited ${code}`)}}});
 return new IncrementalWildRenderer(instance.exports);
}
export class IncrementalWildRenderer extends WildRenderer{
 constructor(wasm){super(wasm);this.incremental=true;this.sources=new Map();this.groups=new Set();this.alive=new Set();this.worlds=new WeakMap();this.invalid=new WeakSet();this.frame=0;this.epoch=0;this.serial=0;this.planesPtr=this.alloc(192);this.planes=new Float64Array(wasm.memory.buffer,this.planesPtr,24);this.dummy=new THREE.Object3D();}
 addMetric(key,n){this.metrics[key]=(this.metrics[key]??0)+n;}
 beginFrame(chunks,frustum,origin){
  const start=performance.now();this.frame++;this.alive.clear();
  if(!this.eventLifecycle){
  for(const group of chunks.values())for(const batch of group.userData.lodBatches??[])this.alive.add(batch);
  for(const [batch,r] of this.sources)if(!this.alive.has(batch)){this.freeSource(r);this.sources.delete(batch);}
  }
  let changed=this.ox!==origin.x||this.oz!==origin.z;
  for(let i=0;i<6;i++){const p=frustum.planes[i],at=i*4;const x=p.normal.x,y=p.normal.y,z=p.normal.z,w=p.constant;if(this.planes[at]!==x||this.planes[at+1]!==y||this.planes[at+2]!==z||this.planes[at+3]!==w)changed=true;this.planes[at]=x;this.planes[at+1]=y;this.planes[at+2]=z;this.planes[at+3]=w;}
  this.ox=origin.x;this.oz=origin.z;if(changed)this.epoch++;
  this.addMetric('descriptorBytes',192);this.addMetric('registryMs',performance.now()-start);
 }
 invalidate(batch){this.invalid.add(batch);}
 freeSource(r){this.wasm.free(r.ptr);this.liveBytes-=r.bytes;}
 world(group){
  let w=this.worlds.get(group);if(!w){w={values:new Float64Array(16),frame:-1,revision:0};this.worlds.set(group,w);}
  if(w.frame!==this.frame){let dirty=false;const m=group.matrixWorld.elements;for(let i=0;i<16;i++)if(w.values[i]!==m[i]){w.values[i]=m[i];dirty=true;}if(dirty)w.revision++;w.frame=this.frame;}
  return w;
 }
 initializeLocal(e,r){const b=e.batch;for(let i=0;i<r.n;i++){const p=b.instances[i],d=this.dummy;d.position.set(p.x-b.chunkOrigin[0],p.y,p.z-b.chunkOrigin[1]);d.rotation.set(0,p.yaw,0);d.scale.set(p.sx,p.sy,p.sz);d.updateMatrix();d.matrix.toArray(r.local,i*16);}}
 source(e){
  const b=e.batch,n=b.instances.length,levels=b.levels.length,world=this.world(e.group);let r=this.sources.get(b);
  if(r&&(r.population!==b.instances||r.n!==n||this.invalid.has(b))){this.freeSource(r);this.sources.delete(b);r=null;}
  if(!r){
   const bytes=Math.ceil((n*64+128+levels*32+n*128+n*levels*32+n*4+n*levels*4)/8)*8,ptr=this.alloc(bytes),buffer=this.wasm.memory.buffer;
   const localPtr=ptr,worldPtr=localPtr+n*64,shapePtr=worldPtr+128,matricesPtr=shapePtr+levels*32,spheresPtr=matricesPtr+n*128,visibilityPtr=spheresPtr+n*levels*32,ordersPtr=visibilityPtr+n*4;
   r={ptr,bytes,n,levels,population:b.instances,localPtr,worldPtr,shapePtr,matricesPtr,spheresPtr,visibilityPtr,ordersPtr,local:new Float32Array(buffer,localPtr,n*16),world:new Float64Array(buffer,worldPtr,16),shape:new Float64Array(buffer,shapePtr,levels*4),visibility:new Float32Array(buffer,visibilityPtr,n).fill(1),orders:new Uint32Array(buffer,ordersPtr,n*levels),orderRefs:Array(levels).fill(null),orderVersions:new Uint32Array(levels),worldRevision:-1,visibilityVersion:-1,revision:++this.serial};
   this.initializeLocal(e,r);
   for(let l=0;l<levels;l++){const geometry=b.levels[l].geometry;if(!geometry.boundingSphere)geometry.computeBoundingSphere();const s=geometry.boundingSphere;r.shape[l*4]=s.center.x;r.shape[l*4+1]=s.center.y;r.shape[l*4+2]=s.center.z;r.shape[l*4+3]=s.radius;}
   this.sources.set(b,r);this.invalid.delete(b);this.addMetric('registeredInstances',n);this.addMetric('copiedBytes',n*64+levels*32);
  }
  if(r.worldRevision!==world.revision){r.world.set(world.values);const t=performance.now();this.wasm.wr_register(r.localPtr,r.worldPtr,r.shapePtr,n,levels,r.matricesPtr,r.spheresPtr);this.addMetric('registerMs',performance.now()-t);this.addMetric('registrations',1);r.worldRevision=world.revision;r.revision=++this.serial;}
  const fade=b.fade?.attribute;
  if(fade&&r.visibilityVersion!==fade.version){r.visibility.set(fade.array);r.visibilityVersion=fade.version;this.addMetric('copiedBytes',n*4);this.addMetric('visibilityUploads',1);}
  const level=e.level,order=b.orders[level];
  if(r.orderRefs[level]!==order){if(order.length!==e.mesh.count)throw Error('Incremental LOD order mismatch');for(let i=0;i<order.length;i++)r.orders[level*n+i]=order[i];r.orderRefs[level]=order;r.orderVersions[level]++;this.addMetric('copiedBytes',order.length*4);this.addMetric('orderUploads',1);}
  return r;
 }
 pack(g,entries,source,frustum,origin,omitZero){
  const start=performance.now(),ec=entries.length,cap=g.capacity;
  if(g.wr&&g.wr.entryCapacity<ec)this.release(g);
  if(!g.wr){const entryCapacity=Math.max(8,2**Math.ceil(Math.log2(ec))),bytes=cap*68+entryCapacity*20,ptr=this.alloc(bytes),buffer=this.wasm.memory.buffer;g.wr={ptr,bytes,entryCapacity,outputPtr:ptr,outVisPtr:ptr+cap*64,descPtr:ptr+cap*68,desc:new Uint32Array(buffer,ptr+cap*68,entryCapacity*5),rows:[],epoch:-1};g.mesh.instanceMatrix.array=new Float32Array(buffer,ptr,cap*16);g.mesh.geometry.attributes.nativeVisibility.array=new Float32Array(buffer,ptr+cap*64,cap);this.groups.add(g);}
  const w=g.wr;let dirty=w.epoch!==this.epoch||w.rows.length!==ec||w.omit!==omitZero,total=0;
  for(let k=0;k<ec;k++){
   const e=entries[k],r=this.source(e),level=e.level,count=e.mesh.count,old=w.rows[k];total+=count;
   if(!old||old.r!==r||old.level!==level||old.count!==count||old.revision!==r.revision||old.order!==r.orderVersions[level]||old.visibility!==r.visibilityVersion){
    dirty=true;const at=k*5;w.desc[at]=r.matricesPtr;w.desc[at+1]=r.spheresPtr+level*r.n*32;w.desc[at+2]=r.ordersPtr+level*r.n*4;w.desc[at+3]=r.visibilityPtr;w.desc[at+4]=count;
    const row=old??{};row.r=r;row.level=level;row.count=count;row.revision=r.revision;row.order=r.orderVersions[level];row.visibility=r.visibilityVersion;w.rows[k]=row;this.addMetric('descriptorBytes',20);
   }
  }
  w.rows.length=ec;const kernelStart=performance.now();this.lastUpdated=dirty;
  if(dirty){if(this.effectiveSelection){const result=this.wasm.wr_select_checked(w.descPtr,ec,this.planesPtr,origin.x,origin.z,w.outputPtr,w.outVisPtr,omitZero?1:0,w.count??-1);this.lastUpdated=result>=0;w.count=result>=0?result:-result-1;}else w.count=this.wasm.wr_select(w.descPtr,ec,this.planesPtr,origin.x,origin.z,w.outputPtr,w.outVisPtr,omitZero?1:0);w.epoch=this.epoch;w.omit=omitZero;}
  const end=performance.now();this.addMetric('calls',dirty?1:0);this.addMetric('inputMs',kernelStart-start);this.addMetric('kernelMs',end-kernelStart);this.addMetric('instances',total);return w.count;
 }
 release(g){super.release(g);this.groups.delete(g);}
 dispose(){for(const g of this.groups)this.release(g);for(const r of this.sources.values())this.freeSource(r);this.sources.clear();if(this.planesPtr){this.wasm.free(this.planesPtr);this.liveBytes-=192;this.planesPtr=0;}}
}
