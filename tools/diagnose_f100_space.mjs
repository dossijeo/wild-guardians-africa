// Bounded observations of the original terminal state. No ticks/game commands.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const frozen=resolve(process.argv[2]),dir=resolve(process.argv[3]);
const load=path=>import(pathToFileURL(resolve(frozen,path)).href);
const {deserialize,serialize}=await load('src/persistence/snapshots.js');
const {Navigation,BIOME_IDS}=await load('src/world/navigation.js');
const {centerServicePoint}=await load('src/world/centers.js');
const {activeChunkRegion}=await load('src/world/active-region.js');
const {cropSpec}=await load('src/simulation/rules.js');
const raw=readFileSync(resolve(frozen,'.cache/f100/gran-canon-saheliana-state.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const source='83b1c1eaa0235f9a9b34966f88b496f42eeb161b';
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:frozen,encoding:'utf8'}).trim(),source);
assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:frozen,encoding:'utf8'}).trim(),'');
const nativeAudit=JSON.parse(readFileSync(resolve(frozen,'.cache/f100/f100-native-terminal-audit.json')));
assert.equal(nativeAudit.source,source);assert.equal(nativeAudit.files['gran-canon-saheliana-state.json'],sha(raw));
const status=JSON.parse(readFileSync(resolve(frozen,'.cache/f100/gran-canon-saheliana-status.json')));
assert.equal(status.status,'passed');assert.equal(status.provenance.gitHead,source);
for(const [path,expected] of Object.entries(status.provenance.sourceHashes))assert.equal(sha(readFileSync(resolve(frozen,path))),expected,path);
assert.equal(sha(raw),'aa1c07343d598b5a5ea0da25465c571fe258df1069d1fc88e36fa632af44d31e');
const s=deserialize(raw.toString()),before=serialize(s),center=s.structures[0];
const profile=JSON.parse(readFileSync(resolve(frozen,'public/content/biome-'+BIOME_IDS[s.biome]+'.json'))).profile;
const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
const bounds=activeChunkRegion(center).bounds,grid=1.5,origin=centerServicePoint(center,s,.8);
const plots=[...new Map(s.plants.map(p=>[`${p.x},${p.z}`,{x:p.x,z:p.z}])).values()];
const living=s.plants.filter(p=>p.alive),occupied=new Set(living.map(p=>`${p.x},${p.z}`));
const histogram=(rows,key)=>rows.reduce((out,row)=>{const k=key(row);out[k]=(out[k]??0)+1;return out;},{});
const plants=new Map(s.plants.map(p=>[p.id,p]));
const endpoints=[];
for(const side of [1,3]){
 const row=plots.filter(p=>p.z===bounds[side]).sort((a,b)=>Math.abs(a.x-center.x)-Math.abs(b.x-center.x));
 for(const p of row.slice(0,2))endpoints.push({side:side===1?'south':'north',from:p,point:{x:p.x,z:p.z+(side===1?-grid:grid)}});
}
const probes=[];
for(const candidate of endpoints){
 const p=candidate.point,placement=nav.placement(p.x,p.z,.4),separated=!living.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<1.1);
 const outward=placement.valid&&separated?nav.path(origin,p,.28,null,true):null;
 const inward=outward?nav.path(p,origin,.28,null,true):null;
 probes.push({...candidate,outsideHarnessRectangle:p.z<bounds[1]||p.z>bounds[3],placement,separated,
  outward:outward?{points:outward.length,end:outward.at(-1)}:null,inward:inward?{points:inward.length,end:inward.at(-1)}:null,
  nativePlacementAndRoundtrip:Boolean(placement.valid&&separated&&outward&&inward)});
}
assert.equal(serialize(s),before,'Read-only observations must not change the terminal state');
assert.equal(sha(readFileSync(resolve(frozen,'.cache/f100/gran-canon-saheliana-state.json'))),sha(raw));
const harness=readFileSync(resolve(frozen,'tools/check_intensive_farm.mjs'),'utf8');
assert.ok(harness.includes("const species=nextSpecies();if(numberOf(s.ledger.balance)<labourReserve(1)+maintenanceReserve()+(defense?.reserve(s)??0)+cropSpec(species).plant_cost)return false;"));
assert.ok(harness.includes("candidateIndex>=candidates.length?'space':'budget'"));
// Truth-table diagnostic of the exact reporting expression, not a replacement
// strategy. Both labels count equally towards recorded whole-campaign idle.
const classificationCounterexamples=[
 {candidateExhausted:true,canAfford:false,actualAttemptFailure:'budget',frozenReason:'space'},
 {candidateExhausted:true,canAfford:true,freeAdmittedPlot:true,actualAttemptFailure:null,frozenReason:'active'},
 {candidateExhausted:false,canAfford:false,actualAttemptFailure:'budget',frozenReason:'budget'},
];
for(const row of classificationCounterexamples)if(row.actualAttemptFailure)assert.equal(row.frozenReason,row.candidateExhausted?'space':'budget');
const result={source,sourceHashesVerified:Object.keys(status.provenance.sourceHashes).length,gitTrackedClean:true,
 priorNativeTerminalAuditSha256:sha(readFileSync(resolve(frozen,'.cache/f100/f100-native-terminal-audit.json'))),snapshotSha256:sha(raw),snapshotUnchanged:true,
 bounds,grid,candidateCount:(Math.floor(bounds[2]/grid)-Math.ceil(bounds[0]/grid)+1)*(Math.floor(bounds[3]/grid)-Math.ceil(bounds[1]/grid)+1),
 admittedUniquePlots:plots.length,living:living.length,unoccupiedPreviouslyAdmitted:plots.filter(p=>!occupied.has(`${p.x},${p.z}`)).length,
 plotsTouchingEdges:histogram(plots,p=>p.z===bounds[1]?'south':p.z===bounds[3]?'north':'interior'),
 plantStates:histogram(living,p=>p.water[0].status==='due'?'initial-water-pending':p.growth>=cropSpec(p.species).growth_seconds?'mature':p.water.some(w=>w.status==='due')?'water-pending':'growing'),
 tasksByKind:histogram(s.tasks,t=>t.kind),tasksByReservation:histogram(s.tasks,t=>t.workerId?'reserved':'unreserved'),
 taskReservationField:{field:'workerId',defined:s.tasks.filter(t=>Object.hasOwn(t,'workerId')).length,null:s.tasks.filter(t=>t.workerId===null).length,
 contract:'src/simulation/tasks.js appendTask creates workerId:null and reserveTasks assigns workerId; all terminal tasks explicitly null, not inferred from missing field'},
 initialWaterTaxonomy:{priority:'first checkpoint status due, then maturity, then any other due checkpoint, then growing',
 firstDueWithNonzeroGrowth:living.filter(p=>p.water[0].status==='due'&&p.growth>0).length,
 firstDueAlsoMature:living.filter(p=>p.water[0].status==='due'&&p.growth>=cropSpec(p.species).growth_seconds).length},
 tasksByBlocked:histogram(s.tasks,t=>t.blocked?'blocked':'unblocked'),workerStatuses:histogram(s.workers,w=>w.status),
 centerAssignments:histogram(living,p=>p.centerId),unpaidCrates:s.crates.filter(c=>!c.delivered).length,
 harvestRequestedAlive:living.filter(p=>p.harvestRequested).length,probes,classificationCounterexamples,
 classificationScope:'Source-bound reporting counterexample only. Does not demonstrate frequency in this original campaign, reattribute recorded4257 space seconds, change total idle or modify strategy.',
 scope:'Four bounded native endpoint probes on exact terminal state, no tick/commands/new planting/cash/policy/domain changes. Demonstrates local legal expansion where roundtrip succeeds, not unlimited territory or historical opportunity duration. Snapshot service counts cannot reconstruct past route/FIFO utilization.'};
mkdirSync(dir,{recursive:true});writeFileSync(resolve(dir,'space-diagnosis.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
