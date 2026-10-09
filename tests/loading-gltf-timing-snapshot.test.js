import test from 'node:test';
import assert from 'node:assert/strict';
import {LoadingDownloads} from '../src/app/loading-downloads.js';
import {LoadingTransferOwner} from '../src/app/loading-transfer-owner.js';
import {loadingReadinessSnapshot,installLoadingReadinessObservation} from '../src/rendering/loading-readiness-snapshot.js';
const read=downloads=>loadingReadinessSnapshot({progress:{downloads}}).transfers;
const timing=(startTime,responseEnd)=>({startTime,responseEnd,transferSize:100,encodedBodySize:90,decodedBodySize:90,responseStatus:200});

test('real owner retains responseEnd before GLTF completion and finish-only copies completed evidence',()=>{
 let clock=performance.now();const owner=new LoadingTransferOwner({now:()=>clock});
 try{
  clock=performance.now();const start=clock,url='http://localhost/assets/model.glb';owner.accept({type:'start',id:123,url,kind:'gltf',start});
  clock=start+20;owner.resource({name:url,...timing(start,start+10)});
  const request=[...owner.downloads.requests.values()][0];assert.equal(request.end,null);assert.equal(request.timing.responseEnd,start+10);
  assert.equal(read(owner.downloads).gltf.rows.length,0);
  clock=start+40;owner.accept({type:'end',id:123,loaded:90});
  owner.downloads.snapshot=()=>assert.fail('estimator invoked');const row=read(owner.downloads).gltf.rows[0];
  assert.equal(row.association,'heuristic-url-window');assert.equal(row.untilResponseEnd,10);assert.equal(row.afterResponseEnd,30);assert.equal(row.duration,40);
  request.timing.responseEnd=0;request.url='changed';assert.equal(row.timing.responseEnd,start+10);assert.equal(row.url,url);
  owner.dispose();assert.equal(read(owner.downloads).disposed,true);
 }finally{owner.dispose();}
});

test('largest durations selected deterministically with independent pending/failed rows and full counts',()=>{
 let clock=100;const downloads=new LoadingDownloads({now:()=>clock});
 for(let i=0;i<12;i++){const id=downloads.begin('/model'+i,{kind:'gltf',start:100});clock=100+i;downloads.finish(id,{timing:timing(100,100+i)});}
 const pending=downloads.begin('/pending',{kind:'gltf'});const failed=downloads.begin('/failed',{kind:'gltf'});downloads.finish(failed,{failed:true});
 const result=read(downloads);assert.equal(result.gltf.count,14);assert.equal(result.gltf.completed,13);assert.equal(result.gltf.pending,1);assert.equal(result.gltf.rows.length,8);assert.equal(result.gltf.omitted,6);assert.equal(result.gltf.omittedCompleted,5);
 assert.deepEqual(result.gltf.rows.map(row=>row.url),Array.from({length:8},(_,i)=>'/model'+(11-i)));
 assert.equal(result.rows.length,2);assert.equal(downloads.requests.get(pending).end,null);
 const ties=new LoadingDownloads({now:()=>10});for(let i=0;i<10;i++){const id=ties.begin('/tie'+i,{kind:'gltf',start:0});ties.finish(id);}
 assert.deepEqual(read(ties).gltf.rows.map(row=>row.url),Array.from({length:8},(_,i)=>'/tie'+i));
});

test('missing, invalid, redacted and failed timing remain unknown without zero intervals',()=>{
 let clock=200;const downloads=new LoadingDownloads({now:()=>clock});
 for(const [url,value,failed] of [['missing',null,false],['zero',timing(100,0),false],['before',timing(99,150),false],['after',timing(100,201),false],['reverse',timing(160,150),false],['nan',timing(NaN,150),false],['failed',timing(100,150),true]]){const id=downloads.begin(url,{kind:'gltf',start:100});downloads.finish(id,{timing:value,failed});}
 for(const row of read(downloads).gltf.rows){assert.equal(row.association,'unknown');assert.equal(row.timing,null);assert.equal(row.untilResponseEnd,null);assert.equal(row.afterResponseEnd,null);}
});

test('overlapping URL/cache records cannot uniquely associate a browser timing; separated repeats can',()=>{
 let clock=200;const downloads=new LoadingDownloads({now:()=>clock});
 const first=downloads.begin('/same',{kind:'gltf',start:100}),second=downloads.begin('/same',{kind:'gltf',start:105});
 downloads.finish(first,{timing:timing(110,150)});downloads.finish(second,{timing:timing(110,150)});
 assert.ok(read(downloads).gltf.rows.every(row=>row.unknownReason==='ambiguous-url-window'));
 const repeated=new LoadingDownloads({now:()=>clock});const original=repeated.begin('/cached',{kind:'gltf',start:100});repeated.finish(original,{timing:timing(110,150)});clock=110;repeated.cacheHit('/cached');
 assert.equal(read(repeated).gltf.rows[0].unknownReason,'ambiguous-url-window');
 clock=400;const separate=new LoadingDownloads({now:()=>clock});const old=separate.begin('/repeat',{kind:'gltf',start:100});clock=200;separate.finish(old,{timing:timing(110,150)});const next=separate.begin('/repeat',{kind:'gltf',start:300});clock=400;separate.finish(next,{timing:timing(310,350)});
 assert.ok(read(separate).gltf.rows.every(row=>row.association==='heuristic-url-window'));
});

test('scalar bounded evidence has no API calls/resource retention and bridge cancellation clears callable',()=>{
 let clock=50;const downloads=new LoadingDownloads({now:()=>clock});const id=downloads.begin('x'.repeat(300),{kind:'gltf',start:10});const evidence={...timing(11,20),resource:{buffer:new ArrayBuffer(4)},getEntriesByName(){assert.fail('timing query');}};downloads.finish(id,{timing:evidence});
 downloads.snapshot=()=>assert.fail('snapshot');downloads.refresh=()=>assert.fail('refresh');
 const world={loading:new AbortController(),loadingProgress:{downloads},onLoadingSpan:null},scope={__desktopSmokeStarted:true};world.loadingReadinessObservation=installLoadingReadinessObservation(world,{scope});
 const callable=scope.__desktopSmokeLoadingReadiness,result=callable();assert.equal(result.readiness.transfers.gltf.rows[0].url.length,160);assert.equal(JSON.stringify(result).includes('buffer'),false);
 assert.equal(Object.hasOwn(result.readiness.transfers.gltf.rows[0].timing,'resource'),false);
 world.loading.abort();assert.equal(callable(),null);assert.equal(scope.__desktopSmokeLoadingReadiness,undefined);downloads.dispose();const count=downloads.requests.size;downloads.finish(id);assert.equal(downloads.requests.size,count);
});
