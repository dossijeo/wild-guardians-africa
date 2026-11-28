import { DataTexture, FloatType, RGBAFormat, NearestFilter, InstancedBufferAttribute } from 'three';
import { attribute,cameraViewMatrix,cameraWorldMatrix,clamp,cross,float,floor,int,ivec2,mat4,mix,modelWorldMatrix,modelWorldMatrixInverse,normalize,reference,select,texture,vec2,vec3,vec4 } from 'three/tsl';
import { FOOTSTEP_SAMPLE_WIDTH,FOOTSTEP_SAMPLE_FRAMES } from './webgpu-footstep-samples.js';

export function createWebGpuFootstepTexture() {
 const result=new DataTexture(new Float32Array(FOOTSTEP_SAMPLE_WIDTH*FOOTSTEP_SAMPLE_FRAMES*4),FOOTSTEP_SAMPLE_WIDTH,FOOTSTEP_SAMPLE_FRAMES,RGBAFormat,FloatType);
 for(let frame=0;frame<97;frame++)for(let slot=0;slot<4;slot++)result.image.data[frame*176+112+slot*16+7]=1;
 result.minFilter=result.magFilter=NearestFilter; result.generateMipmaps=false; result.flipY=false; result.needsUpdate=true;
 return result;
}
export function bindWebGpuFootstepSamples(mesh,texture,birth) {
 mesh._wgFootstepSamples=texture; mesh._wgFootstepBirth=birth;
 mesh._wgFootstepEnabled=0;
 if(!mesh.geometry.getAttribute('wgFootstepSlot'))mesh.geometry.setAttribute('wgFootstepSlot',new InstancedBufferAttribute(new Float32Array([0,1,2,3]),1));
 mesh.geometry.instanceCount=4;
}

// A single graph per effect owner, with per-object texture bindings. Reusing a
// pool slot only uploads data; it neither generates code nor changes topology.
export function createWebGpuFootstepGraph(clock) {
 if(!clock?.isNode)throw TypeError('Footstep playback requires the confirmed GPU clock');
 const placeholder=createWebGpuFootstepTexture(),samples=texture(placeholder).onObjectUpdate(({object})=>object._wgFootstepSamples??placeholder);
 const enabled=reference('_wgFootstepEnabled','float').greaterThan(.5),age=clock.sub(reference('_wgFootstepBirth','float')),phase=clamp(age.mul(60),0,96),lower=floor(phase),upper=lower.add(1).min(96),blend=phase.sub(lower),visible=age.greaterThanEqual(0).and(age.lessThan(1.6));
 const reads=new Map();
 const read=(slot,offset,row)=>{const column=Math.floor(offset/4),key=`${slot.id}/${column}/${row.id}`;let value=reads.get(key);if(!value){value=samples.load(ivec2(int(slot.mul(7).add(column)),int(row))).toVar();reads.set(key,value);}return value.element(offset%4);};
 const scalar=(slot,offset)=>mix(read(slot,offset,lower),read(slot,offset,upper),blend);
 const point=slot=>vec3(scalar(slot,0),scalar(slot,1),scalar(slot,2));
 const order=attribute('wgFootstepSlot','float');
 // Native packing sorts four smoke cards back-to-front. Do the same tiny
 // stable rank in the vertex shader so particle motion needs no CPU sorting.
 const depth=Array.from({length:4},(_,i)=>cameraViewMatrix.mul(modelWorldMatrix).mul(vec4(point(float(i)),1)).z.toVar());
 let slot=float(0);
 for(let i=0;i<4;i++) { let rank=float(0); for(let j=0;j<4;j++)if(i!==j)rank=rank.add(select(depth[j].lessThan(depth[i]).or(depth[j].equal(depth[i]).and(float(j).lessThan(i))),1,0)); slot=select(rank.equal(order),float(i),slot); }
 slot=slot.toVar();
 const group=(offset,count)=>Array.from({length:count},(_,i)=>scalar(slot,offset+i));
 const eye=modelWorldMatrixInverse.mul(vec4(cameraWorldMatrix.element(3).xyz,1)).xyz;
 const right=normalize(modelWorldMatrixInverse.mul(vec4(cameraWorldMatrix.element(0).xyz,0)).xyz),up=normalize(modelWorldMatrixInverse.mul(vec4(cameraWorldMatrix.element(1).xyz,0)).xyz);
 const sprite={pos:point(slot),size:vec2(...group(3,2)),angle:scalar(slot,5),rect:vec4(...group(6,4)),next:vec4(...group(10,4)),color:vec4(...group(14,3),scalar(slot,17).mul(select(visible,1,0))),params:vec4(...group(18,4)),direction:vec3(...group(22,3)),eye,right,up};
 for(const [key,name,type] of [['pos','iPos','vec3'],['size','iSize','vec2'],['angle','iAngle','float'],['rect','iRect','vec4'],['next','iNext','vec4'],['color','iColor','vec4'],['params','iParams','vec4'],['direction','iDirection','vec3']])sprite[key]=select(enabled,sprite[key],attribute(name,type));
 const raw=(column,row)=>samples.load(ivec2(int(order.mul(4).add(28+column)),int(row)));
 const rigidRead=column=>mix(raw(column,lower),raw(column,upper),blend);
 const p=rigidRead(0).xyz,q=normalize(rigidRead(1)),s=rigidRead(2).xyz.mul(select(visible,1,0)).max(.00000001);
 const rotate=v=>v.add(cross(q.xyz,cross(q.xyz,v).add(v.mul(q.w))).mul(2));
 const columns=[vec4(rotate(vec3(s.x,0,0)),0),vec4(rotate(vec3(0,s.y,0)),0),vec4(rotate(vec3(0,0,s.z)),0),vec4(p,1)];
 const transform=mat4(...columns.map((column,i)=>select(enabled,column,attribute('vfxMatrix'+i,'vec4'))));
 return {sprite,rigid:{transform,tint:select(enabled,rigidRead(3).xyz,attribute('vfxInstanceColor','vec3')),opacity:select(enabled,select(visible,rigidRead(0).w,0),1),eye},dispose(){placeholder.dispose();}};
}
