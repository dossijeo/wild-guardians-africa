import fs from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=process.argv[2];if(!root)throw Error('Output directory required');
const fixture='docs/qa/mangrove-magic-20261026/hydraulic-v2-agriculture/fixture.json';
const files=['tools/experiments/far-water-predicate-patch.mjs','tools/experiments/verify-far-water-predicate.js','tools/experiments/native-far-ground.js','src/world/wild-engine/spatial-terrain-view.js','tools/experiments/check-shield-repeat-render.mjs','tools/experiments/qa-chunk-delivery-probe.js','tools/experiments/regional-tail-probe-source.mjs','tools/experiments/far-scene-worker.js','tools/experiments/far-scene-loader.js','tools/experiments/far-scene-data.js','tools/experiments/far-ground-contacts.js','tools/experiments/far-ground-data.js','tools/experiments/native-far-ground-seam.js','tools/experiments/far-ground-seam.js','src/app/main.js','src/rendering/scene.js',fixture,'public/wild-engine/spatial-threaded.wasm'];
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),sources=Object.fromEntries(files.map(p=>[p,hash(p)]));
const arms=process.argv.includes('--pilot')?[true]:[false,true,false,true];
for(const [i,candidate] of arms.entries()){
 const out=`${root}/${i+1}-${candidate?'candidate':'baseline'}`;fs.mkdirSync(out,{recursive:true});
 const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('WG_')));
 Object.assign(env,{WG_BEAST_QA_OUT:out,WG_QA_URL:'http://127.0.0.1:5220',WG_MAGIC_FIXTURE:fixture,WG_MAGIC_PROFILE:'1',WG_FAR_WATER_PREDICATE:candidate?'1':'0',WG_REGIONAL_TAIL_PROBE:'1',WG_MAGIC_CPU_SAMPLING:'0',WG_MAGIC_ALL_SPANS:'1',WG_MAGIC_VIDEO:'0',WG_MAGIC_GPU:'1',WG_MAGIC_PHASES:'1',WG_MAGIC_CASTS:'1',WG_MAGIC_NO_CAST:'1',WG_MAGIC_STREAM:'1',WG_MAGIC_STREAM_DISTANCE:'144',WG_MAGIC_STREAM_SECONDS:'40',WG_CHUNK_DELIVERY:'1',WG_WHOLE_FRAME:'1',WG_MAGIC_SETTLE:'1',WG_MAGIC_WARMUP_ELAPSED:'30',WG_MAGIC_CAPTURE_AFTER_STREAM:'1',WG_VERIFY_FAR_WATER:'1'});
 fs.writeFileSync(out+'/provenance.json',JSON.stringify({candidate,pilot:arms.length===1,sources,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),conditions:Object.fromEntries(Object.entries(env).filter(([key])=>key.startsWith('WG_')))},null,2));
 console.log('Starting '+out);const result=spawnSync(process.execPath,['tools/experiments/check-shield-repeat-render.mjs'],{env,encoding:'utf8',maxBuffer:16*1024*1024});fs.writeFileSync(out+'/execution.log',(result.stdout??'')+(result.stderr??''));if(result.status!==0)throw Error('Run failed '+out);
 const report=JSON.parse(fs.readFileSync(out+'/raid-ui.json'));if(!report.ok||report.errors.length||report.consoleErrors.length)throw Error('Runtime errors '+out);
 for(const file of files)if(hash(file)!==sources[file])throw Error('Source changed '+file);
 console.log('Completed '+out);
}
