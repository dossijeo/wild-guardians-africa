import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {archiveNativeReports,restoreNativeReports} from '../tools/evolutionary-balance/archive-native-reports.mjs';

test('native report bundle restores the exact compressed bytes and leaves other evidence alone',()=>{
 const root=mkdtempSync(join(tmpdir(),'wg-report-bundle-'));
 try{
  const source=join(root,'source'),restored=join(root,'restored');mkdirSync(source);
  const reports=new Map([
   ['a.json.gz',gzipSync(JSON.stringify({status:'completed',completedNights:7}))],
   ['b.json.gz',gzipSync(JSON.stringify({status:'error',name:'CampaignCostStop'}))]
  ]);
  for(const [name,bytes] of reports)writeFileSync(join(source,name),bytes);
  writeFileSync(join(source,'progress-bundle.json.gz'),gzipSync('{}'));
  const packed=archiveNativeReports(source);
  assert.equal(packed.count,2);
  assert.deepEqual(readdirSync(source).sort(),['progress-bundle.json.gz','reports-bundle.json.gz']);
  assert.equal(restoreNativeReports(join(source,packed.archive),restored),2);
  for(const [name,bytes] of reports)assert.deepEqual(readFileSync(join(restored,name)),bytes);
 }finally{rmSync(root,{recursive:true,force:true});}
});
