import {DataTexture,FloatType,Matrix4,Mesh,NearestFilter,RGBAFormat} from 'three';
import {Fn,attribute,float,ivec2,mat4,normalLocal,positionLocal,textureLoad,uniform,vec4} from 'three/tsl';

// Experimental building block for a non-skinned presentation mesh. The source
// SkinnedMesh must remain available for physical poses and unsupported clips.
// It is deliberately not installed on SkinnedMesh: Three's WebGPU renderer
// would otherwise run its own skinning before this position node.
export function createBakedWalkTexture(meta,buffer){
 if(meta?.species!=='hyena'||meta.clip!=='Walking'||meta.sharedMatrixChannels!==1||!Number.isInteger(meta.frames)||meta.frames<2||!Number.isInteger(meta.strideFloats)||!Number.isFinite(meta.duration)||meta.duration<=0||!Number.isFinite(meta.sampleRate)||meta.sampleRate<=0||!Array.isArray(meta.channels)||!meta.channels.length||!Array.isArray(meta.sampleTimes)||meta.sampleTimes.length!==meta.frames||!(buffer instanceof ArrayBuffer)||meta.byteLength!==buffer.byteLength||buffer.byteLength!==meta.frames*meta.strideFloats*4)throw TypeError('Invalid baked walking data');
 const channel=meta.channels[0],bones=channel?.bones?.length,offset=channel?.matrixOffset;
 if(!Number.isInteger(bones)||bones<1||!Number.isInteger(offset)||offset<0||offset+bones*16>meta.strideFloats||meta.channels.some(c=>c.matrixOffset!==offset||c.bones?.join('\0')!==channel.bones.join('\0'))||meta.sampleTimes.some((t,i)=>!Number.isFinite(t)||t<0||t>=meta.duration||i>0&&t<=meta.sampleTimes[i-1]))throw TypeError('Unsupported baked walking channels');
 const source=new Float32Array(buffer),width=bones*4,data=new Float32Array(width*meta.frames*4);
 for(let frame=0;frame<meta.frames;frame++)data.set(source.subarray(frame*meta.strideFloats+offset,frame*meta.strideFloats+offset+bones*16),frame*bones*16);
 if(!data.every(Number.isFinite))throw TypeError('Non-finite baked walking matrix');
 const texture=new DataTexture(data,width,meta.frames,RGBAFormat,FloatType);texture.minFilter=texture.magFilter=NearestFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
 return {texture,meta,bones:channel.bones.slice(),dispose(){texture.dispose();}};
}

// Matrices are the canonical Skeleton.update output (bone world * inverse
// bind). canonicalMeshInverse maps that canonical world into this mesh's local
// frame, as in the already-validated WebGL research prototype. The caller owns
// the phase and must keep it within confirmed simulation time.
export function createBakedWalkNodes(bake,{bindMatrix,canonicalMeshInverse,phase=uniform(0)}={}){
 if(!bake?.texture?.isDataTexture||!bindMatrix?.isMatrix4||!canonicalMeshInverse?.isMatrix4||!phase?.isNode)throw TypeError('Invalid baked walking binding');
 const {texture,meta}=bake,index=attribute('skinIndex','uvec4'),weight=attribute('skinWeight','vec4');
 const t=phase.mod(meta.duration),a=t.mul(meta.sampleRate).floor().min(meta.frames-2),b=a.add(1),start=a.div(meta.sampleRate),end=b.equal(meta.frames-1).select(float(meta.sampleTimes.at(-1)),b.div(meta.sampleRate)),fraction=t.sub(start).div(end.sub(start).max(.0000001)).clamp(0,1);
 function frame(bone,row){const x=bone.mul(4);return mat4(textureLoad(texture,ivec2(x,row)),textureLoad(texture,ivec2(x.add(1),row)),textureLoad(texture,ivec2(x.add(2),row)),textureLoad(texture,ivec2(x.add(3),row)));}
 function bone(i){return frame(i,a).mul(float(1).sub(fraction)).add(frame(i,b).mul(fraction));}
 const matrix=bone(index.x).mul(weight.x).add(bone(index.y).mul(weight.y)).add(bone(index.z).mul(weight.z)).add(bone(index.w).mul(weight.w));
 const local=uniform(canonicalMeshInverse).mul(matrix).mul(uniform(bindMatrix));
 return {phase,position:local.mul(vec4(positionLocal,1)).xyz,normal:local.transformDirection(normalLocal).xyz};
}

// Opt-in only: separate meshes retain the live rig for attacks and physical
// poses. Materials and geometry are never modified on the source rig.
export function createBakedWalkPresentation({model,root,renderer,bake,confirmedClock=null}={}){
 if(!model?.isObject3D||!root?.isObject3D||!renderer?.backend?.isWebGPUBackend||!bake?.texture||confirmedClock!==null&&(!confirmedClock.node?.isNode||!Number.isFinite(confirmedClock.elapsed)))throw TypeError('Invalid baked presentation');
 root.updateWorldMatrix(true,true);const rootInverse=new Matrix4().copy(root.matrixWorld).invert(),meshes=[],materials=[],phaseOffset=uniform(0),clockEnabled=uniform(0),phase=confirmedClock?confirmedClock.node.mul(clockEnabled).add(phaseOffset).max(0):phaseOffset;let enabled=false,disposed=false;
 try{
  model.traverse(source=>{if(!source.isSkinnedMesh)return;
   const channel=bake.meta.channels.find(c=>c.name===source.name);if(!channel||source.skeleton.bones.map(b=>b.name).join('\0')!==bake.bones.join('\0'))throw Error('Unsupported baked walking rig');
   const inverse=new Matrix4().multiplyMatrices(rootInverse,source.matrixWorld).invert(),nodes=createBakedWalkNodes(bake,{bindMatrix:source.bindMatrix,canonicalMeshInverse:inverse,phase});
   const convert=original=>{const material=original.isNodeMaterial?original.clone():renderer.library.fromMaterial(original);if(!material?.isNodeMaterial||material.positionNode||material.normalNode)throw Error('Unsupported baked walking material');material.positionNode=Fn(()=>{normalLocal.assign(nodes.normal);return nodes.position;})();materials.push(material);return material;};
   const material=Array.isArray(source.material)?source.material.map(convert):convert(source.material),mesh=new Mesh(source.geometry,material);
   mesh.position.copy(source.position);mesh.quaternion.copy(source.quaternion);mesh.scale.copy(source.scale);mesh.matrixAutoUpdate=source.matrixAutoUpdate;if(!source.matrixAutoUpdate)mesh.matrix.copy(source.matrix);mesh.morphTargetInfluences=source.morphTargetInfluences;mesh.morphTargetDictionary=source.morphTargetDictionary;mesh.castShadow=source.castShadow;mesh.receiveShadow=source.receiveShadow;mesh.frustumCulled=false;mesh.visible=false;meshes.push({source,mesh,visible:source.visible});
  });
  if(!meshes.length||meshes.length!==bake.meta.channels.length)throw Error('Incomplete baked walking rig');for(const item of meshes)item.source.parent.add(item.mesh);
 }catch(error){for(const item of meshes)item.mesh.removeFromParent();for(const material of materials)material.dispose();throw error;}
 return {set(time){if(disposed||!Number.isFinite(time)||time<0)throw TypeError('Invalid baked walking phase');if(confirmedClock){const now=confirmedClock.elapsed,offset=time-now,reconstructed=Math.fround(Math.fround(now)+Math.fround(offset)),safe=Number.isFinite(reconstructed)&&reconstructed>=0&&reconstructed<bake.meta.duration&&Math.abs(reconstructed-time)<=.0001;clockEnabled.value=safe?1:0;phaseOffset.value=safe?offset:time;}else phaseOffset.value=time;for(const item of meshes){item.source.visible=false;item.mesh.visible=item.visible;}enabled=true;},isEnabled(){return enabled;},status(){return {enabled,confirmedClock:!!confirmedClock,phaseOffset:phaseOffset.value,clockWeight:clockEnabled.value};},disable(){if(disposed||!enabled)return;for(const item of meshes){item.source.visible=item.visible;item.mesh.visible=false;}enabled=false;},dispose(){if(disposed)return;this.disable();disposed=true;for(const item of meshes)item.mesh.removeFromParent();for(const material of materials)material.dispose();}};
}
