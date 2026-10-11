// Small legal-command functional fixture, not a balance campaign.
import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {createOpeningWorld} from './check_opening.mjs';
import {shoreDefenseContours} from './native-shore-defense-contour.mjs';
import {nativePerimeterServiceCandidate} from './native-perimeter-service-candidate.mjs';
import {centerServicePoint} from '../src/world/centers.js';
import {numberOf} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import * as Game from '../src/simulation/game.js';
const [output]=process.argv.slice(2),snapshotPath=output?.replace(/\.json$/,'-state.json.gz');
assert(output?.endsWith('.json')&&!existsSync(output)&&!existsSync(snapshotPath),'Fresh JSON and snapshot output required');
const {s,nav}=createOpeningWorld({seed:712,biome:'gran-canon',culture:'saheliana',slotId:'native-paid-canyon-service'});
const center=s.structures.find(c=>c.kind==='center'),start=centerServicePoint(center,s,.8),initialCash=numberOf(s.ledger.balance),positions=[];
for(let dz=-9;dz<=9;dz+=1.5)for(let dx=4.5;dx<=15;dx+=1.5){
 const p={x:Math.round((center.x+dx)/1.5)*1.5,z:Math.round((center.z+dz)/1.5)*1.5};
 if(nav.placement(p.x,p.z,.4).valid&&nav.path(start,p,.28,null,true)&&nav.path(p,start,.28,null,true))positions.push(p);
}
positions.sort((a,b)=>Math.hypot(a.x-start.x,a.z-start.z)-Math.hypot(b.x-start.x,b.z-start.z)||a.z-b.z||a.x-b.x);
for(const [i,p] of positions.slice(0,8).entries())Game.plant(s,'paid-canyon-plant-'+i,'mijo',p.x,p.z,nav);
assert.equal(s.plants.length,8,'Fixture requires eight actual paid legal seedlings');
Game.openInitialHiring(s);Game.hire(s,'paid-canyon-hire',{olderFemale:1});assert.equal(s.workers.length,1);
const options={smooth:false,snap:false},attempts=[],started=performance.now();let paid=null;
for(const padding of [3,2,4]){
 const proposal=shoreDefenseContours(s,nav,{padding,waterFringe:.2,step:.25,maxCells:30000});
 for(const candidate of proposal.candidates){
  const before=serialize(s),quote=Game.quoteWallChain(s,'zarzas',candidate.points,nav,options);
  const row={padding,bounds:candidate.bounds,points:candidate.points,cost:quote.cost,pieces:quote.pieces.length,gates:quote.gates};attempts.push(row);
  if(!quote.pieces.length||quote.cost>numberOf(s.ledger.balance)-30){row.reason='not-funded-with-real-reserve';continue;}
  row.proof=nativePerimeterServiceCandidate(s,nav,quote,candidate.bounds,{outline:candidate.points});assert.equal(serialize(s),before,'Quote/proof mutated live fixture');
  if(!row.proof.valid)continue;
  const cash=numberOf(s.ledger.balance),wallCount=s.structures.filter(w=>w.kind==='wall').length;
  assert(Game.buildWallChain(s,'paid-canyon-wall','zarzas',candidate.points,nav,options));
  assert.equal(cash-numberOf(s.ledger.balance),quote.cost);assert.equal(numberOf(s.ledger.entries['paid-canyon-wall']),-quote.cost);
  assert.equal(s.structures.filter(w=>w.kind==='wall').length-wallCount,quote.pieces.length);
  const actual=nativePerimeterServiceCandidate(s,nav,{pieces:[],updates:[],suppressed:[]},candidate.bounds,{outline:candidate.points});
  paid={cost:quote.cost,pieces:quote.pieces.length,gates:s.structures.filter(w=>w.kind==='wall'&&w.gate).length,actualProof:actual};break;
 }
 if(paid)break;
}
const frozen=serialize(s);assert.equal(serialize(deserialize(frozen)),frozen,'Save/reload changed paid fixture');
const sources=['tools/probe-native-paid-canyon-service-contour.mjs','tools/check_opening.mjs','tools/native-shore-defense-contour.mjs','tools/native-perimeter-service-candidate.mjs','tools/native-worker-service-proof-v2.mjs','src/simulation/game.js','src/world/navigation.js'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const result={status:paid?.actualProof.valid?'paid-native-static-contour-verified':'no-paid-complete-contour',seed:712,biome:s.biome,culture:s.culture,
 initialCashAfterCentre:initialCash,closingCash:numberOf(s.ledger.balance),paidSeeds:40,paidWages:30,paid,attempts,cpuMilliseconds:performance.now()-started,
 sourceHashes:Object.fromEntries(sources.map(p=>[p,hash(readFileSync(p))])),snapshotPath,
 scope:'Eight-plant legal-command procedural functional fixture with initial 1500, native 800 centre, actual seed/hire/wall debits and save/reload. No cash grants, crops moved, artificial damage, worker movement, gate animation, attack replay, economic campaign, human activity or performance acceptance.'};
assert.equal(result.closingCash,initialCash-40-30-(paid?.cost??0));
writeFileSync(snapshotPath,gzipSync(Buffer.from(frozen)));writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,closingCash:result.closingCash,paid:paid?{cost:paid.cost,pieces:paid.pieces,gates:paid.gates,valid:paid.actualProof.valid}:null,attempts:attempts.map(r=>({padding:r.padding,cost:r.cost,reason:r.proof?.reason??r.reason}))}));
