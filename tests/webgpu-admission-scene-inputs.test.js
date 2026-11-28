import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import Nodes from 'three/src/renderers/common/nodes/Nodes.js';
import {uniform} from 'three/tsl';
import {createWebGpuPipelineAdmission} from '../src/rendering/webgpu-pipeline-admission.js';

const turn=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),mesh=new THREE.Mesh(),point=new THREE.PointLight(),parent=new THREE.Group(),jobs=[];parent.add(point);scene.add(parent);scene.fog=new THREE.Fog(0x667788,1,30);
 const renderer={backend:{isWebGPUBackend:true},info:{calls:1},shadowMap:{enabled:false},getOutputRenderTarget:()=>null,compileAsync(){return new Promise(resolve=>jobs.push(resolve));}};renderer._nodes=new Nodes(renderer,{});
 const admission=createWebGpuPipelineAdmission({renderer,scene,camera,shadowLights:[],sharedSceneLighting:true});
 return {scene,camera,mesh,point,parent,jobs,renderer,admission,async ticket(){const task=admission.prepareTicket(mesh);await turn();jobs.at(-1)();return task;},close(){admission.dispose();mesh.geometry.dispose();mesh.material.dispose();}};
}

const changes={fog:f=>{f.scene.fog=new THREE.FogExp2(0x223344,.02);},environment:f=>{f.scene.environment=new THREE.Texture();},fogNode:f=>{f.scene.fogNode=uniform(.3);},environmentNode:f=>{f.scene.environmentNode=uniform(.4);},lightAdded:f=>f.scene.add(new THREE.HemisphereLight()),lightRemoved:f=>f.parent.remove(f.point),lightHidden:f=>{f.point.visible=false;},parentHidden:f=>{f.parent.visible=false;},lightLayers:f=>f.point.layers.set(3),override:f=>{f.scene.overrideMaterial=new THREE.MeshBasicMaterial();}};
for(const [name,change] of Object.entries(changes))test(`scene ${name} changed during compilation is prepared again before admitting`,async()=>{
 const f=fixture();try{let admitted=false;const pending=f.admission.prepareTicket(f.mesh).then(value=>{admitted=true;return value;});await turn();assert.equal(f.jobs.length,1);change(f);f.jobs[0]();await turn();assert.equal(admitted,false);assert.equal(f.jobs.length,2);f.jobs[1]();const ticket=await pending;assert.equal(ticket.valid(),true);assert.equal(f.renderer.info.calls,1);}finally{f.scene.environment?.dispose();f.scene.overrideMaterial?.dispose();f.close();}
});

test('scene structural changes after preparation invalidate an existing ticket',async()=>{
 for(const change of Object.values(changes)){const f=fixture();try{const ticket=await f.ticket();assert.equal(ticket.valid(),true);change(f);assert.equal(ticket.valid(),false);}finally{f.scene.environment?.dispose();f.scene.overrideMaterial?.dispose();f.close();}}
});

test('fog, environment and light uniform values can change without requesting another pipeline',async()=>{
 const f=fixture();try{f.scene.environment=new THREE.Texture();const ticket=await f.ticket();f.scene.fog.color.set(0x112233);f.scene.fog.near=2;f.scene.fog.far=80;f.scene.environmentIntensity=.4;f.scene.environmentRotation.y=.2;f.point.intensity=7;f.point.color.set(0x884422);f.point.position.set(2,3,4);assert.equal(ticket.valid(),true);assert.equal(f.jobs.length,1);}finally{f.scene.environment?.dispose();f.close();}
});
