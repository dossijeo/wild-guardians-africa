import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const workflow=readFileSync('.github/workflows/windows.yml','utf8'),smoke=readFileSync('src-tauri/smoke.js','utf8');
test('fluid recipe reports strict boolean and preserves disabled independent experiments',()=>{
  const statement=smoke.split('\n').find(line=>line.includes('report.checks.loadingRecipe='));
  for(const flag of [undefined,false,'true',true]){const report={checks:{}};runInNewContext(statement,{report,window:{__desktopSmokeFluidDepth:flag}});assert.equal(report.checks.loadingRecipe.fluidDepth,flag===true);for(const key of ['animalPrefetch','sharedGroundClip','collectiveReadiness','parallelReadiness','parallelDioramaAssets'])assert.equal(report.checks.loadingRecipe[key],false);}
});
test('same executable control OFF uses original fixture once and keeps pause fixed without other hypothesis flags',()=>{
  const control=workflow.split('      - name: Diagnostic same-EXE fixture712 fluid depth OFF')[1].split('      - name: Smoke test')[0];
  assert.match(control,/if: inputs.fluid_depth/);assert.match(control,/continue-on-error: true/);assert.match(control,/create_desktop_visibility_fixture.mjs \$fixture/);
  const args=control.split('\n').find(line=>line.includes('$controlArgs ='));assert.match(args,/--smoke-fixture/);assert.match(args,/--smoke-pause-menu/);assert.doesNotMatch(args,/--smoke-fluid-depth|--smoke-animal-prefetch|--smoke-shared-ground/);
  assert.match(control,/not \$result.ok/);assert.match(control,/not \$result.checks.visibility.passed/);assert.match(control,/raw failure preserved; normalized step success is not a smoke PASS/);
  const visibility=workflow.split('      - name: Check genuine native minimization and restoration')[1].split('      - uses:')[0];
  assert.match(visibility,/SMOKE_ANIMAL_PREFETCH -ne 'true' -and \$env:SMOKE_FLUID_DEPTH -ne 'true'/);assert.match(visibility,/--smoke-fluid-depth/);assert.match(visibility,/not \$result.checks.visibility.passed/);assert.match(visibility,/not \$result.checks.fluidDepthBinding.passed/);
});
test('candidate primary and visibility are hard gates; isolation validation rejects mixed hypotheses',()=>{
  assert.match(workflow,/fluid_depth:[\s\S]*?default: false/);assert.match(workflow,/Fluid depth comparison requires shared_ground=false, animal_prefetch=false and pause_menu=true/);
  const primary=workflow.split('      - name: Smoke test the packaged game in WebView2')[1].split('      - name: Check genuine')[0];assert.doesNotMatch(primary,/continue-on-error/);assert.match(primary,/--smoke-fluid-depth/);assert.match(primary,/not \$result.ok/);assert.match(primary,/not \$result.checks.fluidDepthBinding.passed/);
  assert.match(smoke,/performance.now\(\) \+ 90000/);assert.match(workflow,/desktop-fluid-control.json/);
});
