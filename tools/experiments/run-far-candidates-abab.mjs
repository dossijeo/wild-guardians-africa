import fs from 'node:fs';import {spawnSync,execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const root=process.env.WG_FAR_ABAB_OUT??'docs/qa/residual-spikes-20261027/far-candidates-abab';fs.mkdirSync(root,{recursive:true});
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const baseline=root+'/baseline-transitions.js';
fs.writeFileSync(baseline,execFileSync('git',['show','44068655f:tools/experiments/far-tree-transitions.js']));
for(const [index,candidate] of [false,true,false,true].entries()){
 const name=`${index+1}-${candidate?'candidate':'baseline'}`,out=root+'/'+name;fs.mkdirSync(out,{recursive:true});
 const env={...process.env,WG_BEAST_QA_OUT:out,WG_QA_URL:'http://127.0.0.1:5220',WG_MAGIC_FIXTURE:'docs/qa/mangrove-magic-20261026/hydraulic-v2-agriculture/fixture.json',WG_MAGIC_PROFILE:'1',WG_MAGIC_CPU_SAMPLING:'0',WG_MAGIC_VIDEO:'0',WG_MAGIC_GPU:'1',WG_MAGIC_PHASES:'1',WG_MAGIC_FAR_PHASES:'0',WG_MAGIC_CASTS:'2',WG_MAGIC_NO_CAST:'1',WG_MAGIC_STREAM:'1',WG_MAGIC_STREAM_DISTANCE:'144',WG_MAGIC_STREAM_SECONDS:'40',WG_SPATIAL_RUNTIME_DIR:'',WG_SHADOW_SOURCE_DIR:'',WG_MAGIC_SHADOW_CACHE:'1',WG_FAR_TRANSITION_SOURCE:candidate?'':baseline};
 fs.writeFileSync(out+'/provenance.json',JSON.stringify({candidate,order:index+1,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),transitionSha256:sha(candidate?'tools/experiments/far-tree-transitions.js':baseline),adapterSha256:sha('tools/experiments/attach-native-far-world.js'),wasmSha256:sha('public/wild-engine/spatial-threaded.wasm'),harnessSha256:sha('tools/experiments/check-shield-repeat-render.mjs'),fixtureSha256:sha(env.WG_MAGIC_FIXTURE),conditions:Object.fromEntries(Object.entries(env).filter(([k])=>k.startsWith('WG_')))},null,2)+'\n');
 console.log('Starting '+name);
 const result=spawnSync(process.execPath,['tools/experiments/check-shield-repeat-render.mjs'],{env,encoding:'utf8',maxBuffer:8*1024*1024});fs.writeFileSync(out+'/execution.log',(result.stdout??'')+(result.stderr??''));if(result.status!==0)throw Error(name+' failed '+result.status);
 const report=JSON.parse(fs.readFileSync(out+'/raid-ui.json'));if(!candidate&&!(report.farTransitionOverride?.loads>0))throw Error('Baseline override not loaded');
 const summary=spawnSync(process.execPath,['tools/experiments/summarize-magic-repeat.mjs',out],{encoding:'utf8'});if(summary.status!==0)throw Error('Summary failed');console.log('Completed '+name);
}
