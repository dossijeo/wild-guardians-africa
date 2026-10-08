// Preserve a completed native run before the private report prefix is reused.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {sharedLeafContinuousReportPrefix} from './lib/frontside-shared-leaf-continuous-report.mjs';
const [runId, reportPath, pngPath] = process.argv.slice(2);
if (!/^(game|closeup)-(day|night)-v[1-9][0-9]*$/.test(runId || '') || !reportPath || !pngPath) throw Error('Usage: run-id report-path png-path');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fixtureHash = '2f11e4ec6dab786272d894b70e2f97c96eef2b993e911c13ba0f362177f5441e';
if (sha(fs.readFileSync('tests/browser/frontside-crop-leaf-shared-continuous.js')) !== fixtureHash) throw Error('Frozen continuous fixture changed');
const raw = fs.readFileSync(reportPath), png = fs.readFileSync(pngPath), report = JSON.parse(raw);
sharedLeafContinuousReportPrefix(report);
if (!runId.startsWith(report.mode + '-' + (report.night ? 'night' : 'day') + '-')) throw Error('Run identity differs from native report');
if (png.readUInt32BE(16) !== 1280 || png.readUInt32BE(20) !== 5040) throw Error('Unexpected seven-row capture size');
const folder = `docs/qa/frontside-model-pilot/shared-leaf-continuous/${runId}/`;
fs.mkdirSync(folder, {recursive:true});
function preserve(name, bytes) {
 const file = folder + name;
 if (fs.existsSync(file) && sha(fs.readFileSync(file)) !== sha(bytes)) throw Error('Refusing immutable replacement: ' + file);
 fs.writeFileSync(file, bytes);
}
const zipped = gzipSync(raw);
preserve('report.json.gz', zipped); preserve('filmstrip.png', png);
const manifest = {
 status:'NATIVE_CONTINUOUS_CAPTURE_ARCHIVED_HUMAN_REVIEW_PENDING', visualAcceptancePolicyVersion:3,
 runId, fixtureSourceCommit:'3bb0c41c16d2f4b833703aff4129d1088ac3754d', fixtureJsSha256:fixtureHash,
 rawJsonSha256:sha(raw), gzipSha256:sha(zipped), pngSha256:sha(png),
 mode:report.mode, night:report.night, plantCount:report.plantCount, cameraPosition:report.cameraPosition,
 framesRecorded:report.frames.length, preparation:report.preparation, captures:report.captures,
 cleanup:report.cleanup, contextLost:report.contextLost, visualReview:report.visualReview,
 limitations:[
  'Filmstrip is retained evidence of sampled frames. Continuous motion requires an observer of the live run.',
  'Requested growth thresholds are distinct from actual rendered growth; a delayed frame can overshoot.',
  'This native-shader synthetic plot uses a simple receiver, not the complete production WorldScene.',
  'ShadowSide/customDepth remain Double isolation; no net GPU timing or category acceptance is established.',
  'Pixel metrics remain diagnostic under policy3. Human reviewer and decision remain unassigned.'
 ]
};
preserve('manifest.json', Buffer.from(JSON.stringify(manifest,null,2)+'\n'));
console.log(JSON.stringify({runId,status:manifest.status,frames:manifest.framesRecorded,requestedAndActualGrowth:report.captures.map(c=>({requested:c.requestedGrowth,actual:c.actualGrowth})),humanDecision:null}));
