import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {AudioSystem} from '../src/audio/audio.js';
import {emit,newGame} from '../src/simulation/game.js';

// Isolated CPU diagnostic of our own checked-in dispatcher. No audio decode,
// renderer, GPU, browser scheduling or claimed whole-game frame-time gain.
const baselineCommit='4eb8420eefa317fa635c963b89512eef7cc93b94';
const baselineSource=execFileSync('git',['show',`${baselineCommit}:src/audio/audio.js`],{encoding:'utf8'});
const prefix='  process(events,{state,listener}={}){';
const from=baselineSource.indexOf(prefix)+prefix.length;
const to=baselineSource.indexOf('\n  updateWork(',from);
if(from<prefix.length||to<0)throw new Error('Baseline dispatcher missing');
const body=baselineSource.slice(from,to).trim().replace(/\}$/,'');
// Unmapped events intentionally isolate history traversal; sound routing is
// exercised separately by the regression suite with mapped events.
const oldProcess=new Function('events','options',`const {state,listener}=options??{};const eventSound={};${body}`);
const hash=source=>createHash('sha256').update(source).digest('hex');
function run(process,rolling=false){
  const audio=new AudioSystem({sfx:0,music:0}),state=newGame({seed:1,slotId:'history-benchmark'});
  for(let i=0;i<200;i++)emit(state,'Unmapped');
  process.call(audio,state.events);const start=performance.now();
  for(let frame=0;frame<100000;frame++){
    if(rolling&&frame%40===0)emit(state,'Unmapped');
    process.call(audio,state.events);
  }
  return performance.now()-start;
}
const report={baselineCommit,sourceSha256:{baseline:hash(baselineSource),current:hash(readFileSync(new URL('../src/audio/audio.js',import.meta.url)))},node:process.version,platform:process.platform,framesPerSample:100000,historyCap:200,samples:7,scope:'Isolated Node CPU dispatcher; unmapped facts; no audio decoding, browser, renderer or GPU. Not a whole-game frame-time or FPS measurement.',cases:{}};
for(const [name,rolling] of [['quiet',false],['rollingOneEventEvery40Frames',true]]){
  run(oldProcess,rolling);run(AudioSystem.prototype.process,rolling);
  const before=[],after=[];
  for(let sample=0;sample<7;sample++){
    before.push(run(oldProcess,rolling));after.push(run(AudioSystem.prototype.process,rolling));
  }
  const median=values=>[...values].sort((a,b)=>a-b)[3];
  report.cases[name]={baselineMs:before,currentMs:after,baselineMedianMs:median(before),currentMedianMs:median(after)};
}
console.log(JSON.stringify(report,null,2));
