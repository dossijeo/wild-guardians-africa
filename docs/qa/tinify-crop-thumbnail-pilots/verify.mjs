import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {compareColorPixels} from '../../../tools/image-pixel-comparison.mjs';
const directory=new URL('./',import.meta.url),sha=b=>createHash('sha256').update(b).digest('hex');
const proof=JSON.parse(await readFile(new URL('proof.json',directory)));
assert.equal(proof.rows.length,7);
let before=0,after=0;
for(const row of proof.rows){
 const source=await readFile(new URL(row.name+'-original.webp',directory)),candidate=await readFile(new URL(row.name+'-candidate.webp',directory));
 const reportBytes=await readFile(new URL(row.name+'-report.json',directory)),report=JSON.parse(reportBytes);
 assert.equal(sha(source),row.sourceSha256);assert.equal(sha(candidate),row.candidateSha256);assert.equal(sha(reportBytes),row.reportSha256);
 assert.equal(source.length,row.sourceBytes);assert.equal(candidate.length,row.candidateBytes);
 assert.equal(report.sourceSha256,row.sourceSha256);assert.equal(report.outputSha256,row.candidateSha256);
 assert.equal(report.acceptedForRuntime,false);assert.equal(report.structuralChecksPassed,true);
 const comparison=await compareColorPixels(source,candidate);
 for(const [key,value] of Object.entries(comparison))assert.equal(report[key],value);
 assert.equal(comparison.dimensionsMatch,true);assert.equal(comparison.alphaDifferences,0);
 assert.ok(candidate.length<source.length);before+=source.length;after+=candidate.length;
}
assert.equal(sha(await readFile(new URL('comparison.png',directory))),proof.comparisonSha256);
assert.equal(before,proof.sourceBytes);assert.equal(after,proof.candidateBytes);
console.log(JSON.stringify({verified:7,before,after,potentialSaved:before-after,runtimePromoted:false}));
