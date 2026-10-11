// Read-only local crossing witnesses; never moves actors or repairs structures.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
const input=process.argv[2];assert.ok(input,'Pass a retained compressed native snapshot');
const bytes=readFileSync(input),s=deserialize(gunzipSync(bytes).toString()),before=serialize(s);
const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile;
const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
const radii=[...new Set((s.raid?.animals??[]).map(a=>a.radius))],probes=[];
for(const wall of s.structures.filter(w=>w.kind==='wall'&&w.status==='ruined'))for(const radius of radii){
 const distance=radius+1,dx=Math.sin(wall.yaw)*distance,dz=Math.cos(wall.yaw)*distance;
 const from={x:wall.x+dx,z:wall.z+dz},to={x:wall.x-dx,z:wall.z-dz};
 const fromWalkable=nav.walkable(from.x,from.z,radius,null,false),toWalkable=nav.walkable(to.x,to.z,radius,null,false);
 probes.push({wallId:wall.id,gate:wall.gate,hp:wall.hp,radius,from,to,fromWalkable,toWalkable,
  segmentClear:!!(fromWalkable&&toWalkable&&nav.segmentClear(from,to,radius,null,false))});
}
assert.equal(serialize(s),before,'Probe changed native state');assert.deepEqual(readFileSync(input),bytes);
console.log(JSON.stringify({input,snapshotSha256:createHash('sha256').update(bytes).digest('hex'),
 sourceSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
 day:s.day,time:s.time,raidId:s.raid?.id,stateUnchanged:true,ruinedWalls:s.structures.filter(w=>w.kind==='wall'&&w.status==='ruined').length,
 clearWitnesses:probes.filter(p=>p.segmentClear).length,probes,
 scope:'Static full-radius native terrain/structure crossing witnesses at ruined pieces. Does not prove a particular animal used a segment, global enclosure, pre-impact capture, or protection. No state, RNG, ledger, clock or collision changes.'},null,2));
