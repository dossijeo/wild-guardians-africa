import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize} from '../src/persistence/snapshots.js';
const [protectedPath,controlPath,output,pieceCount='34']=process.argv.slice(2);assert(protectedPath&&controlPath&&output&&!existsSync(output));
const expectedWallPieces=Number(pieceCount);assert(Number.isSafeInteger(expectedWallPieces)&&expectedWallPieces>0);
const hash=b=>createHash('sha256').update(b).digest('hex');
const reports=[protectedPath,controlPath].map(p=>JSON.parse(readFileSync(p)));
const states=reports.map(r=>{const bytes=readFileSync(r.input);assert.equal(hash(bytes),r.inputSha256);return deserialize(gunzipSync(bytes).toString());});
for(const r of reports){assert.equal(r.status,'observed-native-night-complete');assert.equal(r.error,null);assert.equal(r.day,2);assert.equal(r.result,null);}
assert.deepEqual(reports[0].sourceHashes,reports[1].sourceHashes);
for(const k of ['seed','biome','culture','day','time','elapsed','rng','nightPlan','suppressed'])assert.deepEqual(states[0][k],states[1][k],k+' differs');
assert.deepEqual(states[0].plants,states[1].plants,'Crop state differs before the night');
assert.equal(states[0].plants.filter(p=>p.alive).length,8);
assert.equal(states[0].structures.filter(p=>p.kind==='wall').length,expectedWallPieces);assert.equal(states[1].structures.filter(p=>p.kind==='wall').length,0);
const hits=r=>r.events.filter(e=>e.type==='StructureHit').map(e=>({kind:e.structureHit.kind,damage:e.structureHit.previousHp-e.structureHit.hp}));
const result={status:'verified-native-first-night-defense-pair',inputs:[protectedPath,controlPath],inputReportHashes:[protectedPath,controlPath].map(p=>hash(readFileSync(p))),
 expectedWallPieces,sameEngineSources:true,sameRngAndNightPlan:true,sameFullCropState:true,nightPlan:states[0].nightPlan,
 rows:reports.map((r,i)=>({defense:i===0?'paid-perimeter':'native-wall-removal',opening:r.opening,closing:r.closing,logicalHits:r.logicalHits,logicalMisses:r.logicalMisses,
 structureHits:hits(r),cropsDestroyed:r.cropDestroyed,livingAfter:r.living,
 retreats:r.events.filter(e=>e.type==='AnimalRetreating').map(e=>({species:e.species,hitsRemaining:e.hitsRemaining,reason:e.reason}))})),
 scope:'Same native first-night plan, RNG, full crop state, terrain and engine sources; wall removal is a real daytime decision with genuine refunds. Worker positions/path state differ after replaying the day. No further hiring, purchases or magic during night. This measures immediate physical interception, not long-term economic strategy or later-night balance. Normal introductory crop safeguards remain active.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,rows:result.rows}));
