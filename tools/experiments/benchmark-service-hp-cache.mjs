// Isolated QA: compare a stable paid contour before/after non-geometric HP damage.
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../../src/world/navigation.js';
import * as Game from '../../src/simulation/game.js';
import {nativePerimeterProof} from '../native-perimeter-proof.mjs';

const [directory,output]=process.argv.slice(2);
if(!directory||!output||existsSync(output))throw Error('Pass stopped campaign and new output');
const raw=readFileSync(join(directory,'partial-state.json.gz'));
const state=deserialize(gunzipSync(raw).toString('utf8')),before=serialize(state);
const partial=JSON.parse(readFileSync(join(directory,'partial.json'),'utf8'));
const candidate=partial.receipts?.defense?.completed;
if(!candidate?.points?.length)throw Error('No completed paid contour');
const profile=JSON.parse(readFileSync(new URL(`../../public/content/biome-${BIOME_IDS[state.biome]}.json`,import.meta.url),'utf8')).profile;
const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
const plan=Game.quoteWallChain(state,partial.receipts.defense.material,candidate.points,nav,{smooth:false,snap:false});
const proof=()=>{const start=performance.now();const result=nativePerimeterProof(state,nav,plan,candidate.bounds,{outline:candidate.shoreRouted?candidate.points:null});return {ms:performance.now()-start,result};};
const cold=proof(),warm=proof();
const wall=state.structures.find(w=>w.kind==='wall'&&w.status==='intact'&&w.hp>1);
if(!wall)throw Error('No intact paid wall with nonlethal HP to perturb');
const hp=wall.hp,version=nav.version;
wall.hp=hp-1;
const damaged=proof();
wall.hp=hp;
const restored=proof();
if(nav.version!==version||serialize(state)!==before)throw Error('QA perturbation changed native state or geometry epoch');
const semantic=x=>JSON.stringify(x,(k,v)=>k==='regions'?undefined:v);
const equivalent=[warm,damaged,restored].every(x=>semantic(x.result)===semantic(cold.result));
const report={status:'observed-isolated-qa',sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),inputSha256:createHash('sha256').update(raw).digest('hex'),day:state.day,time:state.time,wallId:wall.id,wallHp:hp,navVersion:version,
 runs:{coldMs:cold.ms,warmMs:warm.ms,nonlethalHpChangeMs:damaged.ms,restoredMs:restored.ms},equivalent,
 proofSummary:{valid:cold.result.valid,reason:cold.result.reason,checks:cold.result.checks?.map(c=>({radius:c.radius,services:c.services?{reason:c.services.reason,poses:c.services.poses,certified:c.services.certified,targetId:c.services.targetId}:null}))},
 scope:'Read-only copy of a retained state; one wall loses one HP without changing status/geometry, then is restored. Same native quote, view and geometry epoch. No campaign result or game integration.'};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({runs:report.runs,equivalent,reason:report.proofSummary.reason}));
if(!equivalent)process.exitCode=1;
