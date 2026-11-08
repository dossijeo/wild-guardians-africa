import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {createSimulationAuthority} from '../../src/simulation/simulation-authority.js';
import {projectConfirmedHud,validateConfirmedHudSchema} from '../../src/simulation/confirmed-hud-projection.js';
import {createConfirmedHudDeltaEncoder} from '../../src/simulation/confirmed-hud-delta.js';
import {createConfirmedHudDeltaDecoder as currentDecoder} from './hud-decoder-isolated-candidate.mjs';

const baselineRevision=process.env.QA_HUD_BASELINE??'168fb9d4f';
const source=execFileSync('git',['show',`${baselineRevision}:src/simulation/confirmed-hud-delta.js`],{encoding:'utf8'}),{createConfirmedHudDeltaDecoder:baselineDecoder}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm')),snapshot=serialize(deserialize(gunzipSync(readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString())),keys=[];for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++)keys.push(`${x},${z}`);
const authority=createSimulationAuthority(module,snapshot,keys),encoder=createConfirmedHudDeltaEncoder({validate:validateConfirmedHudSchema}),packets=[];try{for(let sequence=1;sequence<=41;sequence++){const pub=authority.execute(sequence===1?{kind:'snapshot',sequence}:{kind:'advance',sequence,seconds:.05,steps:1,nightFastForward:false}),state=JSON.parse(pub.snapshot);packets.push(encoder.encode(projectConfirmedHud(state,sequence)));}}finally{authority.dispose();}
const percentile=(values,p)=>{const a=[...values].sort((x,y)=>x-y);return a[Math.floor((a.length-1)*p)];};
function run(factory,collect=false){const decoder=factory({validate:validateConfirmedHudSchema}),times=[],outputs=[];let last;for(const packet of packets){const at=performance.now(),prepared=decoder.prepare(packet);last=prepared.commit();times.push(performance.now()-at);if(collect)outputs.push(last);}return {times,last,outputs};}
const a=run(baselineDecoder,true),b=run(currentDecoder,true);assert.deepEqual(a.outputs,b.outputs);let oldCount=0,newCount=0;const clone=globalThis.structuredClone;try{globalThis.structuredClone=(...args)=>{oldCount++;return clone(...args);};run(baselineDecoder);globalThis.structuredClone=(...args)=>{newCount++;return clone(...args);};run(currentDecoder);}finally{globalThis.structuredClone=clone;}
const samples={baseline:[],current:[]};for(const order of [['baseline','current'],['current','baseline'],['current','baseline'],['baseline','current']])for(const name of order){globalThis.gc?.();const runResult=run(name==='baseline'?baselineDecoder:currentDecoder);samples[name].push(...runResult.times.slice(1));}
const stats=values=>({count:values.length,mean:values.reduce((x,y)=>x+y,0)/values.length,p95:percentile(values,.95),p99:percentile(values,.99),max:Math.max(...values)});
console.log(JSON.stringify({baselineRevision,fixture:'sabana712-d6-native-multi-reservation',packets:packets.length,passes:4,clones:{baseline:oldCount,current:newCount},baseline:stats(samples.baseline),current:stats(samples.current),scope:'Archived isolated candidate; Node prepare+commit of identical recorded real WASM HUD packets, schema validation included; no browser, render, GPU or end-to-end frametime'},null,2));
