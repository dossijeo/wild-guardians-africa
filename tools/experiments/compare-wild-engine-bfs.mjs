import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

const directory=process.argv[2];
if(!directory)throw Error('Usage: compare-wild-engine-bfs.mjs REPORT_DIRECTORY');
const biomes=['sabana','manglares','desierto','gran-canon','gran-rio','volcanes'];
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const warm=(report,kind)=>mean(report.rounds.filter(round=>round.kind===kind)
  .slice(1).map(round=>round.milliseconds));
const rows=[];
for(const biome of biomes){
  const pair={};
  for(const variant of ['baseline','candidate']){
    pair[variant]=[0,1].map(index=>JSON.parse(readFileSync(
      join(directory,`${biome}-${variant}-${index}.json`),'utf8')));
  }
  const reference=pair.baseline[0];
  for(const report of [...pair.baseline,...pair.candidate]){
    if(JSON.stringify(report.requests)!==JSON.stringify(reference.requests))
      throw Error(`${biome}: requests differ`);
    for(let i=0;i<report.rounds.length;i++){
      if(report.rounds[i].sha256!==reference.rounds[i].sha256||
          JSON.stringify(report.rounds[i].outcomes)!==JSON.stringify(reference.rounds[i].outcomes))
        throw Error(`${biome}: result/route hash differs in round ${i}`);
    }
  }
  for(const kind of ['connected','route']){
    const baseline=mean(pair.baseline.map(report=>warm(report,kind)));
    const candidate=mean(pair.candidate.map(report=>warm(report,kind)));
    rows.push({biome,kind,baselineMs:baseline,candidateMs:candidate,
      candidateOverBaseline:candidate/baseline});
  }
}
writeFileSync(join(directory,'comparison.json'),JSON.stringify({rows},null,2)+'\n');
console.table(rows.map(row=>({biome:row.biome,kind:row.kind,
  baselineMs:row.baselineMs.toFixed(2),candidateMs:row.candidateMs.toFixed(2),
  ratio:row.candidateOverBaseline.toFixed(3)})));
