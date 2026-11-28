import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {registerNativeBc7Glb} from '../../src/rendering/native-bc7-glb.js';
import {CharacterLod} from '../../src/rendering/character-lod.js';
import {assetUrl} from '../../src/rendering/asset-url.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

try{
 const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setSize(512,512);document.body.append(renderer.domElement);
 if(!renderer.extensions.has('EXT_texture_compression_bptc'))throw Error('BC7 unsupported');
 const ktx=new KTX2Loader().detectSupport(renderer),loader=registerNativeBc7Glb(new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),ktx);
 const original=await loader.loadAsync('/content/character-lod/hyena.glb');
 const native=await loader.loadAsync('/qa/ktx2-fixture/hyena-native.glb');
 function describe(gltf){let meshes=0,skinned=0,bones=0,morphs=0,textures=[];gltf.scene.traverse(o=>{if(o.isMesh){meshes++;if(o.isSkinnedMesh)skinned++;morphs+=Object.keys(o.morphTargetDictionary??{}).length;for(const material of Array.isArray(o.material)?o.material:[o.material])for(const key of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap'])if(material[key])textures.push({key,compressed:!!material[key].isCompressedTexture,channel:material[key].channel});}if(o.isBone)bones++;});return {meshes,skinned,bones,morphs,clips:gltf.animations.map(a=>({name:a.name,duration:a.duration,tracks:a.tracks.length})),textures};}
 function draw(gltf){const scene=new THREE.Scene();scene.background=new THREE.Color(0x737373);scene.add(gltf.scene,new THREE.HemisphereLight(0xffffff,0x444444,2));const box=new THREE.Box3().setFromObject(gltf.scene),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),radius=Math.max(size.x,size.y,size.z);const camera=new THREE.PerspectiveCamera(35,1,.01,10000);camera.position.copy(center).add(new THREE.Vector3(radius*1.8,radius*.9,radius*2.4));camera.lookAt(center);renderer.render(scene,camera);const pixels=new Uint8Array(512*512*4);renderer.getContext().readPixels(0,0,512,512,renderer.getContext().RGBA,renderer.getContext().UNSIGNED_BYTE,pixels);return pixels;}
 function difference(a,b){let sum=0,max=0,changed=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);sum+=d;max=Math.max(max,d);if(d>10)changed++;}return {meanAbsoluteError:sum/a.length,max,channelsAbove10:changed,totalChannels:a.length};}
 const pixels=difference(draw(original),draw(native));
 // CharacterLOD rebinds its bones to the canonical, animated animal in game.
 const source=await loader.loadAsync(assetUrl('/assets/022436860982f39f1bac2989423fcbc9d2be99f6433809ba1f60a664d6be307f.glb'));
 function setup(template){const parent=new THREE.Group(),model=clone(source.scene);parent.add(model);const lod=new CharacterLod(model,template.scene),mixer=new THREE.AnimationMixer(model);return {parent,lod,mixer};}
 const originalLod=setup(original),nativeLod=setup(native),camera=new THREE.OrthographicCamera(-5,5,5,-5,.1,100);camera.position.set(0,5,10);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const animated=[];
 for(const name of ['Walking','Running']){const clip=source.animations.find(c=>c.name===name);if(!clip)throw Error('Missing animation '+name);originalLod.mixer.stopAllAction();nativeLod.mixer.stopAllAction();originalLod.mixer.clipAction(clip).play();nativeLod.mixer.clipAction(clip).play();let first;for(const fraction of [0,.25,.5,.75]){for(const entry of [originalLod,nativeLod]){entry.lod.beforePose();entry.mixer.setTime(clip.duration*fraction);entry.parent.updateMatrixWorld(true);entry.lod.update(camera,512,true);}const frame=draw({scene:originalLod.parent}),movement=first?difference(first,frame):null;first??=frame;animated.push({clip:name,fraction,...difference(frame,draw({scene:nativeLod.parent})),movementFromFirst:movement?.meanAbsoluteError??0});}}
 for(const name of ['Walking','Running'])if(!animated.some(a=>a.clip===name&&a.movementFromFirst>.05))throw Error('Animation produced no visible movement: '+name);
 const info=renderer.getContext().getExtension('WEBGL_debug_renderer_info');window.nativeGlbResult={device:info?renderer.getContext().getParameter(info.UNMASKED_RENDERER_WEBGL):'unknown',original:describe(original),native:describe(native),pixels,animated};
}catch(error){window.nativeGlbError=error.stack||String(error);}
