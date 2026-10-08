// Capacity-pressure experiment, not a gameplay FPS benchmark. Dummy keys fill
// the cache outside timing; all timed misses use native terrain and collision.
import {createOpeningWorld} from './check_opening.mjs';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const report={scope:'native queries under artificial capacity pressure; no GPU/FPS claim',sourceHash:createHash('sha256').update(readFileSync(new URL('../src/world/navigation.js',import.meta.url))).digest('hex'),cases:[]};
function legacyWalk(x,z,radius=.3,ignore=null,worker=false){
  const exact=Number.isInteger(x)&&Number.isInteger(z),key=`${x},${z}:${radius}:${ignore}:${worker}`;
  if(exact&&this.walkCache.has(key))return this.walkCache.get(key);
  const result=this.testWalkable(x,z,radius,ignore,worker);
  if(exact){if(this.walkCache.size>50000)this.walkCache.clear();this.walkCache.set(key,result);}
  return result;
}
function legacySegment(start,end,radius,ignore,worker){
  const grid=Number.isInteger(start.x)&&Number.isInteger(start.z)&&Number.isInteger(end.x)&&Number.isInteger(end.z);
  const key=grid?`${start.x},${start.z}|${end.x},${end.z}:${radius}:${ignore}:${worker}`:null;
  if(key&&this.segmentCache.has(key))return this.segmentCache.get(key);
  const result=this.testSegmentClear(start,end,radius,ignore,worker);
  if(key){if(this.segmentCache.size>=100000)this.segmentCache.clear();this.segmentCache.set(key,result);}
  return result;
}
report.baselineFunctionsHash=createHash('sha256').update(legacyWalk.toString()+legacySegment.toString()).digest('hex');
const quantile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1];
for(const biome of ['sabana','gran-canon']){
  const {s,nav}=createOpeningWorld({biome}),c=s.structures[0],cx=Math.round(c.x),cz=Math.round(c.z);
  for(const kind of ['walk','segment']){
    const walk=kind==='walk',cache=walk?nav.walkCache:nav.segmentCache,capacity=walk?50000:100000;
    const raw=(walk?nav.testWalkable:nav.testSegmentClear).bind(nav);
    const current=(walk?nav.walkable:nav.segmentClear).bind(nav);
    const old=(walk?legacyWalk:legacySegment).bind(nav);
    const hot=[];
    for(let dz=-8;dz<8;dz++)for(let dx=-8;dx<8;dx++){
      const a={x:cx+dx,z:cz+dz};
      hot.push(walk?[a.x,a.z,.28,null,true]:[a,{x:a.x+1,z:a.z+1},.28,null,true]);
    }
    const cold=[30,31].map(dx=>walk?[cx+dx,cz,.28,null,true]:[{x:cx+dx,z:cz},{x:cx+dx+1,z:cz+1},.28,null,true]);
    const queries=[...cold,...hot],expected=queries.map(args=>raw(...args));
    let misses=0;
    nav[walk?'testWalkable':'testSegmentClear']=(...args)=>{misses++;return raw(...args);};
    const blocks=[];
    for(let block=0;block<12;block++){
      const order=block%2?['candidate','baseline']:['baseline','candidate'];
      for(const arm of order){
        const fn=arm==='candidate'?current:old;
        cache.clear();
        for(let i=0;i<capacity-hot.length;i++)cache.set(`pressure-${i}`,Boolean(i%2));
        for(const args of hot)fn(...args);
        assert.equal(cache.size,capacity);misses=0;
        const start=performance.now(),actual=queries.map(args=>fn(...args)),ms=performance.now()-start;
        assert.deepEqual(actual,expected);
        if(arm==='candidate')assert.equal(cache.size,capacity);
        blocks.push({block,arm,ms,misses,cacheSize:cache.size});
      }
    }
    const summary={};
    for(const arm of ['baseline','candidate']){
      const samples=blocks.filter(b=>b.arm===arm);
      summary[arm]={medianMs:quantile(samples.map(b=>b.ms),.5),p95Ms:quantile(samples.map(b=>b.ms),.95),missesPerBlock:[...new Set(samples.map(b=>b.misses))]};
    }
    report.cases.push({biome,kind,capacity,hotQueries:hot.length,coldQueries:cold.length,trueResults:expected.filter(Boolean).length,falseResults:expected.filter(v=>!v).length,blocks,summary});
  }
}
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.cases.map(({biome,kind,summary})=>({biome,kind,summary})),null,2));
