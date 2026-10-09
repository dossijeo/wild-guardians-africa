import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {BALANCE as B} from '../src/simulation/balance.js';
import {HORDE_STAGES,proposalGroups} from './horde-proposal.mjs';

// Small CPU arithmetic diagnostic, not a campaign or a render benchmark.
const rows=[];
for(const stage of HORDE_STAGES)for(const [tierIndex,tier] of B.threat_tiers.entries()){
 for(let budget=Math.ceil(tier.threat_min*stage.budgetScale);budget<=Math.ceil(tier.threat_max*stage.budgetScale);budget++){
  const start=performance.now(),result=proposalGroups(stage.first,budget,tier.unlocked_species);
  const lengths=result.groups.map(g=>g.length);
  rows.push({firstNight:stage.first,tier:tierIndex,budget,groups:result.groups.length,visited:result.visited,
   minCount:Math.min(...lengths),maxCount:Math.max(...lengths),milliseconds:performance.now()-start});
 }
}
const report={scope:'Single-pass pure CPU enumeration; no world, RNG, actors, GPU or campaign',
 caveat:'Timing is descriptive for this tiny arithmetic workload, not evidence of nightly or frame-time performance.',
 economicRuntimeChanged:false,rows,totals:{cases:rows.length,groups:rows.reduce((n,r)=>n+r.groups,0),
  maxGroups:Math.max(...rows.map(r=>r.groups)),maxVisited:Math.max(...rows.map(r=>r.visited)),
  milliseconds:rows.reduce((n,r)=>n+r.milliseconds,0)}};
const output=process.argv[2];if(!output)throw Error('Specify a new output JSON path');
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report.totals));
