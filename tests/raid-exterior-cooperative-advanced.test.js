import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation} from '../src/world/navigation.js';
import {wallLayout,WALL_UNIT} from '../src/world/wall-layout.js';
import {boundaryEdges as originalEdges} from './fixtures/native-boundary-81943608/boundary-gates.js';
import {boundaryFaces as originalFaces} from './fixtures/native-boundary-81943608/boundary-faces.js';
import {RaidExteriorPrewarmer,CANONICAL_RAID_RADII} from '../src/world/raid-exterior-prewarming.js';
import {createRaidExteriorQuery,raidExteriorDiagnostics} from '../src/world/raid-exterior.js';
const source=new URL('../docs/qa/horde-self-consistent-pilot-e040ea6f-20/native-original/responsible/state.json.gz',import.meta.url),bytes=readFileSync(source),profile=JSON.parse(readFileSync(new URL('../public/content/biome-canyons.json',import.meta.url))).profile;
function fixture(){const s=deserialize(gunzipSync(bytes).toString()),nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);return {s,nav};}
function baseline(s,nav,radius){const layout=wallLayout(s.structures,{}),pieces=layout.pieces.filter(p=>p.hp>0&&!p.collapse),edges=originalEdges({...layout,pieces},nav,{radius,worker:false}),virtual=edges.map(([a,b],i)=>({id:-i-1,hp:1,x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,angle:Math.atan2(b[1]-a[1],b[0]-a[0]),scaleX:Math.hypot(b[0]-a[0],b[1]-a[1])/WALL_UNIT})),ids=new Set(pieces.map(p=>p.id));return originalFaces([...pieces,...virtual]).filter(f=>f.ids.some(id=>ids.has(id))).map(f=>f.polygon.map(([x,z])=>({x,z})));}
test('advanced no-worker canonical prewarming: resumable native work, exact frozen819 polygons, measured indivisible cold risk',()=>{
 const {s,nav}=fixture(),before=serialize(s),prewarmer=new RaidExteriorPrewarmer(nav,{createWorker:()=>null}),started=performance.now();prewarmer.update(s);let pumps=0;
 while(prewarmer.status==='working'&&pumps++<20000)prewarmer.pump({maxSteps:128,maxMillis:2});const cooperativeTotalMs=performance.now()-started;assert.equal(prewarmer.status,'prepared',prewarmer.lastError);assert.equal(serialize(s),before);assert.deepEqual(raidExteriorDiagnostics(nav),{builds:0,adoptions:1});
 const reference=fixture(),baselineStarted=performance.now(),counts=[];
 for(const radius of CANONICAL_RAID_RADII){const polygons=baseline(reference.s,reference.nav,radius);assert.deepEqual(createRaidExteriorQuery(s,nav).regionsFor(radius),polygons);counts.push({radius,regions:polygons.length});}
 const baselineAllRadiiMs=performance.now()-baselineStarted;assert.equal(raidExteriorDiagnostics(nav).builds,0);
 console.log(JSON.stringify({scope:'single descriptive CPU observation over5canonical radii, tight test driver with no RAF spacing; not GPU/frametime/deadline or before-after performance acceptance',originalGzipSHA256:createHash('sha256').update(bytes).digest('hex'),walls:103,livingCrops:865,counts,pumps,cooperativeTotalMs,baselineAllRadiiMs,stats:prewarmer.stats,productionReady:false}));prewarmer.dispose();
});
