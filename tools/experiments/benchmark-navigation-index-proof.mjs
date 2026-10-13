// Read-only comparison of one retained hypothetical perimeter proof.
// Usage: node tools/experiments/benchmark-navigation-index-proof.mjs <source-worktree>
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';

const root=resolve(process.argv[2]??'.');
const moduleAt=path=>import(pathToFileURL(join(root,path)).href);
const [{deserialize,serialize},{Navigation,BIOME_IDS},Game,{nativePerimeterProof}]=await Promise.all([
 moduleAt('src/persistence/snapshots.js'),moduleAt('src/world/navigation.js'),
 moduleAt('src/simulation/game.js'),moduleAt('tools/native-perimeter-proof.mjs'),
]);
const input=readFileSync(join(root,'docs/qa/integrated-spiritual-survival/day7-funded-state.json.gz'));
const policy=readFileSync(join(root,'docs/qa/integrated-spiritual-survival/day7-funded-policy.json.gz'));
const s=deserialize(gunzipSync(input).toString('utf8'));
const report=JSON.parse(gunzipSync(policy).toString('utf8'));
const profile=JSON.parse(readFileSync(join(root,`public/content/biome-${BIOME_IDS[s.biome]}.json`),'utf8')).profile;
const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
const candidate=report.planned;
const plan=Game.quoteWallChain(s,report.material,candidate.points,nav,{smooth:false,snap:false});
const before=serialize(s),repeats=Number(process.argv[3]??1);
if(!Number.isSafeInteger(repeats)||repeats<1||repeats>10)throw Error('Invalid repeat count');
const timings=[];let proof,expected;
for(let i=0;i<repeats;i++){
 const start=performance.now();
 proof=nativePerimeterProof(s,nav,plan,candidate.bounds,{outline:candidate.shoreRouted?candidate.points:null});
 timings.push(performance.now()-start);
 if(expected)assert.deepEqual(proof,expected);else expected=proof;
}
assert.equal(serialize(s),before);
const hash=value=>createHash('sha256').update(value).digest('hex');
console.log(JSON.stringify({root,milliseconds:timings[0],timings,valid:proof.valid,reason:proof.reason,
 snapshotSha256:hash(input),stateSha256:hash(before),proofSha256:hash(JSON.stringify(proof)),
 pieces:plan.pieces.length,updates:plan.updates.length,checks:proof.checks?.length}));
