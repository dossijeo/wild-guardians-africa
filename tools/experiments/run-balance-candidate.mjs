import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {applyBalanceCandidate} from './balance-candidate.mjs';

const [candidateFile,days,biome,seed,output,defensePolicy='expanding']=process.argv.slice(2);
if(!candidateFile||!days||!biome||!seed||!output)
 throw Error('Usage: node run-balance-candidate.mjs candidate.json nights biome seed report.json [expanding|topological]');
if(!['expanding','topological'].includes(defensePolicy))
 throw RangeError('Unknown defense policy');
const candidatePath=resolve(candidateFile),outputPath=resolve(output),bytes=readFileSync(candidatePath);
const candidate=applyBalanceCandidate(JSON.parse(bytes));
const sha=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const candidateSha256=createHash('sha256').update(bytes).digest('hex');
const sourceHashes={pressureBudget:sha('src/simulation/raid-pressure-budget.js'),
 pressurePlan:sha('src/simulation/raid-pressure-plan.js'),
 pressureSnapshot:sha('src/persistence/raid-pressure-snapshot.js'),
 balanceAdapter:sha('tools/experiments/balance-candidate.mjs'),
 defensePolicy:sha(defensePolicy==='topological'?
  'tools/native-topological-defense-policy.mjs':
  'tools/native-expanding-defense-policy.mjs'),
 launch:sha('tools/experiments/run-balance-candidate.mjs')};
// Every arm keeps the same integrated engine; the defense policy is recorded.
process.env.WILD_ENGINE_SPATIAL_ADVICE='1';
process.env.WILD_ENGINE_DEFENSE_GATE='event';
process.env.WILD_ENGINE_DEFENSE_POLICY=defensePolicy;
process.env.WILD_ENGINE_DECISION_PROFILE='1';
process.argv=[process.argv[0],resolve('tools/experiments/run-native-intent-campaign.mjs'),
 days,biome,seed,'good',outputPath,'intent'];
await import('./run-native-intent-campaign.mjs');
const report=JSON.parse(readFileSync(outputPath,'utf8'));
report.balanceCandidate={id:candidate.id,sha256:candidateSha256,defensePolicy,
 walls:candidate.walls??null,pressure:candidate.pressure??null,
 sourceHashes};
writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n');
