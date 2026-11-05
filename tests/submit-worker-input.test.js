import test from 'node:test';
import assert from 'node:assert/strict';
import {submitWorkerInput} from '../src/app/submit-worker-input.js';
import {isPresentationInputCommand} from '../src/simulation/presentation-input-command.js';

test('causal placement retains input order and waits for the main projection',async()=>{
 const calls=[],command={kind:'plant',id:'p'},receipt={sequence:9,value:true,events:[{type:'CropPlaced'}]};let confirm;
 const owner={workerGpuOnly:true,presentationInputs:true,qaPresentationInputSeq:4,workerRuntime:{submit(){throw Error('wrong channel');},waitForConfirmed(sequence){calls.push(['confirm',sequence]);return new Promise(resolve=>{confirm=resolve;});}},webGpuWorld:{client:{submitPresentationInput(id,value){calls.push(['submit',id,value]);return Promise.resolve(receipt);}}}};
 let completed=false;const pending=submitWorkerInput(owner,command).then(value=>{completed=true;return value;});await Promise.resolve();assert.deepEqual(calls,[['submit',5,command],['confirm',9]]);assert.equal(completed,false);confirm();assert.equal(await pending,receipt);
});
test('legacy placement continues through the hosted runtime',async()=>{const command={kind:'plant',id:'p'},owner={workerRuntime:{submit:value=>Promise.resolve(value)}};assert.equal(await submitWorkerInput(owner,command),command);});
test('presentation input permits identified player actions and contextual attacks',()=>{
 for(const kind of ['plant','placeStructure','buildWallChain','castAgricultural','castShield','bless','foundVillage','requestRepair','removeWall','hire','hireAdditional'])assert.equal(isPresentationInputCommand({kind,id:'x'}),true);
 assert.equal(isPresentationInputCommand({kind:'castAttack',id:'x',guardianContext:{}}),true);assert.equal(isPresentationInputCommand({kind:'castAttack',id:'x'}),false);assert.equal(isPresentationInputCommand({kind:'snapshot',id:'x'}),false);assert.equal(isPresentationInputCommand({kind:'plant'}),false);
});
test('different actions share one sequence without waiting for earlier confirmation',async()=>{
 const sent=[],resolve=[],owner={workerGpuOnly:true,presentationInputs:true,workerRuntime:{submit(){throw Error('wrong channel');},waitForConfirmed:()=>Promise.resolve()},webGpuWorld:{client:{submitPresentationInput(id,command){sent.push([id,command.kind]);return new Promise(done=>resolve.push(done));}}}};
 const first=submitWorkerInput(owner,{kind:'plant',id:'a'}),second=submitWorkerInput(owner,{kind:'removeWall',id:'b'});assert.deepEqual(sent,[[1,'plant'],[2,'removeWall']]);resolve[0]({sequence:4,value:true});resolve[1]({sequence:5,value:true});assert.equal((await first).sequence,4);assert.equal((await second).sequence,5);
});
