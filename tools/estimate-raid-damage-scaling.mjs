// Analytical QA only: no simulation, RNG, save mutation or production changes.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {BALANCE} from '../src/simulation/balance.js';

export function hitsToCollapse(hp,threshold,damage){
 if(!(hp>threshold&&threshold>=0&&damage>0))throw Error('Invalid structural inputs');
 return Math.ceil((hp-threshold-1e-9)/damage);
}
export function cropKillCeiling(actors,hits,damage=1){
 if(!Number.isSafeInteger(actors)||actors<0||!Number.isSafeInteger(hits)||hits<0||!(damage>0))throw Error('Invalid crop inputs');
 return Math.floor(actors*hits/Math.ceil(2/damage));
}
const args=process.argv.slice(2);
if(args.includes('--self-test')){
 assert.equal(hitsToCollapse(600,126,60),8);
 assert.equal(hitsToCollapse(600,126,600),1);
 assert.equal(cropKillCeiling(10,6),30);
 assert.equal(cropKillCeiling(10,6,10),60);
 assert.equal(cropKillCeiling(100,6),300);
 assert.throws(()=>hitsToCollapse(600,126,0));
 console.log('PASS: six structural/crop analytical checks');
}else{
 const sources=[{name:'current-main',balance:BALANCE}];
 const frozenIndex=args.indexOf('--frozen');
 if(frozenIndex>=0){
  const path=args[frozenIndex+1],bytes=readFileSync(path),snapshot=JSON.parse(gunzipSync(bytes));
  const source=Buffer.from(snapshot.files['src/simulation/balance.js'].base64,'base64').toString('utf8');
  const balance=JSON.parse(source.slice(source.indexOf('export const BALANCE = ')+23).trim().replace(/;$/,''));
  sources.push({name:'frozen-pilot',path,sha256:createHash('sha256').update(bytes).digest('hex'),balance});
 }
 const report={scope:'Static per-target damage bounds; no measured defence efficacy, campaign or GPU result',
  cropSemantics:'Current crop: attackHits+=1, destroyed at2. Hypothetical scaled hit still targets only one crop; no splash damage assumed.',
  illustrativeActors:{hitsPerAnimal:6,current10:cropKillCeiling(10,6),scaled10At10x:cropKillCeiling(10,6,10),current100:cropKillCeiling(100,6),limits:'Upper bounds with all hits unshielded on available crops; introductions, missed hits, travel and worker contacts reduce them.'},
  sources:sources.map(({balance:b,...source})=>({...source,initialMoney:b.initial_money,centerCost:b.work_center.cost,cropPrices:Object.fromEntries(b.crops.map(c=>[c.id,c.base_harvest_value])),rows:b.animals.flatMap(a=>[1,2,4,10].map(multiplier=>({species:a.id,multiplier,baseDamage:a.structure_hit_damage,scaledDamage:a.structure_hit_damage*multiplier,centerHits:hitsToCollapse(600,126,a.structure_hit_damage*multiplier),wallHits:Object.fromEntries(b.walls.map(w=>[w.id,hitsToCollapse(w.hp,w.hp*.2,a.structure_hit_damage*multiplier)]))})))})),
  interpretation:['Structure damage scales HP loss but saturates at one destroyed target per committed attack.','Crop damage saturates when a hit becomes lethal; damage alone cannot replace arbitrary actor/attack count.','Larger damage may weaken responsible walls more than it harms undefended crops. Protection must be measured with actual paths.','Current attraction sums living crops base harvest values; it ignores cash, crop progress and defense capital. Selecting a different farm value measure is a design decision.'],
  candidateProtocol:['Compare fixed prior economy plus scaled structural damage against reduced harvest/cheap walls, separately.','Use smooth capped value scaling, freeze it per raid, preserve first-five-night crop destruction cap.','Measure native crops destroyed, structure damage, repairs paid, reserve, raid duration and meaningful activity.','Reject single-hit center destruction or cheaper weak walls becoming pointless unless explicitly intended and tested.']};
 const outputIndex=args.indexOf('--output');
 if(outputIndex>=0)writeFileSync(args[outputIndex+1],JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}
