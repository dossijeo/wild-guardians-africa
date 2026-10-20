import {performance} from 'node:perf_hooks';
import {writeFileSync,mkdirSync} from 'node:fs';
import {InteractiveParticles} from '../src/microevents/particles.js';
import {EVENTS} from '../src/microevents/definitions.js';
const samples=[];
for(const event of Object.values(EVENTS)){
 const p=new InteractiveParticles(30),def={...event,count:30};p.start(def,()=>.43);
 for(let i=0;i<12000;i++){if(i%180===0)p.start(def,()=>.43);const start=performance.now();p.step(1/60,{present:true,owned:true,x:Math.sin(i*.1)*60,y:Math.cos(i*.1)*30,vx:100,vy:20,hold:0});if(i>=2000)samples.push(performance.now()-start);}
}
samples.sort((a,b)=>a-b);const report={scope:'Node CPU particle simulation only; excludes browser drawing, world render and GPU; 30 particles across the complete 40-event catalogue',samples:samples.length,p50ms:samples[Math.floor(samples.length*.5)],p95ms:samples[Math.floor(samples.length*.95)],p99ms:samples[Math.floor(samples.length*.99)],maximumMs:samples.at(-1),node:process.version};
console.log(JSON.stringify(report,null,2));if(process.argv[2]){mkdirSync(new URL('../docs/qa/microevents/',import.meta.url),{recursive:true});writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');}
