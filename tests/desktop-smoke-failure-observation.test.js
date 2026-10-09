import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const source = await readFile(new URL('../src-tauri/smoke.js', import.meta.url), 'utf8');

async function failedPreflight({query, focused = true, readiness} = {}) {
  let report;
  const context = {
    window: {__desktopSmokeLoadingReadiness:readiness,__TAURI_INTERNALS__: {invoke: async (command, args) => {
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


test('original finish reads readiness exactly once without masking original gate failure',async()=>{
 let reads=0;const snapshot={readiness:{actors:{queued:1}},context:{renderer:'existing'}};const report=await failedPreflight({readiness(){reads++;return snapshot;}});assert.equal(reads,1);assert.equal(report.checks.loadingReadinessAtFinish,snapshot);assert.equal(report.ok,false);assert.deepEqual(Array.from(report.errors),['Error: Original preflight failure']);
 const failure=await failedPreflight({readiness(){throw Error('snapshot');}});assert.match(failure.checks.loadingReadinessObservationError,/snapshot/);assert.equal(failure.ok,false);assert.deepEqual(Array.from(failure.errors),['Error: Original preflight failure']);
});
