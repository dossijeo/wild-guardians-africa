import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessA5} from '../tools/guardian/migration-support/a5-evidence.mjs';
import {rewriteA5Module} from '../tools/guardian/migration-support/a5-routes.mjs';

// Evidence-schema fixture, not simulated GPU success. Hardware receipts are
// independently required by the CLI and exercise these same checks.
function fixture(){
  const pair=(id,cx)=>({id,cx,cz:0,source:{materialId:1,geometryDisposed:false,attributes:[{name:'position',reference:'source'+cx,bytes:12,itemSize:3,hash:8}]},model:{geometryDisposed:false,attributes:[{reference:'model'+id}]},impostor:{geometryDisposed:false,attributes:[{reference:'impostor'+id}]},copies:[{attributeShared:false,cpuBufferShared:false,bytesEqual:true}]});
  const a5=(live,retired=[],events=[])=>({live,retired,missing:[],events,atlases:[{closed:true,retained:0}],textures:[{disposed:true}],createdPairs:2,coverage:{closed:false}});
  const snapshot={clients:1,ui:{hasCurrent:true,binding:1,client:2,canvas:3,status:{phase:'running'}},renderer:{farCoverage:{closed:false,wanted:2,offered:2,deferred:0,pending:null,revision:1},preparation:{admission:{closed:false,active:false,queued:0,inflightCompiles:0,compilesStarted:1}},drawExecution:{resourcesCreated:1,consumer:{gpuErrors:0,uniformForks:0,bindingForks:0}},qaNativeBufferOwners:[{mesh:1,attribute:'position',reference:'resident',geometry:1,bytes:12,version:0,hash:7}],qaResidentOwners:{actors:[{root:1}],instances:[]},qaResourceTrace:[],qaCumulativeFactories:{createBuffer:1},qaA5:a5([pair(1,0),pair(2,1)])}};
  const report={functionalOk:true,errors:[],httpFailures:[],requestErrors:[],disposed:1,resourceStartupAcks:[{ready:{version:1}}],coldStart:structuredClone(snapshot),farWarmup:[{far:{wanted:2,offered:2},created:1,admission:{compilesStarted:1}}],before:structuredClone(snapshot),noRecoveryControl:[snapshot,snapshot,snapshot].map(value=>structuredClone(value)),recoveries:[{result:{retained:true},after:structuredClone(snapshot)},{result:{retained:true},after:structuredClone(snapshot)}]};
  report.coldStart.renderer.farCoverage.offered=1;
  const local=structuredClone(snapshot);local.renderer.qaA5=a5([pair(3,0),pair(2,1)],[1]);
  local.renderer.qaResourceTrace=['model1','impostor1'].map(reference=>({kind:'destroy',reference}));
  const cancel=structuredClone(snapshot);cancel.renderer.qaA5=a5([pair(5,0),pair(2,1)],[1,3,4],[{kind:'cancel-request',pair:4}]);
  cancel.renderer.qaResourceTrace=['model3','impostor3'].map(reference=>({kind:'destroy',reference}));
  const retired=structuredClone(snapshot);retired.renderer.qaA5=a5([],[1,2,3,4,5]);retired.renderer.qaA5.coverage.closed=true;retired.renderer.qaResourceTrace=['model5','impostor5','model2','impostor2'].map(reference=>({kind:'destroy',reference}));
  retired.renderer.qaResourceTrace.push({kind:'createBuffer',usage:40,reference:'cancelledBuffer',scope:{origin:{namespace:'a5-far-model'}}},{kind:'destroy',reference:'cancelledBuffer'});
  report.a5={chunk:{cx:0,cz:0},local:{before:structuredClone(snapshot),after:local},cancel:{before:local,after:cancel},retire:{before:cancel,after:retired,drained:true}};return report;
}
test('complete schema passes; this fixture is not hardware evidence',()=>assert.equal(assessA5(fixture()).accepted,true));
const negatives={
  'missing cold sample':r=>delete r.coldStart,
  'empty progressive observation':r=>r.farWarmup=[{}],
  'no observed progression':r=>r.coldStart.renderer.farCoverage.offered=2,
  'premature material disposal':r=>r.a5.local.after.renderer.qaA5.live[0].model.materialDisposed=true,
  'warm atlas changed':r=>r.recoveries[0].after.renderer.qaA5.textures[0].identity=9,
  'missing incremental demand':r=>r.farWarmup=[],
  'missing local scenario':r=>delete r.a5.local,
  'missing recovery':r=>r.recoveries.pop(),
  'reconstructed warm geometry':r=>r.recoveries[0].after.renderer.qaA5.live[0].model.attributes[0].reference='replacement',
  'extra warm factory':r=>r.recoveries[0].after.renderer.qaCumulativeFactories.createBuffer++,
  'extra warm fork':r=>r.recoveries[0].after.renderer.drawExecution.consumer.bindingForks++,
  'incomplete regional demand':r=>r.before.renderer.farCoverage.offered=1,
  'unrelated pair changed':r=>r.a5.local.after.renderer.qaA5.live[1].id=99,
  'replaced buffer leaked':r=>r.a5.local.after.renderer.qaResourceTrace=[],
  'cancelled unpublished buffer leaked':r=>r.a5.retire.after.renderer.qaResourceTrace=r.a5.retire.after.renderer.qaResourceTrace.filter(e=>e.kind!=='destroy'||e.reference!=='cancelledBuffer'),
  'old pair never retired':r=>r.a5.local.after.renderer.qaA5.retired=[],
  'source bytes changed':r=>r.a5.local.after.renderer.qaA5.live[0].source.attributes[0].hash=9,
  'premature source disposal':r=>r.a5.local.after.renderer.qaA5.live[0].source.geometryDisposed=true,
  'candidate cancellation unobserved':r=>r.a5.cancel.after.renderer.qaA5.events=[],
  'candidate leaked':r=>r.a5.cancel.after.renderer.qaA5.retired=[1,3],
  'atlas lease leaked':r=>r.a5.retire.after.renderer.qaA5.atlases[0].retained=1,
  'atlas texture leaked':r=>r.a5.retire.after.renderer.qaA5.textures[0].disposed=false,
  'private buffer leaked':r=>r.a5.retire.after.renderer.qaResourceTrace.pop(),
  'missing drain':r=>r.a5.retire.drained=false,
  'unrelated actor retired':r=>r.a5.retire.after.renderer.qaResidentOwners.actors=[],
  'presentation lost':r=>r.a5.retire.after.ui.hasCurrent=false,
  'unsafe GPU alias':r=>r.before.renderer.qaA5.live[0].model.attributes[0].reference='source0',
  'unsafe CPU alias':r=>r.before.renderer.qaA5.live[0].copies[0].cpuBufferShared=true,
  'unexplained missing owner':r=>r.a5.retire.after.renderer.qaA5.missing=[4],
};
for(const [name,mutate]of Object.entries(negatives))test('A5 rejects '+name,()=>{const r=fixture();mutate(r);assert.equal(assessA5(r).accepted,false);});
test('QA rewrites apply once to real existing modules and reject drift',()=>{
  for(const [kind,p]of [['pair','src/rendering/webgpu-far-pair.js'],['coverage','src/rendering/webgpu-far-coverage.js'],['assets','src/rendering/webgpu-far-assets.js'],['admission','src/rendering/webgpu-pipeline-admission.js'],['fixture','tests/browser/fixtures/native-worker-world-audit-worker.js']]){
    const original=readFileSync(p,'utf8');assert.match(rewriteA5Module(kind,original),/__a5Audit/);assert.throws(()=>rewriteA5Module(kind,''),/anchor/);
    assert.throws(()=>rewriteA5Module(kind,original+'\n'+original),/ambiguous/);
  }
});
