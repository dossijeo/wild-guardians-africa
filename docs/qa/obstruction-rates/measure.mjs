import * as THREE from 'three';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as current from '../../../src/rendering/obstruction.js';
const baseline='2efc8ed',old=execFileSync('git',['show',baseline+':src/rendering/obstruction.js'],{encoding:'utf8'});
writeFileSync('.cache/obstruction-before.mjs',old.replaceAll("'../world/","'../src/world/").replaceAll("'./","'../src/rendering/"));
const before=await import('../../../.cache/obstruction-before.mjs');
function fixture(module,count){
 const source=new THREE.BoxGeometry(4,10,4),instances=Array.from({length:count},(_,i)=>({id:'prop-'+i,x:(i%32)*3-46,y:0,z:Math.floor(i/32)*3-46,sx:1,sy:1,sz:1,yaw:i*.21})),geometry=module.obstructionGeometry(source,instances,{min:[-2,0,-2],max:[2,10,2]},0),group=new THREE.Group(),material=new THREE.MeshStandardMaterial();
 group.add(new THREE.InstancedMesh(geometry,material,count));
 return {chunks:new Map([['0,0',group]]),fade:geometry.userData.obstruction,dispose(){geometry.dispose();source.dispose();material.dispose();}};
}
const camera=new THREE.PerspectiveCamera(60,1.5),target=new THREE.Vector3(0,5,-10);
function drive(module,fixture,index,mode){camera.position.set(mode==='moving'?Math.sin(index*.02)*2:0,8,index===0?30:4);return module.updateObstructions(fixture.chunks,camera,target,.016);}
const equality=[];
for(const count of [32,800,2048])for(const mode of ['moving','stationary']){
 const a=fixture(before,count),b=fixture(current,count);let callsA=0,callsB=0;const original=Math.exp;
 for(let i=0;i<200;i++){
  let statsA,statsB;try{Math.exp=x=>{callsA++;return original(x);};statsA=drive(before,a,i,mode);Math.exp=x=>{callsB++;return original(x);};statsB=drive(current,b,i,mode);}finally{Math.exp=original;}
  assert.deepEqual(statsA,statsB);assert.deepEqual(a.fade.attribute.array,b.fade.attribute.array);assert.equal(a.fade.attribute.version,b.fade.attribute.version);
 }
 equality.push({count,mode,frames:200,exponentialsBefore:callsA,exponentialsAfter:callsB,identicalCoverageStatsAndUploads:true});a.dispose();b.dispose();
}
function time(module,count,mode){const f=fixture(module,count);for(let i=0;i<300;i++)drive(module,f,i,mode);const start=performance.now();for(let i=0;i<1000;i++)drive(module,f,i+300,mode);const duration=performance.now()-start;f.dispose();return duration;}
const measurements=[];
for(const count of [800,2048])for(const mode of ['moving','stationary']){
 const rows=[];for(let pass=0;pass<4;pass++)for(const name of pass%2?['after','before']:['before','after'])rows.push({name,ms:time(name==='before'?before:current,count,mode)});
 measurements.push({count,mode,framesPerSample:1000,rows});
}
const source='src/rendering/obstruction.js';const report={baseline,equality,measurements,sourceSha256:createHash('sha256').update(readFileSync(source)).digest('hex'),scope:'Isolated presentation CPU, actual obstruction functions and Three geometry, grid populations. Three background campaigns live; no GPU, browser, total-frame, mobile, RAM or FPS claim.'};
mkdirSync('docs/qa/obstruction-rates',{recursive:true});writeFileSync('docs/qa/obstruction-rates/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
