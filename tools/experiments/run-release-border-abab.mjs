import fs from 'node:fs';import {spawnSync,execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const root=process.env.WG_RELEASE_ABAB_OUT??'docs/qa/residual-spikes-20261027/release-border-abab';fs.mkdirSync(root,{recursive:true});
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for(const [index,candidate] of [false,true,false,true].entries()){
 const name=`${index+1}-${candidate?'candidate':'baseline'}`,out=root+'/'+name;
 fs.mkdirSync(out,{recursive:true});
 const env={...process.env,WG_BEAST_QA_OUT:out,WG_QA_URL:'http://127.0.0.1:5220',WG_MAGIC_FIXTURE:'docs/qa/mangrove-magic-20261026/hydraulic-v2-agriculture/fixture.json',WG_MAGIC_PROFILE:'1',WG_MAGIC_CPU_SAMPLING:'0',WG_MAGIC_VIDEO:'0',WG_MAGIC_GPU:'1',WG_MAGIC_PHASES:'1',WG_MAGIC_CASTS:'2',WG_MAGIC_NO_CAST:'1',WG_MAGIC_STREAM:'1',WG_MAGIC_STREAM_DISTANCE:'144',WG_MAGIC_STREAM_SECONDS:'40',WG_SPATIAL_RUNTIME_DIR:candidate?'.codex-tmp/release-border-candidate':''};
 fs.writeFileSync(out+'/provenance.json',JSON.stringify({candidate,order:index+1,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),wasmSha256:sha((candidate?'.codex-tmp/release-border-candidate':'public/wild-engine')+'/spatial-threaded.wasm'),harnessSha256:sha('tools/experiments/check-shield-repeat-render.mjs'),fixtureSha256:sha(env.WG_MAGIC_FIXTURE),conditions:Object.fromEntries(Object.entries(env).filter(([k])=>k.startsWith('WG_'))),limits:['Instrumented GPU queries and phase clocks; no CPU sampling or video.','Same seed, profile and camera sequence; simulation is active and asynchronous residency can differ.','Shared host; no claim of exclusive hardware use.']},null,2)+'\n');
 console.log('Starting '+name);
 const result=spawnSync(process.execPath,['tools/experiments/check-shield-repeat-render.mjs'],{env,encoding:'utf8',maxBuffer:8*1024*1024});
 fs.writeFileSync(out+'/execution.log',(result.stdout??'')+(result.stderr??''));
 if(result.status!==0)throw Error(name+' failed: '+result.status+' '+result.error);
 const sum=spawnSync(process.execPath,['tools/experiments/summarize-magic-repeat.mjs',out],{encoding:'utf8'});if(sum.status!==0)throw Error('Summary failed');
 console.log('Completed '+name);
}
