// QA-only: inspect the first animal approach in a retained breached checkpoint.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {deserialize} from '../../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../../src/world/navigation.js';
import {nativeCameraPose} from '../../src/rendering/terrain-camera.js';
import {activeChunkRegion} from '../../src/world/active-region.js';
import {gatePortalPoints} from '../../src/world/gate-passages.js';
import * as Game from '../../src/simulation/game.js';
import {breachPortalTable} from './breach-portal-prototype.mjs';

const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node probe-breach-portal.mjs snapshot.json.gz output.json');
const s=deserialize(gunzipSync(readFileSync(input)).toString('utf8'));
const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[s.biome]}.json`,'utf8')).profile;
const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
const center=s.structures.find(x=>x.kind==='center'),pose=nativeCameraPose(nav.field,[center.x,0,center.z],nav.field.canyon?0:.5,nav.field.canyon?1.18:1.16,nav.field.canyon?34:38);
nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);
nav.setActiveBounds(activeChunkRegion({x:pose.eye[0],z:pose.eye[2]}).bounds);
const breaches=s.structures.filter(w=>w.kind==='wall'&&w.status==='ruined'&&w.gate);
const portalTable=breachPortalTable(nav);
const old=nav.approachPath.bind(nav),samples=[],stop=Symbol('probe complete');
nav.approachPath=(actor,destination,radius,...args)=>{
  const key=`${actor.x},${actor.z},${radius}`;
  if(!samples.some(x=>x.key===key)){
    const options=[];
    for(const gate of breaches){
      // A ruined gate has no frame; its old intact-gate portal is inapplicable.
      // Probe the actual gap and both sides against current native collisions.
      const c=Math.cos(gate.yaw??0),sn=Math.sin(gate.yaw??0),offset=radius+1.5;
      const sides=[{x:gate.x-sn*offset,z:gate.z-c*offset},{x:gate.x+sn*offset,z:gate.z+c*offset}];
      options.push({gateId:gate.id,kind:'physical-gap',centerWalkable:nav.walkable(gate.x,gate.z,radius,null,false),sideWalkable:sides.map(p=>nav.walkable(p.x,p.z,radius,null,false)),acrossClear:nav.segmentClear(sides[0],sides[1],radius,null,false),oldGatePortals:gatePortalPoints(gate,radius).length});
      for(const [side,point] of sides.entries()){
      const began=performance.now(),walkable=nav.walkable(point.x,point.z,radius,null,false);
      const path=walkable?nav.path(actor,point,radius,null,false,64):null;
      options.push({gateId:gate.id,side,point,walkable,route:!!path,waypoints:path?.length??0,milliseconds:performance.now()-began});
      }
    }
    samples.push({key,actor:{x:actor.x,z:actor.z},radius,destination:{x:destination.x,z:destination.z},breachOptions:options});
  }
  if(samples.length>=5)throw stop;
  return old(actor,destination,radius,...args);
};
try{Game.tick(s,5,nav);}catch(error){if(error!==stop)throw error;}
const gapProfiles=breaches.map(gate=>({gateId:gate.id,radii:[.4,.7,1.1,1.5].map(radius=>{
  const c=Math.cos(gate.yaw??0),sn=Math.sin(gate.yaw??0),offset=radius+1.5;
  const sides=[{x:gate.x-sn*offset,z:gate.z-c*offset},{x:gate.x+sn*offset,z:gate.z+c*offset}];
  return {radius,centerWalkable:nav.walkable(gate.x,gate.z,radius,null,false),sideWalkable:sides.map(p=>nav.walkable(p.x,p.z,radius,null,false)),acrossClear:nav.segmentClear(sides[0],sides[1],radius,null,false)};
})}));
const report={input,day:s.day,time:s.time,breaches:breaches.map(w=>({id:w.id,x:w.x,z:w.z,gate:w.gate})),portalTable,gapProfiles,samples};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
