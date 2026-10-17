import {readFileSync} from 'node:fs';

const file=process.argv[2];
if(!file)throw Error('Usage: node summarize-cpu-profile.mjs capture.cpuprofile');
const profile=JSON.parse(readFileSync(file,'utf8'));
const byId=new Map(profile.nodes.map(node=>[node.id,node]));
const self=new Map();
for(let i=0;i<profile.samples.length;i++){
  const id=profile.samples[i],row=self.get(id)??{samples:0,microseconds:0};
  row.samples++;row.microseconds+=profile.timeDeltas?.[i]??0;self.set(id,row);
}
const rows=[...self].map(([id,row])=>{
  const frame=byId.get(id)?.callFrame??{};
  return {function:frame.functionName,url:frame.url?.replace(/^file:\/\/\//,''),
    line:(frame.lineNumber??-1)+1,...row};
}).sort((a,b)=>b.microseconds-a.microseconds);
console.log(JSON.stringify({totalMicroseconds:rows.reduce((sum,row)=>sum+row.microseconds,0),
  top:rows.slice(0,35)},null,2));
