import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecoveryProgressWatchdog,awaitRecoveryProgress} from '../src/simulation/recovery-progress-watchdog.js';
function fake(){let now=0,id=0;const timers=new Map();return {schedule(fn,ms){const n=++id;timers.set(n,{fn,at:now+ms});return n;},cancel(n){timers.delete(n);},advance(ms){const target=now+ms;for(;;){const next=[...timers].filter(([,timer])=>timer.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}now=target;}};}
test('GPU reconstruction may exceed ten seconds while acknowledged work advances',()=>{const f=fake(),failures=[],watch=createRecoveryProgressWatchdog({idleMs:120000,totalMs:600000,schedule:f.schedule,cancel:f.cancel,onTimeout:reason=>failures.push(reason)});f.advance(11000);assert.deepEqual(failures,[]);watch.progress();f.advance(110000);watch.progress();f.advance(110000);assert.deepEqual(failures,[]);watch.dispose();f.advance(600000);assert.deepEqual(failures,[]);});
test('lack of progress and total deadline each fail exactly once',()=>{const a=fake(),failures=[],one=createRecoveryProgressWatchdog({idleMs:120000,totalMs:600000,schedule:a.schedule,cancel:a.cancel,onTimeout:reason=>failures.push(reason)});a.advance(120000);a.advance(600000);assert.deepEqual(failures,['idle']);assert.equal(one.progress(),false);const b=fake(),other=[],two=createRecoveryProgressWatchdog({idleMs:120000,totalMs:300000,schedule:b.schedule,cancel:b.cancel,onTimeout:reason=>other.push(reason)});for(let i=0;i<3;i++){b.advance(100000);two.progress();}assert.deepEqual(other,['total']);});

test('activation waits for ordered work beyond the old RPC limit and cleans up its observer',async()=>{
 const f=fake();let progress=0,finish,signal;const pending=awaitRecoveryProgress({run:s=>{signal=s;return new Promise(resolve=>{finish=resolve;});},readProgress:()=>progress,schedule:f.schedule,cancel:f.cancel});await Promise.resolve();
 f.advance(21000);assert.equal(signal.aborted,false);progress++;f.advance(110000);assert.equal(signal.aborted,false);progress++;f.advance(100);finish(42);assert.equal(await pending,42);assert.equal(signal.aborted,true);f.advance(600000);
});
test('stalled activation aborts queued barriers, while changing progress cannot evade total bound',async()=>{
 for(const changing of [false,true]){const f=fake();let value=0,signal;const pending=awaitRecoveryProgress({run:s=>{signal=s;return new Promise(()=>{});},readProgress:()=>value,idleMs:1000,totalMs:3000,schedule:f.schedule,cancel:f.cancel});const rejection=assert.rejects(pending,changing?/total timeout/:/idle timeout/);await Promise.resolve();for(let i=0;i<6;i++){if(changing)value++;f.advance(500);}await rejection;assert.equal(signal.aborted,true);}
});
