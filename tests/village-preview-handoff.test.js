import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera} from 'three';
import {createStructureInputFeedback} from '../src/app/structure-input-feedback.js';
import {publishResolvedVillagePreview} from '../src/app/village-preview-handoff.js';
function setup(){const elements=[],client={},stage={append(element){elements.push(element);}},documentRef={createElement(){return {style:{},setAttribute(){},remove(){this.removed=true;}};}},owner=createStructureInputFeedback({stage,camera:new PerspectiveCamera(),canvas:{},documentRef}),feedback=owner.start({clientX:1,clientY:2},client),pending={feedbackId:'old'};assert.equal(feedback.bind('old',{x:0,y:1,z:0},client),true);return {elements,client,owner,feedback,pending};}
test('a failed visual publication retains the new marker ID for transactional cleanup',()=>{
 const f=setup();try{assert.throws(()=>publishResolvedVillagePreview({pending:f.pending,value:{x:2,z:3},feedback:f.feedback,client:f.client,ground:()=>4,makeId:()=> 'new',remove:(...args)=>f.owner.remove(...args),show(){throw Error('worker closed');}}),/worker closed/);assert.equal(f.pending.feedbackId,'new');f.owner.remove('old',f.client);assert.equal(f.elements[0].removed,undefined);f.owner.remove(f.pending.feedbackId,f.client);assert.equal(f.elements[0].removed,true);}finally{f.owner.dispose();}
});
test('unavailable terrain retires the stale marker without inventing a height',()=>{
 const f=setup(),shown=[];try{const result=publishResolvedVillagePreview({pending:f.pending,value:{x:2,z:3},feedback:f.feedback,client:f.client,ground:()=>null,makeId:()=> 'new',remove:(...args)=>f.owner.remove(...args),show:value=>shown.push(value)});assert.equal(f.elements[0].removed,true);assert.equal(f.pending.feedbackId,null);assert.deepEqual(result,{x:2,z:3});assert.equal(shown[0],result);}finally{f.owner.dispose();}
});
