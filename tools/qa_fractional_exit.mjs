import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {Navigation} from '../src/world/navigation.js';
import {animalExitConnector} from '../src/simulation/animal-exit-connectors.js';
import {tick} from '../src/simulation/game.js';
const pack=JSON.parse(readFileSync(new URL('../public/content/biome-desert.json',import.meta.url),'utf8'));
const raw=gunzipSync(readFileSync(new URL('../docs/qa/campaign-ci/desierto-saheliana-failure-37870712064/desierto-saheliana-failure-state.json.gz',import.meta.url))).toString();
const setup=()=>{const s=deserialize(raw),nav=new Navigation(s.seed,s.biome,pack.profile);nav.setState(s);return {s,nav,actor:s.raid.animals.find(a=>a.status==='retreating')};};
const stats=values=>{values.sort((a,b)=>a-b);return {samples:values.length,p50:values[Math.floor(values.length*.5)],p95:values[Math.floor(values.length*.95)],max:values.at(-1)};};
const {nav,actor}=setup(),times=[];let path=null,maxBytes=0,maxNodes=0,maxOpen=0;
for(let i=0;!path&&i<600;i++){
 const start=performance.now();path=animalExitConnector(actor,actor.exit,nav);times.push(performance.now()-start);
 const search=actor.exitConnectorSearch;if(search){maxBytes=Math.max(maxBytes,Buffer.byteLength(JSON.stringify(search)));maxNodes=Math.max(maxNodes,search.fine?.nodeCount??0);maxOpen=Math.max(maxOpen,search.fine?.items.length??0);}
}
if(!path)throw Error('Recorded route did not complete');
const replays=[];
for(const dt of [.1,1]){const {s,nav,actor}=setup(),times=[];let simulated=0,maxStep=0;for(;s.raid&&simulated<120;simulated+=dt){const before={x:actor.x,z:actor.z},start=performance.now();tick(s,dt,nav);times.push(performance.now()-start);maxStep=Math.max(maxStep,Math.hypot(actor.x-before.x,actor.z-before.z));}if(s.raid)throw Error('Native replay stalled');replays.push({dt,simulated,day:s.day,pauses:s.pauses,maxStep,frameMilliseconds:stats(times)});}
console.log(JSON.stringify({node:process.version,platform:process.platform,fallbackMilliseconds:stats(times),maxSerializedSearchBytes:maxBytes,maxNodes,maxOpen,pathPoints:path.length,replays,scope:'CPU cold diagnostics; no GPU claim, full campaign or performance acceptance'},null,2));
