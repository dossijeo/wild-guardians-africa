import {readFile} from 'node:fs/promises';
const [baselinePath,experimentPath,zeroPath]=process.argv.slice(2);if(!baselinePath||!experimentPath)throw Error('Usage: node compare_morph_pipeline_visual.mjs BASELINE EXPERIMENT [ZERO_MORPH_CONTROL]');
const baseline=JSON.parse(await readFile(baselinePath,'utf8')),experiment=JSON.parse(await readFile(experimentPath,'utf8'));
if(baseline.experimental||!experiment.experimental||baseline.errors.length||experiment.errors.length||baseline.frames.length!==4||experiment.frames.length!==4||baseline.morphMeshes<2||experiment.morphMeshes!==baseline.morphMeshes||!experiment.pipelineKeys)throw Error('Incomplete validation results');
for(let i=0;i<4;i++)if(baseline.frames[i].time!==experiment.frames[i].time||baseline.frames[i].sha256!==experiment.frames[i].sha256)throw Error(`Visual mismatch at frame ${i}`);
if(zeroPath){const zero=JSON.parse(await readFile(zeroPath,'utf8'));if(zero.errors.length||zero.frames.length!==4||baseline.frames.some((frame,i)=>frame.time!==zero.frames[i].time||frame.sha256===zero.frames[i].sha256))throw Error('Zero-morph control did not visibly affect every frame');}
console.log(`All four GPU images match: ${experiment.morphMeshes} morph meshes, ${experiment.morphValues} weights, ${experiment.pipelineKeys} experimental key evaluations.`);
