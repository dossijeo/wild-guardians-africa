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
