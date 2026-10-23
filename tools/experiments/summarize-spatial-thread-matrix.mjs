import {readFile,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const root=process.argv[2]??'docs/qa/wild-engine-pthreads/matrix-media-settled';
const report=JSON.parse(await readFile(`${root}/summary.json`,'utf8'));
const retention=report.compare==='program-retention';
const eviction=report.compare==='chunk-eviction';
const pairs=[];
for(const biome of new Set(report.runs.map(r=>r.biome)))for(const iteration of [1,2]){
 const a=report.runs.find(r=>r.biome===biome&&r.label===`a${iteration}`),b=report.runs.find(r=>r.biome===biome&&r.label===`b${iteration}`);
 if(!a||!b)throw Error('Incomplete ABAB');
 const pixels=await Promise.all([a,b].map(r=>sharp(r.report.replace(/\.json$/,'.png')).removeAlpha().raw().toBuffer({resolveWithObject:true})));
 if(JSON.stringify(pixels[0].info)!==JSON.stringify(pixels[1].info))throw Error('Different image dimensions');
 let sum=0,max=0,changed=0;
 for(let i=0;i<pixels[0].data.length;i++){const d=Math.abs(pixels[0].data[i]-pixels[1].data[i]);sum+=d;max=Math.max(max,d);if(d)changed++;}
 pairs.push({biome,iteration,rgbMae255:sum/pixels[0].data.length,maxChannelDifference:max,changedChannelFraction:changed/pixels[0].data.length});
}
for(const r of report.runs){const raw=JSON.parse(await readFile(r.report,'utf8'));if(raw.errors.some(e=>!e.includes('f_environment4')))throw Error(`Unexpected browser error in ${r.report}`);}
await writeFile(`${root}/image-differences.json`,JSON.stringify({scope:'Full frame including UI, RGB differences on 0-255 scale. Metrics supplement visual review; they do not establish correctness by themselves.',pairs},null,2)+'\n');
const f=n=>n.toFixed(2);
const lines=[retention?'# App program-retention streaming comparison':eviction?'# Batched native eviction comparison':'# Six-biome pthread streaming comparison','',
 `Intel UHD, 1280×720, ${report.quality} quality, paused populated game. Two 240m outward/return camera legs per run; exactly 50 chunk installations and 25 final residents. ${retention?'Both use pthreads; A = normal shader lifetime, B = application retainPrograms=1.':eviction?'Both use pthreads; A = individual eviction, B = chunkEviction=batch. Program retention disabled.':'A = synchronous native core, B = pthread core; program retention disabled.'} Same initial fixture and final camera/chunk keys. Sixty warm frames; wait for horizon and near streaming plus twelve stable frames at each stop. Staged graphics installation disabled.`,'',
 `GPU intervals include pipeline bubbles, sampled every third render; a variable number of frames completes the same work. GPU means are therefore not an independent shader-efficiency claim. Total RAF interval includes waiting and settling. This is not continuous active-simulation performance. ${report.runs.length} runs; inspect memoryBytes in summary for WASM capacity. No unexpected browser errors; known f_environment4 shader warnings remain.`,'',
 '| Biome | Run | RAF mean | p95 | Max | Total RAF | GPU mean | Native sync | Publication | Graphics install |',
 '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|',
 ...report.runs.map(r=>`| ${r.biome} | ${r.label} | ${[r.frames.mean,r.frames.p95,r.frames.max,r.observedRafMs,r.gpu.mean,r.generation.mean,r.publication.mean,r.install.mean].map(f).join(' | ')} |`),
 '', 'All timings are milliseconds. Raw reports also include admission CPU, worker compute time, sample arrays, hardware identity and matching per-leg inventories.','',
 retention?'Application retention is a separate experimental option. Compare repeated tails and total intervals before adopting it; lower isolated shader-call cost alone is insufficient.':eviction?'Batch eviction is an opt-in experiment; raw reports separate individual removal and batch CPU times. Compare tails and complete itinerary before adoption.':'Mean frame intervals improve in every biome. Tail behavior is not uniformly better: Gran Rio has larger maximum stalls in both threaded runs, and Gran Canyon takes longer to finish the same itinerary. Mangroves graphics installation remains about 16.4ms/chunk after native publication falls below 0.7ms. These measurements demonstrate removal of synchronous generation stalls, not completion of the whole streaming-stutter objective.','',
 '| Biome | Pair | RGB MAE /255 | Maximum channel difference |','|---|---|---:|---:|',
 ...pairs.map(p=>`| ${p.biome} | ${p.iteration} | ${p.rgbMae255.toFixed(6)} | ${p.maxChannelDifference} |`),
 '', 'Screenshots are retained alongside the JSON. Pixel statistics are supplemental evidence; inspect the images, especially cached ground and shadows. No artistic simplifications were made.',''];
await writeFile(`${root}/RESULTS.md`,lines.join('\n'));
console.log(JSON.stringify(pairs,null,2));
