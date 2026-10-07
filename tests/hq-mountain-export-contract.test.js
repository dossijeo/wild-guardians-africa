import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const cache=path.join(root,'.cache');
const script=fileURLToPath(new URL('../tools/prepare_mountain_arc_pilot.mjs',import.meta.url));
const contractPath='assets-source/far-backdrops-hq/single-export-contract.json';
test('repaired volcano atlas is byte-exact through the pinned exporter including its odd-width source padding',()=>{
 fs.mkdirSync(cache,{recursive:true});const output=fs.mkdtempSync(path.join(cache,'hq-volcano-repro-'));
 try{
  const contract=JSON.parse(fs.readFileSync(path.join(root,'assets-source/far-backdrops-hq/volcanoes-four-export-contract.json'),'utf8'));
  assert.equal(contract.sources[3].rightPadding,1);
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('../tools/prepare_mountain_arc_four.mjs',import.meta.url)),output,'volcanoes'],{cwd:root,encoding:'utf8',timeout:30000});
  assert.equal(result.error,undefined);assert.equal(result.status,0,result.stderr);
  const receipt=JSON.parse(fs.readFileSync(path.join(output,'export.json'),'utf8'));
  assert.equal(receipt.atlasSha256,contract.outputSha256);assert.equal(receipt.bytes,contract.outputBytes);
  assert.deepEqual(receipt.sourceAssets[3].crop,{left:0,top:181,width:2172,height:543});assert.equal(receipt.sourceAssets[3].rightPadding,1);
 }finally{
  const relative=path.relative(cache,output);assert.ok(relative.startsWith('hq-volcano-repro-')&&!relative.includes(path.sep)&&!path.isAbsolute(relative));fs.rmSync(output,{recursive:true,force:true});
 }
});

function rejectedBeforeWrite(mutate,expected,{four=false}={}){
 fs.mkdirSync(cache,{recursive:true});
 const temporary=fs.mkdtempSync(path.join(cache,'hq-export-contract-'));
 try{
  const selectedContract=four?'assets-source/far-backdrops-hq/grand_river-four-export-contract.json':contractPath;
  const contract=JSON.parse(fs.readFileSync(path.join(root,selectedContract),'utf8'));
  const sources=four?contract.sources.map(entry=>entry.source):[contract.biomes.savanna.source];
  fs.mkdirSync(path.dirname(path.join(temporary,selectedContract)),{recursive:true});
  for(const source of sources)fs.copyFileSync(path.join(root,source),path.join(temporary,source));
  mutate(contract);
  fs.writeFileSync(path.join(temporary,selectedContract),JSON.stringify(contract));
  const output=path.join(temporary,'public');
  fs.mkdirSync(output);
  const prior=Buffer.from('Previously reviewed atlas must remain untouched');
  fs.writeFileSync(path.join(output,'atlas.webp'),prior);
  const selectedScript=four?fileURLToPath(new URL('../tools/prepare_mountain_arc_four.mjs',import.meta.url)):script;
  const result=spawnSync(process.execPath,[selectedScript,output,four?'grand_river':'savanna'],{cwd:temporary,encoding:'utf8',timeout:30000});
  assert.equal(result.error,undefined);
  assert.notEqual(result.status,0);
  assert.match(result.stderr,expected);
  assert.deepEqual(fs.readFileSync(path.join(output,'atlas.webp')),prior);
  assert.deepEqual(fs.readdirSync(output),['atlas.webp']);
 }finally{
  const relative=path.relative(cache,temporary);
  assert.ok(relative.startsWith('hq-export-contract-')&&!relative.includes(path.sep)&&!path.isAbsolute(relative));
  fs.rmSync(temporary,{recursive:true,force:true});
 }
}

test('mismatched encoder cannot overwrite an existing reviewed mountain atlas',()=>{
 rejectedBeforeWrite(c=>c.versions.sharp='unreviewed-version',/Pinned encoder mismatch/);
});
test('changed source bytes fail before decode or public writes',()=>{
 rejectedBeforeWrite(c=>c.biomes.savanna.sourceSha256='0'.repeat(64),/Source contract mismatch/);
});
test('different encoded atlas bytes cannot overwrite prior public output',()=>{
 rejectedBeforeWrite(c=>c.biomes.savanna.bytes=0,/Encoded atlas differs/);
});

test('four-cell atlas rejects a changed final source before public writes',()=>{
 rejectedBeforeWrite(c=>c.sources[3].sha256='0'.repeat(64),/Source contract mismatch/,{four:true});
});

test('four-cell atlas rejects unreviewed output bytes without overwriting output',()=>{
 rejectedBeforeWrite(c=>c.outputBytes=0,/Encoded atlas differs/,{four:true});
});

test('four-cell source contract cannot select paths outside its biome source directory',()=>{
 rejectedBeforeWrite(c=>c.sources[0].source='../unreviewed.png',/Invalid mountain source contract/,{four:true});
});
