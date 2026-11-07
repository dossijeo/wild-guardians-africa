import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {publicText} from './web-package.mjs';
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const records=['spirit-voices','agricultural-spirit-voices','awakening-spirit-voices'].flatMap(n=>json(`content/manifests/${n}.json`).records);
const bank=json('dist/content/guardian/lipsync/bank.json'),assets=json('dist/content/web-assets.json');
assert.equal(Object.keys(bank.records).length,records.length);

for(const r of records){
 assert.equal(createHash('sha256').update(readFileSync('dist/'+r.path)).digest('hex'),r.sha256,r.id+' original audio');
 assert.deepEqual(bank.records[r.id],JSON.parse(publicText(readFileSync(`public/content/guardian/lipsync/${r.id}.json`,'utf8'),`content/guardian/lipsync/${r.id}.json`,assets)),r.id+' cues');

}
console.log(`Verified ${records.length} original audio files, packed cue sequences.`);

