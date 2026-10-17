import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';

const [output,...inputs]=process.argv.slice(2);
if(!output||!inputs.length)throw Error('Usage: node summarize-balance-candidates.mjs output.csv report.json ...');
const fields=['candidate','biome','seed','night','crops','cash','workers','income','wages','seeds','newWalls','repairs','animals','cropsExposed','cropsDestroyed','lossRatePct','wallHpLost','gameTickMs','decisionMs','verifiedRaid'];
const lines=[fields.join(',')];
for(const input of inputs){
 const bytes=readFileSync(resolve(input));
 const report=JSON.parse((input.endsWith('.gz')?gunzipSync(bytes):bytes).toString());
 if(!report.balanceCandidate||!Array.isArray(report.rows))throw Error('Missing balance campaign data: '+input);
 const raids=new Map();
 for(const raid of report.raidEvidence?.raids??[]){
  const prior=raids.get(raid.day)??{animals:0,cropsExposed:0,cropsDestroyed:0,wallHpLost:0};
  prior.animals+=raid.actors?.length??0;
  prior.cropsExposed+=raid.exposedLivingAtSpawn??0;
  prior.cropsDestroyed+=raid.cropsDestroyed??0;
  prior.wallHpLost+=raid.wallHpLost??0;
  raids.set(raid.day,prior);
 }
 for(const row of report.rows){
  const raid=raids.get(row.day)??{animals:0,cropsExposed:0,cropsDestroyed:0,wallHpLost:0};
  const data={candidate:report.balanceCandidate.id,biome:report.parameters.biome,
   seed:report.parameters.seed,night:row.day,crops:row.living,cash:row.money,
   workers:row.staff,income:row.finance.income,wages:row.finance.wages,
   seeds:row.finance.seeds,newWalls:row.finance.walls,repairs:row.finance.repairs,
   ...raid,lossRatePct:raid.cropsExposed?100*raid.cropsDestroyed/raid.cropsExposed:0,
   gameTickMs:row.wallTime?.gameTickMs??'',decisionMs:row.wallTime?.decisionMs??'',
   verifiedRaid:report.raidEvidence?.status==='verified'&&
    !report.raidEvidence.issues?.length};
  lines.push(fields.map(field=>data[field]).join(','));
 }
}
writeFileSync(resolve(output),lines.join('\n')+'\n');
