import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {deserialize} from '../../src/persistence/snapshots.js';
import {raidEntryRequest} from '../../src/world/raid-entry-data.js';
import {computeRaidEntry} from '../../src/world/compute-raid-entry.js';

const [statePath,reportPath]=process.argv.slice(2);
if(!statePath||!reportPath)throw TypeError('Pass frozen state and comparison receipt');
const state=deserialize(gunzipSync(readFileSync(statePath)).toString());
const reportBytes=readFileSync(reportPath);
const report=JSON.parse((reportPath.endsWith('.gz')?gunzipSync(reportBytes):reportBytes).toString());
const partial=report.arms[0].partial;
const key=partial.entryTransport.waits.at(-1)?.key ?? partial.navigation.entryFailure?.key;
if(!key)throw Error('Frozen report has no raid-entry request key');
const parts=JSON.parse(key),group=parts[6],bounds=parts[7],view=parts[8];
// Recreate the request emitted by the headless spatial adapter. Unlike the
// legacy Navigation object it has no JavaScript biome scatter profile.
const nav={profile:undefined,activeBounds:bounds,raidView:view};
const request=raidEntryRequest(state,nav,group,key,1);
const started=performance.now();
try{
  const result=computeRaidEntry(request);
  console.log(JSON.stringify({status:result.entry?'found':'no-entry',
    elapsedMs:performance.now()-started,entryCount:result.entry?.entries?.length,
    group:group.length}));
}catch(error){
  console.error(JSON.stringify({status:'error',elapsedMs:performance.now()-started,
    message:error.message,stack:error.stack}));
  process.exitCode=1;
}
