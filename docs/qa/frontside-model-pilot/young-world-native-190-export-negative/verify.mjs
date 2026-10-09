import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const base=new URL('./',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',base)));
assert.equal(manifest.rawNativeReportRetained,false);
for(const r of manifest.records){const b=fs.readFileSync(new URL(r.name,base));assert.equal(b.length,r.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),r.sha256);}
const png=fs.readFileSync(new URL('last-frame.png',base));assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.subarray(-8,-4).toString(),'IEND');assert.equal(png.readUInt32BE(16),2560);assert.equal(png.readUInt32BE(20),720);
const status=fs.readFileSync(new URL('status.txt',base),'utf8');assert.match(status,/Unexpected report/);assert.match(status,/closed/);assert.match(status,/contextLost/);JSON.parse(fs.readFileSync(new URL('console.json',base)));
console.log('PASS retained native190 export failure; no resource gate or report reconstructed.');
