import * as THREE from 'three';
import {MeshBasicNodeMaterial} from 'three/webgpu';
import {abs,clamp,dot,float,max,mix,normalize,positionLocal,pow,screenUV,smoothstep,uniform,vec2,vec3,vec4} from 'three/tsl';
import {loadingMistRecipe} from './webgpu-material-graph-catalog.js';
import {skyNight} from './sky.js';

// The legacy loading mist is drawn between the sky and the garden. A far-depth
// transparent quad does the same in one scene: opaque soil occludes it, and
// the mountain backdrop is sorted after it. It has no terrain or game state.
export function createWebGpuLoadingMist({scene,camera,admission,onError=()=>{}}={}){
 if(!scene?.isScene||!camera?.isPerspectiveCamera||typeof admission?.prepareAndPublish!=='function'||typeof admission?.deferRelease!=='function'||typeof onError!=='function')throw TypeError('Invalid loading mist');
 const abort=new AbortController(),forward=uniform(new THREE.Vector3()),right=uniform(new THREE.Vector3()),up=uniform(new THREE.Vector3()),scale=uniform(new THREE.Vector2()),eye=uniform(1),night=uniform(0),fog=uniform(new THREE.Color()),focus=uniform(new THREE.Vector2(.5,.5)),focusAmount=uniform(1),aspect=uniform(1);
 const day=new THREE.Color('#e6d5b5'),dark=new THREE.Color('#26364a'),projected=new THREE.Vector3(),geometry=new THREE.PlaneGeometry(2,2),material=new MeshBasicNodeMaterial(loadingMistRecipe().structural.state);
 const screen=vec2(screenUV.x.mul(2).sub(1),float(1).sub(screenUV.y.mul(2))),ray=normalize(forward.add(right.mul(screen.x).mul(scale.x)).add(up.mul(screen.y).mul(scale.y))),distance=eye.div(max(.015,ray.y.negate())),distant=smoothstep(7,24,distance),below=float(1).sub(smoothstep(-.28,.025,ray.y)),opacity=below.mul(mix(.86,.96,distant));
 const shaftWidth=float(.12).add(float(.2).mul(float(1).sub(screen.y))),shaftBase=max(0,float(1).sub(abs(screen.x.add(.06)).div(shaftWidth)));
 const shaft=pow(shaftBase,3).mul(smoothstep(-.38,.65,screen.y)).mul(mix(.42,.16,night)).mul(float(1).sub(smoothstep(.2,.85,forward.y))),light=mix(vec3(1,.92,.68),vec3(.5,.66,.92),night),air=night.mul(.28).mul(float(1).sub(below)).mul(float(1).sub(smoothstep(.2,.85,forward.y))),alpha=opacity.add(shaft.add(air).mul(float(1).sub(opacity))),haze=mix(fog,vec3(.08,.14,.3),air.div(max(.001,alpha))),color=mix(haze,light,shaft.div(max(.001,alpha)));
 const offset=vec2(screenUV.x, float(1).sub(screenUV.y)).sub(focus),scaled=vec2(offset.x.mul(aspect),offset.y),edge=smoothstep(.028,.42,dot(scaled,scaled)).mul(focusAmount),shade=edge.mul(mix(.30,.28,night)),shadedAlpha=alpha.add(float(1).sub(alpha).mul(shade));
 material.vertexNode=vec4(positionLocal.xy,1,1);material.outputNode=vec4(color.mul(mix(1,.70,edge)).mul(alpha).div(max(.001,shadedAlpha)),shadedAlpha);
 const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.visible=false;mesh.renderOrder=-1100;mesh.raycast=()=>{};scene.add(mesh);let closed=false,published=false;
 const release=()=>{geometry.dispose();material.dispose();};
 const ready=Promise.resolve().then(()=>admission.prepareAndPublish(mesh,{signal:abort.signal,shadowPass:false},()=>{if(closed||abort.signal.aborted)throw new DOMException('Loading mist cancelled','AbortError');mesh.visible=true;published=true;})).then(()=>true,error=>{if(!closed&&!abort.signal.aborted)onError(error);return false;});
 return {ready,update(state){if(closed)return;camera.updateMatrixWorld();camera.getWorldDirection(forward.value);right.value.setFromMatrixColumn(camera.matrixWorld,0);up.value.setFromMatrixColumn(camera.matrixWorld,1);const view=Math.tan(THREE.MathUtils.degToRad(camera.fov)*.5);scale.value.set(view*camera.aspect,view);aspect.value=camera.aspect;eye.value=Math.max(.1,camera.position.y);night.value=skyNight(state);fog.value.copy(day).lerp(dark,night.value).convertLinearToSRGB();projected.set(0,1.15,0).project(camera);focus.value.set(Number.isFinite(projected.x)?(projected.x+1)/2:.5,Number.isFinite(projected.y)?(projected.y+1)/2:.5);focusAmount.value=1-THREE.MathUtils.smoothstep(forward.value.y,.08,.72);},status(){return {closed,ready:published};},dispose(){if(closed)return;closed=true;abort.abort();scene.remove(mesh);admission.deferRelease(mesh,release);}};
}
