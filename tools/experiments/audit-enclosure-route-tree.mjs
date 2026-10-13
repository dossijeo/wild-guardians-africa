// QA-only paired audit: compare route existence at identical requests, but
// accept different paths when every segment obeys native animal collision.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../../src/world/navigation.js';
import {nativeCameraPose} from '../../src/rendering/terrain-camera.js';
import {activeChunkRegion} from '../../src/world/active-region.js';
import * as Game from '../../src/simulation/game.js';
import {installEnclosureRouteTree} from './enclosure-route-tree-prototype.mjs';

const [input,output,secondsText='5',mode='routes']=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node audit-enclosure-route-tree.mjs snapshot.json.gz output.json [seconds]');
const snapshot=gunzipSync(readFileSync(input)).toString('utf8');
const source=JSON.parse(snapshot),s=deserialize(snapshot);
const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[s.biome]}.json`,'utf8')).profile;
const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
const center=s.structures.find(x=>x.kind==='center');
if(center){
  const pose=nativeCameraPose(nav.field,[center.x,0,center.z],nav.field.canyon?0:.5,nav.field.canyon?1.18:1.16,nav.field.canyon?34:38);
  nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);
  nav.setActiveBounds(activeChunkRegion({x:pose.eye[0],z:pose.eye[2]}).bounds);
}
const native=nav.approachPath.bind(nav),metrics={};
installEnclosureRouteTree(nav,metrics,false,mode==='grid');
const tree=nav.approachPath.bind(nav),rows=[],totals={calls:0,nativeOnly:0,treeOnly:0,both:0,neither:0,invalidTree:0,invalidNative:0};
function valid(route,start,end,radius){
  if(!route)return null;
  let from=start;
  for(let i=0;i<route.length;i++){
    const to=route[i];
    if(!Number.isFinite(to.x)||!Number.isFinite(to.z)||!nav.walkable(to.x,to.z,radius,null,false)||!nav.segmentClear(from,to,radius,null,false))return {segment:i,from,to};
    from=to;
  }
  return Math.hypot(from.x-end.x,from.z-end.z)<1e-5?null:{segment:'end',from,to:end};
}
nav.approachPath=(start,end,radius,margin=32)=>{
  const old=native(start,end,radius,margin),candidate=tree(start,end,radius,margin);
  totals.calls++;
  const oldError=valid(old,start,end,radius),treeError=valid(candidate,start,end,radius);
  if(oldError)totals.invalidNative++;
  if(treeError)totals.invalidTree++;
  const category=old?(candidate?'both':'nativeOnly'):(candidate?'treeOnly':'neither');totals[category]++;
  if((category==='nativeOnly'||category==='treeOnly'||treeError)&&rows.length<80)rows.push({category,start:{x:start.x,z:start.z},end:{x:end.x,z:end.z},radius,margin,nativeWaypoints:old?.length??0,treeWaypoints:candidate?.length??0,treeError});
  return candidate;
};
const begin=performance.now();Game.tick(s,Number(secondsText),nav);
const report={input,seconds:Number(secondsText),mode,day:source.day,time:source.time,biome:source.biome,milliseconds:performance.now()-begin,totals,metrics,examples:rows,stateHash:createHash('sha256').update(serialize(s)).digest('hex')};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({milliseconds:report.milliseconds,totals,metrics,examples:rows.slice(0,5),stateHash:report.stateHash}));
if(totals.invalidTree)process.exitCode=2;
