import test from 'node:test';import assert from 'node:assert/strict';
import {LoadingVisualQa} from '../src/app/loading-visual-qa.js';
const png='data:image/png;base64,AAAA';
function fixture(){return {prepared:true,world:{canvas:{width:1028,height:720}},night:.75,plants:{plants:Array.from({length:4},(_,i)=>({id:String(i),x:i,z:0,growth:12})),mature:false},camera:{position:{toArray:()=>[1,2,3]},quaternion:{toArray:()=>[0,0,0,1]}}};}
test('default off never reads pixels, schedules work or retains a diorama',()=>{const qa=new LoadingVisualQa({capture:()=>{throw Error('must not run');}});qa.afterDraw(fixture(),.5);assert.equal(qa.report.frames.length,0);assert.equal(qa.owner,null);});
test('read-only milestones preserve actual progress/night/plants and stop at owner close',()=>{
 let reads=0;const d=fixture(),before=JSON.stringify(d),qa=new LoadingVisualQa({enabled:true,capture:()=>{reads++;return png;},now:()=>42});
 qa.afterDraw(d,.2);qa.afterDraw(d,.2);qa.afterDraw(d,.5);assert.equal(JSON.stringify(d),before);
 d.plants.plants.push({id:'fifth',x:0,z:3,growth:0});qa.afterDraw(d,.55);qa.afterDraw(d,.95);d.plants.mature=true;qa.afterDraw(d,1);
 assert.deepEqual(qa.report.frames.map(f=>f.label),['initial','middle','additional-plant','late','mature']);
 assert.equal(qa.report.frames[2].plants.length,5);assert.equal(qa.report.frames[2].plants[4].growth,0);assert.equal(qa.report.frames[0].night,.75);
 assert.equal(qa.report.frames[0].progress,.2);assert.equal(qa.report.frames[0].png,png);assert.equal(reads,5);
 const report=qa.close({cancelled:true});qa.afterDraw(d,1);assert.equal(reads,5);assert.equal(report.cancelled,true);assert.equal(qa.owner,null);assert.strictEqual(qa.close(),report);
});
test('unprepared, destroyed and another generation never contaminate this owner',()=>{const qa=new LoadingVisualQa({enabled:true,capture:()=>png}),d=fixture();d.prepared=false;qa.afterDraw(d,.1);assert.equal(qa.owner,null);d.prepared=true;qa.afterDraw(d,.1);qa.afterDraw(fixture(),.6);d.disposed=true;qa.afterDraw(d,.9);assert.equal(qa.report.frames.length,1);});
test('readback failures and size limits are recorded once, never repeated every frame',()=>{
 for(const options of [{capture:()=>{throw Error('context lost');}},{capture:()=>png,maxBytes:10}]){
  const qa=new LoadingVisualQa({enabled:true,...options}),d=fixture();for(let i=0;i<100;i++)qa.afterDraw(d,.1);
  assert.equal(qa.report.errors.length,1);assert.equal(qa.report.frames.length,0);assert.equal(qa.bytes,0);
 }
});
test('metadata copies cannot change after a later animation update',()=>{const qa=new LoadingVisualQa({enabled:true,capture:()=>png}),d=fixture();qa.afterDraw(d,.2);d.plants.plants[0].growth=99;assert.equal(qa.report.frames[0].plants[0].growth,12);});
test('skipped phases are not backfilled with misleading later screenshots',()=>{const qa=new LoadingVisualQa({enabled:true,capture:()=>png}),d=fixture();qa.afterDraw(d,.2);qa.afterDraw(d,.95);qa.afterDraw(d,.95);d.plants.mature=true;qa.afterDraw(d,1);assert.deepEqual(qa.report.frames.map(f=>f.label),['initial','late','mature']);});
