import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import zlib from 'node:zlib';import {execFileSync} from 'node:child_process';
import * as Game from '../src/simulation/game.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const input=process.argv[2],out=path.resolve(process.argv[3]??'.cache/center-repair-navigation');
if(!input||fs.existsSync(out))throw Error('Input required and output must be new');
fs.mkdirSync(out,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),write=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2));
const snapshot=(name,s)=>fs.writeFileSync(path.join(out,name),zlib.gzipSync(serialize(s)));
const bytes=fs.readFileSync(input),s=deserialize(zlib.gunzipSync(bytes).toString());
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const sourceHashes=Object.fromEntries(['src/simulation/game.js','src/world/navigation.js','tools/diagnose-center-repair-navigation.mjs'].map(p=>[p,sha(fs.readFileSync(p))]));
const navFor=state=>{const profile=JSON.parse(fs.readFileSync(new URL('../public/content/biome-'+BIOME_IDS[state.biome]+'.json',import.meta.url))).profile;const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);return nav;};
const task=s.tasks.find(t=>t.kind==='repair');if(!task)throw Error('Retained repair required');
const target=s.structures.find(t=>t.id===task.targetId);if(target?.kind!=='center'||target.status!=='intact')throw Error('Intact centre required');
const status=(phase,extra={})=>write('status.json',{phase,pid:process.pid,source,...extra});
write('provenance.json',{input:path.resolve(input),inputSHA256:sha(bytes),source,sourceHashes,scope:'Headless CPU diagnostic; same saved state and normal ticks. No new hiring, player commands, HP/funding injection or campaign. Current branch runtime, not historical campaign replay.'});
let report={source,arms:[]};
try{
 const nav=navFor(s),start=performance.now();let steps=0;
 while(steps<1200){
  const worker=s.workers.find(w=>w.taskId===task.id),destination=worker?.taskApproach?.destination;
  if(worker?.status==='walking'&&destination&&worker.path?.length===1&&Math.hypot(worker.x-destination.x,worker.z-destination.z)<2)break;
  if(!s.tasks.some(t=>t.id===task.id)||s.time>=300||s.result||s.pauses.length)throw Error('Repair checkpoint unavailable before terminal');
  Game.tick(s,.25,nav);steps++;if(steps%40===0)status('preparing',{steps,time:s.time});
 }
 if(steps>=1200)throw Error('Checkpoint limit reached');
 const saved=serialize(s);snapshot('checkpoint.json.gz',s);report.preparation={steps,time:s.time,milliseconds:performance.now()-start};
 for(const [index,mode]of ['original','candidate','candidate','original'].entries()){
  const state=deserialize(saved),navigation=navFor(state);if(mode==='original')navigation.syncCenterRepair=(st)=>navigation.setState(st);
  let rebuilds=0,pathCalls=0;const rebuild=navigation.setState.bind(navigation),find=navigation.path.bind(navigation);
  navigation.setState=(st)=>{rebuilds++;return rebuild(st);};navigation.path=(...args)=>{pathCalls++;return find(...args);};
  const initialEvents=new Set(state.events.map(e=>e.id)),ticks=[];let receipt=null;
  status('measuring',{arm:index,mode,time:state.time});
  for(let i=0;i<40&&!receipt;i++){
   const begin=performance.now();Game.tick(state,.25,navigation);ticks.push(performance.now()-begin);
   receipt=state.events.find(e=>!initialEvents.has(e.id)&&e.type==='RepairApplied'&&e.repair?.taskId===task.id);
  }
  if(!receipt)throw Error('No actual repair completion in bounded window');
  const repaired=state.structures.find(e=>e.id===target.id),payment=state.ledger.entries[receipt.repair.paymentId];
  if(repaired.hp!==repaired.maxHp||payment?.n!=='-174'||payment.d!=='1')throw Error('Actual settled repair mismatch');
  snapshot('arm-'+index+'-'+mode+'.json.gz',state);
  report.arms.push({index,mode,ticks,totalMilliseconds:ticks.reduce((a,b)=>a+b,0),rebuilds,pathCalls,time:state.time,receipt,workers:state.workers.map(w=>({id:w.id,x:w.x,z:w.z,status:w.status,taskId:w.taskId,crateId:w.crateId})),ledger:state.ledger,taskIds:state.tasks.map(t=>t.id)});
  write('report.json',report);
 }
 report.changedSources=Object.keys(sourceHashes).filter(p=>sha(fs.readFileSync(p))!==sourceHashes[p]);if(report.changedSources.length)throw Error('Sources changed during diagnostic');
 report.scope='ABBA cold-navigator headless completion windows, not GPU/whole-game frametime acceptance. Preparation excluded from arm timings; originals and all worker endpoints retained.';
 write('report.json',report);status('completed');
}catch(error){report.error=error.stack;write('report.json',report);status('failed',{error:error.message});process.exitCode=1;}
