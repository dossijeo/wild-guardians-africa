// Isolated CPU diagnostic, not a render/FPS or Web Audio decoding benchmark.
import {execFileSync} from 'node:child_process';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const reference='834a07567b972ce4c67ed20afe7c1069de77fe16';
const output=resolve(process.argv[2]??'.cache/farm-audio-idle.json');
const modules=[['src/audio/work-audio.js','WorkAudio'],['src/audio/farm-contact-audio.js','FarmContactAudio']];
const sha=source=>createHash('sha256').update(source).digest('hex');
const result={reference,node:process.version,scope:'isolated CPU; 100 workers, 1,000 queued tasks; no rendering/decoding',warmup:100,samples:500,modules:[]};
for(const [file,name] of modules){
  const original=execFileSync('git',['show',`${reference}:${file}`],{encoding:'utf8'});
  // Preserve the exact old update implementation with unchanged dependencies.
  const linked=original.replace(/from\s+'([^']+)'/g,(match,spec)=>spec.startsWith('.')?`from '${new URL(spec,pathToFileURL(resolve(file))).href}'`:match);
  const baseline=(await import(`data:text/javascript;base64,${Buffer.from(linked).toString('base64')}`))[name];
  const current=(await import(pathToFileURL(resolve(file))))[name];
  const evidence={name,baselineHash:sha(original),candidateHash:sha(await readFile(file)),cases:[]};
  for(const status of ['idle','walking','fleeing','carrying','acting']){
    const lots=[];
    for(const [label,Audio] of [['baseline',baseline],['candidate',current],['candidate',current],['baseline',baseline]]){
      const tasks=Array.from({length:1000},(_,i)=>({id:`t${i}`,kind:'water',targetId:`p${i}`}));
      const plants=Array.from({length:1000},(_,i)=>({id:`p${i}`,alive:true}));
      const workers=Array.from({length:100},(_,i)=>({id:`w${i}`,profile:'olderFemale',status,taskId:`t${i}`,actionRemaining:3.4,x:i,z:0}));
      const state={elapsed:0,pauses:[],workers,plants,crates:[]};let reads=0,cues=0;
      Object.defineProperty(state,'tasks',{enumerable:true,get(){reads++;return tasks;}});
      const domain=JSON.stringify({tasks,plants,workers});
      const audio=new Audio(()=>{cues++;return null;},()=>{},()=>0);
      for(let i=0;i<result.warmup;i++){state.elapsed+=.016;audio.update(state);}
      reads=0;const samples=[];
      for(let i=0;i<result.samples;i++){state.elapsed+=.016;const start=performance.now();audio.update(state);samples.push(performance.now()-start);}
      assert.equal(JSON.stringify({tasks,plants,workers}),domain);assert.equal(cues,0);
      assert.equal(reads,label==='candidate'&&status!=='acting'?0:result.samples);
      audio.dispose();lots.push({label,taskReads:reads,cues,samples});
    }
    const summarize=label=>{
      const values=lots.filter(lot=>lot.label===label).flatMap(lot=>lot.samples).sort((a,b)=>a-b);
      return {medianMs:values[Math.floor(values.length*.5)],p95Ms:values[Math.floor(values.length*.95)]};
    };
    evidence.cases.push({status,lots,baseline:summarize('baseline'),candidate:summarize('candidate')});
  }
  result.modules.push(evidence);
}
await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.modules.map(m=>({name:m.name,cases:m.cases.map(({status,baseline,candidate})=>({status,baseline,candidate}))})),null,2));
