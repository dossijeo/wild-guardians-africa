import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {frozenSource} from './frozen-loading-source.js';
test('frozen source blobs retain exact Git object identity without historical refs',()=>{
 const manifest=JSON.parse(readFileSync(new URL('./fixtures/frozen-loading-source/manifest.json',import.meta.url),'utf8'));assert.equal(manifest.entries.length,19);const keys=new Set();let bytes=0;
 for(const row of manifest.entries){const key=row.ref+':'+row.path;assert.equal(keys.has(key),false);keys.add(key);assert.match(row.commit,/^[a-f0-9]{40}$/);const raw=Buffer.from(frozenSource(row.ref,row.path),'utf8');const gitBlob=createHash('sha1').update(Buffer.from('blob '+raw.length+'\0')).update(raw).digest('hex');assert.equal(gitBlob,row.gitBlob);bytes+=raw.length;}
 assert.equal(bytes,475517);assert.throws(()=>frozenSource('unknown','src/app/main.js'),/Unknown/);assert.throws(()=>frozenSource('0e94d7be','../untracked'),/Unknown/);
});
