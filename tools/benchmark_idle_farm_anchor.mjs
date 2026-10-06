import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {idleFarmAnchor} from '../src/simulation/game.js';
import {deserialize} from '../src/persistence/snapshots.js';
assert.ok(process.argv[2]);assert.ok(process.argv[3]);
const reference=(await import(pathToFileURL(resolve(process.argv[2],'src/simulation/game.js')))).idleFarmAnchor;
const median=a=>{const b=[...a].sort((x,y)=>x-y);return (b[4]+b[5])/2;};
const report={scope:'Isolated idle anchor selection on unmodified archived real farm snapshots. 100 diagnostic worker positions sampled from live crops, not actual idle workforce. Ten warmup and ten timed alternating pairs. Full returned anchors equal, input unchanged. Setup and comparisons excluded. No Game.tick, paths, rendering, FPS, phone or 100-night balance claim.',cases:[]};
for(const name of ['intensive-mangrove-shield-100','intensive-river-rejoin-100','crop-lifecycle-eight-100']){
  const raw=gunzipSync(readFileSync(new URL('../docs/qa/'+name+'/state.json.gz',import.meta.url))),s=deserialize(raw.toString('utf8'));
  const center=s.structures.find(c=>c.kind==='center'&&c.hp>0),live=s.plants.filter(p=>p.alive&&p.centerId===center.id);assert.ok(live.length);
  const workers=Array.from({length:100},(_,i)=>{const p=live[Math.floor(i*live.length/100)];return {centerId:center.id,x:p.x+.7,z:p.z+.3};});
  const before=JSON.stringify(s),rows=[];
  for(let trial=0;trial<20;trial++){
    const pair={};
    for(const mode of trial%2?['candidate','reference']:['reference','candidate']){
      const select=mode==='reference'?reference:idleFarmAnchor,start=performance.now(),anchors=workers.map(w=>select(s,w,center));
      pair[mode]={ms:performance.now()-start,anchors};
    }
    assert.deepEqual(pair.candidate.anchors,pair.reference.anchors);
    if(trial>=10)rows.push({referenceMs:pair.reference.ms,candidateMs:pair.candidate.ms});
  }
  assert.equal(JSON.stringify(s),before);
  report.cases.push({source:name,inputSha256:createHash('sha256').update(raw).digest('hex'),history:s.plants.length,live:live.length,queriesPerPair:100,rows,medianMs:{reference:median(rows.map(r=>r.referenceMs)),candidate:median(rows.map(r=>r.candidateMs))},candidateWins:rows.filter(r=>r.candidateMs<r.referenceMs).length});
}
writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
