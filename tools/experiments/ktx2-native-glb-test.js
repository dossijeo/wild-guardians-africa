import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
import {registerNativeBc7Glb} from './native_glb_plugin.js';

try{
 const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setSize(512,512);document.body.append(renderer.domElement);
 if(!renderer.extensions.has('EXT_texture_compression_bptc'))throw Error('BC7 unsupported');
 const ktx=new KTX2Loader().detectSupport(renderer),loader=registerNativeBc7Glb(new GLTFLoader(),ktx);
 const original=await loader.loadAsync('/content/character-lod/hyena.glb');
 const native=await loader.loadAsync('/qa/ktx2-fixture/hyena-native.glb');
 function describe(gltf){let meshes=0,skinned=0,bones=0,morphs=0,textures=[];gltf.scene.traverse(o=>{if(o.isMesh){meshes++;if(o.isSkinnedMesh)skinned++;morphs+=Object.keys(o.morphTargetDictionary??{}).length;for(const material of Array.isArray(o.material)?o.material:[o.material])for(const key of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap'])if(material[key])textures.push({key,compressed:!!material[key].isCompressedTexture,channel:material[key].channel});}if(o.isBone)bones++;});return {meshes,skinned,bones,morphs,clips:gltf.animations.map(a=>({name:a.name,duration:a.duration,tracks:a.tracks.length})),textures};}
 function draw(gltf){const scene=new THREE.Scene();scene.background=new THREE.Color(0x737373);scene.add(gltf.scene,new THREE.HemisphereLight(0xffffff,0x444444,2));const box=new THREE.Box3().setFromObject(gltf.scene),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),radius=Math.max(size.x,size.y,size.z);const camera=new THREE.PerspectiveCamera(35,1,.01,10000);camera.position.copy(center).add(new THREE.Vector3(radius*1.8,radius*.9,radius*2.4));camera.lookAt(center);renderer.render(scene,camera);const pixels=new Uint8Array(512*512*4);renderer.getContext().readPixels(0,0,512,512,renderer.getContext().RGBA,renderer.getContext().UNSIGNED_BYTE,pixels);return pixels;}
 const a=draw(original),b=draw(native);let sum=0,max=0,changed=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);sum+=d;max=Math.max(max,d);if(d>10)changed++;}
 const info=renderer.getContext().getExtension('WEBGL_debug_renderer_info');window.nativeGlbResult={device:info?renderer.getContext().getParameter(info.UNMASKED_RENDERER_WEBGL):'unknown',original:describe(original),native:describe(native),pixels:{meanAbsoluteError:sum/a.length,max,channelsAbove10:changed,totalChannels:a.length}};
}catch(error){window.nativeGlbError=error.stack||String(error);}
