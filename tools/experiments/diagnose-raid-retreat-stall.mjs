import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../../src/world/navigation.js';
import {animalLocalRetreatExit} from '../../src/simulation/animal-local-retreat-exit.js';

const file=process.argv[2]??new URL('../../tests/fixtures/raid-retreat-day15.json.gz',import.meta.url);
const bytes=readFileSync(file),s=deserialize(gunzipSync(bytes).toString('utf8'));
const before=serialize(s);
const profile=JSON.parse(readFileSync(new URL(`../../public/content/biome-${BIOME_IDS[s.biome]}.json`,import.meta.url),'utf8')).profile;
const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
const a=s.raid.animals.find(a=>a.status==='retreating');
if(!a)throw Error('No stranded retreating animal');
const farm=[...s.plants.filter(p=>p.alive),...s.structures.filter(x=>x.status==='intact')];
const bounds={minX:Math.min(...farm.map(x=>x.x)),maxX:Math.max(...farm.map(x=>x.x)),minZ:Math.min(...farm.map(x=>x.z)),maxZ:Math.max(...farm.map(x=>x.z))};
const candidates=[a.exit,a.spawn,...[-.75,-.5,-.25,0,.25,.5,.75].map(d=>({x:a.x+8,z:a.z+d*8}))];
const results=[];
const nearbyReachable=[];
for(const radius of [.25,.5,1,2,4])for(let i=0;i<16;i++){
 const angle=i*Math.PI/8,p={x:a.x+Math.sin(angle)*radius,z:a.z+Math.cos(angle)*radius};
 if(nav.walkable(p.x,p.z,a.radius,null,false)&&nav.segmentClear(a,p,a.radius,null,false))nearbyReachable.push({radius,angleIndex:i,point:p});
}
for(const p of candidates){
 const started=performance.now(),walkable=nav.walkable(p.x,p.z,a.radius,null,false),segmentClear=nav.segmentClear(a,p,a.radius,null,false);
 const path=walkable?nav.path(a,p,a.radius,null,false,32):null;
 results.push({point:p,walkable,segmentClear,pathLength:path?.length??null,milliseconds:performance.now()-started});
}
console.log(JSON.stringify({inputSha256:createHash('sha256').update(bytes).digest('hex'),stateSha256:createHash('sha256').update(before).digest('hex'),
 actor:{id:a.id,x:a.x,z:a.z,radius:a.radius,status:a.status,exit:a.exit,spawn:a.spawn,
  terrainValid:nav.terrainValid(a.x,a.z,a.radius,false),walkable:nav.walkable(a.x,a.z,a.radius,null,false),
  nearStructures:s.structures.filter(o=>Math.hypot(o.x-a.x,o.z-a.z)<5).map(o=>({id:o.id,kind:o.kind,x:o.x,z:o.z,status:o.status})),
  nearProps:nav.propsAt(a.x,a.z,5).map(p=>({id:p.id,x:p.x,z:p.z,radius:p.radius,slot:p.slot}))},
 bounds,results,nearbyReachable,localExit:animalLocalRetreatExit(s,a,nav),stateUnchanged:serialize(s)===before},null,2));
