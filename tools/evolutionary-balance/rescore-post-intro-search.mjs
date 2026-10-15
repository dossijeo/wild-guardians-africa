// Re-score frozen native campaigns without replaying or modifying them.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,relative,dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {scorePostIntro,scorePostIntroV2} from './post-intro-fitness.mjs';
import {genomeId} from './ga.mjs';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const order=(a,b)=>b.score-a.score||b.meanScore-a.meanScore||a.id.localeCompare(b.id);
const close=(a,b)=>Math.abs(a-b)<=1e-9;

export function rescoreFrozenSearch(searchPath){
 const path=resolve(searchPath),folder=dirname(path);
 const searchBytes=readFileSync(path),search=JSON.parse(searchBytes);
 const {stamp,generations}=search,{config}=stamp;
 if(config.fitnessVersion!=='post-intro-v1'||config.days<14)
  throw Error('Expected a frozen post-intro-v1 search of at least 14 nights');
 if(!Array.isArray(generations)||!generations.length)throw Error('No complete generations');
 if(stamp.runKind!=='native-Wild-Engine-campaign')throw Error('Not native campaign evidence');
 const reports=new Map();
 function load(id,scenario,strategy){
  const file=join(folder,`${stamp.implementationId}-${id}-${scenario.biome}-${scenario.seed}-${config.days}.json`);
  if(!existsSync(file))throw Error(`Missing native report: ${file}`);
  const bytes=readFileSync(file),report=JSON.parse(bytes);
  if(report.status!=='completed'||report.biome!==scenario.biome||report.seed!==scenario.seed||
     report.days!==config.days||report.strategy!==strategy)
   throw Error(`Mismatched or incomplete native report: ${file}`);
  if(!Array.isArray(report.rows)||report.rows.some(row=>!row.reconciled))
   throw Error(`Unreconciled native ledger: ${file}`);
  const original=scorePostIntro(report,config.days,
   {minimumTerminalDeliveryPerDay:config.minimumTerminalDeliveryPerDay});
  const updated=scorePostIntroV2(report,config.days,
   {minimumTerminalDeliveryPerDay:config.minimumTerminalDeliveryPerDay});
  const record={id,biome:scenario.biome,seed:scenario.seed,
   file:file.slice(folder.length+1),sha256:digest(bytes),
   completedNights:report.completedNights,result:report.result,
   v1:{score:original.score,valid:original.valid,reason:original.reason??null},
   v2:{score:updated.score,valid:updated.valid,reason:updated.reason??null}};
  reports.set(`${id}:${scenario.biome}:${scenario.seed}`,record);
  return record;
 }
 const rescored=generations.map(({generation,ranked})=>{
  if(!Array.isArray(ranked)||ranked.length!==config.population)
   throw Error(`Incomplete generation ${generation}`);
  const entries=ranked.map(candidate=>{
   if(genomeId(candidate.genes)!==candidate.id)throw Error(`Genome ID mismatch: ${candidate.id}`);
   if(candidate.cases.length!==config.train.length)throw Error(`Missing cases: ${candidate.id}`);
   const evidence=config.train.map((scenario,index)=>{
    const record=load(candidate.id,scenario,'evolved'),old=candidate.cases[index];
    if(old.biome!==scenario.biome||old.seed!==scenario.seed||
       !close(old.score,record.v1.score)||old.valid!==record.v1.valid)
     throw Error(`Historical score mismatch: ${candidate.id} ${scenario.biome}/${scenario.seed}`);
    return record;
   });
   const scores=evidence.map(row=>row.v2.score);
   return {id:candidate.id,score:Math.min(...scores),
    meanScore:scores.reduce((total,score)=>total+score,0)/scores.length};
  });
  const historical=ranked.map(row=>row.id),revised=[...entries].sort(order).map(row=>row.id);
  return {generation,historical,revised,rankUnchanged:historical.every((id,i)=>id===revised[i]),
   entries:entries.sort(order)};
 });
 const resultPath=join(folder,`result-${stamp.runId}.json`);
 let holdout=null;
 if(existsSync(resultPath)){
  const bytes=readFileSync(resultPath),result=JSON.parse(bytes);
  if(result.stamp?.runId!==stamp.runId)throw Error('Result stamp mismatch');
  const oldLeader=result.pilotLeader?.id;
  const revisedLeader=rescored.flatMap(row=>row.entries).sort(order)[0]?.id??null;
  const rows=[];
  for(const item of result.holdout??[]){
   const scenario={biome:item.biome,seed:item.seed};
   const record=load(item.id,scenario,item.strategy);
   if(!close(item.score,record.v1.score)||item.valid!==record.v1.valid)
    throw Error(`Historical holdout score mismatch: ${item.id}`);
   rows.push({strategy:item.strategy,...record});
  }
  holdout={resultSha256:digest(bytes),oldLeader,revisedLeader,
   leaderUnchanged:oldLeader===revisedLeader,rows};
 }
 return {kind:'post-intro-v1-to-v2-offline-rescore',
  sourceSearch:relative(process.cwd(),path).replaceAll('\\','/'),
  sourceSearchSha256:digest(searchBytes),sourceStamp:stamp,
  scoring:'post-intro-v2; native reports unchanged',
  generations:rescored,holdout,reports:[...reports.values()]};
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const [searchPath,outputPath]=process.argv.slice(2);
 if(!searchPath)throw Error('Usage: rescore-post-intro-search.mjs SEARCH_JSON [OUTPUT_JSON]');
 const result=rescoreFrozenSearch(searchPath),serialized=JSON.stringify(result,null,2)+'\n';
 if(outputPath)writeFileSync(resolve(outputPath),serialized);
 else process.stdout.write(serialized);
}
