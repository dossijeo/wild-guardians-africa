import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import * as Game from '../src/simulation/game.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {deserialize} from '../src/persistence/snapshots.js';
import {intensiveRunProvenance} from './intensive-run-provenance.mjs';

// Reproduce a saved, naturally reached raid with current native rules. This
// cannot stand in for a fresh 100-night campaign or alter the saved exit points.
const [input,output,limit='120']=process.argv.slice(2),seconds=Number(limit);
if(!input||!output||!Number.isSafeInteger(seconds)||seconds<1||seconds>2400)throw Error('Usage: node tools/replay_raid_checkpoint.mjs INPUT.json OUTPUT.json [SIM_SECONDS=120]');
const fileBytes=readFileSync(resolve(input)),bytes=input.endsWith('.gz')?gunzipSync(fileBytes):fileBytes,state=deserialize(bytes.toString('utf8'));
if(!state.raid||state.result||state.pauses.length)throw Error('Checkpoint must contain an active, unpaused raid');
const profile=JSON.parse(readFileSync(new URL(`../public/content/biome-${BIOME_IDS[state.biome]}.json`,import.meta.url))).profile;
const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
const provenance=intensiveRunProvenance(process.argv.slice(2));
provenance.sourceHashes['tools/replay_raid_checkpoint.mjs']=createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex');
const trace=[],started=performance.now(),initialDay=state.day,initialElapsed=state.elapsed;
const capture=()=>({elapsed:state.elapsed-initialElapsed,day:state.day,time:state.time,pauses:[...state.pauses],result:state.result,animals:state.raid?.animals.map(a=>({id:a.id,species:a.species,status:a.status,x:a.x,z:a.z,hitsRemaining:a.hitsRemaining,targetId:a.targetId,path:a.path.map(p=>({x:p.x,z:p.z})),exit:a.exit,destinationId:a.destinationId,approach:a.approach}))??null});
trace.push(capture());
let steps=0;
while(steps<seconds&&state.raid&&!state.result&&state.day===initialDay&&!state.pauses.length){
  Game.tick(state,1,nav);steps++;
  if(steps%10===0){trace.push(capture());console.log(JSON.stringify({steps,day:state.day,remaining:state.raid?.animals.filter(a=>a.status!=='gone').map(a=>({id:a.id,status:a.status,x:a.x,z:a.z}))??[]}));}
}
if(steps%10)trace.push(capture());
const report={input:resolve(input),inputSha256:createHash('sha256').update(bytes).digest('hex'),provenance,biome:state.biome,culture:state.culture,initialDay,initialElapsed,limit:seconds,steps,wallSeconds:(performance.now()-started)/1000,status:!state.raid&&state.day>initialDay?'resolved':'unresolved',trace};
writeFileSync(resolve(output),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,steps,wallSeconds:report.wallSeconds,output:resolve(output)}));
if(report.status!=='resolved')process.exitCode=1;
