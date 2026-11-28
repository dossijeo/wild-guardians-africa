import * as THREE from 'three';
import {captureMudInputs} from './mud-worker-input.js';
import {MudWorkerQueue} from './mud-worker-queue.js';
import {rebuildMudGeometry} from './mud-worker-geometry.js';
// QA bridge only: injected into the real chunk generator by the audit runner.
export function startMudJob(world,payload,cx,cz){
 const q=world.__qaMudQueue??=new MudWorkerQueue(new Worker('/tools/trees/mud-worker-browser.js',{type:'module'}),{limit:4}),key=Symbol('chunk'),at=performance.now(),input=captureMudInputs(world.nav.field,cx,cz,payload.terrain.positions,world.mudPatches.scale),captureMs=performance.now()-at;
 const sent=performance.now(),promise=q.request(key,payload.terrainRevision,input).then(data=>({data,latencyMs:performance.now()-sent,captureMs}),()=>null);
 return {promise,cancel:()=>q.invalidate(key)};
}
export function makeMudMesh(world,answer,cx,cz){
 const started=performance.now(),geometry=rebuildMudGeometry(answer.data.result);if(!geometry)return null;
 const [map,normalMap,packed]=world.mudPatches.textures,material=new THREE.MeshStandardMaterial({map,normalMap,roughnessMap:packed,aoMap:packed,color:new THREE.Color().setRGB(.58,.61,.64),roughness:.52,metalness:0,side:THREE.FrontSide});material.userData.artSurface=0;
 const mesh=new THREE.Mesh(geometry,material);mesh.name='mangrove-mud-patches';mesh.userData.mudPatches=geometry.userData.mudPatches;mesh.castShadow=false;mesh.receiveShadow=true;
 let hash=2166136261;for(const array of [geometry.attributes.position.array,geometry.attributes.uv.array,new TextEncoder().encode(JSON.stringify(geometry.userData))])for(const v of new Uint8Array(array.buffer,array.byteOffset,array.byteLength))hash=Math.imul(hash^v,16777619)>>>0;
 (globalThis.__qaMudWorkerTrace??=[]).push({cx,cz,captureMs:answer.captureMs,latencyMs:answer.latencyMs,workerMs:answer.data.elapsed,buildMs:performance.now()-started,hash,vertices:geometry.attributes.position.count});return mesh;
}
