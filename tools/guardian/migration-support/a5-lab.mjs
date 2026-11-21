import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {root,fingerprint,runDirectory,command,saveReport,digest} from './core.mjs';
import {readA5Receipt,summarizeA5} from './a5-summary.mjs';
import {assessA5} from './a5-evidence.mjs';
import {probeGeometryLifetime} from './a5-geometry-lifetime.mjs';

export const a5Scenarios={
  cold:{tests:['webgpu-far-assets','webgpu-far-pair'],scope:'Cold original-main startup and first legitimate preparations'},
  progressive:{tests:['webgpu-far-region','webgpu-far-coverage'],scope:'Original regional wanted/offered/admission progression'},
  steady:{tests:['webgpu-far-region','webgpu-far-pair'],scope:'Settled owner, two no-recovery controls; not cadence'},
  recovery:{tests:['webgpu-biome-props'],scope:'Two retained main recoveries, same owners and resident references'},
  local:{tests:['webgpu-far-coverage','webgpu-far-pair'],scope:'One graphical chunk invalidated/reprepared from unchanged native data; other pairs preserved'},
  retirement:{tests:['webgpu-far-assets','webgpu-far-coverage','webgpu-far-pair','a5-far-geometry-lifetime'],scope:'Stale/cancelled candidate, deferred release, coverage retirement and original-main disposal'},
};
export async function runA5Lab(args){
  const value=key=>{if(!args.includes(key))return undefined;const v=args[args.indexOf(key)+1];if(!v||v.startsWith('--'))throw Error('Missing value for '+key);return v;};
  if(value('--receipt')){const p=path.resolve(root,value('--receipt')),raw=readFileSync(p),result=assessA5(readA5Receipt(p));console.log(JSON.stringify({source:p,sha256:digest(raw),result},null,2));process.exitCode=result.accepted?0:1;return;}
  const names=(value('--scenario')??'all').split(','),selected=names.includes('all')?Object.keys(a5Scenarios):names;
  for(const n of selected)if(!a5Scenarios[n])throw Error('Unknown A5 scenario: '+n);
  const tests=[...new Set(['webgpu-resource-registry','webgpu-pipeline-admission','webgpu-texture-upload','a5-far-geometry-lifetime','a5-far-evidence',...selected.flatMap(n=>a5Scenarios[n].tests)])].sort().map(n=>'tests/'+n+'.test.js');
  const plan={scenarios:selected.map(name=>({name,...a5Scenarios[name]})),tests,gpu:{script:'tools/experiments/audit_main_retained_resources.mjs',environment:{QA_A5_RESOURCE_LAB:'true'},executes:'A–F together once on the existing actual-main fixture'},scope:'No gate closure. Unit recording backends and hardware evidence stay separate.'};
  if(!args.includes('--run')){console.log(JSON.stringify(plan,null,2));return;}
  const before=fingerprint(),dir=runDirectory('a5'),results=[];console.log('Evidence: '+dir);
  const ownership=['deep-clone','shared-attribute','shared-attribute-stripped-before-dispose','cpu-array-shared-private-attributes'].map(probeGeometryLifetime);
  writeFileSync(path.join(dir,'three-lifetime.json'),JSON.stringify(ownership,null,2)+'\n');
  results.push(await command(['--test','--test-concurrency=2',...tests],dir,'components'));
  let hardware=null;
  if(args.includes('--gpu')){
    const prefix=path.join(dir,'main');results.push(await command([plan.gpu.script],dir,'hardware',{env:{QA_A5_RESOURCE_LAB:'true',QA_ARTIFACT_PREFIX:prefix,QA_BASE_URL:process.env.QA_BASE_URL??'http://127.0.0.1:5218'},timeoutMs:900000}));
    try{const raw=readFileSync(prefix+'.json');const receipt=JSON.parse(raw);hardware={path:prefix+'.json',sha256:digest(raw),acceptance:assessA5(receipt)};writeFileSync(path.join(dir,'summary.json'),JSON.stringify(summarizeA5(receipt),null,2)+'\n');if(!hardware.acceptance.accepted)results.at(-1).status='failed';}catch(error){results.at(-1).status='failed';hardware={error:String(error)};}
  }
  const three=JSON.parse(readFileSync(path.join(root,'node_modules/three/package.json'))),fixture=JSON.parse(readFileSync(path.join(root,'tests/fixtures/microevent-world.json')));
  const threeFiles=['Geometries','Attributes','RenderObject','RenderObjects','Pipelines','Bindings'].map(n=>'node_modules/three/src/renderers/common/'+n+'.js');
  const report={version:1,kind:'a5',plan,results,hardware,ownership,configuration:{seed:fixture.seed,biome:fixture.biome,fixture:'tests/fixtures/microevent-world.json',paused:true,threeVersion:three.version,threeHashes:Object.fromEntries(threeFiles.map(p=>[p,digest(readFileSync(path.join(root,p)))]))},missingGpu:!args.includes('--gpu'),gateClosed:false};
  const output=saveReport(dir,report,before);
  console.log(JSON.stringify({report:output,stable:report.context.stable,results:results.map(r=>({status:r.status,counts:r.counts,log:r.log})),hardware:hardware?.acceptance,missingGpu:report.missingGpu,gateClosed:false},null,2));
  process.exitCode=results.some(r=>r.status==='failed')?1:!report.context.stable||report.missingGpu||results.some(r=>r.status==='incomplete')?2:0;
}
