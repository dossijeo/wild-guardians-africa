import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base=new URL('./',import.meta.url),read=file=>readFileSync(new URL(file,base));
const hash=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(read('receipt.json'));
for(const run of receipt.runs){
 const compressed=read(run.name+'.json.gz'),raw=gunzipSync(compressed),report=JSON.parse(raw);
 assert.equal(hash(compressed),run.gzipSha256);assert.equal(hash(raw),run.rawSha256);
 assert.equal(hash(read(run.name+'.html')),run.fixtureSha256);
 assert.equal(report.done,true);assert.deepEqual(report.errors,[]);
 assert.equal(report.rows.length,run.name==='six-biomes'?6:1);
 for(const row of report.rows){
  assert.equal(row.restored,true);assert.equal(row.logicalUnchanged,true);
  assert.equal(row.disposed,true);assert.equal(row.contextLost,true);assert.equal(row.shadowOn,1);
  assert.equal(row.framebufferAfterUpload.differingChannels,0);
  if(run.name==='manglar-control'){
   assert.equal(row.baselineNextFrame.differingChannels,0);assert.equal(row.nextWorldFrame.differingChannels,0);
  }
 }
 for(const image of run.images)assert.equal(hash(read(image.file)),image.sha256);
 console.log(JSON.stringify({run:run.name,rows:report.rows.map(({biome,baselineNextFrame,nextWorldFrame})=>({biome,baselineNextFrame,nextWorldFrame}))}));
}
