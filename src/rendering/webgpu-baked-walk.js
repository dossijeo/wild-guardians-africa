import {BufferAttribute,BufferGeometry,DataTexture,FloatType,Matrix4,Mesh,NearestFilter,RGBAFormat,Vector3,Vector4} from 'three';
import {Fn,attribute,float,ivec2,mat4,reference,normalLocal,positionLocal,textureLoad,uniform,vec4} from 'three/tsl';
import {ANIMAL_ACTIONS} from '../simulation/animal-actions-data.js';
import {hasBakedWorkerWalk} from './baked-worker-walk-profiles.js';

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
function createPackedBakedWalkTexture(meta,buffer){
 if(meta.sharedMatrixChannels!==1||!Number.isInteger(meta.frames)||meta.frames<2||!Number.isInteger(meta.strideFloats)||!Number.isFinite(meta.duration)||meta.duration<=0||!Number.isFinite(meta.sampleRate)||meta.sampleRate<=0||!Array.isArray(meta.channels)||!meta.channels.length||!Array.isArray(meta.sampleTimes)||meta.sampleTimes.length!==meta.frames||!(buffer instanceof ArrayBuffer)||meta.byteLength!==buffer.byteLength||buffer.byteLength!==meta.frames*meta.strideFloats*4)throw TypeError('Invalid baked walking data');
 const channel=meta.channels[0],bones=channel?.bones?.length,offset=channel?.matrixOffset;
 if(!Array.isArray(channel?.bones)||!Number.isInteger(bones)||bones<1||channel.bones.some(name=>typeof name!=='string'||!name)||!Number.isInteger(offset)||offset<0||offset+bones*16>meta.strideFloats||meta.boneInverses!==undefined&&(!Array.isArray(meta.boneInverses)||meta.boneInverses.length!==bones*16||!meta.boneInverses.every(Number.isFinite))||meta.channels.some(c=>typeof c?.name!=='string'||!c.name||!Array.isArray(c.bones)||!Array.isArray(c.bindMatrix)||c.bindMatrix.length!==16||!c.bindMatrix.every(Number.isFinite)||c.matrixOffset!==offset||c.bones.join('\0')!==channel.bones.join('\0'))||new Set(meta.channels.map(c=>c.name)).size!==meta.channels.length||meta.frames!==Math.ceil(meta.duration*meta.sampleRate)+1||meta.sampleTimes.some((t,i)=>!Number.isFinite(t)||t<0||t>=meta.duration||i>0&&t<=meta.sampleTimes[i-1]||i<meta.frames-1&&Math.abs(t-i/meta.sampleRate)>1e-9))throw TypeError('Unsupported baked walking channels');
 const source=new Float32Array(buffer),width=bones*4,data=new Float32Array(width*meta.frames*4);
 for(let frame=0;frame<meta.frames;frame++)data.set(source.subarray(frame*meta.strideFloats+offset,frame*meta.strideFloats+offset+bones*16),frame*bones*16);
 if(!data.every(Number.isFinite))throw TypeError('Non-finite baked walking matrix');
 const safeMeta=structuredClone(meta);Object.freeze(safeMeta.sampleTimes);if(safeMeta.boneInverses)Object.freeze(safeMeta.boneInverses);for(const item of safeMeta.channels){Object.freeze(item.bones);Object.freeze(item.bindMatrix);if(Array.isArray(item.bindMatrixInverse))Object.freeze(item.bindMatrixInverse);Object.freeze(item);}Object.freeze(safeMeta.channels);Object.freeze(safeMeta);
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
export function sharedBakedWalkGraph(bake,clock=null){
 if(!bake?.texture?.isDataTexture||clock!==null&&(!clock.node?.isNode||!Number.isFinite(clock.elapsed)))throw TypeError('Invalid shared baked walking graph');
 let clocks=bakedWalkGraphs.get(bake);if(!clocks){clocks=new WeakMap();bakedWalkGraphs.set(bake,clocks);}const key=clock??noClock;let graph=clocks.get(key);if(graph)return graph;
 const references={phaseOffset:reference('_wgWalkPhaseOffset','float'),clockWeight:reference('_wgWalkClockWeight','float'),bind:reference('_wgWalkBindMatrix','mat4'),inverse:reference('_wgWalkInverse','mat4'),duration:reference('_wgWalkDuration','float'),sampleRate:reference('_wgWalkSampleRate','float'),frames:reference('_wgWalkFrames','float'),lastSample:reference('_wgWalkLastSample','float')},phase=clock?(clock.motionNode??clock.node).mul(references.clockWeight).add(references.phaseOffset).max(0):references.phaseOffset,nodes=bakedWalkNodes(bake,{bind:references.bind,inverse:references.inverse,phase,timing:references});
 graph=Object.freeze({position:Fn(()=>{normalLocal.assign(nodes.normal);return nodes.position;})(),references:Object.freeze(references)});clocks.set(key,graph);return graph;
}

// One replica per source material and graph, scoped to the owning renderer.
// Progressive texture transitions update the single replica through its lease.
const sharedWalkMaterials=new WeakMap();
function acquireWalkMaterial(renderer,original,graph){
 let graphs=sharedWalkMaterials.get(renderer);if(!graphs){graphs=new WeakMap();sharedWalkMaterials.set(renderer,graphs);}let sources=graphs.get(graph);if(!sources){sources=new WeakMap();graphs.set(graph,sources);}let record=sources.get(original);
 if(!record){const material=original.isNodeMaterial?original.clone():renderer.library.fromMaterial(original);if(!material?.isNodeMaterial||material===original||material.positionNode||material.normalNode){if(material&&material!==original)material.dispose?.();throw Error('Unsupported baked walking material');}material.positionNode=graph.position;let unregister;try{unregister=typeof original._wgRegisterReplica==='function'?original._wgRegisterReplica(material):null;}catch(error){material.dispose();throw error;}record={material,unregister,refs:0};sources.set(original,record);}
 record.refs++;let released=false;return {material:record.material,release(){if(released)return;released=true;if(--record.refs===0){sources.delete(original);record.unregister?.();record.material.dispose();}}};
}

// Opt-in only: separate meshes retain the live rig for attacks and physical
// poses. Materials and geometry are never modified on the source rig.
export function createBakedWalkPresentation({model,root,renderer,bake,confirmedClock=null}={}){
 if(!model?.isObject3D||!root?.isObject3D||!renderer?.backend?.isWebGPUBackend||!bake?.texture||confirmedClock!==null&&(!confirmedClock.node?.isNode||!Number.isFinite(confirmedClock.elapsed)))throw TypeError('Invalid baked presentation');
 root.updateWorldMatrix(true,true);const rootInverse=new Matrix4().copy(root.matrixWorld).invert(),meshes=[],leases=[],phaseOffset=uniform(0),clockEnabled=uniform(0);let enabled=false,disposed=false;
 try{
  model.traverse(source=>{if(!source.isSkinnedMesh)return;
   const channel=bake.meta.channels.find(c=>c.name===source.name);if(!channel||source.skeleton.bones.map(b=>b.name).join('\0')!==bake.bones.join('\0')||source.bindMatrix.elements.some((value,i)=>!Number.isFinite(value)||Math.abs(value-channel.bindMatrix[i])>1e-6)||bake.meta.boneInverses&&(source.skeleton.boneInverses.length!==bake.bones.length||source.skeleton.boneInverses.some((matrix,bone)=>matrix.elements.some((value,i)=>!Number.isFinite(value)||Math.abs(value-bake.meta.boneInverses[bone*16+i])>1e-6))))throw Error('Unsupported baked walking rig');
   const inverse=new Matrix4().multiplyMatrices(rootInverse,source.matrixWorld).invert(),graph=sharedBakedWalkGraph(bake,confirmedClock);
   const convert=original=>{const lease=acquireWalkMaterial(renderer,original,graph);leases.push(lease);return lease.material;};
   const material=Array.isArray(source.material)?source.material.map(convert):convert(source.material),mesh=new Mesh(source.geometry,material);mesh._wgWalkBindMatrix=source.bindMatrix;mesh._wgWalkInverse=inverse;mesh._wgWalkPhaseOffset=phaseOffset.value;mesh._wgWalkClockWeight=clockEnabled.value;mesh._wgWalkDuration=bake.meta.duration;mesh._wgWalkSampleRate=bake.meta.sampleRate;mesh._wgWalkFrames=bake.meta.frames;mesh._wgWalkLastSample=bake.meta.sampleTimes.at(-1);
   mesh.position.copy(source.position);mesh.quaternion.copy(source.quaternion);mesh.scale.copy(source.scale);mesh.matrixAutoUpdate=source.matrixAutoUpdate;if(!source.matrixAutoUpdate)mesh.matrix.copy(source.matrix);mesh.morphTargetInfluences=source.morphTargetInfluences;mesh.morphTargetDictionary=source.morphTargetDictionary;mesh.castShadow=source.castShadow;mesh.receiveShadow=source.receiveShadow;mesh.frustumCulled=false;mesh.visible=false;meshes.push({source,mesh,inverse,proxy:null,visible:source.visible});
  });
  if(!meshes.length||meshes.length!==bake.meta.channels.length)throw Error('Incomplete baked walking rig');for(const item of meshes)item.source.parent.add(item.mesh);
 }catch(error){for(const item of meshes)item.mesh.removeFromParent();for(const lease of leases)lease.release();throw error;}
 function preparePick(){if(disposed||!enabled)throw Error('Baked walk not active');const f=Math.fround,phase=f(Math.max(0,f(f((confirmedClock?.motionNode??confirmedClock?.node)?.value??0)*f(clockEnabled.value))+f(phaseOffset.value))),t=phase%bake.meta.duration,a=Math.min(Math.floor(t*bake.meta.sampleRate),bake.meta.frames-2),b=a+1,start=a/bake.meta.sampleRate,end=b===bake.meta.frames-1?bake.meta.sampleTimes.at(-1):b/bake.meta.sampleRate,mix=Math.max(0,Math.min(1,(t-start)/Math.max(.0000001,end-start))),data=bake.texture.image.data,bones=bake.bones.length,input=new Vector3(),v=new Vector4(),sum=new Vector4(),scratch=new Vector4(),matrix=new Matrix4();
  try{for(const item of meshes){const {mesh,source,inverse}=item;if(!item.proxy){const geometry=new BufferGeometry();geometry.setIndex(mesh.geometry.index);for(const [name,attribute] of Object.entries(mesh.geometry.attributes))if(name!=='position'&&name!=='skinIndex'&&name!=='skinWeight'&&name!=='normal')geometry.setAttribute(name,attribute);geometry.setAttribute('position',new BufferAttribute(new Float32Array(mesh.geometry.attributes.position.count*3),3));for(const group of mesh.geometry.groups)geometry.addGroup(group.start,group.count,group.materialIndex);geometry.setDrawRange(mesh.geometry.drawRange.start,mesh.geometry.drawRange.count);const proxy=new Mesh(geometry,mesh.material);proxy.position.copy(mesh.position);proxy.quaternion.copy(mesh.quaternion);proxy.scale.copy(mesh.scale);proxy.matrixAutoUpdate=mesh.matrixAutoUpdate;if(!proxy.matrixAutoUpdate)proxy.matrix.copy(mesh.matrix);proxy.visible=false;mesh.parent.add(proxy);item.proxy=proxy;}const output=item.proxy.geometry.attributes.position,index=source.geometry.attributes.skinIndex,weight=source.geometry.attributes.skinWeight;for(let i=0;i<output.count;i++){mesh.getVertexPosition(i,input);v.set(input.x,input.y,input.z,1).applyMatrix4(source.bindMatrix);sum.set(0,0,0,0);for(let k=0;k<4;k++){const w=weight.getComponent(i,k),bone=index.getComponent(i,k);if(!w)continue;const x=(a*bones+bone)*16,y=(b*bones+bone)*16;for(let n=0;n<16;n++)matrix.elements[n]=data[x+n]*(1-mix)+data[y+n]*mix;sum.addScaledVector(scratch.copy(v).applyMatrix4(matrix),w);}sum.applyMatrix4(inverse);output.setXYZ(i,sum.x,sum.y,sum.z);}output.needsUpdate=true;item.proxy.geometry.computeBoundingSphere();item.proxy.geometry.computeBoundingBox();mesh.visible=false;item.proxy.visible=item.visible;item.proxy.updateWorldMatrix(true,false);}}
  catch(error){for(const item of meshes){if(item.proxy)item.proxy.visible=false;item.mesh.visible=item.visible;}throw error;}return ()=>{for(const item of meshes){if(item.proxy)item.proxy.visible=false;item.mesh.visible=item.visible;}};}
 return {set(time,{advance=true}={}){if(disposed||!Number.isFinite(time)||time<0||typeof advance!=='boolean')throw TypeError('Invalid baked walking phase');if(confirmedClock&&advance){const now=(confirmedClock.motionNode??confirmedClock.node).value,offset=time-now,reconstructed=Math.fround(Math.fround(now)+Math.fround(offset)),safe=Number.isFinite(reconstructed)&&reconstructed>=0&&reconstructed<bake.meta.duration&&Math.abs(reconstructed-time)<=.0001;clockEnabled.value=safe?1:0;phaseOffset.value=safe?offset:time;}else{clockEnabled.value=0;phaseOffset.value=time;}for(const {mesh} of meshes){mesh._wgWalkPhaseOffset=phaseOffset.value;mesh._wgWalkClockWeight=clockEnabled.value;}for(const item of meshes){item.source.visible=false;item.mesh.visible=item.visible;}enabled=true;},admissionObjects(){if(disposed)throw Error('Baked walking presentation disposed');return meshes.flatMap(item=>[item.source,item.mesh]);},preparePick,isEnabled(){return enabled;},status(){return {enabled,confirmedClock:!!confirmedClock,phaseOffset:phaseOffset.value,clockWeight:clockEnabled.value};},disable(){if(disposed||!enabled)return;for(const item of meshes){item.source.visible=item.visible;item.mesh.visible=false;}enabled=false;},dispose(){if(disposed)return;this.disable();disposed=true;for(const item of meshes){item.mesh.removeFromParent();if(item.proxy){item.proxy.removeFromParent();item.proxy.geometry.dispose();}}for(const lease of leases)lease.release();}};
}
