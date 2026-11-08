import {DataTexture,FloatType,RGBAFormat,NearestFilter} from 'three';
import {attribute,cameraWorldMatrix,float,floor,int,ivec2,modelWorldMatrixInverse,normalize,reference,select,texture,vec2,vec3,vec4,vertexIndex,instanceIndex,varying} from 'three/tsl';

export function createWebGpuCombatTexture(sample=null){const result=new DataTexture(sample?.data??new Float32Array(4096),sample?.width??1024,sample?.height??1,RGBAFormat,FloatType);result.minFilter=result.magFilter=NearestFilter;result.generateMipmaps=false;result.flipY=false;result.needsUpdate=true;return result;}
export function bindWebGpuCombatSamples(object,palette){object._wgCombatSamples=palette;object._wgCombatEnabled=0;object._wgCombatPhase=0;object._wgCombatElapsed=0;object._wgCombatRate=1;object._wgCombatSampleStart=0;object._wgCombatSampleFrames=1;object._wgCombatRows=1;object._wgCombatGeometryOffset=1;object._wgCombatDuration=0;}

export function createWebGpuCombatGraph(clock){
 if(!clock?.isNode)throw TypeError('Combat playback requires confirmed time');
 const placeholder=createWebGpuCombatTexture(),palette=texture(placeholder).onObjectUpdate(({object})=>object._wgCombatSamples??placeholder),enabled=reference('_wgCombatEnabled','float').greaterThan(.5);
 const phase=reference('_wgCombatPhase','float').add(clock.sub(reference('_wgCombatElapsed','float')).mul(reference('_wgCombatRate','float'))).toVar();
 const frame=floor(phase.sub(reference('_wgCombatSampleStart','float')).mul(60).add(.00001)).clamp(0,reference('_wgCombatSampleFrames','float').sub(1)).toVar(),row=frame.mul(reference('_wgCombatRows','float'));
 const load=index=>palette.load(ivec2(int(index.mod(1024)),int(row.add(floor(index.div(1024)))))).toVar();
 const counts=load(float(0)),inTime=phase.greaterThanEqual(0).and(phase.lessThan(reference('_wgCombatDuration','float')));
 const eye=modelWorldMatrixInverse.mul(vec4(cameraWorldMatrix.element(3).xyz,1)).xyz,right=normalize(modelWorldMatrixInverse.mul(vec4(cameraWorldMatrix.element(0).xyz,0)).xyz),up=normalize(modelWorldMatrixInverse.mul(vec4(cameraWorldMatrix.element(1).xyz,0)).xyz);
 const spriteTexels=Array.from({length:7},(_,i)=>load(float(instanceIndex).mul(7).add(1+i))),s=i=>spriteTexels[Math.floor(i/4)].element(i%4),sv=instanceIndex.lessThan(int(counts.x)).and(inTime);
 const sprite={pos:vec3(s(0),s(1),s(2)),size:vec2(s(3),s(4)),angle:s(5),rect:vec4(s(6),s(7),s(8),s(9)),next:vec4(s(10),s(11),s(12),s(13)),color:vec4(s(14),s(15),s(16),s(17).mul(select(sv,1,0))),params:vec4(s(18),s(19),s(20),s(21)),direction:vec3(s(22),s(23),s(24)),eye,right,up};
 for(const [key,name,type]of[['pos','iPos','vec3'],['size','iSize','vec2'],['angle','iAngle','float'],['rect','iRect','vec4'],['next','iNext','vec4'],['color','iColor','vec4'],['params','iParams','vec4'],['direction','iDirection','vec3']])sprite[key]=select(enabled,sprite[key],attribute(name,type));
 const vertexTexels=Array.from({length:3},(_,i)=>load(float(vertexIndex).mul(3).add(reference('_wgCombatGeometryOffset','float')).add(i))),g=i=>vertexTexels[Math.floor(i/4)].element(i%4),gv=vertexIndex.lessThan(int(counts.y)).and(inTime);
 const geometry={position:varying(select(enabled,vec3(g(0),g(1),g(2)),attribute('position','vec3'))),normal:varying(select(enabled,vec3(g(3),g(4),g(5)),attribute('normal','vec3'))),color:varying(select(enabled,vec4(g(6),g(7),g(8),g(9).mul(select(gv,1,0))),attribute('color','vec4'))),kind:varying(select(enabled,g(10),attribute('vfxKind','float'))),eye,time:select(enabled,phase,reference('_wgVfxGeometryTime','float'))};
 return {sprite,geometry,dispose(){placeholder.dispose();}};
}
