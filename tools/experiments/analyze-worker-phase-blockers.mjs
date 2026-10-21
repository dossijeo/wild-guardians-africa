import {readFileSync} from 'node:fs';

const file=process.argv[2];
if(!file)throw Error('Usage: analyze-worker-phase-blockers.mjs <probe-report.json>');
const report=JSON.parse(readFileSync(file,'utf8'));
const samples=(report.motionSamples??[]).filter(sample=>
  sample.kind==='mobileCollisionRecovery'&&Array.isArray(sample.blockingIds));
const overlaps=(report.workExamples??[]).filter(example=>example.time>30);
const classified=overlaps.map(example=>{
  const latest=samples.filter(sample=>sample.day===example.day&&
    (sample.actorId===example.a||sample.actorId===example.b)&&
    sample.time<=example.time+1e-6&&example.time-sample.time<=3.2)
    .sort((a,b)=>b.time-a.time)[0];
  const partner=latest?.actorId===example.a?example.b:example.a;
  return {day:example.day,time:example.time,a:example.a,b:example.b,
    actorId:latest?.actorId??null,blockingIds:latest?.blockingIds??[],
    originalBlocker:!!latest?.blockingIds.includes(partner),
    phased:example.aPhase>0||example.bPhase>0,
    penetration:example.penetration};
});
console.log(JSON.stringify({stateHash:report.stateHash,
  workOverlapPairs:report.workOverlapPairs,
  sampledLatePairs:classified.length,
  linkedToRecovery:classified.filter(row=>row.actorId).length,
  originalBlockerPairs:classified.filter(row=>row.originalBlocker).length,
  otherBodyPairs:classified.filter(row=>row.actorId&&!row.originalBlocker).length,
  unlinkedPairs:classified.filter(row=>!row.actorId).length,
  phasedPairs:classified.filter(row=>row.phased).length,
  examples:classified.filter(row=>!row.originalBlocker)},null,2));
