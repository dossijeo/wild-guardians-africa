// Read-only diagnosis: never plants, hires, advances time or modifies a save.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {createNativeCampaignPlots} from './native-campaign-plots.mjs';
const [directory,output]=process.argv.slice(2);
if(!directory||!output||existsSync(output))throw Error('Provide campaign directory and fresh output');
const sha=b=>createHash('sha256').update(b).digest('hex');
const file=directory+'/state.json.gz',raw=readFileSync(file);
const s=deserialize(gunzipSync(raw).toString()),before=serialize(s);
const nav=new Navigation(s.seed,s.biome,JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[s.biome]}.json`)).profile);
nav.setState(s);
const plots=createNativeCampaignPlots(nav,()=>s,{fluidClearance:1.5});
const attempts=[];
for(let i=0;i<32;i++){
 const p=plots.choose();attempts.push({attempt:i+1,point:p,reason:plots.reason()});
 if(p)break;
}
assert.equal(serialize(s),before,'Read-only navigation probe changed native save state');
assert.equal(sha(readFileSync(file)),sha(raw),'Retained snapshot changed');
writeFileSync(output,JSON.stringify({input:file,inputSha256:sha(raw),sourceHashes:Object.fromEntries(['tools/probe-native-replant-access.mjs','tools/native-campaign-plots.mjs','src/world/navigation.js'].map(p=>[p,sha(readFileSync(p))])),day:s.day,time:s.time,living:s.plants.filter(p=>p.alive).length,attempts,plotSearch:plots.report(),snapshotUnchanged:true,scope:'Fresh bounded plot search on terminal snapshot only. Does not reconstruct historical cash timing or the campaign plot cursor; not a recovery or survival demonstration.'},null,2)+'\n');
console.log(JSON.stringify({day:s.day,time:s.time,validPoint:attempts.find(a=>a.point)?.point??null,snapshotUnchanged:true}));
