// Body/contact diagnostics only; no failed route is interpreted as enclosure.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {agriculturalRayClear} from '../src/simulation/raid-agricultural-impact.js';
import {containsPoint} from '../src/world/footprints.js';
import * as Game from '../src/simulation/game.js';
const [snapshotPath,reportPath,indexText,output]=process.argv.slice(2),index=Number(indexText);
assert(snapshotPath&&reportPath&&output&&!existsSync(output)&&Number.isSafeInteger(index)&&index>=0);
const hash=b=>createHash('sha256').update(b).digest('hex'),snapshot=readFileSync(snapshotPath),reportBytes=readFileSync(reportPath),report=JSON.parse(reportBytes),attempt=report.attempts[index];assert(attempt?.points);
assert.equal(snapshotPath,report.snapshotPath,'Snapshot does not match retained functional report');
const s=deserialize(gunzipSync(snapshot).toString('utf8')),before=serialize(s),profilePath='public/content/biome-'+BIOME_IDS[s.biome]+'.json';
const nav=new Navigation(s.seed,s.biome,JSON.parse(readFileSync(profilePath)).profile);nav.setState(s);
const quote=Game.quoteWallChain(s,'zarzas',attempt.points,nav,{smooth:false,snap:false});assert.equal(quote.cost,attempt.cost);
const view=nav.forBuildingPlacement({id:'qa-empty',x:1e12,z:1e12,radius:0,kind:'house'}),updates=new Map(quote.updates.map(p=>[p.id,p]));
view.obstacles=[...nav.obstacles.map(p=>updates.has(p.id)?{...p,...updates.get(p.id)}:p),...quote.pieces];
const polygon=attempt.points.map(([x,z])=>({x,z})),radii=[...new Set(Object.values(ANIMAL_ACTIONS.animals).map(a=>a.presentation.footprint.radius))],rows=[];
for(const radius of radii){
 const poses=[],crops=s.plants.filter(p=>p.alive);
 for(const crop of crops)for(let i=0;i<32;i++){
  const angle=i*Math.PI/16,point={x:crop.x+Math.sin(angle)*(.6+radius),z:crop.z+Math.cos(angle)*(.6+radius)};
  if(view.walkable(point.x,point.z,radius,null,false)&&agriculturalRayClear(s,view,point,crop))poses.push({targetId:crop.id,...point,insideOutline:containsPoint(polygon,point.x,point.z)});
 }
 rows.push({radius,bodyValidCropPivots:crops.filter(p=>view.walkable(p.x,p.z,radius,null,false)).length,
  contactPoses:poses.length,insideContactPoses:poses.filter(p=>p.insideOutline).length,outsideContactPoses:poses.filter(p=>!p.insideOutline).length,poses});
}
assert.equal(serialize(s),before);assert.equal(hash(readFileSync(snapshotPath)),hash(snapshot));
const sources=['tools/probe-native-animal-crop-poses.mjs','src/world/navigation.js','src/simulation/raid-agricultural-impact.js','src/simulation/animal-actions-data.js',profilePath];
const result={snapshotPath,snapshotSha256:hash(snapshot),reportPath,reportSha256:hash(reportBytes),index,stateUnchanged:true,
 sourceHashes:Object.fromEntries(sources.map(p=>[p,hash(readFileSync(p))])),rows,
 scope:'32 exact body/contact poses per crop/radius with hypothetical quoted obstacles. No reachability, enclosure certificate, paid walls, attacks, damage, economic outcome or performance acceptance.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(rows.map(({poses,...r})=>r)));
