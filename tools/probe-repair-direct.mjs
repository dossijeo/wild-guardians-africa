import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {createOpeningWorld} from './check_opening.mjs';

const s=deserialize(gunzipSync(readFileSync(process.argv[2])).toString());
const {nav}=createOpeningWorld({seed:s.seed,biome:s.biome,culture:s.culture,terrainVersion:s.terrainVersion});nav.setState(s);
const w=s.workers.find(w=>w.id===process.argv[3]),target=s.structures.find(t=>t.id===process.argv[4]);
if(!w||!target)throw Error('Missing worker or target');
const radius=.28,clearance=.1,scale=target.gate?(target.material==='reforzado'?1.6:['adobe','piedra'].includes(target.material)?1.4:1):1;
const width=1.09*scale+radius+clearance,depth=.22+radius+clearance,c=Math.cos(target.yaw??0),sn=Math.sin(target.yaw??0);
const points=[[0,depth],[0,-depth],[width,0],[-width,0]].map(([x,z])=>({x:target.x+x*c+z*sn,z:target.z-x*sn+z*c}));
points.sort((a,b)=>Math.hypot(a.x-w.x,a.z-w.z)-Math.hypot(b.x-w.x,b.z-w.z));
console.log(JSON.stringify({worker:{id:w.id,x:w.x,z:w.z},target:{id:target.id,x:target.x,z:target.z,yaw:target.yaw},points:points.map((p,i)=>({index:i,x:p.x,z:p.z,walkable:nav.walkable(p.x,p.z,radius,null,true),direct:nav.segmentClear(w,p,radius,null,true)}))},null,2));
