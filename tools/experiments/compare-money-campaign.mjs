// Compare two completed runs of tools/run_native_campaign.mjs without
// mistaking legitimate wall-clock timings for simulation-state differences.
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';

const [candidateDir,controlDir]=process.argv.slice(2).map(path=>resolve(path));
if(!candidateDir||!controlDir)throw Error('Pass candidate and control output directories');
const read=(dir,name)=>JSON.parse(readFileSync(join(dir,name)));
const run=dir=>{
  const rows=readFileSync(join(dir,'days.jsonl'),'utf8').trim().split(/\r?\n/).map(JSON.parse);
  const state=gunzipSync(readFileSync(join(dir,'state.json.gz')));
  return {source:read(dir,'source.json'),receipt:read(dir,'receipt.json'),
    report:read(dir,'report.json'),rows,
    stateHash:createHash('sha256').update(state).digest('hex')};
};
const [candidate,control]=[candidateDir,controlDir].map(run);
const parameters=({source})=>{
  const {out,...inputs}=source.arguments;
  return inputs;
};
if(JSON.stringify(parameters(candidate))!==JSON.stringify(parameters(control)))
  throw Error('Campaign inputs differ beyond the output directory');
const pair=candidate.rows.slice(0,Math.min(candidate.rows.length,control.rows.length))
  .map((row,i)=>{
    const original=control.rows[i];
    const {wallTime:candidateTiming,...candidateState}=row;
    const {wallTime:controlTiming,...controlState}=original;
    return {day:row.day,simulationEqual:JSON.stringify(candidateState)===JSON.stringify(controlState),
      candidateTickMs:candidateTiming.gameTickMs,
      controlTickMs:controlTiming.gameTickMs,
      candidateDecisionMs:candidateTiming.decisionMs,
      controlDecisionMs:controlTiming.decisionMs};
  });
const differences=Object.keys({...candidate.source.sourceHashes,...control.source.sourceHashes})
  .filter(path=>candidate.source.sourceHashes[path]!==control.source.sourceHashes[path]);
const sum=(key)=>pair.reduce((total,row)=>total+row[key],0);
const identity=run=>({result:run.receipt.status,
  nights:run.report.completedNights,stateHash:run.stateHash,
  gitHead:run.source.gitHead,
  moneySourceHash:run.source.sourceHashes['src/simulation/money.js'],
  startedAt:run.source.startedAt,finishedAt:run.receipt.finishedAt});
console.log(JSON.stringify({parameters:parameters(candidate),
  candidate:identity(candidate),control:identity(control),
  sameFinalState:candidate.stateHash===control.stateHash,
  sourceHashDifferences:differences,
  sharedDays:pair.length,allDailySimulationFactsEqual:pair.every(row=>row.simulationEqual),
  totals:{candidateTickMs:sum('candidateTickMs'),controlTickMs:sum('controlTickMs'),
    candidateDecisionMs:sum('candidateDecisionMs'),controlDecisionMs:sum('controlDecisionMs')},
  daily:pair},null,2));
