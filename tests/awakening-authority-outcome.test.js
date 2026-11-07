import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

async function fixture(){
 const source=await readFile(new URL('../src/app/main.js',import.meta.url),'utf8');
 const start=source.indexOf('function confirmAwakening()'),end=source.indexOf('\nfunction startDueCinematic()',start);
 assert.ok(start>=0&&end>start);
 const calls=[],state={},tool={kind:'awakening',targetId:'plant',confirmedDraft:{valid:true},hitPoint:{x:1,y:0,z:1}};
 let finish;const submitted=new Promise(resolve=>{finish=resolve;});
 const original={beginGuardianAwakening:()=>true,resolveGuardianAttack:(...args)=>calls.push(['original',...args])},replacement={resolveGuardianAttack:(...args)=>calls.push(['replacement',...args])};
 const owner={workerGpuOnly:true,workerRuntime:{submit:()=>submitted},webGpuWorld:{client:original},confirmedHud:{rules:{awakenings:{progress:100}}},guardianSummons:{slots:[],beginProvisionalAwakening(){},rejectProvisional:id=>calls.push(['reject',id])},camera:{position:{toArray:()=>[0,1,0]}}};
 const context={world:owner,state,tool,permission:()=>true,commandId:()=> 'command',provisionalAwakeningSelection:()=>({origin:{x:0,y:1,z:0},contact:{x:1,y:0,z:1}}),cancelTool(){},save:async()=>{throw Error('save unavailable');}};
 vm.runInNewContext(source.slice(start,end)+'\nglobalThis.invoke=confirmAwakening;',context);
 return {calls,finish,owner,replacement,invoke:()=>context.invoke()};
}

test('an accepted awakening remains confirmed when the later save fails',async()=>{
 const f=await fixture(),pending=f.invoke();f.finish({value:true});
 await assert.rejects(pending,/save unavailable/);
 assert.deepEqual(f.calls,[['original','command',true]]);
 assert.equal(f.owner.pendingAwakening,null);
});

test('a rejection reaches the worker that displayed the provisional awakening',async()=>{
 const f=await fixture(),pending=f.invoke();f.owner.webGpuWorld.client=f.replacement;f.finish({rejection:'denied'});
 await assert.rejects(pending,/denied/);
 assert.deepEqual(f.calls,[['original','command',false],['reject','command']]);
 assert.equal(f.owner.pendingAwakening,null);
});

test('a failure to start the visual awakening cleans up its provisional gesture',async()=>{
 const f=await fixture();f.owner.webGpuWorld.client.beginGuardianAwakening=()=>false;
 assert.throws(f.invoke,/presentación del Despertar/);
 assert.deepEqual(f.calls,[['reject','command']]);
 assert.equal(f.owner.pendingAwakening,undefined);
});
