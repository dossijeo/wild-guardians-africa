// Read-only positive-path diagnostic. A failed bounded search is not enclosure proof.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {deserialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {raidWallEnvelope,exteriorRaidWitness} from '../src/simulation/raid-exterior-entry.js';
const [diagnostic,output]=process.argv.slice(2);
if(!diagnostic||!output||existsSync(output))throw Error('Requires entry diagnostic and fresh output');
const input=JSON.parse(readFileSync(diagnostic)),raw=readFileSync(input.input);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(raw),input.inputSha256);
const row=input.rows.find(r=>r.species.length===1&&r.species[0]==='warthog');
assert.ok(row?.cameraPoses[0]?.bodyClear);
const {point:start,radius}=row.cameraPoses[0],state=deserialize(gunzipSync(raw).toString());
const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[state.biome]}.json`)).profile;
const nav=new Navigation(state.seed,state.biome,profile);
nav.setState(state);nav.setActiveBounds(input.bounds);
const box=raidWallEnvelope(state,nav),active=input.bounds;
const bounds=[Math.min(active[0],box[0]-48),Math.min(active[1],box[1]-48),Math.max(active[2],box[2]+48),Math.max(active[3],box[3]+48)];
const ends=[{x:start.x,z:bounds[3]+radius+2},{x:start.x,z:bounds[1]-radius-2},{x:bounds[2]+radius+2,z:start.z},{x:bounds[0]-radius-2,z:start.z}]
 .sort((a,b)=>Math.hypot(a.x-start.x,a.z-start.z)-Math.hypot(b.x-start.x,b.z-start.z));
const rows=[];
for(const end of ends){
 const begin=performance.now(),bodyClear=nav.walkable(end.x,end.z,radius,null,false);
 const path=bodyClear?nav.approachPath(start,end,radius,16):null;
 const points=path?[start,...path]:[],segments=points.slice(1).map((p,i)=>nav.segmentClear(points[i],p,radius,null,false));
 const reachesEnd=points.length>1&&Math.hypot(points.at(-1).x-end.x,points.at(-1).z-end.z)<1e-7;
 const certified=bodyClear&&reachesEnd&&segments.every(Boolean)&&exteriorRaidWitness(end,radius,box,nav);
 rows.push({end,bodyClear,elapsedMs:performance.now()-begin,path,segments,reachesEnd,certified});
 console.log(JSON.stringify({end,bodyClear,elapsedMs:rows.at(-1).elapsedMs,points:points.length,certified}));
 if(certified)break;
}
assert.equal(sha(readFileSync(input.input)),input.inputSha256);
writeFileSync(output,JSON.stringify({input:input.input,inputSha256:input.inputSha256,day:state.day,start,radius,bounds,rows,
 scope:'At most four native animal detour searches on copied state; every route segment checked at real body radius. No spawning or relaxed collisions. Negative search results do not prove enclosure.'},null,2)+'\n');
