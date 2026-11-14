import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createConfirmedSceneReceiver as current} from '../../src/rendering/confirmed-scene-receiver.js';
const baseline=resolve(`src/rendering/.confirmed-scene-benchmark-${process.pid}.js`);let created=false;
try{
 writeFileSync(baseline,execFileSync('git',['show','0e8b843d5:src/rendering/confirmed-scene-receiver.js']),{flag:'wx'});created=true;
 const {createConfirmedSceneReceiver:original}=await import(pathToFileURL(baseline));
 const source=gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString();
 function run(factory){const state=deserialize(source),receiver=factory(state,'bench',{state,mixers:new Map()}),samples=[];for(let i=1;i<=45;i++){const start=performance.now();receiver.accept({session:'bench',sequence:i,snapshot:source,events:[],physicsPose:null});if(i>5)samples.push(performance.now()-start);}samples.sort((a,b)=>a-b);return {mean:samples.reduce((a,b)=>a+b,0)/samples.length,p95:samples[Math.ceil(samples.length*.95)-1],p99:samples.at(-1)};}
 const results=[];for(const mode of ['original','current','current','original'])results.push({mode,...run(mode==='original'?original:current)});
 console.log(JSON.stringify({snapshotChars:source.length,samplesPerRun:40,results,scope:'Node, deterministic mangrove capture, complete confirmed scene acceptance with no physics poses or GPU; A/B/B/A.'}));
}finally{if(created)unlinkSync(baseline);}
