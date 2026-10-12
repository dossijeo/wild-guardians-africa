import {writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {parseNativeCampaignArgs,runNativeCampaignCase,nativeCampaignProvenance,calibrationStop} from './run_native_campaign.mjs';
import {simulateNativeCampaign} from './native-campaign-runner.mjs';
import {createNativeShortTimingObserver} from './native-short-timing-observer.mjs';
import {serialize} from '../src/persistence/snapshots.js';
const options=parseNativeCampaignArgs(process.argv.slice(2));if(options.days>7)throw Error('Short diagnostic permits at most seven nights');
const observer=createNativeShortTimingObserver(),startedAt=new Date().toISOString();let slowIndex=0;
const save=(file,value)=>writeFileSync(resolve(options.out,file),JSON.stringify(value,null,2)+'\n');
const provenance=o=>{const p=nativeCampaignProvenance(o);for(const path of ['tools/run_native_short_observed.mjs','tools/native-short-timing-observer.mjs'])p.sourceHashes[path]=createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex');return {...p,diagnostic:{pid:process.pid,startedAt,maximumNights:7,slowWindowMs:2000,stopAfterSlowWindows:3,scope:observer.report().scope,sparseCheckout:'public/assets, tools/sources and unrelated docs/qa excluded; simulation/config sources intact'}};};
const result=await runNativeCampaignCase(options,{provenance,run:o=>simulateNativeCampaign({...o,
 onDecision:row=>{o.onDecision?.(row);observer.decision(row);},
 onTick:(s,nav)=>{
  const sample=observer.tick(s);
  if(sample&&(sample.count%60===0||sample.slow))save('timing-progress.json',{status:'running',pid:process.pid,updatedAt:new Date().toISOString(),...observer.report()});
  if(sample?.slow){const name='slow-window-'+(++slowIndex);writeFileSync(resolve(options.out,name+'-state.json.gz'),gzipSync(Buffer.from(serialize(s))));save(name+'.json',{sample,nav:{version:nav.version,bounds:nav.activeBounds,view:nav.raidView},note:'Post-tick native snapshot, not reconstructed pre-tick input'});}
  o.onTick?.(s,nav);
  if(sample?.stop)throw calibrationStop('CPU diagnostic: three decision-to-observation windows >=2000 ms; preserve partial native state, no economic defeat');
 }
})});
save('timing-terminal.json',{status:result.receipt.status,pid:process.pid,finishedAt:new Date().toISOString(),...observer.report()});console.log(JSON.stringify({receipt:result.receipt,timing:observer.report()}));process.exitCode=result.exitCode;
