// Read-only reconstruction of a retained funded-defense candidate quote.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
import {wallStroke} from '../src/world/wall-layout.js';
import {nativePerimeterProof} from './native-perimeter-proof.mjs';

const [input,partial,output]=process.argv.slice(2);
assert(input&&partial&&output);
const s=deserialize(gunzipSync(readFileSync(input)).toString()),sourceTime=s.time,sourceRaid=!!s.raid;
// Native wall quotes are daylight-only. Restore only that permission gate on
// this disposable copy; the retained structures/crops/navigation are intact.
if(s.raid){s.raid=null;s.time=295;}
const before=serialize(s);
const evidence=JSON.parse(readFileSync(partial));
const candidate=evidence.receipts.defense.planned??evidence.receipts.defense.completed;
assert(candidate,'No retained contour');
const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[s.biome]}.json`)).profile;
const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
const started=performance.now(),plan=Game.quoteWallChain(s,evidence.receipts.defense.material,candidate.points,nav,{smooth:false,snap:false});
const quoteMs=performance.now()-started;
const missing=wallStroke(candidate.points,s.structures,{smooth:false,snap:false});
const proofStarted=performance.now(),proof=nativePerimeterProof(s,nav,plan,candidate.bounds,{outline:candidate.shoreRouted?candidate.points:null});
const proofMs=performance.now()-proofStarted;
const repeatStarted=performance.now(),repeat=nativePerimeterProof(s,nav,plan,candidate.bounds,{outline:candidate.shoreRouted?candidate.points:null});
const repeatMs=performance.now()-repeatStarted;
assert.deepEqual(repeat,proof);
assert.equal(serialize(s),before);
const report={scope:'Read-only retained candidate at one saved state. For an after-dusk checkpoint, daylight permission is temporarily restored on a disposable copy; this is not a replay or campaign certificate.',day:s.day,sourceTime,sourceRaid,quoteTime:s.time,candidateBounds:candidate.bounds,shoreRouted:!!candidate.shoreRouted,plannedPieces:missing.length,legalPieces:plan.pieces.length,updates:plan.updates.length,suppressed:plan.suppressed.length,quoteMs,proofMs,repeatMs,proof};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
