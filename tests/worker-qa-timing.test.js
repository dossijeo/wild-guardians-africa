import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {configureTerrainControls,updateTerrainCamera} from '../src/rendering/terrain-camera.js';
const domStub=()=>({style:{},clientWidth:1024,clientHeight:576,addEventListener(){},removeEventListener(){},getRootNode:()=>({addEventListener(){},removeEventListener(){}})});
import {deriveWorkerQaFrame,workerQaFrameFits} from '../src/rendering/worker-qa-framing.js';
import {WorkerGpuQueries,WORKER_TIMING_PROTOCOL,analyzeWorkerTiming} from '../src/rendering/worker-qa-timing.js';
function mockGl(){let next=0;const calls=[],ext={TIME_ELAPSED_EXT:1,QUERY_COUNTER_BITS_EXT:2,GPU_DISJOINT_EXT:3};const gl={calls,ext,disjoint:false,lost:false,foreign:null,available:true,result:2500000,getExtension:()=>ext,getQuery:(target,p)=>p===ext.QUERY_COUNTER_BITS_EXT?64:gl.foreign,isContextLost:()=>gl.lost,getParameter:()=>gl.disjoint,createQuery:()=>({id:++next}),beginQuery:(t,q)=>calls.push(['begin',q.id]),endQuery:()=>calls.push(['end']),deleteQuery:q=>calls.push(['delete',q.id]),getQueryParameter:(q,p)=>p===gl.QUERY_RESULT_AVAILABLE?gl.available:gl.result,QUERY_RESULT_AVAILABLE:4,QUERY_RESULT:5,CURRENT_QUERY:6};return gl;}
test('native terrain framing survives real OrbitControls protection for flats, slopes, cliffs/canyon and aspect ratios',()=>{
 const model=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(1,7,1)),tool=new THREE.Mesh(new THREE.BoxGeometry(3,.5,.5)),hidden=new THREE.Mesh(new THREE.BoxGeometry(100,100,100));body.position.y=3.5;tool.position.set(3,2,0);hidden.visible=false;model.add(body,tool,hidden);model.position.set(90,1,20);
 const fields=[{surface:()=>0},{surface:()=>100},{surface:()=>-100},{surface:(x,z)=>.03*x+.02*z},{canyon:true,surface:(x,z)=>x<90?10:0}];
 for(const field of fields)for(const aspect of [16/9,1,9/16])for(const azimuth of [45,225]){
  model.position.y=field.surface(90,20)+1;const camera=new THREE.PerspectiveCamera(42,aspect,.1,1000),frame=deriveWorkerQaFrame(model,camera,{azimuth,elevation:35},field),controls=new OrbitControls(camera,domStub());configureTerrainControls(controls);controls.enableDamping=false;controls.target.fromArray(frame.target);camera.position.fromArray(frame.eye);camera.lookAt(controls.target);const fov=camera.fov;
  updateTerrainCamera(camera,controls,field);const actualEye=camera.position.toArray(),actualTarget=controls.target.toArray();controls.target.fromArray(frame.target);camera.position.fromArray(frame.eye);updateTerrainCamera(camera,controls,field);assert.deepEqual(camera.position.toArray(),actualEye);assert.deepEqual(controls.target.toArray(),actualTarget);assert.equal(workerQaFrameFits(frame,camera),true);assert.equal(controls.target.y,field.surface(controls.target.x,controls.target.z)+.18);assert.equal(camera.fov,fov);assert.ok(camera.position.y-field.surface(camera.position.x,camera.position.z)>=2-1e-8);assert.ok(camera.position.y-field.surface(camera.position.x,camera.position.z)<=20+1e-8);assert.ok(frame.search.attempts<=245);assert.equal(hidden.visible,false);assert.equal(body.visible,true);controls.dispose();
 }
});
test('impossible legal framing remains inconclusive with bounded search and no camera or visibility mutation',()=>{
 const model=new THREE.Mesh(new THREE.BoxGeometry(1,500,1));model.position.y=250;const camera=new THREE.PerspectiveCamera(42,9/16,.1,1000),before=camera.clone();let failure;try{deriveWorkerQaFrame(model,camera,{azimuth:45,elevation:35},{surface:()=>0});}catch(error){failure=error;}assert.match(failure.message,/No legal native/);assert.equal(failure.framing.search.attempts,245);assert.ok(failure.framing.lastNativePose);assert.ok(camera.position.equals(before.position));assert.equal(model.visible,true);
});
test('query pool reads only available results outside draw, deletes exactly once and bounds pending without nested/foreign queries',()=>{
 const gl=mockGl(),q=new WorkerGpuQueries(gl);gl.available=false;for(let i=0;i<16;i++){assert.equal(q.begin({sample:i}),true);assert.throws(()=>q.begin({}),/Nested/);q.end();}assert.equal(q.begin({sample:16}),false);assert.equal(q.stats.overflow,1);q.poll();assert.equal(q.raw.length,0);gl.available=true;q.poll();assert.equal(q.raw.length,16);assert.ok(q.raw.every(r=>r.ms===2.5));assert.equal(q.pending.length,0);gl.foreign={};assert.throws(()=>q.begin({}),/Foreign/);q.dispose();q.dispose();assert.equal(gl.calls.filter(c=>c[0]==='delete').length,16);assert.equal(q.stats.deleted,q.stats.allocated);
});
test('disjoint and unresolved/cancel results remain negative and unsupported extension is inconclusive',()=>{
 const gl=mockGl(),q=new WorkerGpuQueries(gl);q.begin({sample:0});q.end();q.poll();q.begin({sample:1});q.end();gl.disjoint=true;assert.throws(()=>q.poll(),/disjoint/);q.dispose();assert.equal(q.raw.length,1);assert.equal(q.invalid.length,2);assert.equal(q.invalid[0].reason,'campaign-disjoint');assert.equal(q.stats.unresolved,1);assert.equal(q.pending.length,0);assert.equal(q.stats.deleted,q.stats.allocated);
 const no=mockGl();no.getExtension=()=>null;const unsupported=new WorkerGpuQueries(no);assert.equal(unsupported.reason,'extension-unavailable');unsupported.dispose();assert.equal(no.calls.length,0);
});
function raw(saved=1){return WORKER_TIMING_PROTOCOL.caseIndices.flatMap(caseIndex=>WORKER_TIMING_PROTOCOL.order.flatMap((arm,block)=>Array.from({length:120},(_,sample)=>({caseIndex,block,arm,sample,ms:arm==='A'?10:10-saved,valid:true}))));}
test('paired endpoint enforces exact prospective counts, two-pose weighting and useful absolute OR relative minimum',()=>{
 const good=analyzeWorkerTiming(raw(.3));assert.equal(good.poses.length,2);assert.equal(good.combined.pairs.length,6);assert.equal(good.combined.useful,true);assert.ok(good.combined.ci95[0]>0);assert.equal(analyzeWorkerTiming(raw(.05)).combined.useful,false);assert.equal(analyzeWorkerTiming(raw(-.3)).combined.useful,false);
 const relative=raw(.05).map(r=>({...r,ms:r.arm==='A'?1:.95}));assert.equal(analyzeWorkerTiming(relative).combined.useful,true);
 assert.throws(()=>analyzeWorkerTiming(raw().slice(1)),/Incomplete/);const duplicate=raw();duplicate[1]={...duplicate[0]};assert.throws(()=>analyzeWorkerTiming(duplicate),/duplicate/);
});
