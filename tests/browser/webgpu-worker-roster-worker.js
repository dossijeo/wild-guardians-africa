import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {createWebGpuWorkerBank} from '../../src/rendering/webgpu-worker-bank.js';
import {createWebGpuWorkerRoster} from '../../src/rendering/webgpu-worker-roster.js';
let renderer,roster,scene,camera;
self.onmessage=async({data})=>{try{if(data.kind==='init'){
 const original=OffscreenCanvas.prototype.getContext;OffscreenCanvas.prototype.getContext=function(kind,...args){if(/^webgl/i.test(kind))throw Error('WebGL forbidden');return original.call(this,kind,...args);};
 renderer=new WebGPURenderer({canvas:data.canvas});await renderer.init();if(!renderer.backend?.isWebGPUBackend)throw Error('WebGPU unavailable');renderer.setSize(512,512,false);scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xffffff,0x777777,2));const worker=data.state.workers[0];camera=new THREE.PerspectiveCamera(45,1,.1,300);camera.coordinateSystem=renderer.coordinateSystem;camera.position.set(worker.x+6,4,worker.z+9);camera.lookAt(worker.x,1,worker.z);camera.updateProjectionMatrix();const bank=createWebGpuWorkerBank({renderer});roster=createWebGpuWorkerRoster({scene,residency:{get:()=>null},state:data.state,assetBank:bank,onError:e=>self.postMessage({kind:'error',message:String(e?.stack??e)})});roster.sync();self.postMessage({kind:'ready'});
 }else if(data.kind==='inspect'){roster.tick(performance.now());const status=roster.status();if(status.ready){renderer.render(scene,camera);}self.postMessage({kind:'inspect',id:data.id,status,draws:renderer.info.render.drawCalls});}else if(data.kind==='dispose'){roster.dispose();renderer.dispose();close();}
 }catch(e){self.postMessage({kind:'error',message:String(e?.stack??e)});}};
