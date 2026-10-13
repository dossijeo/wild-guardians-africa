// Replay one saved native tick in AB/BA order; no campaign or production edits.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../../src/world/navigation.js';
import {nativeCameraPose} from '../../src/rendering/terrain-camera.js';
import {activeChunkRegion} from '../../src/world/active-region.js';
import * as Game from '../../src/simulation/game.js';
import {installEnclosureAccessPrototype} from './enclosure-access-prototype.mjs';
import {installEnclosureRouteTree} from './enclosure-route-tree-prototype.mjs';
import {installSharedRegionPrototype} from './shared-region-prototype.mjs';
import {installSharedGoalField} from './shared-goal-field-prototype.mjs';
import {installSharedConnectivity} from './shared-connectivity-prototype.mjs';

const [input,output,secondsText='5',mode='access',runSet='abba']=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node benchmark-enclosure-access.mjs snapshot.json.gz output.json [seconds]');
const seconds=Number(secondsText),snapshot=gunzipSync(readFileSync(input)).toString('utf8');
const source=JSON.parse(snapshot);
const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[source.biome]}.json`,'utf8')).profile;
const rows=[];
for(const candidate of runSet==='candidate'?[true]:[false,true,true,false]){
  const s=deserialize(snapshot),nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
  const center=s.structures.find(x=>x.kind==='center');
  if(center){
    const pose=nativeCameraPose(nav.field,[center.x,0,center.z],nav.field.canyon?0:.5,nav.field.canyon?1.18:1.16,nav.field.canyon?34:38);
    nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);
    nav.setActiveBounds(activeChunkRegion({x:pose.eye[0],z:pose.eye[2]}).bounds);
  }
  const metrics={};if(candidate){
    if(mode==='region')installSharedRegionPrototype(nav,metrics);
    else if(mode==='shared-goals')installSharedGoalField(nav,metrics);
    else if(mode==='global-goals')installSharedGoalField(nav,metrics,true);
    else if(mode==='connectivity')installSharedConnectivity(nav,metrics);
    else if(mode==='shared-regions-tree'){
      metrics.region={};metrics.route={};
      installSharedConnectivity(nav,metrics.region);
      installEnclosureRouteTree(nav,metrics.route,false,true,false,true);
    }
    else if(mode==='region-goals-tree'){
      metrics.region={};metrics.route={};
      installSharedConnectivity(nav,metrics.region,true);
      installEnclosureRouteTree(nav,metrics.route,false,true,false,true,false,true);
    }
    else (['routes','negative','grid','adaptive','shared-tree','shared-tree-pruned','shared-incremental','shared-batched','adaptive-shared-incremental'].includes(mode)?installEnclosureRouteTree:installEnclosureAccessPrototype)(nav,metrics,mode==='negative',mode==='grid'||mode==='adaptive'||mode.startsWith('shared-')||mode==='adaptive-shared-incremental',mode==='adaptive'||mode==='adaptive-shared-incremental',mode.startsWith('shared-')||mode==='adaptive-shared-incremental',mode==='shared-tree-pruned',mode==='shared-incremental'||mode==='shared-batched'||mode==='adaptive-shared-incremental',mode==='shared-batched');
  }
  let searches=0,success=0,nativeSearches=0;const path=nav.approachPath.bind(nav),findSteps=nav.findPathSteps.bind(nav);
  nav.findPathSteps=(...args)=>{if(args[4]===false)nativeSearches++;return findSteps(...args);};
  nav.approachPath=(...args)=>{searches++;const value=path(...args);if(value)success++;return value;};
  const before=process.memoryUsage().rss,began=performance.now();Game.tick(s,seconds,nav);
  const milliseconds=performance.now()-began,hash=createHash('sha256').update(serialize(s)).digest('hex');
  const targets=s.raid?.animals.map(a=>({species:a.species,status:a.status,targetId:a.targetId,hitsRemaining:a.hitsRemaining}))??[];
  rows.push({variant:candidate?'candidate':'baseline',milliseconds,searches,nativeSearches,success,rssDeltaBytes:process.memoryUsage().rss-before,hash,metrics,targets});
  console.log(JSON.stringify({variant:candidate?'candidate':'baseline',milliseconds,searches,nativeSearches,success,metrics}));
}
const report={input,seconds,mode,runSet,day:source.day,time:source.time,biome:source.biome,plants:source.plants.length,living:source.plants.filter(p=>p.alive).length,sameState:rows.every(r=>r.hash===rows[0].hash),baselineDeterministic:rows.length===4?rows[0].hash===rows[3].hash:null,candidateDeterministic:rows.length===4?rows[1].hash===rows[2].hash:null,rows};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
if(rows.length===4&&(!report.baselineDeterministic||!report.candidateDeterministic))process.exitCode=2;
