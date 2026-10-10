import {normalizeTrace} from './native-loading-trace-source-normalize.js';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {runInNewContext} from 'node:vm';
import {installNativeLoadingTrace} from '../src/app/native-loading-trace-bridge.js';import {loadingAwaitWitness} from '../src/rendering/loading-sync-witness.js';
const setup=()=>({world:{loading:new AbortController()},scope:{__desktopSmokeLoadingTrace:true}});
const pending=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
test('OFF/missing WeakRef do not change world/hooks/export or read clock',()=>{
 for(const options of [{scope:{}},{Weak:null},{Weak:class{constructor(){throw Error('weak fault');}}}]){const f=setup(),before={...f.world};assert.equal(installNativeLoadingTrace(f.world,{scope:f.scope,now(){throw Error('clock OFF');},...options}),null);assert.deepEqual(f.world,before);assert.equal(f.scope.__wildGuardiansNativeLoadingTrace,undefined);}
});
test('finish getter preserves real unresolved awaits before closing and exports only frozen scalars',async()=>{
 const f=setup(),owner=installNativeLoadingTrace(f.world,{scope:f.scope,now:()=>150}),deferred=pending();
 const work=loadingAwaitWitness(f.world.onLoadingSpan,'load-bridges',()=>deferred.promise,()=>100);
 const report=f.scope.__wildGuardiansNativeLoadingTrace.report;assert.deepEqual(report.pending,[{label:'load-bridges',start:100,elapsedMs:50}]);assert.ok(Object.isFrozen(report.pending[0]));assert.equal(report.closed,true);assert.equal(f.world.onLoadingSpan,undefined);assert.equal(Object.hasOwn(f.world,'onLoadingSpan'),false);
 deferred.resolve(7);assert.equal(await work,7);assert.strictEqual(owner.close(),report);assert.strictEqual(f.scope.__wildGuardiansNativeLoadingTrace.report,report);assert.equal(report.completed.length,0);
});
test('prior hooks receive exact calls/arguments/results and old async tokens survive rebind until release',()=>{
 const f=setup(),calls=[],context={},oldToken={value:'prior'};
 function prior(...args){calls.push(['span',this,...args]);return 42;}
 prior.onAwaitStart=function(...args){calls.push(['start',this,...args]);return oldToken;};prior.onAwaitEnd=function(...args){calls.push(['end',this,...args]);return 'end-result';};f.world.onLoadingSpan=prior;
 const owner=installNativeLoadingTrace(f.world,{scope:f.scope,now:()=>10}),hook=f.world.onLoadingSpan,span={label:'x',start:0,end:3,duration:3};
 assert.equal(hook.call(context,span),42);const token=hook.onAwaitStart({label:'pending',start:0});
 const replacement=()=>{};f.world.onLoadingSpan=replacement;owner.connect();assert.strictEqual(f.world.onLoadingSpan,hook);
 assert.equal(hook.onAwaitEnd(token,span),'end-result');assert.deepEqual(calls[0],['span',context,span]);assert.strictEqual(calls[1][1],prior);assert.strictEqual(calls[2][1],prior);assert.strictEqual(calls[2][2],oldToken);
 owner.close();assert.strictEqual(f.world.onLoadingSpan,replacement);assert.equal(token.end,null);assert.equal(token.context,null);assert.equal(token.previous,null);
});
test('abort after hook replacement closes retained callbacks and keeps pending evidence without clobbering replacement',()=>{
 const f=setup();let calls=0;const prior=()=>calls++;f.world.onLoadingSpan=prior;const owner=installNativeLoadingTrace(f.world,{scope:f.scope,now:()=>100}),retained=f.world.onLoadingSpan,token=retained.onAwaitStart({label:'load',start:30});
 const replacement=()=>{};f.world.onLoadingSpan=replacement;owner.connect();f.world.loading.abort();retained({label:'late',start:0,end:1,duration:1});retained.onAwaitEnd(token);retained.onAwaitStart({label:'new',start:2});
 const report=f.scope.__wildGuardiansNativeLoadingTrace.report;assert.equal(report.cancelled,true);assert.equal(report.pending[0].elapsedMs,70);assert.equal(calls,0);assert.strictEqual(f.world.onLoadingSpan,replacement);assert.equal(token.trace,null);owner.close();
});
test('recursive external chaining and observer getter/clock/export faults cannot change readiness flow',()=>{
 const f=setup(),owner=installNativeLoadingTrace(f.world,{scope:f.scope}),retained=f.world.onLoadingSpan;let calls=0;
 f.world.onLoadingSpan=span=>{calls++;retained(span);return 7;};owner.connect();assert.equal(retained({label:'a',start:0,end:1,duration:1}),7);assert.equal(calls,1);owner.close();
 const getter=setup();Object.defineProperty(getter.world,'onLoadingSpan',{get(){throw Error('getter');}});assert.doesNotThrow(()=>installNativeLoadingTrace(getter.world,{scope:getter.scope,now(){throw Error('clock');}}));
 const inaccessible=setup();Object.defineProperty(inaccessible.scope,'__wildGuardiansNativeLoadingTrace',{value:'protected'});assert.equal(installNativeLoadingTrace(inaccessible.world,{scope:inaccessible.scope}),null);assert.equal(inaccessible.world.onLoadingSpan,undefined);
});
test('trace finish copies pending diagnosis but leaves original ok/failure gates independent',async()=>{
 const source=readFileSync('src-tauri/smoke.js','utf8'),finish=source.slice(source.indexOf('  async function finish(error)'),source.indexOf('  async function listFixtureForSmoke('));
 const data=Object.freeze({pending:[{label:'load',elapsedMs:90000}]});const context={report:{checks:{},errors:[]},finished:false,timeout:1,worldStartedAt:0,worldReadyAt:null,performance:{now:()=>90000},clearTimeout(){},document:{querySelector:()=>null,visibilityState:'visible',hasFocus:()=>true},window:{__desktopSmokeLoadingTrace:true,__wildGuardiansNativeLoadingTrace:{get report(){return data;}},__TAURI_INTERNALS__:{invoke:async()=>{}}}};
 const report=await runInNewContext(`${finish}\n(async()=>{await finish(Error('Original90s timeout'));return report;})()`,context);assert.equal(report.ok,false);assert.equal(report.checks.nativeLoadingTrace.pending[0].label,'load');assert.ok(report.errors.includes('Error: Original90s timeout'));
});
test('App trace wiring retains ordinary source exactly outside narrow smoke diagnostics',()=>{
 const base=execFileSync('git',['show','71917b71:src/app/main.js'],{encoding:'utf8'}).replaceAll('\r\n','\n');
 const actual=readFileSync('src/app/main.js','utf8').replaceAll('\r\n','\n').replace("import {installNativeLoadingTrace} from './native-loading-trace-bridge.js';\n",'').replace('let owner,diorama,trace;','let owner,diorama;').replace('trace=installNativeLoadingTrace(owner);','').replace(',trace,visual:',',visual:').replace('pending.trace?.close({cancelled:true});','').replace('prepared.trace?.connect();','').replace('prepared.trace?.close();','');assert.equal(actual,base);
 const rust=readFileSync('src-tauri/src/main.rs','utf8');assert.match(rust,/--smoke-report[\s\S]*--smoke-loading-trace/);const bridge=readFileSync('src/app/native-loading-trace-bridge.js','utf8');for(const forbidden of ['setTimeout','requestAnimationFrame','new WebGLRenderer','canvas.getContext','fetch('])assert.equal(bridge.includes(forbidden),false);
});
test('graphics snapshot uses existing renderer once only under opt-in, and context failures are data',()=>{
 const f=setup(),queries=[];let gets=0;
 const gl={VERSION:1,VENDOR:2,RENDERER:3,getParameter(key){queries.push(key);return ['','WebGL2','ANGLE','renderer','unmasked-vendor','unmasked-renderer'][key];},getExtension(name){assert.equal(name,'WEBGL_debug_renderer_info');return {UNMASKED_VENDOR_WEBGL:4,UNMASKED_RENDERER_WEBGL:5};}};
 f.world.renderer={getContext(){gets++;return gl;}};assert.equal(installNativeLoadingTrace(f.world,{scope:{}}),null);assert.equal(gets,0);
 const owner=installNativeLoadingTrace(f.world,{scope:f.scope});owner.connect();const report=owner.close();assert.equal(gets,1);assert.deepEqual(queries,[1,2,3,4,5]);assert.equal(report.graphics.unmasked.renderer,'unmasked-renderer');assert.equal(Object.isFrozen(report.graphics),true);
 const failure=setup();failure.world.renderer={getContext(){throw Error('context unavailable');}};const other=installNativeLoadingTrace(failure.world,{scope:failure.scope});assert.match(other.close().graphics.error,/context unavailable/);
});

test('only exact trace hunks differ from frozen ordinary Rust and smoke sources',()=>{
 for(const file of ['src-tauri/src/main.rs','src-tauri/smoke.js'])assert.equal(normalizeTrace(file,readFileSync(file,'utf8')),execFileSync('git',['show','71917b71:'+file],{encoding:'utf8'}).replaceAll('\r\n','\n'));
});
test('prior callback exceptions and optional getter faults preserve flow and terminal cleanup',async()=>{
 const f=setup(),error=Error('prior failure');function prior(){throw error;}prior.onAwaitStart=()=>({});prior.onAwaitEnd=()=>{throw error;};f.world.onLoadingSpan=prior;
 const owner=installNativeLoadingTrace(f.world,{scope:f.scope,now:()=>10}),hook=f.world.onLoadingSpan;assert.throws(()=>hook({label:'sync',start:0,end:2,duration:2}),e=>e===error);
 const token=hook.onAwaitStart({label:'await',start:0});assert.throws(()=>hook.onAwaitEnd(token),e=>e===error);assert.equal(token.context,null);
 assert.equal(await loadingAwaitWitness(hook,'real-await',()=>Promise.resolve(7),()=>3),7);const report=owner.close();assert.equal(report.pending.length,0);assert.strictEqual(f.world.onLoadingSpan,prior);
 const other=setup();const callback=()=>{};Object.defineProperty(callback,'onAwaitStart',{get(){throw error;}});other.world.onLoadingSpan=callback;const bridge=installNativeLoadingTrace(other.world,{scope:other.scope});assert.equal(await loadingAwaitWitness(other.world.onLoadingSpan,'getter-fault',()=>Promise.resolve(8)),8);bridge.close();
});
test('absent debug extension and invalid/error parameters remain explicitly unavailable',()=>{
 const f=setup();f.world.renderer={getContext:()=>({getParameter(){throw Error('parameter unavailable');},getExtension:()=>null})};const owner=installNativeLoadingTrace(f.world,{scope:f.scope});const report=owner.close();assert.equal(report.graphics.unmasked.unavailable,true);assert.match(report.graphics.version.error,/parameter unavailable/);
});
