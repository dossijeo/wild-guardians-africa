import fs from 'node:fs';import z from 'node:zlib';import {createHash} from 'node:crypto';import {performance} from 'node:perf_hooks';import assert from 'node:assert/strict';
import {fixture} from './probe-raid-reservation-saturation.mjs';import {spawnRaid,updateRaid} from '../src/simulation/raids.js';
const out=process.argv[2];if(!out)throw Error('Fresh output prefix required');
const rows=[],hash=s=>createHash('sha256').update(JSON.stringify(s)).digest('hex'),started=performance.now();
for(const [layout,count] of [['mono',1],['mono',2],['mono',5],['mono',12],['closed-walls',12],['center-only',12]]){
 const {s,nav}=fixture(layout);
 // Existing fixture uses a random save-slot UUID. Fix only that QA identity
 // before spawning, otherwise independent runs cannot have matching state hashes.
 s.slotId=`hostile-scene-${layout}-${count}`;
 assert(spawnRaid(s,{group:Array(count).fill('warthog')},nav));const initialState=JSON.stringify(s),inputHash=hash(s),trace=[];
 for(let step=0;step<=4000&&s.raid;step++){
  if(step)s.elapsed+=.1;updateRaid(s,step?.1:0,nav);trace.push(hash(s));
 }
 const result={layout,count,initialState,inputHash,ended:s.raid===null,trace,finalHash:hash(s)};rows.push(result);console.log(JSON.stringify({...result,initialState:undefined,trace:undefined,steps:trace.length}));
}
fs.writeFileSync(out+'.json.gz',z.gzipSync(JSON.stringify({scope:'Native raid updates and collisions on existing flat-terrain fixture; full state hash after every update; not a procedural campaign or rendering benchmark',node:process.version,execArgv:process.execArgv,msIncludingHashing:performance.now()-started,rows})),{flag:'wx'});
