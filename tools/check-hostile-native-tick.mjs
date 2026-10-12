import fs from 'node:fs';import z from 'node:zlib';import {createHash} from 'node:crypto';import {performance} from 'node:perf_hooks';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';import * as Game from '../src/simulation/game.js';
const mode=process.argv[2],out=process.argv[3],trace=process.argv.includes('--trace');if(!['baseline','candidate'].includes(mode)||!out)throw Error('Pass baseline|candidate and a fresh output prefix');
const raw=z.gunzipSync(fs.readFileSync(new URL('../docs/qa/hostile-approach-cache/normal-mid-query.json.gz',import.meta.url))),captured=JSON.parse(raw),state=structuredClone(captured.state);
const nav=new Navigation(state.seed,state.biome,JSON.parse(fs.readFileSync('public/content/biome-'+BIOME_IDS[state.biome]+'.json')).profile);nav.setState(state);nav.setActiveBounds(captured.activeBounds);
if(mode==='baseline')nav.approachPath=function(start,end,radius,margin){const reverse=this.path(end,start,radius,null,false,margin);return reverse?[...reverse.slice(0,-1).reverse(),{x:end.x,z:end.z}]:null;};
let approachCalls=0;
if(trace){const original=nav.approachPath;nav.approachPath=function(...args){const n=++approachCalls,t=performance.now(),route=original.apply(this,args);if(n<4||n%100===0)console.log(JSON.stringify({calls:n,ms:performance.now()-t,animal:args[0].id,radius:args[2],point:args[1],route:!!route,regions:this.searchedRegions.map(r=>({nodes:r.nodes.size,verified:r.incomingVerified,bounds:[r.minX,r.minZ,r.maxX,r.maxZ]}))}));return route;};}
const hash=s=>createHash('sha256').update(s).digest('hex');
fs.writeFileSync(out+'-started.json',JSON.stringify({mode,pid:process.pid,startedAt:new Date().toISOString(),scope:'Independent single native 0.05s tick from retained mid-tick diagnostic clone; not a campaign continuation',snapshotHash:hash(raw)},null,2),{flag:'wx'});
const before=JSON.stringify(state),at=performance.now();Game.tick(state,.05,nav);const ms=performance.now()-at,after=JSON.stringify(state);
const result={mode,ms,...(trace?{approachCalls}:{}),inputHash:hash(before),outputHash:hash(after),day:state.day,time:state.time,rng:state.rng,eventsBefore:JSON.parse(before).events.length,eventsAfter:state.events.length,animals:state.raid?.animals.map(a=>({id:a.id,status:a.status,targetId:a.targetId,approach:a.approach,reservation:a.reservation,hitsRemaining:a.hitsRemaining})),memoryAtEnd:process.memoryUsage()};
fs.writeFileSync(out+'-state.json.gz',z.gzipSync(after),{flag:'wx'});fs.writeFileSync(out+'.json',JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));
