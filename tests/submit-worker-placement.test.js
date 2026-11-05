import test from 'node:test';
import assert from 'node:assert/strict';
import {submitWorkerPlacement} from '../src/app/submit-worker-placement.js';
import {isPresentationInputCommand} from '../src/simulation/presentation-input-command.js';

test('causal placement retains input order and waits for the main projection',async()=>{
 const calls=[],command={kind:'plant',id:'p'},receipt={sequence:9,value:true,events:[{type:'CropPlaced'}]};let confirm;
 const owner={workerGpuOnly:true,presentationInputs:true,qaPresentationInputSeq:4,workerRuntime:{submit(){throw Error('wrong channel');},waitForConfirmed(sequence){calls.push(['confirm',sequence]);return new Promise(resolve=>{confirm=resolve;});}},webGpuWorld:{client:{submitPresentationInput(id,value){calls.push(['submit',id,value]);return Promise.resolve(receipt);}}}};
 let completed=false;const pending=submitWorkerPlacement(owner,command).then(value=>{completed=true;return value;});await Promise.resolve();assert.deepEqual(calls,[['submit',5,command],['confirm',9]]);assert.equal(completed,false);confirm();assert.equal(await pending,receipt);
});
test('legacy placement continues through the hosted runtime',async()=>{const command={kind:'plant',id:'p'},owner={workerRuntime:{submit:value=>Promise.resolve(value)}};assert.equal(await submitWorkerPlacement(owner,command),command);});
test('presentation input permits only identified player placements and contextual attacks',()=>{
 for(const kind of ['plant','placeStructure','buildWallChain'])assert.equal(isPresentationInputCommand({kind,id:'x'}),true);
 assert.equal(isPresentationInputCommand({kind:'castAttack',id:'x',guardianContext:{}}),true);assert.equal(isPresentationInputCommand({kind:'castAttack',id:'x'}),false);assert.equal(isPresentationInputCommand({kind:'snapshot',id:'x'}),false);assert.equal(isPresentationInputCommand({kind:'plant'}),false);
});
