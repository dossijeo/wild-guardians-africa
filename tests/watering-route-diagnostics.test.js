import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {diagnosticWateringSource} from '../tools/watering-route-diagnostics.mjs';
import {wateringRoute,repairRoute} from '../src/world/work-points.js';

const url=new URL('../src/world/work-points.js',import.meta.url),source=readFileSync(url,'utf8').replaceAll('\r\n','\n');
const code=diagnosticWateringSource(source).replace(/from '([^']+)'/g,(match,specifier)=>specifier.startsWith('.')?`from '${new URL(specifier,url).href}'`:match);
const observed=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const worker={x:0,z:3,radius:.28},plant={id:'qa',x:0,z:0,species:'mijo'};
const reset=()=>{for(const key of Object.keys(observed.qaWatering))observed.qaWatering[key]=0;};
function nav({height=0,walk=true,path=true,firstBlocked=false}={}){
 let attempts=0;const calls=[];
 return {calls,field:{surface:()=>height},workerSurface:()=>0,
  walkable(...args){calls.push(['walk',...args]);return walk;},
  path(...args){calls.push(['path',...args]);return path&&!(firstBlocked&&attempts++===0)?[{...args[1]}]:null;}};
}
for(const [name,options,expected] of [
 ['height rejection',{height:12},{reachRejected:8,heightRejected:8,distanceRejected:0,unreachable:1}],
 ['solid approach rejection',{walk:false},{walkRejected:8,unreachable:1}],
 ['failed routes',{path:false},{pathQueries:8,pathRejected:8,unreachable:1}],
 ['reachable first point',{}, {reachable:1,candidates:1,pathQueries:1}],
 ['reachable fallback',{firstBlocked:true},{reachable:1,candidates:2,pathQueries:2,pathRejected:1}],
])test(`QA watering observer preserves calls/results and distinguishes ${name}`,()=>{
 reset();const originalNav=nav(options),observedNav=nav(options),before=structuredClone({worker,plant});
 assert.deepEqual(observed.wateringRoute(worker,plant,observedNav),wateringRoute(worker,plant,originalNav));
 assert.deepEqual(observedNav.calls,originalNav.calls);assert.deepEqual({worker,plant},before);
 assert.equal(observed.qaWatering.routes,1);for(const [key,value] of Object.entries(expected))assert.equal(observed.qaWatering[key],value,key);
 assert.equal(observed.qaWatering.routes,observed.qaWatering.reachable+observed.qaWatering.unreachable);
 assert.equal(observed.qaWatering.candidates,observed.qaWatering.reachRejected+observed.qaWatering.walkRejected+observed.qaWatering.pathQueries);
});
test('QA watering counters never instrument a repair route',()=>{
 reset();const target={id:'wall',kind:'wall',x:0,z:0,yaw:0,material:'adobe'},a=nav(),b=nav();
 assert.deepEqual(observed.repairRoute(worker,target,b),repairRoute(worker,target,a));assert.deepEqual(a.calls,b.calls);
 assert.ok(Object.values(observed.qaWatering).every(value=>value===0));
});
test('QA direct interaction guard distinguishes distance from height without sampling rejected terrain',()=>{
 reset();const n=nav({height:12});n.field.surface=()=>{throw Error('Distant interaction must not sample terrain');};
 assert.equal(observed.canWaterFrom(worker,plant,n),false);
 assert.equal(observed.qaWatering.distanceRejected,1);assert.equal(observed.qaWatering.heightRejected,0);assert.equal(observed.qaWatering.routes,0);
});
test('QA instrumentation fails closed when the authored algorithm changes',()=>{
 assert.throws(()=>diagnosticWateringSource(source.replace('if(!canWaterFrom','if (!canWaterFrom')),/Diagnostic anchor changed/);
 assert.throws(()=>diagnosticWateringSource(source+'\n'+source),/Diagnostic anchor changed/);
});

test('QA preflight observer preserves direct-route calls and accounts for early success',()=>{
 reset();
 const create=()=>{const calls=[];return {calls,obstacles:[],walkable(...args){calls.push(['walk',...args]);return true;},segmentClear(...args){calls.push(['segment',...args]);return true;},path(){throw Error('Preflight must avoid A* for a clear approach');}};};
 const a=create(),b=create();
 assert.deepEqual(observed.wateringRoute(worker,plant,b),wateringRoute(worker,plant,a));
 assert.deepEqual(b.calls,a.calls);
 assert.equal(observed.qaWatering.preflightDirect,1);assert.equal(observed.qaWatering.reachable,1);
 assert.equal(observed.qaWatering.pathQueries,0);assert.equal(observed.qaWatering.routes,1);
});
