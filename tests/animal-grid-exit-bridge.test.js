import test from 'node:test';
import assert from 'node:assert/strict';
import {animalGridExitBridge} from '../src/simulation/animal-grid-exit-bridge.js';

test('an exhausted retreat connector retries when sector residency changes',()=>{
 const actor={status:'retreating',x:0,z:0,radius:.28},end={x:3,z:0};
 let resident=false,searches=0;
 const nav={version:1,residencyRevision:1,field:{},obstacles:[],
  walkable:()=>resident,segmentClear:()=>resident,
  *findPathSteps(){searches++;yield null;return [{x:3,z:0}];}};
 for(let i=0;i<12;i++)animalGridExitBridge(actor,end,nav);
 assert.deepEqual(animalGridExitBridge(actor,end,nav),{pending:false,path:null});
 assert.equal(searches,0);
 resident=true;nav.residencyRevision++;
 assert.equal(animalGridExitBridge(actor,end,nav).pending,true);
 assert.equal(animalGridExitBridge(actor,end,nav).pending,true);
 assert.equal(searches,1,'newly resident terrain must restart the exhausted search');
});
