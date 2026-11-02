import {execFileSync} from 'node:child_process';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const results = [];
for (const species of Object.keys(ANIMAL_ACTIONS.animals).sort()) {
  const runs = [];
  for (let repeat = 0; repeat < 2; repeat++) {
    const output = `.cache/${species}-walk-moving-support-${repeat}.json`;
    execFileSync(process.execPath, ['tools/guardian/audit_baked_walk_motion.mjs'], {
      env: {...process.env, BAKE_SPECIES:species, BAKE_OUTPUT:`.cache/${species}-motion-bake-${repeat}`, OUTPUT:output},
      stdio:'inherit',
    });
    const bytes = await readFile(output);
    runs.push({hash:digest(bytes), report:JSON.parse(bytes)});
  }
  if (runs[0].hash !== runs[1].hash) throw Error(`Non-reproducible motion report: ${species}`);
  const {report,hash} = runs[0];
  results.push({species, reportSha256:hash, sourceSha256:report.sourceSha256,
    bakeSha256:report.bakeSha256, contactBankBytes:report.contactBankBytes, feet:report.feet, contactSamples:report.contactSamples,
    terrains:report.terrains, result:report.result});
}
const report = {schema:'wg-gpu-walk-motion-species-audit/1', repeats:2, results,
  scope:'Offline comparison of precomputed contact points against current CPU pose and exact CPU terrain support; synthetic moving root, 181 samples at 60 Hz on four Wild Engine terrain locations per species. Full per-frame reports are reproducible in .cache. No gameplay, GPU, visual review or performance measurement.'};
const output=process.env.OUTPUT??'docs/guardian/gpu-animation/walk-five-species-moving-support-audit.json';
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(`Validated ${results.length} species; report: ${output}`);
