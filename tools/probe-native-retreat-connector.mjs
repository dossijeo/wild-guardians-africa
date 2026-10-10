// Read-only route diagnosis against a retained failed native campaign.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';

const input=process.argv[2];assert.ok(input,'Pass retained partial-state.json.gz');
const bytes=readFileSync(input),s=deserialize(gunzipSync(bytes).toString());
const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile;
const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
const before=serialize(s),actor=s.raid?.animals.find(a=>a.status==='retreating');
assert.ok(actor);const end=actor.exit??actor.spawn,radius=actor.radius;
const heading=Math.atan2(end.x-actor.x,end.z-actor.z),attempts=[];
let route=null;
const started=performance.now();
outer:for(const reach of [.5,1,2,4,8,16])for(let i=0;i<16;i++){
 const offset=i===0?0:Math.ceil(i/2)*(i%2?1:-1)*Math.PI/8;
 const point={x:actor.x+Math.sin(heading+offset)*reach,z:actor.z+Math.cos(heading+offset)*reach};
 if(!nav.walkable(point.x,point.z,radius,null,false)||!nav.segmentClear(actor,point,radius,null,false))continue;
 const start=performance.now(),path=nav.path(point,end,radius,null,false,64);
 attempts.push({reach,angleIndex:i,point,routeFound:!!path,pathPoints:path?.length??0,cpuMilliseconds:performance.now()-start});
 if(!path)continue;
 const candidate=[point,...path];let previous=actor,valid=true;
 for(const p of candidate){if(!nav.walkable(p.x,p.z,radius,null,false)||!nav.segmentClear(previous,p,radius,null,false)){valid=false;break;}previous=p;}
 attempts.at(-1).sweptValidation=valid;
 if(valid){assert.ok(Math.hypot(previous.x-end.x,previous.z-end.z)<1e-8);route=candidate;break outer;}
}
assert.equal(serialize(s),before,'Route diagnosis must not mutate game, RNG, ledger or actor');
assert.deepEqual(readFileSync(input),bytes,'Original snapshot remains unchanged');
console.log(JSON.stringify({input,snapshotSha256:createHash('sha256').update(bytes).digest('hex'),seed:s.seed,day:s.day,nativeResult:s.result,actorId:actor.id,origin:{x:actor.x,z:actor.z},exit:end,radius,search:actor.exitConnectorSearch&&{next:actor.exitConnectorSearch.next,visited:actor.exitConnectorSearch.fine?.visited,nodeCount:actor.exitConnectorSearch.fine?.nodeCount},attempts,route,cpuMilliseconds:performance.now()-started,scope:'Physical static route proposal only; no actor movement, raid completion, economic or GPU acceptance.'},null,2));
