// Offline read-only diagnosis. Never used in production or campaign actions.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {SearchFrontier} from '../src/world/search-frontier.js';
const input=process.argv[2];assert.ok(input);
const bytes=readFileSync(input),s=deserialize(gunzipSync(bytes).toString()),original=serialize(s);
const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile;
const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
const a=s.raid.animals.find(a=>a.status==='retreating');assert.ok(a);
const end=a.exit,r=a.radius,key=(i,j)=>`${i},${j}`,results=[];
const started=performance.now();
for(const spacing of [.25,.125]){
 const open=new SearchFrontier(),costs=new Map([['0,0',0]]),previous=new Map(),point=(i,j)=>({x:a.x+i*spacing,z:a.z+j*spacing});
 open.push({i:0,j:0,g:0,f:Math.hypot(end.x-a.x,end.z-a.z)});
 let visited=0,route=null,joined=null;
 while(open.length&&visited<8192){
  const cur=open.pop(),k=key(cur.i,cur.j);if(cur.g>costs.get(k))continue;visited++;
  const here=point(cur.i,cur.j);
  let suffix=nav.segmentClear(here,end,r,null,false)?[{...end}]:null;
  if(!suffix&&visited%16===0)suffix=nav.path(here,end,r,null,false,64);
  if(suffix){
   route=[...suffix];joined=here;let cursor=k;
   while(cursor!=='0,0'){const [i,j]=cursor.split(',').map(Number);route.unshift(point(i,j));cursor=previous.get(cursor);}
   let last=a;for(const p of route){assert.ok(nav.walkable(p.x,p.z,r,null,false));assert.ok(nav.segmentClear(last,p,r,null,false));last=p;}
   assert.deepEqual(last,end);break;
  }
  for(let di=-1;di<=1;di++)for(let dj=-1;dj<=1;dj++){
   if(!di&&!dj)continue;
   const i=cur.i+di,j=cur.j+dj;if(Math.abs(i*spacing)>32||Math.abs(j*spacing)>32)continue;
   const nk=key(i,j),g=cur.g+Math.hypot(di,dj)*spacing;if(g>=(costs.get(nk)??Infinity))continue;
   const p=point(i,j);if(!nav.walkable(p.x,p.z,r,null,false)||!nav.segmentClear(here,p,r,null,false))continue;
   costs.set(nk,g);previous.set(nk,k);open.push({i,j,g,f:g+Math.hypot(end.x-p.x,end.z-p.z)});
  }
 }
 results.push({spacing,visited,nodes:costs.size,frontier:open.length,joined,route});if(route)break;
}
assert.equal(serialize(s),original);assert.deepEqual(readFileSync(input),bytes);
console.log(JSON.stringify({snapshotSha256:createHash('sha256').update(bytes).digest('hex'),actorId:a.id,radius:r,origin:{x:a.x,z:a.z},exit:end,originWalkable:nav.walkable(a.x,a.z,r,null,false),results,cpuMilliseconds:performance.now()-started,scope:'Offline bounded static fine-lattice diagnosis with original native sweeps. No movement, campaign, collision relaxation or performance acceptance.'},null,2));
