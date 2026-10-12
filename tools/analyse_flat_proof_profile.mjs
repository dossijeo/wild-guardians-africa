import assert from 'node:assert/strict';import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const [profilePath,summaryPath,out]=process.argv.slice(2);if(!out||existsSync(out))throw Error('Profile, summary and new output required');
const p=JSON.parse(readFileSync(profilePath)),summary=JSON.parse(readFileSync(summaryPath)),nodes=new Map(p.nodes.map(n=>[n.id,n])),parents=new Map();for(const n of p.nodes)for(const id of n.children??[])parents.set(id,n.id);
assert.equal(summary.status,'passed-exact-parity');const arms=summary.arms.map(a=>({...a,samples:0,sampledSeconds:0,buckets:{coarsePipeline:0,surfaceOther:0,other:0},exclusive:{}}));
for(let i=0;i<arms.length;i++){const a=arms[i];assert.ok(p.startTime<=a.actStartHrUs&&a.actStartHrUs<a.actEndHrUs&&a.actEndHrUs<=p.endTime);if(i)assert.ok(arms[i-1].actEndHrUs<=a.actStartHrUs);}
let time=p.startTime,outsideSamples=0;
for(let i=0;i<p.samples.length;i++){
 const us=p.timeDeltas[i];time+=us;const a=arms.find(a=>time>=a.actStartHrUs&&time<=a.actEndHrUs);if(!a){outsideSamples++;continue;}a.samples++;a.sampledSeconds+=us/1e6;
 const n=nodes.get(p.samples[i]),chain=[];for(let id=n.id;id;id=parents.get(id))chain.push(nodes.get(id).callFrame.functionName);
 const bucket=chain.includes('coarseSegmentClear')?'coarsePipeline':chain.includes('surface')?'surfaceOther':'other';a.buckets[bucket]+=us/1e6;
 const f=n.callFrame,key=f.functionName+'@'+(f.url?.split('/').pop()??'')+':'+(f.lineNumber+1);a.exclusive[key]=(a.exclusive[key]??0)+us/1e6;
}
const result={scope:'Main-isolate samples classified by monotonic sample endpoint inside actual proof windows; disjoint ancestry buckets, profiler/concurrent overhead retained; not GPU or process-summed CPU',profileSeconds:(p.endTime-p.startTime)/1e6,totalSamples:p.samples.length,outsideSamples,arms:arms.map(({decision,exclusive,...a})=>({...a,topExclusive:Object.entries(exclusive).sort((a,b)=>b[1]-a[1]).slice(0,14).map(([fn,seconds])=>({fn,seconds}))}))};
writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.arms.map(a=>({label:a.label,wallSeconds:a.actMs/1000,sampledSeconds:a.sampledSeconds,buckets:a.buckets,top:a.topExclusive.slice(0,6)})),null,2));
