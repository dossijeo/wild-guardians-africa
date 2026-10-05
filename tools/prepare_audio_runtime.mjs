// Promote validated musical candidates only. Preserve source MP3s outside the distributed package.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),sha=b=>createHash('sha256').update(b).digest('hex');
const conversion=JSON.parse(readFileSync(new URL('.cache/opus-audit/report.json',root)));assert.equal(conversion.status,'measured');
const sourceCheck=JSON.parse(readFileSync(new URL('docs/qa/opus-conversion/browser-report.json',root)));assert.equal(sourceCheck.rows.length,294);assert.equal(sourceCheck.errors.length,0);
const recipeCheck=JSON.parse(readFileSync(new URL('docs/qa/opus-window-recipes/browser-report.json',root)));assert.equal(recipeCheck.rows.length,1100);assert.equal(recipeCheck.errors.length,0);
const audited=JSON.parse(readFileSync(new URL('docs/qa/opus-conversion/conversion-report.json',root)));
const records=[],stage={a:[],b:[],menu:[]};mkdirSync(new URL('public/assets/audio/',root),{recursive:true});
const groups=new Map();for(const pack of ['a','b']){const bank=JSON.parse(readFileSync(new URL(`public/content/music-${pack}.json`,root)));for(const track of bank.tracks.filter(t=>!t.silent))groups.set(track.data.url,pack);}
for(const record of conversion.records.filter(r=>r.role==='music')){
 assert.equal(record.opusSha256,audited.records.find(r=>r.source===record.source)?.opusSha256,'Candidate differs from audited conversion');
 const original=readFileSync(new URL('public'+record.source,root));assert.equal(sha(original),record.sourceSha256);
 const bytes=readFileSync(new URL(`.cache/opus-audit/${record.sourceSha256}.opus`,root));assert.equal(sha(bytes),record.opusSha256);assert.equal(record.sampleDelta,0);
 const source=record.source.slice(1),runtime=`assets/audio/${record.opusSha256}.opus`;writeFileSync(new URL('public/'+runtime,root),bytes);
 records.push({kind:'music',source,runtime,sourceSha256:record.sourceSha256,runtimeSha256:record.opusSha256,beforeBytes:original.length,afterBytes:bytes.length,samples48000:record.after.samples48000,channels:record.channels});
 stage[groups.get(record.source)??'menu'].push('public/'+runtime);
}
assert.equal(records.length,21);assert.equal(stage.a.length,10);assert.equal(stage.b.length,10);assert.equal(stage.menu.length,1);
for(const pack of ['a','b']){
 const index=JSON.parse(readFileSync(new URL(`.cache/opus-recipes/music-windows-${pack}.json`,root))),bank=JSON.parse(readFileSync(new URL(`public/content/music-${pack}.json`,root)));
 assert.equal(index.codec,'ogg-opus-recipe');assert.equal(index.prerollPackets,30);assert.equal(index.pcmPrerollPackets,2);assert.equal(index.tailPackets,2);
 for(const track of index.tracks){const original=bank.tracks.find(t=>t.id===track.id),record=records.find(r=>r.source===original.data.url.slice(1));assert.equal(track.sha256,record.runtimeSha256);track.url='/'+record.runtime;track.fullUrl=track.url;}
 const source=`content/music-windows-${pack}.json`,runtime=`content/music-opus-windows-${pack}.json`,bytes=Buffer.from(JSON.stringify(index)+'\n'),original=readFileSync(new URL('public/'+source,root));writeFileSync(new URL('public/'+runtime,root),bytes);
 records.push({kind:'music-index',source,runtime,sourceSha256:sha(original),runtimeSha256:sha(bytes),beforeBytes:original.length,afterBytes:bytes.length});
}
const manifest={version:1,scope:'Twenty musical stems and menu music. SFX originals retained until their catalogue exports are adapted.',codec:'Ogg Opus libopus VBR 128 kbps, 48 kHz; offline header recipes for requested windows',records};
writeFileSync(new URL('content/manifests/audio-runtime.json',root),JSON.stringify(manifest,null,2)+'\n');
for(const [key,paths] of Object.entries(stage))writeFileSync(new URL(`.cache/audio-stage-${key}.txt`,root),paths.join('\n')+'\n');
console.log(JSON.stringify({music:21,indices:2,beforeBytes:records.reduce((n,r)=>n+r.beforeBytes,0),afterBytes:records.reduce((n,r)=>n+r.afterBytes,0)}));
