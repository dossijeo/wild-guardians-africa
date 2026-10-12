import fs from 'node:fs';import z from 'node:zlib';import {performance} from 'node:perf_hooks';import {pathToFileURL} from 'node:url';import {resolve} from 'node:path';
import {deserialize} from '../src/persistence/snapshots.js';import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
const source=fs.readFileSync('src/simulation/animal-exit-connectors.js','utf8');
const module=cap=>source.replace('halfSearchLimit=16384','halfSearchLimit='+cap).replace(/from '([^']+)'/g,(_,p)=>"from '"+pathToFileURL(resolve('src/simulation',p)).href+"'");
const A=await import('data:text/javascript;base64,'+Buffer.from(module(4096)).toString('base64')),B=await import('data:text/javascript;base64,'+Buffer.from(module(16384)).toString('base64'));
const raw=z.gunzipSync(fs.readFileSync('docs/qa/integrated-spiritual-survival/recovery-night41-technical-stop/partial-state.json.gz')).toString(),rows=[];
for(const arm of ['A','B','B','A']){
 const s=deserialize(raw),n=new Navigation(s.seed,s.biome,JSON.parse(fs.readFileSync('public/content/biome-'+BIOME_IDS[s.biome]+'.json')).profile);n.setState(s);
 const a=s.raid.animals.find(a=>a.id==='animal-44975'),samples=[];n.version=JSON.parse(a.exitConnectorSearch.key)[0];let path=null,maxNodes=0,maxBytes=0;
 const at=performance.now();for(let calls=0;calls<2000&&!path;calls++){
  const t=performance.now();path=(arm==='A'?A:B).animalExitConnector(a,a.exit,n);samples.push(performance.now()-t);
  maxNodes=Math.max(maxNodes,a.exitConnectorSearch?.fine?.nodeCount??0);
  if(calls%100===0)maxBytes=Math.max(maxBytes,Buffer.byteLength(JSON.stringify(a.exitConnectorSearch??{})));
 }
 let prev=a,valid=!!path;for(const p of path??[]){valid&&=n.segmentClear(prev,p,a.radius,null,false);prev=p;}
 const sorted=[...samples].sort((a,b)=>a-b);rows.push({arm,cap:arm==='A'?4096:16384,calls:samples.length,pathPoints:path?.length??null,validNativeSegments:valid,totalMs:performance.now()-at,p50Ms:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],p99Ms:sorted[Math.floor(sorted.length*.99)],maxMs:sorted.at(-1),maxNodes,sampledSearchJSONBytes:maxBytes});
 console.log(JSON.stringify(rows.at(-1)));
}
fs.mkdirSync('docs/qa/integrated-spiritual-survival/night41-expanded-exit',{recursive:true});fs.writeFileSync('docs/qa/integrated-spiritual-survival/night41-expanded-exit/abba.json',JSON.stringify({scope:'Retained night41 connector only; AB/BA capped vs expanded; 2000-call diagnostic cutoff; timer overhead included; JSON bytes are not measured RAM or GPU frame time',rows},null,2)+'\n');
