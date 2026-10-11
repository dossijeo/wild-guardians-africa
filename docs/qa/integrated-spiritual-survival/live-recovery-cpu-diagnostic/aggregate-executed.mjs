import {readFileSync,writeFileSync} from 'node:fs';
const profile=JSON.parse(readFileSync('.cache-live-campaign.cpuprofile','utf8'));
const nodes=new Map(profile.nodes.map(n=>[n.id,n])),parents=new Map();
for(const n of profile.nodes)for(const c of n.children??[])parents.set(c,n.id);
const self=new Map(),inclusive=new Map();let total=0;
for(let i=0;i<profile.samples.length;i++){
 const id=profile.samples[i],us=profile.timeDeltas?.[i]??2000;total+=us;self.set(id,(self.get(id)??0)+us);
 const seen=new Set();for(let p=id;p&&!seen.has(p);p=parents.get(p)){seen.add(p);inclusive.set(p,(inclusive.get(p)??0)+us);}
}
const rows=m=>[...m].sort((a,b)=>b[1]-a[1]).slice(0,25).map(([id,us])=>({function:nodes.get(id).callFrame.functionName,url:nodes.get(id).callFrame.url,line:nodes.get(id).callFrame.lineNumber+1,milliseconds:us/1000,fraction:us/total}));
const report={pid:30420,sampleCount:profile.samples.length,sampledMilliseconds:total/1000,scope:'Ten-second live diagnostic sample; sampling overhead exists. No mutation, restart, breakpoint or application expression evaluation.',self:rows(self),inclusive:rows(inclusive)};
writeFileSync('.cache-live-cpu-summary.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
