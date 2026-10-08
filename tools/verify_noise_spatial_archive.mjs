import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import path from 'node:path';

// Archive integrity and experimental scope, never a visual acceptance gate.
const directory=process.argv[2];
assert(directory,'Usage: node tools/verify_noise_spatial_archive.mjs <archive directory>');
const receipt=JSON.parse(await readFile(path.join(directory,'receipt.json'),'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const [name,expected] of Object.entries(receipt.files)){
  const bytes=await readFile(path.join(directory,name));
  assert.equal(bytes.length,expected.bytes,name+' bytes');
  assert.equal(sha(bytes),expected.sha256,name+' hash');
}
const raw=gunzipSync(await readFile(path.join(directory,'report.json.gz')));
assert.equal(sha(raw),receipt.rawReportSha256);
const report=JSON.parse(raw);
assert.equal(report.completed,true);
assert.equal(report.logicalStateRestored,true);
assert.deepEqual(report.errors,[]);
assert.equal(report.rows.length,60);
assert.equal(report.textureBytes,64**3);
assert.equal(report.biome,receipt.biome);
const keys=new Set();
const stats={};
for(const row of report.rows){
  const key=row.phase+'/'+row.pose.id;
  assert(!keys.has(key),'Duplicate view '+key);keys.add(key);
  assert.equal(row.elapsed,0);
  assert.equal(row.fixedEffectiveCamera,true);
  assert.equal(row.frames.length,5);
  assert.deepEqual(row.frames.map(f=>f.label),['A1','A2','B1','B2','A3']);
  assert.deepEqual(row.frames.map(f=>f.enabled),[0,0,1,1,0]);
  assert.equal(new Set(row.frames.map(f=>JSON.stringify(f.cameraMatrix))).size,1);
  assert.equal(new Set(row.frames.map(f=>f.calls)).size,1);
  assert.equal(new Set(row.frames.map(f=>f.triangles)).size,1);
  assert.equal(row.comparisons.length,5);
  for(const c of row.comparisons){
    assert.equal(c.pixels,row.width*row.height);
    const s=stats[c.from+'/'+c.to]??={groups:0,changedGroups:0,maxChangedPixels:0,maxTileMae:0,maxError:0,maxAlphaDifferences:0};
    s.groups++;s.changedGroups+=Number(c.differentPixels>0);
    s.maxChangedPixels=Math.max(s.maxChangedPixels,c.differentPixels);
    s.maxTileMae=Math.max(s.maxTileMae,c.maxTileMae);
    s.maxError=Math.max(s.maxError,c.maxError);
    s.maxAlphaDifferences=Math.max(s.maxAlphaDifferences,c.alphaDifferences);
  }
}
assert.deepEqual([...new Set(report.rows.map(r=>r.phase))],['day','dusk','night']);
for(const phase of ['day','dusk','night']){
  const rows=report.rows.filter(r=>r.phase===phase);
  assert.equal(rows.length,20);
  assert.equal(new Set(rows.map(r=>r.stateSha256)).size,1);
}
assert.equal(new Set(report.rows.map(r=>r.pose.id)).size,20);
assert.deepEqual(stats,receipt.comparisons);
assert.equal(receipt.promoted,false);
console.log(JSON.stringify({archiveValid:true,visualAcceptance:false,benchmark:false,groups:60,frames:300,comparisons:stats},null,2));
