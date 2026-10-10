import {frozenSource} from './frozen-loading-source.js';
import {normalizePairWiring} from './world-crop-pair-wiring-normalize.js';
import {normalizeTrace} from './native-loading-trace-source-normalize.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {prepareLoadingCropPartition} from '../src/app/loading-crop-partition.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};

test('App uses canonical Assets singleton and releases only its owner on abort',async()=>{
 const loading=new AbortController(),partition={calls:0,dispose(){this.calls++;}},world={loading,assets:{getCropPartition:async()=>partition}};
 assert.strictEqual(await prepareLoadingCropPartition(world),partition);assert.strictEqual(world.cropPartition,partition);
 await assert.rejects(prepareLoadingCropPartition(world),/already prepared/);
 loading.abort();loading.abort();assert.equal(partition.calls,1);assert.equal(world.cropPartition,null);
});
test('cancelled late manifest arrival cannot adopt into App',async()=>{
 const pending=deferred(),loading=new AbortController(),world={loading,assets:{getCropPartition:()=>pending.promise}};
 const work=prepareLoadingCropPartition(world),rejected=assert.rejects(work,/cancelled/);loading.abort();let disposals=0;pending.resolve({dispose(){disposals++;}});await rejected;assert.equal(disposals,1);assert.equal(world.cropPartition,undefined);
});
test('rejected preparation is observed and aborted owner cannot start a new manifest',async()=>{
 const error=Error('manifest failure'),loading=new AbortController(),world={loading,assets:{getCropPartition:async()=>{throw error;}}};
 await assert.rejects(prepareLoadingCropPartition(world),e=>e===error);loading.abort();await assert.rejects(prepareLoadingCropPartition(world),/cancelled/);
});
test('App retains current main rules and gates outside partition selection and opt-in visual connection',()=>{
 const base=frozenSource('0e94d7be','src/app/main.js');
 const actual=normalizeTrace('src/app/main.js',readFileSync('src/app/main.js','utf8')).replace("import {installLoadingVisualQa} from './loading-visual-bridge.js';\n",'').replace(',visual:installLoadingVisualQa(owner,diorama)','').replace('pending.visual?.close({cancelled:true});','').replace('loadingDiorama?.visualQa?.close({cancelled:true});','').replace('prepared.visual?.close();','').replace("import {prepareLoadingCropPartition} from './loading-crop-partition.js';\n",'').replace('prepareLoadingCropPartition(owner).then(()=>diorama.prepare())','diorama.prepare()');
 assert.equal(actual.replaceAll('\r\n','\n'),base.replaceAll('\r\n','\n'));
 for(const file of ['src/rendering/loading-programs.js','src/rendering/loading-yield-budget.js','src/app/loading-downloads.js','public/menu/native.js','src/ui/menu-integration.js','src/simulation/game.js','src-tauri/smoke.js','src-tauri/src/main.rs','.github/workflows/windows.yml'])assert.equal(normalizeQa(file,readFileSync(file,'utf8').replaceAll('\r\n','\n')),frozenSource(['src-tauri/smoke.js','src-tauri/src/main.rs'].includes(file)?'8fb7f437':'0e94d7be',file).replaceAll('\r\n','\n'),file);
});

// QA branch adds only guarded evidence/action checks; strip these exact hunks
// to retain the production recipe/source equivalence assertion.
function normalizeQa(file,text){
 text=normalizePairWiring(file,normalizeTrace(file,text));
 if(file==='.github/workflows/windows.yml')text=text.replace("      loading_trace:\n        description: 'Record bounded loading phase attribution (diagnostic overhead; not a benchmark)'\n        type: boolean\n        required: false\n        default: false\n",'').replace("          if ('${{ github.event.inputs.loading_trace }}' -eq 'true') { $smokeArguments += '--smoke-loading-trace' }\n",'').replace("          $smokeArguments = @('--smoke-report', $report)\n",'').replace('    inputs:\n','').replace('$smokeArguments -WindowStyle',"'--smoke-report', $report -WindowStyle");
 if(file==='src-tauri/src/main.rs')return text.replace('                    if std::env::args().any(|arg| arg == "--smoke-visual-plant") {\n                        let _ = webview.eval("window.__desktopSmokeVisualPlant = true;");\n                    }\n','');
 if(file==='src-tauri/smoke.js'){
  const start=text.indexOf('  async function listFixtureForSmoke(');
  if(start>=0){const end=text.indexOf('  async function checkVisibility(',start);text=text.slice(0,start)+text.slice(end);}
  text=text.replace(`    if (fixture) {
      localStorage.setItem('wild-guardians:slot:'+fixture.slotId,fixture.snapshot);
      report.checks.fixtureMenuList=await listFixtureForSmoke(menu,fixture,send);
      send({action:'load-slot',slotId:fixture.slotId});
    }`,"    if (fixture) {localStorage.setItem('wild-guardians:slot:'+fixture.slotId,fixture.snapshot);send({action:'load-slot',slotId:fixture.slotId});}");
  return text.replace(`      if (window.__desktopSmokeVisualPlant === true) {
        const action = visual?.plantAction;
        const additional = visual?.frames?.find(frame => frame.label === 'additional-plant' && frame.plants?.length === 5);
        if (!action?.result || action.afterCount !== 5 || action.logicalPlantsUnchanged !== true || !additional) {
          report.errors.push('Requested synthetic loading plant evidence is missing or failed');
        }
      }
`,'');
 }
 return text;
}
