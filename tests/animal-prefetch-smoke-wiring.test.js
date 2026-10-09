import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const smoke=readFileSync('src-tauri/smoke.js','utf8'),rust=readFileSync('src-tauri/src/main.rs','utf8'),workflow=readFileSync('.github/workflows/windows.yml','utf8');

test('native recipe reports strict opt-in prefetch plus unchanged disabled readiness experiments',()=>{
 const statement=smoke.split('\n').find(line=>line.includes('report.checks.loadingRecipe='));
 for(const flag of [undefined,false,'true',true]){
  const report={checks:{}},window={__desktopSmokeAnimalPrefetch:flag,__desktopSmokeSharedGroundClip:true,__desktopSmokePauseLoadingMenu:true};runInNewContext(statement,{report,window});
  assert.equal(report.checks.loadingRecipe.animalPrefetch,flag===true);assert.equal(report.checks.loadingRecipe.sharedGroundClip,true);assert.equal(report.checks.loadingRecipe.pauseLoadingMenu,true);
  assert.equal(report.checks.loadingRecipe.collectiveReadiness,false);assert.equal(report.checks.loadingRecipe.parallelReadiness,false);assert.equal(report.checks.loadingRecipe.parallelDioramaAssets,false);
 }
});

test('native prefetch switch is injected only inside existing smoke-report page-load guard',()=>{
 const guard=rust.indexOf('&& std::env::args().any(|arg| arg == "--smoke-report")'),flag=rust.indexOf('arg == "--smoke-animal-prefetch"'),evalAt=rust.indexOf('window.__desktopSmokeAnimalPrefetch=true;'),smokeAt=rust.indexOf('include_str!("../smoke.js")');
 assert.ok(guard>=0&&flag>guard&&evalAt>flag&&smokeAt>evalAt);assert.equal((rust.match(/__desktopSmokeAnimalPrefetch/g)||[]).length,1);
});

test('paired control uses identical fixture file and fixed ground/menu options but never enables prefetch',()=>{
 const control=workflow.split('      - name: Diagnostic same-EXE fixture712 animal prefetch OFF')[1].split('      - name: Smoke test')[0];
 assert.match(control,/continue-on-error: true/);assert.match(control,/create_desktop_visibility_fixture\.mjs \$fixture/);
 const args=control.split('\n').find(line=>line.includes('$controlArgs ='));assert.match(args,/--smoke-fixture/);assert.match(args,/--smoke-shared-ground/);assert.match(args,/--smoke-pause-menu/);assert.doesNotMatch(args,/--smoke-animal-prefetch/);
 assert.match(control,/not \$result\.ok/);assert.match(control,/not \$result\.checks\.visibility\.passed/);assert.match(control,/normalized step success is not a smoke PASS/);
 const visibility=workflow.split('      - name: Check genuine native minimization and restoration')[1].split('      - uses:')[0];
 assert.match(visibility,/if \(\$env:SMOKE_ANIMAL_PREFETCH -ne 'true'\)/);assert.match(visibility,/desktop-visibility-fixture\.json/);assert.match(visibility,/Missing exact fixture712 control snapshot/);assert.match(visibility,/--smoke-animal-prefetch/);assert.match(visibility,/not \$result\.checks\.visibility\.passed/);
});

test('workflow defaults OFF and retains both candidate gates and original world deadline',()=>{
 assert.match(workflow,/animal_prefetch:[\s\S]*?type: boolean\n        default: false/);
 assert.match(workflow,/Animal prefetch comparison requires shared_ground=true and pause_menu=true in both arms/);
 assert.match(workflow,/inputs\.shared_ground && !inputs\.animal_prefetch/);
 const primary=workflow.split('      - name: Smoke test the packaged game in WebView2')[1].split('      - name: Check genuine')[0];
 assert.match(primary,/--smoke-animal-prefetch/);assert.doesNotMatch(primary,/continue-on-error/);assert.match(primary,/not \$result\.ok/);
 assert.match(smoke,/const worldEnd = performance\.now\(\) \+ 90000/);
 assert.match(workflow,/desktop-animal-control\.json/);assert.match(workflow,/path: \$\{\{ runner\.temp \}\}\/desktop-visibility-fixture\.json/);
});
