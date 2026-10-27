import fs from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=process.argv[2]??'docs/qa/residual-spikes-20261027/regional-tail-phases';
const fixture='docs/qa/mangrove-magic-20261026/hydraulic-v2-agriculture/fixture.json';
const files=['tools/experiments/qa-fixed-scene-windows.js','tools/experiments/qa-presentation-trace.mjs','tools/experiments/native-far-ground-seam.js','tools/experiments/far-ground-seam-stream.js','tools/experiments/native-far-ground.js','tools/experiments/check-shield-repeat-render.mjs','tools/experiments/qa-whole-frame-attribution.js','tools/experiments/regional-tail-probe-source.mjs','tools/experiments/far-scene-loader.js','tools/experiments/native-far-layer.js','src/app/main.js','src/app/global-frame-scheduler.js','src/rendering/scene.js','src/rendering/render-origin.js',fixture,'public/wild-engine/spatial-threaded.wasm'];
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),sources=Object.fromEntries(files.map(p=>[p,hash(p)]));
for(const [i,candidate] of [false].entries()){
 const out=`${root}/${i+1}-${candidate?'candidate':'baseline'}`;fs.mkdirSync(out,{recursive:true});
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('WG_')));
 Object.assign(env,{WG_BEAST_QA_OUT:out,WG_QA_URL:'http://127.0.0.1:5220',WG_MAGIC_FIXTURE:fixture,WG_MAGIC_PROFILE:'1',WG_FIXED_SCENE:process.argv.includes('--fixed')?'1':'0',WG_PRESENTATION_TRACE:process.argv.includes('--trace')?'1':'0',WG_REGIONAL_TAIL_PROBE:'1',WG_MAGIC_CPU_SAMPLING:'0',WG_MAGIC_ALL_SPANS:'1',WG_MAGIC_VIDEO:'0',WG_MAGIC_GPU:'1',WG_MAGIC_PHASES:'1',WG_MAGIC_CASTS:'1',WG_MAGIC_NO_CAST:'1',WG_MAGIC_STREAM:'1',WG_MAGIC_STREAM_DISTANCE:'144',WG_MAGIC_STREAM_SECONDS:'40',WG_WHOLE_FRAME:'1',WG_MAGIC_SETTLE:'1',WG_MAGIC_WARMUP_ELAPSED:'30',WG_MAGIC_CAPTURE_AFTER_STREAM:'1',WG_DEPTH_MATRIX_REUSE:candidate?'1':'0'});
 fs.writeFileSync(out+'/provenance.json',JSON.stringify({candidate,sources,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),conditions:Object.fromEntries(Object.entries(env).filter(([k])=>k.startsWith('WG_')))},null,2));
 console.log('Starting '+out);const r=spawnSync(process.execPath,['tools/experiments/check-shield-repeat-render.mjs'],{env,encoding:'utf8',maxBuffer:16*1024*1024});fs.writeFileSync(out+'/execution.log',(r.stdout??'')+(r.stderr??''));if(r.status!==0)throw Error('Run failed '+out);
 for(const p of files)if(hash(p)!==sources[p])throw Error('Source changed '+p);
 console.log('Completed '+out);
}
