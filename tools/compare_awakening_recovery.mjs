// Compare paired recovery policies on actual, common, completed campaign days.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {basename,resolve} from 'node:path';
import assert from 'node:assert/strict';

const [out,...paths]=process.argv.slice(2);
if(!out||!paths.length||paths.length%2)throw Error('Usage: node tools/compare_awakening_recovery.mjs output.json fixed.json adaptive.json [fixed.json adaptive.json ...]');
function read(path){const b=readFileSync(path);return JSON.parse((path.endsWith('.gz')?gunzipSync(b):b).toString('utf8'));}
function metrics(rows){
 const keys=['income','wages','seeds','walls','repairs','net'];
 return {...Object.fromEntries(keys.map(k=>[k,rows.reduce((n,r)=>n+(r.finance[k]??0),0)])),
  delivered:rows.reduce((n,r)=>n+(r.delivered??0),0)};
}
const comparisons=[];
for(let i=0;i<paths.length;i+=2){
 const a=read(paths[i]),b=read(paths[i+1]);
 assert.equal(a.status,'complete');assert.equal(b.status,'complete');
 assert.equal(a.arm,'recovery');assert.equal(b.arm,'recovery-adaptive');
 for(const key of ['seed','biome','culture','days'])assert.equal(a[key],b[key],`Different ${key}`);
 const aLoss=a.losses.find(x=>x.type==='BlessingRemoved'),bLoss=b.losses.find(x=>x.type==='BlessingRemoved');
 const lossMatches=!!aLoss&&!!bLoss&&aLoss.day===bLoss.day&&aLoss.time===bLoss.time&&aLoss.targetId===bLoss.targetId;
 const sharedNights=Math.min(a.completedNights,b.completedNights);
 const preLossNights=lossMatches?Math.min(sharedNights,aLoss.day-1):null;
 const prefix=rows=>rows.filter(r=>r.day<=preLossNights).map(r=>({day:r.day,finance:r.finance,living:r.living,sources:r.sources}));
 const identicalBeforeLoss=lossMatches&&JSON.stringify(prefix(a.daily))===JSON.stringify(prefix(b.daily));
 const fixed=metrics(a.daily.filter(r=>r.day<=sharedNights));
 const adaptive=metrics(b.daily.filter(r=>r.day<=sharedNights));
 const after=(r,loss)=>loss?r.casts.filter(c=>c.day>loss.day||c.day===loss.day&&c.time>loss.time).map(({day,time,kind,targetId})=>({day,time,kind,targetId})):[];
 const terminal=r=>{const d=r.daily.at(-1);return d?{day:d.day,money:d.money,living:d.living,sources:d.sources,walls:d.walls,centerHp:d.centerHp}:null;};
 comparisons.push({seed:a.seed,biome:a.biome,culture:a.culture,fixedFile:basename(paths[i]),adaptiveFile:basename(paths[i+1]),
  fixed:{nights:a.completedNights,result:a.result,loss:aLoss??null,subsequentBlessings:after(a,aLoss),terminal:terminal(a)},
  adaptive:{nights:b.completedNights,result:b.result,loss:bLoss??null,subsequentBlessings:after(b,bLoss),terminal:terminal(b)},
  lossMatches,preLossNights,identicalBeforeLoss,sharedNights,fixedMetrics:fixed,adaptiveMetrics:adaptive,
  differences:Object.fromEntries(Object.keys(fixed).map(k=>[k,adaptive[k]-fixed[k]]))});
}
writeFileSync(resolve(out),JSON.stringify({scope:'Prescribed loss, actual ordinary commands; comparisons include policy-induced subsequent raid and economic trajectories.',comparisons},null,2)+'\n');
console.log(JSON.stringify({output:resolve(out),comparisons:comparisons.map(({seed,lossMatches,identicalBeforeLoss,sharedNights})=>({seed,lossMatches,identicalBeforeLoss,sharedNights}))}));
