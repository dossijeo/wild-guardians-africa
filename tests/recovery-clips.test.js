import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {AnimationClip} from 'three';
import {decodeRecoveryClips} from '../src/rendering/recovery-clips.js';
const base=new URL('../public/content/guardian/recovery/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('recovery.json',base))),file=fs.readFileSync(new URL('recovery.bin',base)),bytes=file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength);
test('shipping bank exactly preserves all five reviewed recovery candidates',()=>{
 assert.equal(crypto.createHash('sha256').update(file).digest('hex'),manifest.sha256);
 const clips=decodeRecoveryClips(manifest,bytes);assert.equal(clips.size,5);
 for(const entry of manifest.clips){const source=fs.readFileSync(new URL(`../content/source/animations/stand-up/${entry.species}-candidate.json`,import.meta.url));assert.equal(crypto.createHash('sha256').update(source).digest('hex'),entry.candidateSha256);const expected=AnimationClip.parse(JSON.parse(source).clip),actual=clips.get(entry.species);assert.equal(actual.duration,expected.duration);assert.equal(actual.tracks.length,expected.tracks.length);for(let i=0;i<actual.tracks.length;i++){assert.equal(actual.tracks[i].name,expected.tracks[i].name);assert.deepEqual(actual.tracks[i].times,expected.tracks[i].times);assert.deepEqual(actual.tracks[i].values,expected.tracks[i].values);}}
});
test('invalid or truncated recovery banks fail before constructing playable clips',()=>{
 assert.throws(()=>decodeRecoveryClips(manifest,bytes.slice(0,-4)));
 const bad=structuredClone(manifest);bad.clips[0].tracks[0].values.offset=bytes.byteLength;assert.throws(()=>decodeRecoveryClips(bad,bytes));
});
