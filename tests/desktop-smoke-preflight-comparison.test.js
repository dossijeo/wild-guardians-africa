import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {undoPreflightQa} from './fixtures/preflight-comparison-normalizer.mjs';
const source=readFileSync('src-tauri/smoke.js','utf8').replaceAll('\r\n','\n');
const baseline=JSON.parse(readFileSync('tests/fixtures/preflight-comparison-baseline.json','utf8'));
async function run({loadingOnly,failFetch=false,failReady=false,fixture=null,worldTimeout}={}){
 const calls=[],messages=[],timers=new Map(),map=new Map();let report,clock=0;
 const listeners=new Set(),target={addEventListener(_,fn){listeners.add(fn);},removeEventListener(_,fn){listeners.delete(fn);}},menu={contentWindow:target,src:'menu/index.html'};
 const world={width:1024,height:576,getContext(){throw Error('No GPU/context access allowed');},toDataURL(){calls.push('world PNG');return 'data:image/png;base64,AA==';}};
 const header=new ArrayBuffer(12);new DataView(header).setUint32(0,0x46546c67,true);
 const rows=[{source:'assets/model.glb',runtime:'assets/model.glb'}];
 const context={location:{origin:'http://tauri.localhost',href:'http://tauri.localhost/'},navigator:{userAgent:'CPUdouble'},isSecureContext:true,console:{error(){}},addEventListener(){},URL,Blob,
  performance:{now:()=>clock},setTimeout(fn,ms){if(ms===720000||ms===10000){timers.set(ms,fn);return ms;}clock+=ms;queueMicrotask(fn);return ms;},clearTimeout(id){timers.delete(id);},requestAnimationFrame(fn){queueMicrotask(fn);},
  fetch:async url=>{calls.push('fetch:'+url);if(failFetch)throw Error('compatibility fetch failed');return {ok:true,json:async()=>String(url).includes('web-assets')?{records:rows}:{items:[{id:'SFX',audio:{url:'sample.audio'}}]},arrayBuffer:async()=>header};},
  document:{querySelector(selector){if(selector==='#app iframe')return menu;if(selector==='#stage')return {getAttribute:()=>failReady?'true':'false'};if(selector==='#world')return world;return null;},createElement(){calls.push('compatibility WebGL');return {getContext:()=>({getExtension:()=>({loseContext(){calls.push('lose compatibility context');}})})};},visibilityState:'visible',hasFocus:()=>true},
  Worker:class {set onmessage(fn){calls.push('compatibility Worker');queueMicrotask(()=>fn({data:42}));}terminate(){calls.push('terminate Worker');}},
  AudioContext:class {async decodeAudioData(){calls.push('compatibility audio');return {duration:1,numberOfChannels:1,sampleRate:48000};}async close(){calls.push('close audio');}},
  localStorage:{setItem(k,v){calls.push('storage:'+k);map.set(k,v);},getItem:k=>map.get(k),removeItem:k=>map.delete(k)},
  window:{__desktopSmokeWorldTimeoutMs:worldTimeout,__desktopSmokeLoadingOnly:loadingOnly,__TAURI_INTERNALS__:{invoke:async(command,args)=>{if(command==='desktop_smoke_fixture')return fixture;assert.equal(command,'desktop_smoke_report');report=args.report;}}},
  decodeWebGlb:async value=>{calls.push('compatibility decode');return value;},
  MessageEvent:class {constructor(_,options){Object.assign(this,options);}},dispatchEvent(event){messages.push(event.data.action);if(event.data.action==='request-saves'){for(const fn of listeners)fn({origin:context.location.origin,source:context.window,data:{type:'wild-guardians:menu-data',slots:[{slotId:fixture.slotId,day:1,time:310,biome:'gran-canon',culture:'mapungubwe'}]}});}if(fixture&&event.data.action==='load-slot')throw Error('fixture load marker');}
 };
 // Only module resolution is replaced for this VM double; all compatibility
 // statements, branching, menu/readiness and finish code execute from smoke.js.
 const executable=source.replace("const {decodeWebGlb} = await import(new URL('runtime/glb-legacy.js', location.href));","const decodeWebGlb = globalThis.decodeWebGlb;");
 await runInNewContext(executable,context);return {report,calls,messages,timers};
}
test('full default still performs all compatibility checks before unchanged real loading flow',async()=>{
 const {report,calls,messages}=await run();assert.equal(report.ok,true);assert.equal(report.checks.preflightSkipped,false);assert.equal(report.checks.preflight.completed,true);assert.equal(report.checks.models.length,1);
 for(const key of ['webgl2','worker','storage'])assert.equal(report.checks[key],true);assert.equal(report.checks.audio.id,'SFX');assert.ok(calls.includes('compatibility decode'));assert.deepEqual(messages,['settings-change','start']);assert.equal(report.checks.loadingAtFinish.readyGateReached,true);assert.equal(report.checks.worldGraphicsIdentity.available,false);
});
test('strict lean skips only compatibility without manufacturing PASS fields',async()=>{
 const {report,calls,messages}=await run({loadingOnly:true});assert.equal(report.ok,true);assert.equal(report.checks.preflightSkipped,true);assert.equal(report.checks.preflight.completed,false);
 for(const key of ['models','webgl2','worker','audio','audioSeconds','storage'])assert.equal(report.checks[key],undefined,key);
 assert.deepEqual(calls,['world PNG']);assert.deepEqual(messages,['settings-change','start']);assert.match(report.checks.preflight.scope,/no model\/WebGL\/Worker\/audio\/storage compatibility PASS/);
});
test('string/false flags retain full mode and original compatibility failure',async()=>{
 for(const value of [undefined,false,'true',1]){const {report,messages}=await run({loadingOnly:value,failFetch:true});assert.equal(report.ok,false);assert.equal(report.checks.preflightSkipped,false);assert.equal(report.checks.preflight.completed,false);assert.match(report.errors[0],/compatibility fetch failed/);assert.deepEqual(messages,[]);}
});
test('both modes retain configured readiness failure; skipped compatibility cannot approve an unready World',async()=>{
 for(const worldTimeout of [undefined,300000])for(const loadingOnly of [false,true]){const {report}=await run({loadingOnly,worldTimeout,failReady:true});assert.equal(report.ok,false);assert.match(report.errors[0],/Production world did not finish loading/);assert.equal(report.checks.loadingAtFinish.readyGateReached,false);assert.ok(report.checks.loadingAtFinish.worldWaitMs>=(worldTimeout??90000));}
});
test('same fixture flow lists actual saved preview before load in both modes',async()=>{
 for(const loadingOnly of [false,true]){const {report,messages,timers}=await run({loadingOnly,fixture:{slotId:'owned',snapshot:'immutable fixture string'}});assert.deepEqual(messages,['settings-change','request-saves','load-slot']);assert.equal(report.checks.fixtureMenuList.preview.time,310);assert.equal(report.ok,false);assert.match(report.errors[0],/fixture load marker/);assert.equal(timers.size,0);}
});
test('only approved wrapper/listing/unknown identity and guarded Rust flag differ from383 source',()=>{
 for(const row of baseline.rows){const text=readFileSync(row.path,'utf8').replaceAll('\r\n','\n');assert.equal(createHash('sha256').update(undoPreflightQa(row.path,text)).digest('hex'),row.sha256,row.path);}
 const helper=source.slice(source.indexOf('  async function listFixtureForSmoke('),source.indexOf('  async function checkVisibility('));assert.equal(createHash('sha256').update(helper).digest('hex'),baseline.helperSha256);
 assert.match(source,/worldStartedAt \+ worldTimeoutMs/);assert.match(source,/await wait\(300000\)/);assert.match(source,/Desktop smoke timed out'\)\), 720000/);
 const rust=readFileSync('src-tauri/src/main.rs','utf8');assert.match(rust,/--smoke-report[\s\S]*webview.label\(\) == "main"[\s\S]*--smoke-loading-only/);assert.equal((rust.match(/window\.__desktopSmokeLoadingOnly = true/g)??[]).length,1);
});
