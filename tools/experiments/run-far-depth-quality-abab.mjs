import fs from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const files=['tools/experiments/native-far-ground.js','tools/experiments/prepare-native-far-gpu.js','tools/experiments/attach-native-far-world.js'];
const candidates=new Map(files.map(p=>[p,fs.readFileSync(p)]));
const root='docs/qa/residual-spikes-20261027/far-depth-quality-abab';fs.mkdirSync(root,{recursive:true});
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
try{for(const [i,enabled] of [false,true,false,true].entries()){
 for(const p of files)fs.writeFileSync(p,enabled?candidates.get(p):execFileSync('git',['show','7d00e96a7:'+p]));
 const out=root+'/'+(i+1)+'-'+(enabled?'candidate':'baseline');fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(out+'/treatment.json',JSON.stringify({candidate:enabled,order:i+1,sources:Object.fromEntries([...files,'tools/experiments/prepare-native-far-depth.js','tools/experiments/check-volcano-quality-no-sync.mjs','tools/experiments/spatial-thread-game-quality-case.js'].map(p=>[p,sha(p)])),fixtureSha256:sha('docs/qa/global-visual-lab/volcanes-populated-frozen-20261022/native-fixture.json')},null,2));
 console.log('Starting '+out);const r=spawnSync(process.execPath,['tools/experiments/check-volcano-quality-no-sync.mjs',out],{encoding:'utf8',maxBuffer:16*1024*1024});fs.writeFileSync(out+'/runner.log',(r.stdout??'')+(r.stderr??''));if(r.status!==0)throw Error('Run failed '+out);console.log('Completed '+out);
}}finally{for(const [p,b] of candidates)fs.writeFileSync(p,b);}
