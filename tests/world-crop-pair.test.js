import {frozenSource} from './frozen-loading-source.js';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {spawnSync,execFileSync} from 'node:child_process';
import {loadWorldCropPair} from '../src/rendering/world-crop-pair.js';import {WorldScene} from '../src/rendering/scene.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
test('sources start together, but complete pair is not adopted before both settle',async()=>{
 const steady=deferred(),bridges=deferred(),calls=[];let completed=false;
 const work=loadWorldCropPair(()=>{calls.push('steady');return steady.promise;},()=>{calls.push('bridges');return bridges.promise;});work.then(()=>completed=true);
 await Promise.resolve();assert.deepEqual(calls,['steady','bridges']);steady.resolve({scene:'forty'});await Promise.resolve();assert.equal(completed,false);bridges.resolve({bakedTemplates:'thirty-two'});assert.deepEqual(await work,{gltf:{scene:'forty'},data:{bakedTemplates:'thirty-two'}});
});
test('first rejection is immediate and late sibling rejection is already observed',async()=>{
 for(const rejectSteady of [true,false]){const steady=deferred(),bridges=deferred(),error=Error('first');const work=loadWorldCropPair(()=>steady.promise,()=>bridges.promise),check=assert.rejects(work,e=>e===error);await Promise.resolve();(rejectSteady?steady:bridges).reject(error);await check;(rejectSteady?bridges:steady).reject(Error('late'));await new Promise(resolve=>setImmediate(resolve));}
 const calls=[];await assert.rejects(loadWorldCropPair(()=>{calls.push('steady');throw Error('sync');},()=>{calls.push('bridges');return 1;}),/sync/);assert.deepEqual(calls,['steady','bridges']);
});
test('actual World loadReady cancellation wins join and cannot adopt late borrowed sources',async()=>{
 const world=Object.create(WorldScene.prototype);world.loading=new AbortController();world.disposed=false;const steady=deferred(),bridges=deferred();let adopted=0;
 const work=world.loadReady(loadWorldCropPair(()=>steady.promise,()=>bridges.promise)).then(()=>adopted++);const reject=assert.rejects(work,/cancelada/);world.loading.abort();await reject;steady.resolve({scene:{}});bridges.resolve({bakedTemplates:new Map()});await new Promise(resolve=>setImmediate(resolve));assert.equal(adopted,0);
});
test('real generic Assets + meshopt World callpath retains New/Continue40/32 and same requests under both settings',()=>{
 for(const args of [[],['--pair-overlap']]){const result=spawnSync(process.execPath,['--experimental-loader','./tests/fixtures/world-load-crop-default-loader.mjs','./tests/fixtures/world-load-crop-default.mjs',...args],{encoding:'utf8',timeout:30000});assert.equal(result.status,0,result.stdout+'\n'+result.stderr);assert.match(result.stdout,/New \+ saved Continue PASS/);}
});
test('GPU warm, variants, chunk/far fences and remaining source recipe are byte-identical',()=>{
 const base=frozenSource('9cc3ba2f','src/rendering/scene.js').replaceAll('\r\n','\n');let actual=readFileSync('src/rendering/scene.js','utf8');
 actual=actual.replace("import {loadWorldCropPair} from './world-crop-pair.js';\n",'');const start=actual.indexOf('    // Experimental scheduling only:'),end=actual.indexOf('    const gltf=cropPair?',start);actual=actual.slice(0,start)+actual.slice(end);actual=actual.replace('const gltf=cropPair?cropPair.gltf:await','const gltf=await');actual=actual.replace('if(cropPair)this.cropBridgeData=cropPair.data;else{','').replace('}this.cropBatch=','this.cropBatch=');assert.equal(actual,base);
});

test('controlled deferred calendar proves max vs sum scheduling only, not native savings',async()=>{
 async function calendar(parallel){let clock=0;const events=[],starts=[],load=(label,duration,value)=>()=>{starts.push({label,at:clock});return new Promise(resolve=>events.push({at:clock+duration,resolve:()=>resolve(value)}));};let done=false,result;
 const steady=load('steady',3,{scene:'40'}),bridges=load('bridges',15,{bakedTemplates:'32'});
 const work=(parallel?loadWorldCropPair(steady,bridges):(async()=>({gltf:await steady(),data:await bridges()}))()).then(value=>{done=true;result=value;});
 for(let guard=0;!done&&guard<30;guard++){await Promise.resolve();if(events.length){events.sort((a,b)=>a.at-b.at);const next=events.shift();clock=next.at;next.resolve();}else await Promise.resolve();}await work;return {clock,starts,result};
 }
 const serial=await calendar(false),parallel=await calendar(true);assert.equal(serial.clock,18);assert.equal(parallel.clock,15);assert.deepEqual(serial.starts,[{label:'steady',at:0},{label:'bridges',at:3}]);assert.deepEqual(parallel.starts,[{label:'steady',at:0},{label:'bridges',at:0}]);assert.deepEqual(parallel.result,serial.result);
});
