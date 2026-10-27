import fs from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=process.argv[2]??'docs/qa/residual-spikes-20261027/depth-matrix-reuse-abab',biome=process.argv[3]??'manglares';
const files=['tools/experiments/reuse-depth-scene-matrices.js','tools/experiments/check-spatial-thread-game.mjs','src/rendering/buildings.js','src/rendering/scene.js','src/rendering/vfx.js','tools/experiments/native-far-ground-seam.js','tools/experiments/native-far-ground.js','tools/experiments/check-volcano-quality-no-sync.mjs','tools/experiments/quality-execution-attribution.js'];
const hashes=Object.fromEntries(files.map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
const reverse=process.argv[4]==='BABA';
for(const [i,candidate] of (reverse?[true,false,true,false]:[false,true,false,true]).entries()){
 const out=root+'/'+(i+1)+'-'+(candidate?'candidate':'baseline');fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(out+'/treatment.json',JSON.stringify({candidate,biome,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sources:hashes},null,2));
 console.log('Starting '+out);
 const env={...process.env,WG_IMPOSTOR_DEPTH:'0',WG_SEAM_REUSE:'1',WG_SOFT_DEPTH_REGION:'0',WG_SOFT_DEPTH_DEMAND:'0',WG_SOFT_DEPTH_VISIBILITY:'0',WG_DEPTH_MATRIX_REUSE:candidate?'1':'0',WG_RENDER_STAGES:'1',WG_DEPTH_TRACE:'0'};
 const r=spawnSync(process.execPath,['tools/experiments/check-volcano-quality-no-sync.mjs',out,biome],{env,encoding:'utf8',maxBuffer:16*1024*1024});fs.writeFileSync(out+'/runner.log',(r.stdout??'')+(r.stderr??''));if(r.status!==0)throw Error('Run failed '+out);
 for(const p of files)if(createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==hashes[p])throw Error('Source changed '+p);
 console.log('Completed '+out);
}
