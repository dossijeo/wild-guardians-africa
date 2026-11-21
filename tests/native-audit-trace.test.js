import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {gzipSync,gunzipSync} from 'node:zlib';
import {nativeTraceOptions,startNativeAuditTrace} from '../tools/guardian/native-audit-trace.mjs';

function fixture(t,{loss=false,readError=false,noStream=false}={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'wg-native-trace-')),output=path.join(dir,'run.json');
 t.after(()=>{assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep+'wg-native-trace-'));fs.rmSync(dir,{recursive:true});});
 const original=Buffer.from(JSON.stringify({traceEvents:[{name:'original event',args:{value:'retained'}}]})),zip=gzipSync(original),chunks=[zip.subarray(0,8),zip.subarray(8,17),zip.subarray(17)];
 const session=new EventEmitter(),calls=[];let cursor=0;
 session.send=async(method,args)=>{calls.push({method,args});
  if(method==='Tracing.start'){session.emit('Tracing.bufferUsage',{percentFull:.5});session.emit('Tracing.bufferUsage',{value:.25});}
  if(method==='Tracing.end')session.emit('Tracing.tracingComplete',{...(noStream?{}:{stream:'trace-handle'}),dataLossOccurred:loss,traceFormat:'json',streamCompression:'gzip'});
  if(method==='IO.read'){assert.equal(args.size,1024*1024);if(readError&&cursor===1)throw Error('read failed');const data=chunks[cursor++];return {data:data.toString('base64'),base64Encoded:true,eof:cursor===chunks.length};}
  return {};
 };
 return {output,original,calls,browser:{newBrowserCDPSession:async()=>session,version:()=> 'unit-test-browser'},metadata:()=>JSON.parse(fs.readFileSync(output.replace('.json','.trace-complete.json')))};
}

test('trace capacity is explicit and bounded without dropping categories or switching to a rolling recording',()=>{
 const options=nativeTraceOptions({QA_NATIVE_TRACE_CATEGORIES:'toplevel, blink.user_timing'});
 assert.equal(options.traceConfig.traceBufferSizeInKb,512*1024);assert.equal(options.traceConfig.recordMode,'recordUntilFull');
 assert.deepEqual(options.traceConfig.includedCategories,['toplevel','blink.user_timing']);assert.equal(options.streamCompression,'gzip');
 for(const value of ['0','1025','NaN','1.5',''])assert.throws(()=>nativeTraceOptions({QA_NATIVE_TRACE_BUFFER_MB:value}),/integer/);
 assert.throws(()=>nativeTraceOptions({QA_NATIVE_TRACE_CATEGORIES:','}),/categories/);
});

test('compressed binary chunks preserve the original trace with one export and a closed stream',async t=>{
 const f=fixture(t),capture=await startNativeAuditTrace(f.browser,{output:f.output,env:{}});
 const stopped=capture.stop();assert.equal(capture.stop(),stopped);const m=await stopped;
 assert.deepEqual(gunzipSync(fs.readFileSync(m.tracePath)),f.original);assert.equal(m.collectionComplete,true);assert.equal(m.dataLossOccurred,false);
 assert.equal(m.peakBufferUsage,.5);assert.equal(m.usageReports,2);assert.equal(m.browserVersion,'unit-test-browser');assert.equal(m.sha256.length,64);
 assert.equal(f.calls.filter(c=>c.method==='Tracing.end').length,1);assert.equal(f.calls.filter(c=>c.method==='IO.close').length,1);
});

test('a lossy recording remains a failure while preserving its complete export and loss metadata',async t=>{
 const f=fixture(t,{loss:true}),capture=await startNativeAuditTrace(f.browser,{output:f.output,env:{}});
 await assert.rejects(capture.stop(),/loss-free/);const m=f.metadata();assert.equal(m.dataLossOccurred,true);assert.equal(m.collectionComplete,true);
 assert.deepEqual(gunzipSync(fs.readFileSync(m.tracePath)),f.original);
});

test('an interrupted export closes its stream and cannot look like complete evidence even with dataLossOccurred false',async t=>{
 const f=fixture(t,{readError:true}),capture=await startNativeAuditTrace(f.browser,{output:f.output,env:{}});
 await assert.rejects(capture.stop(),/read failed/);const m=f.metadata();assert.equal(m.collectionComplete,false);assert.equal(m.dataLossOccurred,false);assert.match(m.collectionError,/read failed/);
 assert.equal(f.calls.filter(c=>c.method==='IO.close').length,1);
});

test('missing streams and existing evidence are rejected rather than replaced',async t=>{
 const f=fixture(t,{noStream:true}),capture=await startNativeAuditTrace(f.browser,{output:f.output,env:{}});
 await assert.rejects(capture.stop(),/no stream/);assert.equal(f.metadata().collectionComplete,false);
 await assert.rejects(startNativeAuditTrace(f.browser,{output:f.output,env:{}}),/already exists/);
});

test('an existing legacy uncompressed trace cannot be shadowed by a new compressed recording',async t=>{
 const f=fixture(t);fs.writeFileSync(f.output.replace('.json','.trace.json'),'original trace');
 await assert.rejects(startNativeAuditTrace(f.browser,{output:f.output,env:{}}),/already exists/);assert.equal(f.calls.length,0);
});
