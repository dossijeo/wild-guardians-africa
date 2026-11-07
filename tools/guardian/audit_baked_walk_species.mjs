import {execFileSync} from 'node:child_process';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';

// Independent offline authoring audit. No assets or runtime paths are changed.
const species = Object.keys(ANIMAL_ACTIONS.animals).sort();
const rate = Number(process.env.BAKE_FPS ?? 30);
if (!Number.isFinite(rate) || rate <= 0) throw Error('Invalid BAKE_FPS');
const root = '.cache/gpu-walk-species-audit';
const results = [];
for (const name of species) {
  const runs = [];
  for (let repeat = 0; repeat < 2; repeat++) {
    const destination = `${root}/${name}-${repeat}`;
    execFileSync(process.execPath, ['tools/guardian/prototype_bake_gpu_walk.mjs'], {
      env: {...process.env, BAKE_SPECIES: name, BAKE_FPS: String(rate), BAKE_OUTPUT: destination},
      stdio: 'inherit',
    });
    runs.push(JSON.parse(await readFile(`${destination}/walking.json`, 'utf8')));
  }
  const [a, b] = runs;
  if (a.species !== name || a.sha256 !== b.sha256 || a.sourceSha256 !== b.sourceSha256 ||
      JSON.stringify(a.validation) !== JSON.stringify(b.validation)) {
    throw Error(`Non-reproducible bake or validation for ${name}`);
  }
  results.push({species:name, sourceSha256:a.sourceSha256, sha256:a.sha256,
    duration:a.duration, frames:a.frames, byteLength:a.byteLength,
    sharedMatrixChannels:a.sharedMatrixChannels,
    channels:a.channels.map(c=>({name:c.name,bones:c.bones.length,matrixOffset:c.matrixOffset})),
    validation:a.validation});
}
const report = {schema:'wg-gpu-walk-species-audit/1',sampleRate:rate,repeats:2,results,
  scope:'Offline canonical-root walking clips. Exact stored samples and packed matrices are checked; midpoint vertex checks are sparse. No moving terrain, transitions, images, GPU timings, real raids or production integration.'};
const output = process.env.OUTPUT ?? `${root}/report.json`;
await mkdir(output.substring(0, output.lastIndexOf('/')) || '.', {recursive:true});
await writeFile(output, JSON.stringify(report,null,2)+'\n');
console.log(`Validated ${results.length} species; report: ${output}`);
