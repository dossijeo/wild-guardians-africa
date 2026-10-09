import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const base=new URL('./',import.meta.url),read=n=>fs.readFileSync(new URL(n,base)),json=n=>JSON.parse(read(n));
const manifest=json('manifest.json');for(const f of manifest.files){const b=read(f.path);assert.equal(b.length,f.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),f.sha256);}
const r=json('report.json'),s=r.resourceSnapshots,identity=v=>v.liveBuffers.map(b=>[b.id,b.bytes]).sort((a,b)=>a[0]-b[0]);
assert.equal(r.campaign,'resources');assert.equal(r.qaDepth,'front');assert.equal(r.vfx,'on');assert.equal(r.candidateBinaryBytes,253326);assert.equal(r.candidateBinarySha256,'3eba51ae256663c20bdfcfc4f9e0133a304e8a6dfa25b072a07154b82f0ee65c');
assert.equal(s.length,4);assert.equal(s[0].liveBytes,0);assert.equal(s[1].liveBytes,64815184);assert.equal(s[2].liveBytes,65065672);assert.equal(s[2].liveBytes-s[1].liveBytes,250488);assert.equal(s[2].liveBuffers.length-s[1].liveBuffers.length,4);assert.deepEqual(identity(s[1]),identity(s[3]));
assert.equal(r.bufferAudit.liveBytes,0);assert.equal(r.bufferAudit.liveBuffers.length,0);assert.deepEqual(r.arms[0].activeInputs,r.arms[1].activeInputs);for(const a of r.arms){assert.equal(a.activeInputs.maizeInstances,1257);assert.equal(a.logicalUnchanged,true);assert.equal(a.worldDepthCalled,true);}
assert.equal(r.cleanup.closed,true);assert.equal(r.cleanup.contextLost,true);assert.deepEqual(r.cleanup.errors,[]);assert.deepEqual(r.errors,[]);assert.equal(r.conditions.gpuTiming,false);assert.equal(r.conditions.bufferMetadataQueries,true);
const p=read('comparison.png');assert.equal(p.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(p.readUInt32BE(16),2560);assert.equal(p.readUInt32BE(20),720);
console.log('PASS immutable native894 buffers restored/final0 and PNG2560x720; no physicalVRAM/WorldGPU/category claim');
