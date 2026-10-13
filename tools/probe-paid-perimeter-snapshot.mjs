// Read-only cost probe for an actual, already-paid campaign contour.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {Session} from 'node:inspector';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
import {nativePerimeterProof} from './native-perimeter-proof.mjs';

const [directory,output,profileFile]=process.argv.slice(2);
if(!directory||!output||existsSync(output))throw Error('Usage: node tools/probe-paid-perimeter-snapshot.mjs STOPPED_RUN NEW_OUTPUT.json');
if(profileFile&&existsSync(profileFile))throw Error('Refusing to overwrite CPU profile');
const bytes=readFileSync(join(directory,'partial-state.json.gz'));
const state=deserialize(gunzipSync(bytes).toString('utf8')),before=serialize(state);
const partial=JSON.parse(readFileSync(join(directory,'partial.json'),'utf8'));
const source=JSON.parse(readFileSync(join(directory,'source.json'),'utf8'));
const candidate=partial.receipts?.defense?.completed;
if(!candidate?.points?.length)throw Error('Stopped snapshot has no completed paid contour');
const profile=JSON.parse(readFileSync(new URL(`../public/content/biome-${BIOME_IDS[state.biome]}.json`,import.meta.url),'utf8')).profile;
const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
const started=performance.now();
const plan=Game.quoteWallChain(state,partial.receipts.defense.material,candidate.points,nav,{smooth:false,snap:false});
const quoteMs=performance.now()-started,proofStart=performance.now();
let session,post;
if(profileFile){session=new Session();session.connect();post=(method)=>new Promise((resolve,reject)=>session.post(method,(error,value)=>error?reject(error):resolve(value)));await post('Profiler.enable');await post('Profiler.start');}
let proof,proofMs;
try{proof=nativePerimeterProof(state,nav,plan,candidate.bounds,{outline:candidate.shoreRouted?candidate.points:null});proofMs=performance.now()-proofStart;
 if(session){const {profile}=await post('Profiler.stop');writeFileSync(profileFile,JSON.stringify(profile)+'\n');}}
finally{session?.disconnect();}
if(serialize(state)!==before)throw Error('Read-only proof changed the native state');
const report={status:'observed-read-only-paid-perimeter-proof',inputSha256:createHash('sha256').update(bytes).digest('hex'),snapshotSourceHead:source.gitHead,probeSourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),day:state.day,time:state.time,
 plants:state.plants.filter(p=>p.alive).length,walls:state.structures.filter(x=>x.kind==='wall'&&x.status==='intact').length,quoteMs,proofMs,profileFile:profileFile??null,plan:{pieces:plan.pieces.length,updates:plan.updates.length},proof,
 scope:'Cold native quote and hypothetical proof of the retained paid contour on a copied campaign state. Does not resume the player policy or imply actual interception.'};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({day:report.day,time:report.time,plants:report.plants,walls:report.walls,quoteMs,proofMs,valid:proof.valid,reason:proof.reason}));
