import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';

const [input,output]=process.argv.slice(2);
assert(input&&output,'Usage: node tools/summarize-native-campaign-cpu-profile.mjs INPUT.cpuprofile OUTPUT.json');
const profile=JSON.parse(readFileSync(input,'utf8'));
const nodes=new Map(profile.nodes.map(n=>[n.id,n]));
const parents=new Map();
for(const node of profile.nodes)for(const child of node.children??[])parents.set(child,node.id);
const self=new Map(),byContext=new Map(),actChildren=new Map(),defenseChildren=new Map();
let totalMicros=0;
for(let i=0;i<profile.samples.length;i++){
 const delta=profile.timeDeltas[i],node=nodes.get(profile.samples[i]);
 if(!node||!Number.isFinite(delta)||delta<0)continue;
 totalMicros+=delta;
 const f=node.callFrame,key=`${f.functionName} ${f.url}:${f.lineNumber+1}`;
 self.set(key,(self.get(key)??0)+delta);
 let ancestor=node.id;
 while(ancestor){
  const frame=nodes.get(ancestor)?.callFrame;
  if(frame?.url.endsWith('/tools/native-funded-defense-policy.mjs')&&frame.functionName==='act'){
   let child=node.id;
   while(parents.get(child)!==ancestor&&parents.has(child))child=parents.get(child);
   const called=nodes.get(child)?.callFrame,childName=child===ancestor?'defense act self':`${called?.functionName} ${called?.url}:${(called?.lineNumber??0)+1}`;
   defenseChildren.set(childName,(defenseChildren.get(childName)??0)+delta);
   break;
  }
  ancestor=parents.get(ancestor);
 }
 let id=node.id,context='other';
 while(id){
  const frame=nodes.get(id)?.callFrame;
  if(frame?.url.endsWith('/tools/native-campaign-runner.mjs')&&frame.functionName==='act'){
   context='act';
   let child=node.id;
   while(parents.get(child)!==id&&parents.has(child))child=parents.get(child);
   const called=nodes.get(child)?.callFrame,childName=child===id?'act self':`${called?.functionName} ${called?.url}:${(called?.lineNumber??0)+1}`;
   actChildren.set(childName,(actChildren.get(childName)??0)+delta);
   break;
  }
  if(frame?.url.endsWith('/tools/native-campaign-runner.mjs')&&['plant','hire','collect','choosePlot','nextSpecies','labourReserve','maintenanceReserve','savingsReserve'].includes(frame.functionName)){context=frame.functionName;break;}
  if(frame?.url.endsWith('/src/simulation/game.js')&&['tick','tickScoped'].includes(frame.functionName)){context='Game.tick';break;}
  id=parents.get(id);
 }
 byContext.set(context,(byContext.get(context)??0)+delta);
}
const sort=map=>[...map].sort((a,b)=>b[1]-a[1]).map(([name,micros])=>({name,micros,percent:100*micros/totalMicros}));
const report={scope:'Sampled CPU including profiler and harness overhead, all campaign phases. Diagnostic ranking only, not an uninstrumented wall-time or gameplay frame-time measurement.',input,samples:profile.samples.length,totalMicros,contexts:sort(byContext),actChildren:sort(actChildren),defenseChildren:sort(defenseChildren),topSelf:sort(self).slice(0,60)};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,topSelf:report.topSelf.slice(0,20)},null,2));
