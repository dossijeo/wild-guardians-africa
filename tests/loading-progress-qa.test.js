import test from 'node:test';
import assert from 'node:assert/strict';
import {installLoadingProgressQa} from '../src/app/loading-progress-qa.js';

function fixture(){
 let element;
 const qa=installLoadingProgressQa({createElement(){return {textContent:''};},head:{append(value){element=value;}}});
 return {qa,read:()=>JSON.parse(element.textContent)};
}
const progress={snapshot:()=>({progress:.3,ready:false,pending:['chunks']})};
const owner={downloads:{snapshot:()=>({pending:2})}};

test('native application QA retains complete RAF gaps and real worker markers',()=>{
 const {qa,read}=fixture();qa.begin(100);qa.frame(116);qa.frame(350);qa.snapshotDecode({mode:'worker',decodeMs:20});
 qa.close(progress,owner,{cancelled:true});const report=read();
 assert.deepEqual(report.frames,[{at:116,interval:16},{at:350,interval:234}]);
 assert.equal(report.snapshotDecode[0].mode,'worker');assert.equal(report.snapshotDecode[0].decodeMs,20);assert.ok(Number.isFinite(report.snapshotDecode[0].at));
 assert.equal(report.cancelled,true);assert.deepEqual(report.current.pending,['chunks']);
 assert.match(report.frameScope,/ends before the final HUD draw/);
});

test('repeated empty cleanup preserves the last owned cancellation evidence',()=>{
 const {qa,read}=fixture();qa.begin(10);qa.frame(20);qa.close(progress,owner,{cancelled:true});const before=read();
 qa.close(null,null,{cancelled:true});assert.deepEqual(read(),before);
 qa.close(null,null);assert.deepEqual(read(),before);
});

test('a new owned presentation starts without preceding frames or decode markers',()=>{
 const {qa,read}=fixture();qa.begin(100);qa.frame(200);qa.snapshotDecode({mode:'worker'});qa.close(progress,owner);
 qa.begin(500);qa.frame(525);qa.close(progress,owner,{cancelled:true});const report=read();
 assert.deepEqual(report.frames,[{at:525,interval:25}]);assert.equal(report.snapshotDecode,undefined);
});

test('synchronous loading witnesses retain attribution and are reset with their owned presentation',()=>{const {qa,read}=fixture();const row={label:'restore-sync',start:10,end:200,duration:190,failed:false};qa.loadingSpan(row);qa.close(progress,owner);assert.deepEqual(read().loadingSpans,[row]);qa.begin(500);qa.close(progress,owner);assert.equal(read().loadingSpans,undefined);});

function timedFixture(options={}){let clock=1000,writes=0,text='';const element={set textContent(value){writes++;text=value;clock+=2;},get textContent(){return text;}},doc={createElement:()=>element,head:{append(){}}};const qa=installLoadingProgressQa(doc,{now:()=>clock,...options}),progress={ready:false,failure:false,snapshot:()=>({ready:progress.ready,progress:progress.ready?1:.5,pending:[]})};return {qa,progress,clock:value=>clock=value,getWrites:()=>writes,read:()=>JSON.parse(text)};}
test('throttles ready DOM writes while retaining every RAF and flushing final data',()=>{const f=timedFixture();f.qa.begin(1000);f.qa.update(f.progress);f.progress.ready=true;f.clock(1010);f.qa.update(f.progress);assert.equal(f.getWrites(),2);for(let i=0;i<100;i++){f.qa.frame(1011+i);f.clock(1011+i);f.qa.update(f.progress);}assert.equal(f.getWrites(),2);f.qa.close(f.progress,null);const r=f.read();assert.equal(r.frames.length,100);assert.equal(r.closed,true);assert.equal(r.current.ready,true);assert.equal(r.loadingSpans.filter(s=>s.label==='qa-dom-serialize').length,2);assert.ok(r.loadingSpans.every(s=>s.duration===2));});
test('unthrottled ready diagnostic mode preserves prior cadence for paired overhead measurement',()=>{const f=timedFixture({throttleReady:false});f.progress.ready=true;for(let i=0;i<5;i++){f.clock(1000+i*10);f.qa.update(f.progress);}assert.equal(f.getWrites(),5);});
test('failure publishes immediately and empty duplicate close preserves previous evidence',()=>{const f=timedFixture();f.qa.update(f.progress);f.clock(1010);f.progress.failure=true;f.qa.update(f.progress);assert.equal(f.getWrites(),2);f.qa.close(f.progress,null,{cancelled:true});const before=f.read();f.qa.close(null,null);assert.deepEqual(f.read(),before);assert.equal(before.cancelled,true);});

test('outer presentation witness preserves synchronous result/error and records nested scope',()=>{const f=timedFixture(),result={};assert.equal(f.qa.invocation('outer',()=>{f.clock(1005);return result;}),result);const error=Error('presentation');assert.throws(()=>f.qa.invocation('failed',()=>{throw error;}),e=>e===error);f.qa.close(f.progress,null);const rows=f.read().loadingSpans;assert.equal(rows[0].duration,5);assert.equal(rows[0].failed,false);assert.equal(rows[1].failed,true);assert.match(rows[0].scope,/includes nested/);});


test('camera witnesses copy real pose without changing camera or controls and retain cancellation restore',()=>{
 const {qa,read}=fixture(),eye=[4,7,11],quaternion=[0,.1,0,.99],target=[2,.18,3],world={camera:{position:{toArray:()=>eye.slice()},quaternion:{toArray:()=>quaternion.slice()}},controls:{target:{toArray:()=>target.slice()},enabled:false},cinematic:false};
 const before=JSON.stringify({eye,quaternion,target,enabled:world.controls.enabled});
 qa.cameraPose('before-cinematic',world);eye[0]=12;world.cinematic=true;qa.cameraPose('cancel-current',world);eye[0]=4;world.cinematic=false;qa.cameraPose('cancel-restored',world);qa.close(progress,owner,{cancelled:true});
 const report=read();assert.deepEqual(report.cameraPoses.map(row=>row.phase),['before-cinematic','cancel-current','cancel-restored']);assert.deepEqual(report.cameraPoses[0].eye,[4,7,11]);assert.deepEqual(report.cameraPoses[1].eye,[12,7,11]);assert.deepEqual(report.cameraPoses[2].eye,report.cameraPoses[0].eye);assert.match(report.cameraPoses[0].basis,/focusFarm\/Home/);assert.equal(JSON.stringify({eye,quaternion,target,enabled:world.controls.enabled}),before);
 qa.begin(100);qa.close(progress,owner);assert.equal(read().cameraPoses,undefined);
});
