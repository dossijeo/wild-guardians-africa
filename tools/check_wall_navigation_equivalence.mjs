import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createOpeningWorld} from './check_opening.mjs';
import {centerServicePoint} from '../src/world/centers.js';

const reference=process.argv[2]??'f63d82db',output=process.argv[3];assert.ok(output,'Output path required');
const source=execFileSync('git',['show',reference+':src/world/navigation.js'],{encoding:'utf8'});
const resolved=source.replace(/from '(\.\/[^']+)'/g,(_match,path)=>`from '${new URL('../src/world/'+path,import.meta.url).href}'`);
const {Navigation:Before}=await import('data:text/javascript;base64,'+Buffer.from(resolved).toString('base64'));
const rows=[],trajectory=createHash('sha256');let found=0,blocked=0;
for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon','desierto']){
 const {s,nav}=createOpeningWorld({seed:712,biome,culture:'mapungubwe',slotId:'wall-equivalence'});
 const before=new Before(712,biome,nav.profile),center=s.structures[0],origin=centerServicePoint(center,s,.8);
 const wall=(id,dz,material,gate=false)=>({id,kind:'wall',x:origin.x+3,z:origin.z+dz,yaw:Math.PI/2,material,baseScaleX:1,gate,status:'intact'});
 const walls=[wall('qa-a',-2,'madera'),wall('qa-b',0,'adobe',true),wall('qa-c',2,'reforzado')];
 for(const stage of ['mixed','edited-gap','rebuilt']){
  if(stage==='mixed')s.structures.push(...walls);
  if(stage==='edited-gap'){walls[1].status='ruined';walls[0].yaw+=.25;walls[2].baseScaleX=.8;}
  if(stage==='rebuilt'){walls[1].status='intact';walls[1].material='piedra';walls[2].x+=.4;}
  // Snapshot synchronization is deliberately identical; no edits to live games.
  before.setState(structuredClone(s));nav.setState(s);
  for(const worker of [true,false])for(const radius of [.28,.6])for(const dz of [-2.5,2.5]){
   const from={x:origin.x-.5,z:origin.z+dz},to={x:origin.x+7,z:origin.z-dz};
   const a=before.path(from,to,radius,null,worker),b=nav.path(from,to,radius,null,worker);
   assert.deepEqual(b,a,`${biome}/${stage}/${worker}/${radius}/${dz}`);
   if(b){found++;let last=from;for(const p of b){assert.ok(nav.segmentClear(last,p,radius,null,worker));last=p;}}else blocked++;
   const row={biome,stage,worker,radius,from,to,path:b};rows.push(row);trajectory.update(JSON.stringify(row)+'\n');
  }
  // Include a positive native control even where all wall-crossing endpoints
  // are unreachable (e.g. the narrow canyon). Keep the actual terrain/props.
  for(const worker of [true,false]){
   let pair;
   search:for(let dz=-15;dz<=15;dz++)for(let dx=-15;dx<=15;dx++){
    const from={x:origin.x+dx,z:origin.z+dz},to={x:from.x+.25,z:from.z};
    if(nav.walkable(from.x,from.z,.28,null,worker)&&nav.walkable(to.x,to.z,.28,null,worker)&&nav.segmentClear(from,to,.28,null,worker)){pair={from,to};break search;}
   }
   assert.ok(pair,`${biome}: positive native control unavailable`);
   const a=before.path(pair.from,pair.to,.28,null,worker),b=nav.path(pair.from,pair.to,.28,null,worker);
   assert.ok(b);assert.deepEqual(b,a);found++;
   const row={biome,stage,worker,radius:.28,...pair,path:b,control:true};rows.push(row);trajectory.update(JSON.stringify(row)+'\n');
  }
  console.log(JSON.stringify({biome,stage,comparisons:rows.length,found,blocked}));
 }
}
assert.ok(found>0);assert.ok(blocked>0);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
writeFileSync(output,JSON.stringify({reference,seed:712,culture:'mapungubwe',baselineSourceSha256:sha(source),candidateNavigationSha256:sha(readFileSync('src/world/navigation.js')),candidateFrameSha256:sha(readFileSync('src/world/wall-collision-frame.js')),comparisons:rows.length,found,blocked,trajectorySha256:trajectory.digest('hex'),rows,scope:'Exact native domain routes across six biomes and three synthetic mixed-wall edit stages. Includes worker/animal semantics and two radii; no timing, rendered/mobile acceptance, automatic-gate generation or 100-night campaign claim.'},null,2)+'\n');
