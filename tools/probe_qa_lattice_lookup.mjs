import assert from 'node:assert/strict';import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';import {resolve} from 'node:path';import {execFileSync} from 'node:child_process';
import {deserialize,serialize} from '../src/persistence/snapshots.js';import {Navigation,BIOME_IDS} from '../src/world/navigation.js';import {withNativeProofLatticeCache} from './native-proof-lattice-cache.mjs';
const input=resolve(process.argv[2]??'docs/qa/native-balance-parallel-short/native-original/state.json.gz'),out=resolve(process.argv[3]??'.cache/lattice-lookup-probe'),iterations=1000000;
if(existsSync(out))throw Error('New diagnostic output required');mkdirSync(out,{recursive:true});const sha=b=>createHash('sha256').update(b).digest('hex'),original=gunzipSync(readFileSync(input)).toString(),s=deserialize(original),profile=JSON.parse(readFileSync('public/content/biome-'+BIOME_IDS[s.biome]+'.json')).profile;
const points=s.plants.filter(p=>p.alive).flatMap(p=>{const a=[];for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)a.push([Math.floor(p.x)+dx,Math.floor(p.z)+dz]);return a;});assert.ok(points.length);
const sourceFiles=Object.fromEntries(['tools/probe_qa_lattice_lookup.mjs','tools/native-proof-lattice-cache.mjs','tools/qa-flat-lattice-key.mjs','src/world/terrain.js','src/world/navigation.js'].map(p=>[p,sha(readFileSync(p))]));
writeFileSync(out+'/launch.json',JSON.stringify({pid:process.pid,source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),inputSHA:sha(original),iterations,points:points.length,uniqueCoordinates:new Set(points.map(p=>p.join(','))).size,sourceFiles,scope:'Bounded warm lookup microprobe on actual crop lattice neighborhoods; not recorded full surface/collision query distribution, policy evaluation or campaign performance'},null,2)+'\n');
const arms=[];
for(const label of ['A1','B1','C1','C2','B2','A2']){
 const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);const expected=points.map(p=>nav.field.lattice(...p)),mode=label[0]==='A'?'diagnose':'cache',storage=label[0]==='C'?'flat':'nested';let stats;
 const timing=withNativeProofLatticeCache(nav,v=>{
  const field=v.field;for(let i=0;i<points.length;i++)assert.equal(field.lattice(...points[i]),expected[i]);for(let i=0;i<10000;i++){const p=points[i%points.length];field.lattice(p[0],p[1]);}
  let sum=0;const start=performance.now();for(let i=0;i<iterations;i++){const p=points[i%points.length];sum+=field.lattice(p[0],p[1]);}return {ms:performance.now()-start,sum};
 },{mode,storage,onDiagnostics:r=>stats=r});
 assert.equal(serialize(s),original);if(arms.length)assert.equal(timing.sum,arms[0].sum);const row={label,mode,storage,...timing,stats};arms.push(row);writeFileSync(out+'/'+label+'.json',JSON.stringify(row,null,2)+'\n');console.log(JSON.stringify({label,ms:row.ms,sum:row.sum,hits:stats.hits,nativeCalls:stats.nativeLatticeCalls}));
}
for(const[p,h]of Object.entries(sourceFiles))assert.equal(sha(readFileSync(p)),h,p);
writeFileSync(out+'/summary.json',JSON.stringify({status:'passed-exact-microprobe',arms,scope:'Warm lookup-only timings; no protected proof/campaign/GPU acceptance'},null,2)+'\n');
