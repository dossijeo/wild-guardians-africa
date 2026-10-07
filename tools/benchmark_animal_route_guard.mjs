import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {deserialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as candidate from '../src/simulation/game.js';
const baseline=execFileSync('git',['show','75918f8:src/simulation/game.js'],{encoding:'utf8'});
const gameUrl=pathToFileURL(process.cwd()+'/src/simulation/game.js');
mkdirSync('.cache',{recursive:true});
writeFileSync('.cache/animal-route-reference.mjs',baseline.replace(/from (['"])(\.[^'"]+)\1/g,(_all,q,p)=>'from '+q+new URL(p,gameUrl).href+q));
const reference=await import(pathToFileURL(process.cwd()+'/.cache/animal-route-reference.mjs'));
const bytes=gunzipSync(readFileSync('docs/qa/paid-defense-failure-ee25c8c/failure-state.json.gz'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const samples=[];
for(let pair=0;pair<6;pair++){
 const row={};
 for(const name of pair%2?['candidate','reference']:['reference','candidate']){
  const s=deserialize(bytes.toString()),profile=JSON.parse(readFileSync('public/content/biome-'+BIOME_IDS[s.biome]+'.json')).profile;
  const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
  const a=s.raid.animals.find(a=>a.id==='animal-95773'),exit={...a.exit,id:'exit-'+a.id};
  const start=performance.now();
  for(let i=0;i<125;i++)(name==='candidate'?candidate:reference).walkTo(s,a,exit,.1,nav,{speed:3.8,worker:false,expandRoute:true,routeVia:a.spawn});
  row[name]={milliseconds:performance.now()-start,actorSha256:hash(JSON.stringify(a))};
 }
 assert.equal(row.candidate.actorSha256,row.reference.actorSha256,'Exact actor endpoint, retained route, gait and heading');samples.push(row);
}
const result={scope:'Six alternating pairs of 125 native walkTo steps (12.5 simulated seconds) on the recorded night39 stationary-body route regression. Setup, deserialization and hashes excluded. CPU diagnostic only; not GPU, frametime, phone or whole campaign.',referenceCommit:'75918f8',referenceGameSha256:hash(baseline),candidateHashes:Object.fromEntries(['src/simulation/game.js','src/simulation/animal-route-clearance.js'].map(p=>[p,hash(readFileSync(p))])),inputSha256:hash(bytes),samples};
writeFileSync('.cache/animal-route-guard-benchmark.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
