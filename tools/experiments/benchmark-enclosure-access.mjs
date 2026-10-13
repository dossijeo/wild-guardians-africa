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

const [input,output,secondsText='5',mode='access']=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node benchmark-enclosure-access.mjs snapshot.json.gz output.json [seconds]');
const seconds=Number(secondsText),snapshot=gunzipSync(readFileSync(input)).toString('utf8');
const source=JSON.parse(snapshot);
const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[source.biome]}.json`,'utf8')).profile;
const rows=[];
for(const candidate of [false,true,true,false]){
  const s=deserialize(snapshot),nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
  const center=s.structures.find(x=>x.kind==='center');
  if(center){
    const pose=nativeCameraPose(nav.field,[center.x,0,center.z],nav.field.canyon?0:.5,nav.field.canyon?1.18:1.16,nav.field.canyon?34:38);
    nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);
    nav.setActiveBounds(activeChunkRegion({x:pose.eye[0],z:pose.eye[2]}).bounds);
  }
  const metrics={};if(candidate)(mode==='routes'||mode==='negative'?installEnclosureRouteTree:installEnclosureAccessPrototype)(nav,metrics,mode==='negative');
  let searches=0,success=0;const path=nav.approachPath.bind(nav);
  nav.approachPath=(...args)=>{searches++;const value=path(...args);if(value)success++;return value;};
  const before=process.memoryUsage().rss,began=performance.now();Game.tick(s,seconds,nav);
  const milliseconds=performance.now()-began,hash=createHash('sha256').update(serialize(s)).digest('hex');
  rows.push({variant:candidate?'candidate':'baseline',milliseconds,searches,success,rssDeltaBytes:process.memoryUsage().rss-before,hash,metrics});
  console.log(JSON.stringify({variant:candidate?'candidate':'baseline',milliseconds,searches,success,metrics}));
}
const report={input,seconds,mode,day:source.day,time:source.time,biome:source.biome,plants:source.plants.length,living:source.plants.filter(p=>p.alive).length,sameState:rows.every(r=>r.hash===rows[0].hash),rows};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
if(!report.sameState)process.exitCode=2;
