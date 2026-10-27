import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const [file,out]=process.argv.slice(2);if(!file)throw Error('Expected CPU profile');
const bytes=readFileSync(file),p=JSON.parse(file.endsWith('.gz')?gunzipSync(bytes):bytes);
if(p.samples.length!==p.timeDeltas.length)throw Error('Mismatched samples');
const nodes=new Map(p.nodes.map(n=>[n.id,n])),parents=new Map();
for(const n of p.nodes)for(const id of n.children??[])parents.set(id,n.id);
const self=new Map(),farSelf=new Map(),farInclusive=new Map();let total=0,far=0;
const key=n=>`${n.callFrame.functionName||'(anonymous)'} ${n.callFrame.url}:${n.callFrame.lineNumber+1}`;
const add=(m,k,t)=>m.set(k,(m.get(k)??0)+t);
for(let i=0;i<p.samples.length;i++){
 const ms=p.timeDeltas[i]/1000;total+=ms;const path=[];
 for(let id=p.samples[i];id!==undefined;id=parents.get(id)){const n=nodes.get(id);if(!n)break;path.push(n);}
 if(!path.length)continue;add(self,key(path[0]),ms);
 if(!path.some(n=>/\/(attach-native-far-world|native-tree-standby|native-far-layer|far-tree-transitions|native-far-coverage)\.js(?:\?|$)/.test(n.callFrame.url)))continue;
 far+=ms;add(farSelf,key(path[0]),ms);for(const k of new Set(path.map(key)))add(farInclusive,k,ms);
}
const sorted=m=>[...m].sort((a,b)=>b[1]-a[1]).slice(0,40);
const result={scope:'Statistical CPU samples, not GPU time or benchmark acceptance. Inclusive entries overlap and must not be added. Far self includes callees only when a far-system ancestor is sampled.',samples:p.samples.length,profileWallMs:(p.endTime-p.startTime)/1000,sampledMs:total,farSampledMs:far,topSelf:sorted(self),farSelf:sorted(farSelf),farInclusive:sorted(farInclusive)};
if(out)writeFileSync(out,JSON.stringify(result,null,2)+'\n');else console.log(JSON.stringify(result,null,2));
