import {pointGuardian} from '../rendering/guardian-pointing.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GuardianFace} from './guardian-face.js';
import {assetUrl} from '../rendering/asset-url.js';
export class Guardian3D {
 constructor(canvas){
  this.canvas=canvas;this.renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
  this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-.56,.56,.56,-.56,.01,10);this.camera.position.set(0,0,2);this.camera.lookAt(0,0,0);
  this.scene.add(new THREE.HemisphereLight(0xfff4dc,0x786b60,2.2));
  const key=new THREE.DirectionalLight(0xffecd9,3);key.position.set(-2,3,4);this.scene.add(key);const fill=new THREE.DirectionalLight(0xd9edff,1.5);fill.position.set(2,1,2);this.scene.add(fill);
  this.eyeTargets={};this.target=new THREE.Vector3(0,.27,2);this.gazeOffset=new THREE.Vector3();this.temp=new THREE.Vector3();this.q=new THREE.Quaternion();this.yAxis=new THREE.Vector3(0,1,0);this.manual={};this.record=null;this.ready=this.load();
 }
 async load(){
  const gltf=await new GLTFLoader().loadAsync(assetUrl('content/guardian/guardian.glb'));
  if(this.disposed){this.release(gltf.scene);return;}
  this.model=gltf.scene;this.scene.add(this.model);this.mixer=new THREE.AnimationMixer(this.model);this.actions=new Map(gltf.animations.map(clip=>[clip.name,this.mixer.clipAction(clip)]));
  for(const a of this.actions.values())a.play();
  this.eyes=['L','R'].map(side=>{const bone=this.model.getObjectByName('Eye'+side)??this.model.getObjectByName('Eye.'+side);return bone?{bone,side,rest:bone.quaternion.clone()}:null;}).filter(Boolean);
  this.face=new GuardianFace(this.model,{resolve:assetUrl});if(this.record)this.face.setRecord(this.record);this.resize();
 }
 setRecord(record){this.record=record;return this.face?.setRecord(record);}
 lookAt(target,side=null){if(side)this.eyeTargets[side]=target.clone();else{this.target.copy(target);this.eyeTargets={};}}
 resize(){const w=Math.max(2,this.canvas.clientWidth),h=Math.max(2,this.canvas.clientHeight);this.renderer.setSize(w,h,false);const a=w/h;const half=Math.max(.56,.36/a);this.camera.left=-half*a;this.camera.right=half*a;this.camera.top=half;this.camera.bottom=-half;this.camera.updateProjectionMatrix();}
 draw({time=0,audio=null,gesture='idle',reduced=false}={}){
  if(!this.model||this.disposed)return;
  const start=performance.now();const speaking=audio&&!audio.ended;const clock=speaking?audio.currentTime:time;
  const event=speaking?this.face.data?.gestures?.find(e=>clock>=e.start&&clock<e.end):null;
  const envelope=event?Math.min(1,(clock-event.start)/.35,(event.end-clock)/.45):0;
  const clip=(this.manual.clip==='Float'||this.manual.clip?.startsWith('Mantle_'))?'Idle':this.manual.clip??event?.clip??'Idle';
  const cloth=this.manual.clip?.startsWith('Mantle_')?this.manual.clip:(['Invoke','Cast'].includes(clip)||clip.startsWith('Spell_'))?'Mantle_Spell':'Mantle_Breeze';
  for(const [name,a] of this.actions){
   a.enabled=name==='Float'||name===cloth||name==='Idle'||name===clip;
   a.weight=reduced?0:(name==='Float'||name===cloth)?1:name==='Idle'?(clip==='Idle'?1:this.manual.clip?0:1-envelope):this.manual.clip?1:envelope;
   a.time=name==='Float'||name.startsWith('Mantle_')||name==='Idle'||this.manual.clip?time%a.getClip().duration:event?Math.min(a.getClip().duration,(clock-event.start)/(event.end-event.start)*a.getClip().duration):0;
  }
  this.mixer.update(0);
  const expression=this.manual.expression??(event?{name:event.expression,value:.35*envelope}:null);
  this.face.update(audio,time,{...this.manual,expression,reduced});
  const pause=speaking?this.face.data?.pauses?.findIndex(p=>clock>=p.start&&clock<=p.end):-1;
  this.gazeOffset.set(!reduced&&pause>=0?(pause%2?-.16:.16):0,0,0);
  this.model.updateMatrixWorld(true);
  if(this.pointTarget)pointGuardian(this.model,this.pointTarget,.9);
  for(const {bone,side,rest} of this.eyes){
   bone.quaternion.copy(rest);bone.parent.updateWorldMatrix(true,false);this.temp.copy(this.eyeTargets[side]??this.target);if(!this.eyeTargets[side])this.temp.add(this.gazeOffset);bone.parent.worldToLocal(this.temp);this.temp.sub(bone.position).applyQuaternion(this.q.copy(rest).invert()).normalize();
   // Local Y is the forward direction of the authored eye bone.
   this.temp.x=THREE.MathUtils.clamp(this.temp.x,-.13,.13);this.temp.z=THREE.MathUtils.clamp(this.temp.z,-.12,.12);this.temp.y=1;this.temp.normalize();this.q.setFromUnitVectors(this.yAxis,this.temp);bone.quaternion.multiply(this.q);
  }
  this.updateMs=performance.now()-start;this.renderer.render(this.scene,this.camera);
 }
 get metrics(){const info=this.renderer.info;return {updateMs:this.updateMs,drawCalls:info.render.calls,triangles:info.render.triangles,geometries:info.memory.geometries,textures:info.memory.textures,bones:this.model?.getObjectByProperty('type','SkinnedMesh')?.skeleton.bones.length};}
 release(root){root.traverse(o=>{o.skeleton?.dispose();o.geometry?.dispose();for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}});}
 dispose(){this.disposed=true;this.face?.dispose();this.mixer?.stopAllAction();if(this.model){this.mixer.uncacheRoot(this.model);this.release(this.model);}this.renderer.dispose();}
}
