import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const root = new URL('./', import.meta.url);
const receipt = JSON.parse(await readFile(new URL('receipt.json', root), 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
for (const entry of receipt.cases) {
  const raw = gunzipSync(await readFile(new URL(`case-${entry.index}.json.gz`, root)));
  const report = JSON.parse(raw);
  assert.equal(hash(raw), entry.reportSha256);
  assert.equal(hash(await readFile(new URL(`case-${entry.index}.png`, root))), entry.imageSha256);
  assert.equal(report.viewCaseIndex, entry.index);
  assert.equal(report.viewCaseId, entry.id);
  assert.equal(report.contextLost, true);
  assert.equal(report.cleanup.closed, true);
  assert.deepEqual(report.cleanup.errors, []);
  assert.equal(report.phaseSummary.length, 4);
  for (const phase of report.phaseSummary) {
    assert.equal(phase.phase, entry.expectedPhase);
    assert.equal(phase.matureActive, entry.expectedMatureActive);
  }
}
console.log('PASS: four native comparisons, identities, phase state, hashes and cleanup. No visual or GPU acceptance inferred.');
