import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=path=>readFileSync(new URL('../'+path,import.meta.url));
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
test('building AO bank matches every original geometry and declared grayscale atlas',()=>{
 const manifest=JSON.parse(read('content/manifests/destruction-native.json'));
 for(const building of manifest.buildings){
  const base='public/content/lighting/'+building.culture+'-geometric-ao';
  const data=read(base+'.png'),meta=JSON.parse(read(base+'.json'));
  assert.equal(meta.source,building.url);
  assert.equal(meta.sourceSHA256,hash(read('public'+building.url)));
  assert.equal(meta.outputSHA256,hash(data));
  assert.equal(data.subarray(1,4).toString(),'PNG');
  assert.equal(data.readUInt32BE(16),1024);assert.equal(data.readUInt32BE(20),1024);
  assert.equal(data[24],8);assert.equal(data[25],0,'single grayscale channel, no color transform');
  assert.ok(meta.distance>0&&Number.isFinite(meta.distance));
 }
});
