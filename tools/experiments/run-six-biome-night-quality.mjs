import fs from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=process.argv[2]??'docs/qa/residual-spikes-20261027/seam-reuse-six-biomes-night';
const fixtures={sabana:'sabana-populated-frozen-20261022',desierto:'desert-populated-closure-20261022','gran-rio':'gran-rio-populated-frozen-20261022',volcanes:'volcanes-populated-frozen-20261022',manglares:'manglares-populated-frozen-20261022','gran-canon':'gran-canon-populated-native-camera-20261022'};
fs.mkdirSync(root,{recursive:true});
const harness='tools/experiments/check-spatial-thread-game.mjs';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
fs.writeFileSync(root+'/harness-working.patch',execFileSync('git',['diff','HEAD','--',harness]));
const selected=process.argv.slice(3);
if(selected.some(b=>!Object.hasOwn(fixtures,b)))throw Error('Unknown biome');
for(const biome of (selected.length?selected:['manglares','sabana','gran-rio','desierto','volcanes','gran-canon'])){
 const out=root+'/'+biome;fs.mkdirSync(out,{recursive:true});
 const fixture=JSON.parse(fs.readFileSync('docs/qa/global-visual-lab/'+fixtures[biome]+'/native-fixture.json'));const state=JSON.parse(fixture.timing.navigationContext.state);state.time=350;fixture.timing.navigationContext.state=JSON.stringify(state);const fixturePath=out+'/night-fixture.json';fs.writeFileSync(fixturePath,JSON.stringify(fixture));
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('WG_')));
 Object.assign(env,{WG_THREAD_FIXTURE_FILE:fixturePath,WG_THREAD_PORT:'5220',WG_THREAD_BIOME:biome,WG_THREAD_QUALITY:'media',WG_PRODUCTION_VISUALS:'1',WG_THREAD_ACTIVE:'1',WG_THREAD_DEFAULT_STREAMING:'1',WG_THREAD_QUALITY_CYCLE:'1',WG_THREAD_QUALITY_ACTIVE:'1',WG_THREAD_QUALITY_MENU_PROTOCOL:'1',WG_THREAD_QUALITY_CAPTURE:'1',WG_THREAD_REPORT:out+'/report.json'});
 fs.writeFileSync(out+'/provenance.json',JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),fixtureSha256:sha(fixturePath),harnessSha256:sha(harness),wasmSha256:sha('public/wild-engine/spatial-threaded.wasm'),conditions:Object.fromEntries(Object.entries(env).filter(([k])=>k.startsWith('WG_'))),scope:'Production URL defaults, populated historical save with initial visual time350 (night), active quality cycle with camera motion; diagnostic acceptance, not comparative performance proof.'},null,2));
 console.log('Starting '+biome);
 const r=spawnSync(process.execPath,[harness],{env,encoding:'utf8',maxBuffer:16*1024*1024});fs.writeFileSync(out+'/execution.log',(r.stdout??'')+(r.stderr??''));
 console.log('Finished '+biome+' exit '+r.status);
 if(r.status!==0)throw Error('Inspect failure before continuing: '+biome);
}
