import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {posix} from 'node:path';

const original=readFileSync(new URL('../src/simulation/game.js',import.meta.url),'utf8');
const needle='for(const p of activeCrops(s.plants)) {';
assert.equal(original.split(needle).length,2,'Reference loop must be unique');
const reference=original.replace(needle,'for(const p of s.plants) {').replace(/from '([^']+)'/g,(match,specifier)=>specifier.startsWith('.')?`from '${posix.normalize(posix.join('../../src/simulation',specifier))}'`:match);
const directory=new URL('../.cache/active-crops-render-reference/',import.meta.url);
mkdirSync(directory,{recursive:true});writeFileSync(new URL('game.js',directory),reference);
const sha=value=>createHash('sha256').update(value).digest('hex');
const provenance={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),gameSha256:sha(original),referenceSha256:sha(reference),activeCropsSha256:sha(readFileSync(new URL('../src/simulation/active-crops.js',import.meta.url)))};
writeFileSync(new URL('provenance.json',directory),JSON.stringify(provenance,null,2)+'\n');
console.log(JSON.stringify(provenance));
