import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const source = await readFile(new URL('../src-tauri/smoke.js', import.meta.url), 'utf8');

async function failedPreflight({query, focused = true, visualRequested=false, visual=null, worldTimeout} = {}) {
  let report;
  const context = {
    window: {__desktopSmokeWorldTimeoutMs:worldTimeout,__desktopSmokeVisualCapture:visualRequested,__wildGuardiansLoadingVisualQa:visual,__TAURI_INTERNALS__: {invoke: async (command, args) => {
      assert.equal(command, 'desktop_smoke_report'); report = args.report;
    }}},
    location: {origin: 'http://tauri.localhost', href: 'http://tauri.localhost/'},
    navigator: {userAgent: 'test'}, isSecureContext: true, URL,
    console: {error() {}}, addEventListener() {},
    setTimeout: () => 1, clearTimeout() {}, performance: {now: () => 1234},
    document: {querySelector: query ?? (() => null), visibilityState: 'visible', hasFocus: () => focused},
    fetch: async () => {throw Error('Original preflight failure');}
  };
  await runInNewContext(source, context);
  return report;
}

test('CI functional tolerance is explicit and finite; local/default and malformed inputs retain 90 seconds',async()=>{
 for(const value of [undefined,0,-1,Infinity,'300000',900000]){
  const report=await failedPreflight({worldTimeout:value});
  assert.equal(report.checks.loadingBudget.worldTimeoutMs,90000);
  assert.equal(report.checks.loadingBudget.policy,'local-smoke');
  assert.equal(report.ok,false,'a larger budget cannot turn a preflight error into success');
 }
 const ci=await failedPreflight({worldTimeout:300000});
 assert.equal(ci.checks.loadingBudget.worldTimeoutMs,300000);
 assert.equal(ci.checks.loadingBudget.policy,'ci-functional');
 assert.equal(ci.ok,false);
 const rust=await readFile(new URL('../src-tauri/src/main.rs',import.meta.url),'utf8');
 assert.match(rust,/arg == "--smoke-report"[\s\S]*WG_DESKTOP_SMOKE_CI[\s\S]*__desktopSmokeWorldTimeoutMs = 300000/);
 const workflow=await readFile(new URL('../.github/workflows/windows.yml',import.meta.url),'utf8');
 assert.match(workflow,/WG_DESKTOP_SMOKE_CI: '1'/);
 assert.match(workflow,/WaitForExit\(420000\)/);
 assert.match(workflow,/WaitForExit\(900000\)/);
});

test('failure report observes loading UI without converting it into readiness or masking failure', async () => {
  const elements = {
    '#stage': {getAttribute: () => 'true'},
    '#world': {width: 1024, height: 576, getContext() {throw Error('GPU access forbidden');}},
    '.interactive-loading-track': {getAttribute: () => '82'},
    '.interactive-loading-title': {textContent: 'Preparing your world…'}
  };
  const report = await failedPreflight({query: selector => elements[selector] ?? null, focused: false});
  assert.equal(report.ok, false);
  assert.deepEqual(Array.from(report.errors), ['Error: Original preflight failure']);
  const observed = report.checks.loadingAtFinish;
  assert.equal(observed.worldWaitMs, null, 'preflight is not world initialization time');
  assert.equal(observed.stageBusy, 'true');
  assert.equal(observed.displayedProgress, '82');
  assert.equal(observed.focused, false);
  assert.equal(observed.canvas.width, 1024);
  assert.match(observed.scope, /do not establish world readiness/);
});

test('early failure tolerates loading elements not yet created', async () => {
  const report = await failedPreflight();
  assert.equal(report.ok, false);
  for (const key of ['worldWaitMs', 'stageBusy', 'displayedProgress', 'phaseLabel', 'canvas']) {
    assert.equal(report.checks.loadingAtFinish[key], null);
  }
});

test('an observation fault preserves the original failure and still publishes the report', async () => {
  const report = await failedPreflight({query() {throw Error('DOM observation unavailable');}});
  assert.equal(report.ok, false);
  assert.deepEqual(Array.from(report.errors), ['Error: Original preflight failure']);
  assert.match(report.checks.loadingObservationError, /DOM observation unavailable/);
});

test('world wait stops at the ready gate and excludes the later five-minute visibility test', async () => {
  const finishSource = source.slice(source.indexOf('  async function finish(error)'), source.indexOf('  async function checkVisibility(fixture)'));
  const context = {
    report: {checks: {}, errors: []}, finished: false, timeout: 1,
    worldStartedAt: 10000, worldReadyAt: 28000,
    performance: {now: () => 343000}, clearTimeout() {},
    document: {querySelector: () => null, visibilityState: 'visible', hasFocus: () => true},
    window: {__TAURI_INTERNALS__: {invoke: async () => {}}}
  };
  const report = await runInNewContext(`${finishSource}\n(async () => {await finish(); return report;})()`, context);
  assert.equal(report.checks.loadingAtFinish.worldWaitMs, 18000);
  assert.equal(report.checks.loadingAtFinish.readyGateReached, true);
  assert.equal(report.ok, true);
});

test('opt-in visual export retains pixels/metadata without claiming readiness or hiding preflight failure',async()=>{
 const visual={report:{frames:[{label:'initial',progress:.2,night:1,plants:[{id:'loading-maize-1'}],png:'data:image/png;base64,AAAA'}],errors:[],closed:true,cancelled:true}};
 const report=await failedPreflight({visualRequested:true,visual});
 assert.equal(report.ok,false);assert.deepEqual(Array.from(report.errors),['Error: Original preflight failure']);
 assert.equal(report.checks.loadingVisual.frames[0].png,visual.report.frames[0].png);
 assert.equal(report.checks.loadingVisual.cancelled,true);assert.match(report.checks.loadingVisualRunScope,/not a loading-time or GPU benchmark/);
 assert.equal(report.checks.loadingAtFinish.readyGateReached,false);
});

test('missing visual collector remains explicitly unavailable, ordinary smoke exports no pixels',async()=>{
 const requested=await failedPreflight({visualRequested:true});assert.equal(requested.checks.loadingVisual.available,false);
 assert.deepEqual(Array.from(requested.errors),['Error: Original preflight failure']);
 const ordinary=await failedPreflight();assert.equal(ordinary.checks.loadingVisual,undefined);
});

test('requested but empty captures cannot pass an otherwise successful native smoke',async()=>{
 const finishSource=source.slice(source.indexOf('  async function finish(error)'),source.indexOf('  async function checkVisibility(fixture)'));
 const context={report:{checks:{},errors:[]},finished:false,timeout:1,worldStartedAt:0,worldReadyAt:100,
  performance:{now:()=>100},clearTimeout(){},document:{querySelector:()=>null,visibilityState:'visible',hasFocus:()=>true},
  window:{__desktopSmokeVisualCapture:true,__wildGuardiansLoadingVisualQa:{report:{frames:[],errors:[]}},__TAURI_INTERNALS__:{invoke:async()=>{}}}};
 const report=await runInNewContext(`${finishSource}\n(async()=>{await finish();return report;})()`,context);
 assert.equal(report.ok,false);assert.equal(report.checks.loadingAtFinish.readyGateReached,true);
 assert.deepEqual(Array.from(report.errors),['Requested loading visual evidence is missing']);
});

test('native visual injection remains nested inside explicit smoke mode',async()=>{
 const rust=await readFile(new URL('../src-tauri/src/main.rs',import.meta.url),'utf8');
 assert.match(rust,/args\(\)\.any\(\|arg\| arg == "--smoke-report"\)[\s\S]*if std::env::args\(\)\.any\(\|arg\| arg == "--smoke-visual"\)/);
 assert.equal((rust.match(/window\.__desktopSmokeVisualCapture = true/g)??[]).length,1);
 assert.match(source,/worldStartedAt \+ worldTimeoutMs/);assert.match(source,/await wait\(300000\)/);
});
