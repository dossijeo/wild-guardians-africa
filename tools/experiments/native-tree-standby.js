import * as THREE from 'three';
import {NativeFarGpuCancelled} from './prepare-native-far-gpu.js';
import {lodMix} from './far-impostor-math.js';

// Immutable logical identity survives changes of native instance order/LOD.
// The standby itself receives a real upload draw/fence, never a CPU-only proof.
export function standbyTreeKey(tree){const p=tree.origin??tree;return [tree.id,p.x,p.y,p.z,tree.yaw,tree.sx,tree.sy,tree.sz].join(':');}
// A missing chunk may use its owned, GPU-prepared bank. A resident tree still
// needs current physical selection; culling must not authorize extra geometry.
export function standbyCoverageReady(id,{coverage,standby,nativeTree,logicalTree,suppressed,nativeMissing=false}){
 if(nativeMissing&&nativeTree===undefined)return standby.has(id,logicalTree,suppressed);
 return coverage.has(id,suppressed)&&standby.has(id,nativeTree,suppressed)&&standby.has(id,logicalTree,suppressed);
}
function sourceKey(source){return [source.geometry.uuid,source.material.uuid,source.material.version].join(':');}
function geometryView(source,capacity){
 const g=new THREE.BufferGeometry();if(source.index)g.setIndex(new THREE.BufferAttribute(source.index.array,source.index.itemSize,source.index.normalized));
 for(const [name,a] of Object.entries(source.attributes))if(name!=='nativeVisibility')g.setAttribute(name,new THREE.BufferAttribute(a.array,a.itemSize,a.normalized));
 g.setAttribute('nativeVisibility',new THREE.InstancedBufferAttribute(new Float32Array(capacity),1).setUsage(THREE.DynamicDrawUsage));g.groups=source.groups.map(group=>({...group}));g.drawRange={...source.drawRange};g.boundingBox=source.boundingBox?.clone()??null;g.boundingSphere=source.boundingSphere?.clone()??null;return g;
}

// Two owned banks: one prepared/immutable while its replacement uploads.
// They render only IDs whose normal native representation is awaiting proof.
export class NativeTreeStandby {
 constructor({scene,sources,prepare,start=40,end=60,keepDistance=end+48,maxTrees=1024,onError=()=>{},resourceRevision=()=>0}){
  if(typeof prepare!=='function'||!(end>start)||!Number.isFinite(keepDistance)||keepDistance<end||!Number.isInteger(maxTrees)||maxTrees<1)throw Error('Invalid standby settings');
  Object.assign(this,{scene,sources,prepare,start,end,keepDistance,maxTrees,onError,resourceRevision});this.banks=[null,null];this.active=null;this.busy=false;this.closed=false;this.pending=null;this.revision=0;this.stats={cancelledPreparations:0,preparations:0,rendered:0,trees:0,estimatedOwnedGpuBytes:0,errors:[]};
 }
 sourceKey(level){return this.resourceRevision()+':'+sourceKey(this.sources[level]);}
 has(id,tree,suppressed){const d=this.active?.entries.get(id);return !!d&&!!tree&&!suppressed?.has(id)&&d.key===standbyTreeKey(tree)&&d.resource===this.sourceKey(d.level);}
 request(entries,camera){
  if(this.closed)return;this.pending={entries:entries.map(d=>({...d,matrix:new Float64Array(d.matrix)})),camera:{x:camera.x,z:camera.z}};if(!this.busy)void this.run();
 }
 async run(){
  this.busy=true;
  try{while(!this.closed&&this.pending){
   const {entries,camera}=this.pending;this.pending=null;const wanted=new Map();
   for(const [id,d] of this.active?.entries??[])if(Math.hypot(d.x-camera.x,d.z-camera.z)<=this.keepDistance&&d.resource===this.sourceKey(d.level))wanted.set(id,d);
   for(const d of entries){if(Math.hypot(d.x-camera.x,d.z-camera.z)>this.keepDistance)continue;const old=wanted.get(d.id);if(!old||old.key!==d.key)wanted.set(d.id,{...d,matrix:new Float64Array(d.matrix),resource:this.sourceKey(d.level)});}
   if(wanted.size>this.maxTrees)throw Error('Standby tree budget exceeded');
   if(this.active&&wanted.size===this.active.entries.size&&[...wanted].every(([id,d])=>this.active.entries.get(id)===d))continue;
   if(!wanted.size){if(this.active){this.active.root.removeFromParent();this.active=null;this.revision++;this.stats.trees=0;}continue;}
   const index=this.active===this.banks[0]?1:0;let bank=this.banks[index];const capacity=2**Math.ceil(Math.log2(Math.max(8,wanted.size))),layout=this.sources.map(source=>source.geometry.uuid+':'+source.material.uuid).join('|');
   if(bank&&(bank.capacity<capacity||bank.layout!==layout)){this.release(bank);bank=null;}
   if(!bank){const root=new THREE.Group();root.name='native-tree-standby';bank={root,capacity,layout,meshes:this.sources.map(source=>{const mesh=new THREE.InstancedMesh(geometryView(source.geometry,capacity),source.material,capacity);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.castShadow=false;mesh.receiveShadow=true;mesh.frustumCulled=false;root.add(mesh);return mesh;}),entries:null,rows:[]};this.banks[index]=bank;}
   // Keep global matrices in CPU doubles. Subtract a fixed bank anchor before
   // writing GPU floats, like native merged groups; large-world visits must not
   // lose the tree's fractional placement through a global Float32 translation.
   bank.root.position.set(Math.round(camera.x/48)*48,0,Math.round(camera.z/48)*48);
   bank.entries=wanted;bank.rows=this.sources.map(()=>[]);for(const d of wanted.values())bank.rows[d.level].push(d);
   // Keep prepared packing immutable, with near entries first. Trailing
   // zero-fade entries can then be excluded by count without matrix uploads.
   for(const rows of bank.rows)rows.sort((a,b)=>Math.hypot(a.x-camera.x,a.z-camera.z)-Math.hypot(b.x-camera.x,b.z-camera.z)||a.id.localeCompare(b.id));
   for(const [level,mesh] of bank.meshes.entries()){const rows=bank.rows[level];mesh.count=rows.length;mesh.visible=rows.length>0;for(const [i,d] of rows.entries()){const offset=i*16;mesh.instanceMatrix.array.set(d.matrix,offset);mesh.instanceMatrix.array[offset+12]=d.matrix[12]-bank.root.position.x;mesh.instanceMatrix.array[offset+14]=d.matrix[14]-bank.root.position.z;}mesh.instanceMatrix.needsUpdate=true;mesh.geometry.attributes.nativeVisibility.array.fill(0);mesh.geometry.attributes.nativeVisibility.needsUpdate=true;}
   await this.prepare(bank.root,()=>this.closed);if(this.closed)break;
   // A generation may change between the preparation promise and adoption.
   if([...wanted.values()].some(d=>d.resource!==this.sourceKey(d.level)))throw new NativeFarGpuCancelled('resources-changed');
   this.active?.root.removeFromParent();this.active=bank;this.scene.add(bank.root);this.revision++;this.stats.preparations++;this.stats.trees=wanted.size;
   this.stats.estimatedOwnedGpuBytes=this.banks.filter(Boolean).reduce((sum,b)=>sum+b.meshes.reduce((n,m)=>n+m.instanceMatrix.array.byteLength+(m.geometry.index?.array.byteLength??0)+Object.values(m.geometry.attributes).reduce((v,a)=>v+a.array.byteLength,0),0),0);
  }}catch(error){if(!this.closed){if(error instanceof NativeFarGpuCancelled)this.stats.cancelledPreparations++;else{this.stats.errors.push(String(error));this.onError(error);}}}
  finally{this.busy=false;if(this.closed){for(const bank of this.banks)if(bank)this.release(bank);this.banks=[null,null];this.active=null;this.clearStats();}else if(this.pending)void this.run();}
 }
 update(camera,trees,stateFor,nativeReady,suppressed,baseFor=()=>1){
  let rendered=0;if(!this.active)return;for(const [level,mesh] of this.active.meshes.entries()){
   const attribute=mesh.geometry.attributes.nativeVisibility;let first=Infinity,last=-1,live=0,lastLive=-1;
   for(const [i,d] of this.active.rows[level].entries()){
    const tree=trees.get(d.id),state=stateFor(d.id),value=Math.fround(!nativeReady(d.id)&&this.has(d.id,tree,suppressed)&&state?.enabled?baseFor(d.id)*(1-lodMix(Math.hypot(camera.x-tree.x,camera.z-tree.z),this.start,this.end,state.ready)):0);
    if(value>0){live++;rendered++;lastLive=i;}if(attribute.array[i]!==value){attribute.array[i]=value;first=Math.min(first,i);last=i;}
   }
   mesh.visible=live>0;mesh.count=lastLive+1;if(last>=first){attribute.addUpdateRange(first,last-first+1);attribute.needsUpdate=true;}
  }this.stats.rendered=rendered;
 }
 release(bank){bank.root.removeFromParent();for(const mesh of bank.meshes){mesh.dispose();mesh.geometry.dispose();}}
 clearStats(){this.stats.rendered=0;this.stats.trees=0;this.stats.estimatedOwnedGpuBytes=0;}
 dispose(){if(this.closed)return;this.closed=true;this.pending=null;this.active?.root.removeFromParent();this.stats.rendered=0;if(!this.busy){for(const bank of this.banks)if(bank)this.release(bank);this.banks=[null,null];this.active=null;this.clearStats();}}
}
