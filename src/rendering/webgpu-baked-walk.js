import {BufferAttribute,BufferGeometry,DataTexture,FloatType,Matrix4,Mesh,NearestFilter,RGBAFormat,Vector3,Vector4} from 'three';
import {Fn,attribute,float,ivec2,mat4,reference,normalLocal,positionLocal,textureLoad,uniform,vec4} from 'three/tsl';
import {ANIMAL_ACTIONS} from '../simulation/animal-actions-data.js';
import {hasBakedWorkerWalk} from './baked-worker-walk-profiles.js';
import {bakedWalkRecipe} from './webgpu-material-graph-catalog.js';

// Experimental building block for a non-skinned presentation mesh. The source
// SkinnedMesh must remain available for physical poses and unsupported clips.
// It is deliberately not installed on SkinnedMesh: Three's WebGPU renderer
// would otherwise run its own skinning before this position node.
export function createBakedWalkTexture(meta,buffer){
 if(!Object.hasOwn(ANIMAL_ACTIONS.animals,meta?.species)||meta.clip!=='Walking')throw TypeError('Invalid baked walking data');
 return createPackedBakedWalkTexture(meta,buffer);
}
export function createBakedWorkerWalkTexture(meta,buffer){
 if(meta?.schema!=='wg-worker-gpu-walk/1'||!hasBakedWorkerWalk(meta.species)||meta.clip!=='Walk_Skip'||meta.validation?.visibleAttachments!==0)throw TypeError('Invalid baked worker walking data');
 return createPackedBakedWalkTexture(meta,buffer);
}
export function createBakedWorkerRunTexture(meta,buffer){
 if(meta?.schema!=='wg-worker-gpu-walk/1'||!hasBakedWorkerWalk(meta.species)||meta.clip!=='Run'||meta.validation?.visibleAttachments!==0)throw TypeError('Invalid baked worker running data');
 return createPackedBakedWalkTexture(meta,buffer);
}
export function createBakedWorkerHarvestTexture(meta,buffer){
 if(meta?.schema!=='wg-worker-gpu-walk/1'||!hasBakedWorkerWalk(meta.species)||meta.clip!=='Harvest'||meta.validation?.visibleAttachments!==0)throw TypeError('Invalid baked worker harvest data');
 return createPackedBakedWalkTexture(meta,buffer);
}
export function createBakedWorkerIdleTexture(meta,buffer){
 if(meta?.schema!=='wg-worker-gpu-walk/1'||!hasBakedWorkerWalk(meta.species)||meta.clip!=='Idle'||meta.validation?.visibleAttachments!==0)throw TypeError('Invalid baked worker idle data');
 return createPackedBakedWalkTexture(meta,buffer);
}
export function createBakedWorkerPlantTexture(meta,buffer){
 if(meta?.schema!=='wg-worker-gpu-walk/1'||!hasBakedWorkerWalk(meta.species)||meta.clip!=='Plant'||meta.validation?.visibleAttachments!==0||meta.attachments?.length)throw TypeError('Invalid baked worker plant data');
 return createPackedBakedWalkTexture(meta,buffer);
}
export function createBakedWorkerWaterTexture(meta,buffer){
 if(meta?.schema!=='wg-worker-gpu-walk/1'||!hasBakedWorkerWalk(meta.species)||meta.clip!=='Water'||meta.validation?.visibleAttachments!==0||!Array.isArray(meta.attachments)||meta.attachments.length!==6)throw TypeError('Invalid baked worker water data');
 return createPackedBakedWalkTexture(meta,buffer);
}
export function createBakedWorkerCarryTexture(meta,buffer){
 if(meta?.schema!=='wg-worker-gpu-walk/1'||!hasBakedWorkerWalk(meta.species)||meta.clip!=='Carry_Crate'||meta.validation?.visibleAttachments!==0||!Array.isArray(meta.attachments)||meta.attachments.length!==9)throw TypeError('Invalid baked worker carry data');
 return createPackedBakedWalkTexture(meta,buffer);
}
function createPackedBakedWalkTexture(meta,buffer){
 if(meta.sharedMatrixChannels!==1||!Number.isInteger(meta.frames)||meta.frames<2||!Number.isInteger(meta.strideFloats)||!Number.isFinite(meta.duration)||meta.duration<=0||!Number.isFinite(meta.sampleRate)||meta.sampleRate<=0||!Array.isArray(meta.channels)||!meta.channels.length||!Array.isArray(meta.sampleTimes)||meta.sampleTimes.length!==meta.frames||!(buffer instanceof ArrayBuffer)||meta.byteLength!==buffer.byteLength||buffer.byteLength!==meta.frames*meta.strideFloats*4)throw TypeError('Invalid baked walking data');
 const channel=meta.channels[0],bones=channel?.bones?.length,offset=channel?.matrixOffset;
 if(!Array.isArray(channel?.bones)||!Number.isInteger(bones)||bones<1||channel.bones.some(name=>typeof name!=='string'||!name)||!Number.isInteger(offset)||offset<0||offset+bones*16>meta.strideFloats||meta.boneInverses!==undefined&&(!Array.isArray(meta.boneInverses)||meta.boneInverses.length!==bones*16||!meta.boneInverses.every(Number.isFinite))||meta.channels.some(c=>typeof c?.name!=='string'||!c.name||!Array.isArray(c.bones)||!Array.isArray(c.bindMatrix)||c.bindMatrix.length!==16||!c.bindMatrix.every(Number.isFinite)||c.matrixOffset!==offset||c.bones.join('\0')!==channel.bones.join('\0'))||new Set(meta.channels.map(c=>c.name)).size!==meta.channels.length||meta.frames!==Math.ceil(meta.duration*meta.sampleRate)+1||meta.sampleTimes.some((t,i)=>!Number.isFinite(t)||t<0||t>=meta.duration||i>0&&t<=meta.sampleTimes[i-1]||i<meta.frames-1&&Math.abs(t-i/meta.sampleRate)>1e-9))throw TypeError('Unsupported baked walking channels');
 const attachments=meta.attachments??[];if(!Array.isArray(attachments)||attachments.some((item,i)=>typeof item?.name!=='string'||!item.name||typeof item.parent!=='string'||!item.parent||item.matrixOffset!==offset+(bones+i)*16)||new Set(attachments.map(item=>item.name)).size!==attachments.length||offset+(bones+attachments.length)*16>meta.strideFloats)throw TypeError('Unsupported baked attachment channels');
 const source=new Float32Array(buffer),width=(bones+attachments.length)*4,data=new Float32Array(width*meta.frames*4);
 for(let frame=0;frame<meta.frames;frame++)data.set(source.subarray(frame*meta.strideFloats+offset,frame*meta.strideFloats+offset+(bones+attachments.length)*16),frame*(bones+attachments.length)*16);
 if(!data.every(Number.isFinite))throw TypeError('Non-finite baked walking matrix');
 const safeMeta=structuredClone(meta);Object.freeze(safeMeta.sampleTimes);if(safeMeta.boneInverses)Object.freeze(safeMeta.boneInverses);for(const item of safeMeta.channels){Object.freeze(item.bones);Object.freeze(item.bindMatrix);if(Array.isArray(item.bindMatrixInverse))Object.freeze(item.bindMatrixInverse);Object.freeze(item);}Object.freeze(safeMeta.channels);if(safeMeta.attachments){for(const item of safeMeta.attachments)Object.freeze(item);Object.freeze(safeMeta.attachments);}Object.freeze(safeMeta);
 const texture=new DataTexture(data,width,meta.frames,RGBAFormat,FloatType);texture.minFilter=texture.magFilter=NearestFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
 return {texture,meta:safeMeta,bones:Object.freeze(channel.bones.slice()),dispose(){texture.dispose();}};
}

// Matrices are the canonical Skeleton.update output (bone world * inverse
// bind). canonicalMeshInverse maps that canonical world into this mesh's local
// frame, as in the already-validated WebGL research prototype. The caller owns
// the phase and must keep it within confirmed simulation time.
export function createBakedWalkNodes(bake,{bindMatrix,canonicalMeshInverse,phase=uniform(0)}={}){
 if(!bake?.texture?.isDataTexture||!bindMatrix?.isMatrix4||!canonicalMeshInverse?.isMatrix4||!phase?.isNode)throw TypeError('Invalid baked walking binding');
 return bakedWalkNodes(bake,{bind:uniform(bindMatrix),inverse:uniform(canonicalMeshInverse),phase});
}
function bakedWalkNodes(bake,{bind,inverse,phase,timing=null}){
 const {texture,meta}=bake,index=attribute('skinIndex','uvec4'),weight=attribute('skinWeight','vec4');
 const duration=timing?.duration??float(meta.duration),sampleRate=timing?.sampleRate??float(meta.sampleRate),frames=timing?.frames??float(meta.frames),lastSample=timing?.lastSample??float(meta.sampleTimes.at(-1));
 const t=phase.mod(duration),a=t.mul(sampleRate).floor().min(frames.sub(2)),b=a.add(1),start=a.div(sampleRate),end=b.equal(frames.sub(1)).select(lastSample,b.div(sampleRate)),fraction=t.sub(start).div(end.sub(start).max(.0000001)).clamp(0,1);
 function frame(bone,row){const x=bone.mul(4);return mat4(textureLoad(texture,ivec2(x,row)),textureLoad(texture,ivec2(x.add(1),row)),textureLoad(texture,ivec2(x.add(2),row)),textureLoad(texture,ivec2(x.add(3),row)));}
 function bone(i){return frame(i,a).mul(float(1).sub(fraction)).add(frame(i,b).mul(fraction));}
 const matrix=bone(index.x).mul(weight.x).add(bone(index.y).mul(weight.y)).add(bone(index.z).mul(weight.z)).add(bone(index.w).mul(weight.w));
 const local=inverse.mul(matrix).mul(bind);
 return {phase,position:local.mul(vec4(positionLocal,1)).xyz,normal:local.transformDirection(normalLocal).xyz};
}

// Texture and clip layout are shared per baked library; pose-specific values
// live on each mesh so identical animals can also reuse one material.
const bakedWalkGraphs=new WeakMap(),noClock={};
export function sharedBakedWalkGraph(bake,clock=null,phaseSource=null){
 if(!bake?.texture?.isDataTexture||clock!==null&&(!clock.node?.isNode||!Number.isFinite(clock.elapsed)))throw TypeError('Invalid shared baked walking graph');
 const recipe=bakedWalkRecipe({texture:bake.texture,clock:clock!==null,phaseSource:phaseSource!==null});let clocks=bakedWalkGraphs.get(bake);if(!clocks){clocks=new WeakMap();bakedWalkGraphs.set(bake,clocks);}const key=phaseSource??clock??noClock;let variants=clocks.get(key);if(!variants){variants=new Map();clocks.set(key,variants);}let graph=variants.get(recipe.key);if(graph)return graph;
 const references={phaseOffset:reference('_wgWalkPhaseOffset','float'),clockWeight:reference('_wgWalkClockWeight','float'),bind:reference('_wgWalkBindMatrix','mat4'),inverse:reference('_wgWalkInverse','mat4'),duration:reference('_wgWalkDuration','float'),sampleRate:reference('_wgWalkSampleRate','float'),frames:reference('_wgWalkFrames','float'),lastSample:reference('_wgWalkLastSample','float')},fallback=clock?(clock.motionNode??clock.node).mul(references.clockWeight).add(references.phaseOffset).max(0):references.phaseOffset,phase=phaseSource?phaseSource.resolve(fallback):fallback,nodes=bakedWalkNodes(bake,{bind:references.bind,inverse:references.inverse,phase,timing:references});
 graph=Object.freeze({position:Fn(()=>{normalLocal.assign(nodes.normal);return nodes.position;})(),references:Object.freeze(references),recipe});variants.set(recipe.key,graph);return graph;
}

const bakedRigidGraphs=new WeakMap();
function sharedBakedRigidGraph(bake,clock=null,phaseSource=null){
 let clocks=bakedRigidGraphs.get(bake);if(!clocks){clocks=new WeakMap();bakedRigidGraphs.set(bake,clocks);}const key=phaseSource??clock??noClock;let graph=clocks.get(key);if(graph)return graph;
 const offset=reference('_wgWalkPhaseOffset','float'),weight=reference('_wgWalkClockWeight','float'),index=reference('_wgWalkAttachmentIndex','float'),fallback=clock?(clock.motionNode??clock.node).mul(weight).add(offset).max(0):offset,phase=phaseSource?phaseSource.resolve(fallback):fallback,meta=bake.meta,t=phase.mod(meta.duration),a=t.mul(meta.sampleRate).floor().min(meta.frames-2),b=a.add(1),start=a.div(meta.sampleRate),end=b.equal(meta.frames-1).select(meta.sampleTimes.at(-1),b.div(meta.sampleRate)),fraction=t.sub(start).div(end.sub(start).max(.0000001)).clamp(0,1),x=index.add(bake.bones.length).mul(4);
 const frame=row=>mat4(textureLoad(bake.texture,ivec2(x,row)),textureLoad(bake.texture,ivec2(x.add(1),row)),textureLoad(bake.texture,ivec2(x.add(2),row)),textureLoad(bake.texture,ivec2(x.add(3),row))),matrix=frame(a).mul(float(1).sub(fraction)).add(frame(b).mul(fraction));
 graph=Object.freeze({position:Fn(()=>{normalLocal.assign(matrix.transformDirection(normalLocal).xyz);return matrix.mul(vec4(positionLocal,1)).xyz;})()});clocks.set(key,graph);return graph;
}

// One replica per source material and graph, scoped to the owning renderer.
// Progressive texture transitions update the single replica through its lease.
const sharedWalkMaterials=new WeakMap();let nextBakedMaterial=0;
function acquireWalkMaterial(renderer,original,graph,resourceRegistry){
 let graphs=sharedWalkMaterials.get(renderer);if(!graphs){graphs=new WeakMap();sharedWalkMaterials.set(renderer,graphs);}let sources=graphs.get(graph);if(!sources){sources=new WeakMap();graphs.set(graph,sources);}let record=sources.get(original);
 if(!record){const material=original.isNodeMaterial?original.clone():renderer.library.fromMaterial(original);if(!material?.isNodeMaterial||material===original||material.positionNode||material.normalNode){if(material&&material!==original)material.dispose?.();throw Error('Unsupported baked walking material');}material.positionNode=graph.position;let unregister;try{unregister=typeof original._wgRegisterReplica==='function'?original._wgRegisterReplica(material):null;}catch(error){material.dispose();throw error;}let lease;try{if(resourceRegistry){lease=resourceRegistry.adopt({namespace:'baked-walk-material',key:String(++nextBakedMaterial),dispose:()=>material.dispose()});lease.commit();}}catch(error){unregister?.();if(lease)lease.release();else material.dispose();throw error;}record={material,unregister,lease,resourceRegistry,refs:0};sources.set(original,record);}
 if(record.resourceRegistry!==resourceRegistry)throw Error('Baked material resource owner changed');record.refs++;let released=false;return {material:record.material,release(){if(released)return;released=true;if(--record.refs===0){sources.delete(original);record.unregister?.();if(record.lease)record.lease.release();else record.material.dispose();}}};
}

// Opt-in only: separate meshes retain the live rig for attacks and physical
// poses. Materials and geometry are never modified on the source rig.
export function createBakedWalkPresentation({model,root,renderer,bake,confirmedClock=null,phaseSource=null,resourceRegistry=null,sourceMaterial=null}={}){
 if(sourceMaterial!==null&&typeof sourceMaterial!=='function'||resourceRegistry!==null&&typeof resourceRegistry?.adopt!=='function'||!model?.isObject3D||!root?.isObject3D||!renderer?.backend?.isWebGPUBackend||!bake?.texture||confirmedClock!==null&&(!confirmedClock.node?.isNode||!Number.isFinite(confirmedClock.elapsed)))throw TypeError('Invalid baked presentation');
 root.updateWorldMatrix(true,true);const rootInverse=new Matrix4().copy(root.matrixWorld).invert(),meshes=[],rigids=[],leases=[],replicaSources=new Map(),phaseOffset=uniform(0),clockEnabled=uniform(0);let enabled=false,disposed=false;
 try{
  model.traverse(source=>{if(!source.isSkinnedMesh)return;
   const channel=bake.meta.channels.find(c=>c.name===source.name);if(!channel||source.skeleton.bones.map(b=>b.name).join('\0')!==bake.bones.join('\0')||source.bindMatrix.elements.some((value,i)=>!Number.isFinite(value)||Math.abs(value-channel.bindMatrix[i])>1e-6)||bake.meta.boneInverses&&(source.skeleton.boneInverses.length!==bake.bones.length||source.skeleton.boneInverses.some((matrix,bone)=>matrix.elements.some((value,i)=>!Number.isFinite(value)||Math.abs(value-bake.meta.boneInverses[bone*16+i])>1e-6))))throw Error('Unsupported baked walking rig');
   const inverse=new Matrix4().multiplyMatrices(rootInverse,source.matrixWorld).invert(),graph=sharedBakedWalkGraph(bake,confirmedClock,phaseSource);
   const convert=original=>{const lease=acquireWalkMaterial(renderer,original,graph,resourceRegistry);leases.push(lease);replicaSources.set(lease.material,original);return lease.material;};
   const original=sourceMaterial?sourceMaterial(source):source.material,material=Array.isArray(original)?original.map(convert):convert(original),mesh=new Mesh(source.geometry,material);mesh._wgWalkBindMatrix=source.bindMatrix;mesh._wgWalkInverse=inverse;mesh._wgWalkPhaseOffset=phaseOffset.value;mesh._wgWalkClockWeight=clockEnabled.value;mesh._wgWalkDuration=bake.meta.duration;mesh._wgWalkSampleRate=bake.meta.sampleRate;mesh._wgWalkFrames=bake.meta.frames;mesh._wgWalkLastSample=bake.meta.sampleTimes.at(-1);
   mesh.position.copy(source.position);mesh.quaternion.copy(source.quaternion);mesh.scale.copy(source.scale);mesh.matrixAutoUpdate=source.matrixAutoUpdate;if(!source.matrixAutoUpdate)mesh.matrix.copy(source.matrix);mesh.morphTargetInfluences=source.morphTargetInfluences;mesh.morphTargetDictionary=source.morphTargetDictionary;mesh.castShadow=source.castShadow;mesh.receiveShadow=source.receiveShadow;mesh.frustumCulled=false;mesh.visible=false;meshes.push({source,mesh,inverse,proxy:null,visible:source.visible});
  });
  if(!meshes.length||meshes.length!==bake.meta.channels.length)throw Error('Incomplete baked walking rig');for(const item of meshes)item.source.parent.add(item.mesh);
  for(const [index,attachment] of (bake.meta.attachments??[]).entries()){const source=model.getObjectByName(attachment.name);if(!source?.isMesh||source.isSkinnedMesh||source.parent?.name!==attachment.parent)throw Error('Unsupported baked attachment rig');const graph=sharedBakedRigidGraph(bake,confirmedClock,phaseSource),convert=original=>{const lease=acquireWalkMaterial(renderer,original,graph,resourceRegistry);leases.push(lease);replicaSources.set(lease.material,original);return lease.material;},original=sourceMaterial?sourceMaterial(source):source.material,material=Array.isArray(original)?original.map(convert):convert(original),mesh=new Mesh(source.geometry,material);mesh._wgWalkAttachmentIndex=index;mesh._wgWalkPhaseOffset=0;mesh._wgWalkClockWeight=0;mesh.castShadow=source.castShadow;mesh.receiveShadow=source.receiveShadow;mesh.frustumCulled=false;mesh.visible=false;root.add(mesh);rigids.push({source,mesh,visible:source.visible,proxy:null});}
 }catch(error){for(const item of [...meshes,...rigids])item.mesh.removeFromParent();for(const lease of leases)lease.release();throw error;}
 function preparePick(){if(disposed||!enabled)throw Error('Baked walk not active');const f=Math.fround,phase=f(phaseSource?.status().installed?phaseSource.sample():Math.max(0,f(f((confirmedClock?.motionNode??confirmedClock?.node)?.value??0)*f(clockEnabled.value))+f(phaseOffset.value))),t=phase%bake.meta.duration,a=Math.min(Math.floor(t*bake.meta.sampleRate),bake.meta.frames-2),b=a+1,start=a/bake.meta.sampleRate,end=b===bake.meta.frames-1?bake.meta.sampleTimes.at(-1):b/bake.meta.sampleRate,mix=Math.max(0,Math.min(1,(t-start)/Math.max(.0000001,end-start))),data=bake.texture.image.data,bones=bake.bones.length,stride=bones+(bake.meta.attachments?.length??0),input=new Vector3(),v=new Vector4(),sum=new Vector4(),scratch=new Vector4(),matrix=new Matrix4();
  try{for(const item of meshes){const {mesh,source,inverse}=item;if(!item.proxy){const geometry=new BufferGeometry();geometry.setIndex(mesh.geometry.index);for(const [name,attribute] of Object.entries(mesh.geometry.attributes))if(name!=='position'&&name!=='skinIndex'&&name!=='skinWeight'&&name!=='normal')geometry.setAttribute(name,attribute);geometry.setAttribute('position',new BufferAttribute(new Float32Array(mesh.geometry.attributes.position.count*3),3));for(const group of mesh.geometry.groups)geometry.addGroup(group.start,group.count,group.materialIndex);geometry.setDrawRange(mesh.geometry.drawRange.start,mesh.geometry.drawRange.count);const proxy=new Mesh(geometry,mesh.material);proxy.position.copy(mesh.position);proxy.quaternion.copy(mesh.quaternion);proxy.scale.copy(mesh.scale);proxy.matrixAutoUpdate=mesh.matrixAutoUpdate;if(!proxy.matrixAutoUpdate)proxy.matrix.copy(mesh.matrix);proxy.visible=false;mesh.parent.add(proxy);item.proxy=proxy;}const output=item.proxy.geometry.attributes.position,index=source.geometry.attributes.skinIndex,weight=source.geometry.attributes.skinWeight;for(let i=0;i<output.count;i++){mesh.getVertexPosition(i,input);v.set(input.x,input.y,input.z,1).applyMatrix4(source.bindMatrix);sum.set(0,0,0,0);for(let k=0;k<4;k++){const w=weight.getComponent(i,k),bone=index.getComponent(i,k);if(!w)continue;const x=(a*stride+bone)*16,y=(b*stride+bone)*16;for(let n=0;n<16;n++)matrix.elements[n]=data[x+n]*(1-mix)+data[y+n]*mix;sum.addScaledVector(scratch.copy(v).applyMatrix4(matrix),w);}sum.applyMatrix4(inverse);output.setXYZ(i,sum.x,sum.y,sum.z);}output.needsUpdate=true;item.proxy.geometry.computeBoundingSphere();item.proxy.geometry.computeBoundingBox();mesh.visible=false;item.proxy.raycast=mesh.raycast;item.proxy.visible=item.visible;item.proxy.updateWorldMatrix(true,false);}for(const [i,item] of rigids.entries()){if(!item.proxy){item.proxy=new Mesh(item.mesh.geometry,item.mesh.material);item.proxy.matrixAutoUpdate=false;item.proxy.visible=false;root.add(item.proxy);}const x=(a*stride+bones+i)*16,y=(b*stride+bones+i)*16;for(let n=0;n<16;n++)item.proxy.matrix.elements[n]=data[x+n]*(1-mix)+data[y+n]*mix;item.mesh.visible=false;item.proxy.visible=true;item.proxy.updateWorldMatrix(true,false);}}
  catch(error){for(const item of [...meshes,...rigids]){if(item.proxy)item.proxy.visible=false;item.mesh.visible=item.visible;}throw error;}return ()=>{for(const item of [...meshes,...rigids]){if(item.proxy)item.proxy.visible=false;item.mesh.visible=item.visible;}};}
 return {set(time,{advance=true}={}){if(disposed||!Number.isFinite(time)||time<0||typeof advance!=='boolean')throw TypeError('Invalid baked walking phase');if(!enabled){root.updateWorldMatrix(true,true);rootInverse.copy(root.matrixWorld).invert();for(const item of meshes)item.inverse.multiplyMatrices(rootInverse,item.source.matrixWorld).invert();}if(confirmedClock&&advance){const now=(confirmedClock.motionNode??confirmedClock.node).value,offset=time-now,reconstructed=Math.fround(Math.fround(now)+Math.fround(offset)),safe=Number.isFinite(reconstructed)&&reconstructed>=0&&reconstructed<bake.meta.duration&&Math.abs(reconstructed-time)<=.0001;clockEnabled.value=safe?1:0;phaseOffset.value=safe?offset:time;}else{clockEnabled.value=0;phaseOffset.value=time;}for(const {mesh} of [...meshes,...rigids]){mesh._wgWalkPhaseOffset=phaseOffset.value;mesh._wgWalkClockWeight=clockEnabled.value;}for(const item of [...meshes,...rigids]){item.source.visible=false;item.mesh.visible=item.visible;}enabled=true;},motionMeshes(){if(disposed)throw Error('Baked walking presentation disposed');return [...meshes,...rigids].map(item=>item.mesh);},motionReplicaSources(){if(disposed)throw Error('Baked walking presentation disposed');return replicaSources;},admissionObjects(){if(disposed)throw Error('Baked walking presentation disposed');return [...meshes,...rigids].flatMap(item=>[item.source,item.mesh]);},preparePick,isEnabled(){return enabled;},status(){return {enabled,confirmedClock:!!confirmedClock,phaseOffset:phaseOffset.value,clockWeight:clockEnabled.value};},disable(){if(disposed||!enabled)return;for(const item of [...meshes,...rigids]){item.source.visible=item.visible;item.mesh.visible=false;}enabled=false;},dispose(){if(disposed)return;this.disable();disposed=true;for(const item of meshes){item.mesh.removeFromParent();if(item.proxy){item.proxy.removeFromParent();item.proxy.geometry.dispose();}}for(const item of rigids){item.mesh.removeFromParent();item.proxy?.removeFromParent();}for(const lease of leases)lease.release();}};
}
