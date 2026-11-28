import * as THREE from 'three';
import {MeshBasicNodeMaterial} from 'three/webgpu';
import {abs,attribute,cameraProjectionMatrix,cameraViewMatrix,cos,dot,exp,float,max,mix,modelWorldMatrix,positionLocal,pow,sin,uniform,varying,vec2,vec3,vec4} from 'three/tsl';
import {loadingSparklesRecipe} from './webgpu-material-graph-catalog.js';
import {skyNight} from './sky.js';

// Same seeds and billboard animation as LoadingSparkles; no per-frame buffers.
export function createWebGpuLoadingSparkles({scene,admission,count=24,onError=()=>{}}={}){
 if(!scene?.isScene||typeof admission?.prepareAndPublish!=='function'||typeof admission?.deferRelease!=='function'||!Number.isSafeInteger(count)||count<1||typeof onError!=='function')throw TypeError('Invalid loading sparkles');
 const quad=new THREE.PlaneGeometry(1,1),geometry=new THREE.InstancedBufferGeometry();geometry.index=quad.index.clone();for(const [name,value] of Object.entries(quad.attributes))geometry.setAttribute(name,value.clone());quad.dispose();
 const seeds=new Float32Array(count);for(let i=0;i<count;i++)seeds[i]=(i+.5)/count;geometry.setAttribute('aSeed',new THREE.InstancedBufferAttribute(seeds,1));geometry.instanceCount=count;
 const time=uniform(0),night=uniform(0),motion=uniform(1),seed=attribute('aSeed','float'),angle=seed.mul(59.67),phase=time.mul(.24).mul(motion).add(seed.mul(6.2831853));
 const centre=vec3(sin(angle).mul(seed.mul(1.3).add(1.6)).add(sin(phase).mul(.18).mul(motion)),seed.mul(3.8).add(time.mul(.11).mul(motion)).mod(3.5).add(.35),cos(angle).mul(seed.mul(1.6).add(1.2)).add(cos(phase.mul(1.2)).mul(.18).mul(motion)));
 const eye=cameraViewMatrix.mul(modelWorldMatrix).mul(vec4(centre,1)),offset=positionLocal.xy.mul(seed.mul(.055).add(.055)),uv=varying(attribute('uv','vec2')),pulse=varying(pow(sin(phase.mul(1.7)).mul(.5).add(.5),2).mul(.65).add(.35));
 const p=uv.sub(.5).mul(2),r=dot(p,p),core=exp(r.mul(-12)),halo=pow(max(0,float(1).sub(r)),3).mul(.13),cross=exp(abs(p.x).mul(-55)).mul(pow(max(0,float(1).sub(abs(p.y))),5)).add(exp(abs(p.y).mul(-55)).mul(pow(max(0,float(1).sub(abs(p.x))),5))),alpha=core.add(halo).add(cross.mul(.3)).mul(pulse).mul(.72);
 const material=new MeshBasicNodeMaterial(loadingSparklesRecipe().structural.state);material.vertexNode=cameraProjectionMatrix.mul(eye.add(vec4(offset,0,0)));material.colorNode=mix(vec3(1,.83,.38),vec3(.57,.78,1),night);material.opacityNode=alpha;
 const mesh=new THREE.Mesh(geometry,material),abort=new AbortController();mesh.visible=false;mesh.frustumCulled=false;mesh.raycast=()=>{};mesh.renderOrder=20;scene.add(mesh);let closed=false,published=false;
 const ready=Promise.resolve().then(()=>admission.prepareAndPublish(mesh,{signal:abort.signal,shadowPass:false},()=>{if(closed||abort.signal.aborted)throw new DOMException('Loading sparkles cancelled','AbortError');mesh.visible=true;published=true;})).then(()=>true,error=>{if(!closed&&!abort.signal.aborted)onError(error);return false;});
 return {ready,update(state,timeSeconds,reducedMotion=false){if(closed)return;if(!Number.isFinite(timeSeconds)||typeof reducedMotion!=='boolean')throw TypeError('Invalid sparkle clock');time.value=timeSeconds;night.value=skyNight(state);motion.value=reducedMotion?0:1;},status(){return {closed,ready:published};},dispose(){if(closed)return;closed=true;abort.abort();mesh.removeFromParent();admission.deferRelease(mesh,()=>{geometry.dispose();material.dispose();});}};
}
