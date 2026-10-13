// Run one retained native tick through two source trees in AB/BA order.
// This is QA-only and never changes production state or campaign decisions.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';

const args=Object.fromEntries(process.argv.slice(2).reduce((rows,arg,i,list)=>{if(i%2===0)rows.push([arg.replace(/^--/,''),list[i+1]]);return rows;},[]));
if(!args.snapshot||!args.referenceRoot||!args.out)throw Error('Use --snapshot FILE.gz --referenceRoot DIR --out FILE.json');
const seconds=Number(args.seconds??1);
if(!Number.isFinite(seconds)||seconds<=0||seconds>10)throw Error('Invalid --seconds');
const snapshot=gunzipSync(readFileSync(resolve(args.snapshot))).toString('utf8'),state=JSON.parse(snapshot);
const roots={reference:resolve(args.referenceRoot),candidate:fileURLToPath(new URL('../',import.meta.url))};
const loaded={};
for(const [name,root] of Object.entries(roots)){
 const load=path=>import(pathToFileURL(resolve(root,path)).href);
 loaded[name]={Game:await load('src/simulation/game.js'),nav:await load('src/world/navigation.js'),persistence:await load('src/persistence/snapshots.js'),camera:await load('src/rendering/terrain-camera.js'),region:await load('src/world/active-region.js')};
}
const profile=JSON.parse(readFileSync(resolve(roots.candidate,`public/content/biome-${loaded.candidate.nav.BIOME_IDS[state.biome]}.json`),'utf8')).profile;
const rows=[];
for(const name of ['reference','candidate','candidate','reference']){
 const impl=loaded[name],s=impl.persistence.deserialize(snapshot),nav=new impl.nav.Navigation(s.seed,s.biome,profile);
 nav.setState(s);
 if(args.cameraEntry==='yes'){
  const center=s.structures.find(t=>t.kind==='center'),pose=impl.camera.nativeCameraPose(nav.field,[center.x,0,center.z],nav.field.canyon?0:.5,nav.field.canyon?1.18:1.16,nav.field.canyon?34:38);
  nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);nav.setActiveBounds(impl.region.activeChunkRegion({x:pose.eye[0],z:pose.eye[2]}).bounds);
 }
 const before=process.memoryUsage().rss,start=performance.now();
 impl.Game.tick(s,seconds,nav);
 const milliseconds=performance.now()-start,serialized=impl.persistence.serialize(s);
 rows.push({name,milliseconds,rssDeltaBytes:process.memoryUsage().rss-before,hash:createHash('sha256').update(serialized).digest('hex'),day:s.day,time:s.time,raid:!!s.raid});
}
const sameState=rows.every(r=>r.hash===rows[0].hash);
const report={snapshot:resolve(args.snapshot),roots,seconds,cameraEntry:args.cameraEntry==='yes',sourceState:{day:state.day,time:state.time,seed:state.seed,biome:state.biome,structures:state.structures.length,plants:state.plants.length,livingPlants:state.plants.filter(p=>p.alive).length,animals:state.raid?.animals.length??0},sameState,rows};
writeFileSync(resolve(args.out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({sameState,rows}));
if(!sameState)process.exitCode=2;
