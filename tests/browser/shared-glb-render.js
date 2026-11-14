import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
const status=document.querySelector('#status'),gallery=document.querySelector('#gallery');
const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setSize(240,240);renderer.setPixelRatio(1);
const scene=new THREE.Scene();scene.background=new THREE.Color('#25332e');scene.add(new THREE.HemisphereLight(0xffffff,0x53604a,2));const sun=new THREE.DirectionalLight(0xffedce,3);sun.position.set(4,6,5);scene.add(sun);
const camera=new THREE.PerspectiveCamera(40,1,.01,1000),loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const report={scope:'Static same-camera WebGL render comparison, originals versus compiled GLBs; not full gameplay validation.',models:[],errors:[]};
function dispose(root){const gs=new Set(),ms=new Set(),ts=new Set();root.traverse(o=>{if(!o.isMesh)return;gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){ms.add(m);for(const t of Object.values(m))if(t?.isTexture)ts.add(t);}});for(const g of gs)g.dispose();for(const m of ms)m.dispose();for(const t of ts){t.dispose();t.source.data?.close?.();}}
try{
 const names=await(await fetch('/test-results/shared-glb-images/models.json')).json();
 for(const name of names){
  const original=await loader.loadAsync('/'+name),compiled=await loader.loadAsync('/dist/'+name);
  const box=new THREE.Box3().setFromObject(original.scene),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()).length();
  camera.position.copy(center).add(new THREE.Vector3(.7,.4,1).normalize().multiplyScalar(size*1.8));camera.near=Math.max(.001,size/1000);camera.far=size*20;camera.lookAt(center);camera.updateProjectionMatrix();
  const pictures=[],pixels=[];
  for(const model of [original,compiled]){scene.add(model.scene);renderer.render(scene,camera);const data=new Uint8Array(240*240*4);const gl=renderer.getContext();gl.readPixels(0,0,240,240,gl.RGBA,gl.UNSIGNED_BYTE,data);pixels.push(data);pictures.push(renderer.domElement.toDataURL());scene.remove(model.scene);}
  let changed=0,max=0;for(let i=0;i<pixels[0].length;i++){const d=Math.abs(pixels[0][i]-pixels[1][i]);if(d)changed++;max=Math.max(max,d);}
  const row=document.createElement('div');row.style.display='inline-block';row.style.margin='6px';const label=document.createElement('div');label.textContent=name.slice(11,23)+' — original / compilado';row.append(label);for(const src of pictures){const img=new Image();img.src=src;img.width=160;img.height=160;row.append(img);}gallery.append(row);
  report.models.push({name,changedChannels:changed,maxDifference:max});status.textContent=JSON.stringify(report,null,2);dispose(original.scene);dispose(compiled.scene);
 }
 report.passed=report.models.length===names.length&&report.models.every(m=>m.changedChannels===0);
}catch(e){report.errors.push(String(e.stack??e));report.passed=false;}
renderer.dispose();status.textContent=JSON.stringify(report,null,2);
