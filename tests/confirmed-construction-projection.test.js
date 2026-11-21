import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame} from '../src/simulation/game.js';
import {villageCost} from '../src/simulation/rules.js';
import {villageLayout} from '../src/world/villages.js';
import {projectConfirmedConstruction,validateConfirmedConstruction,provisionalCenterCulture,pendingVillagePreview} from '../src/simulation/confirmed-construction-projection.js';

test('compact construction facts preserve existing culture selection and provisional village draft',()=>{
 const state=newGame({seed:321}),catalog=JSON.parse(readFileSync('public/content/villages.json','utf8')),payload=catalog.find(item=>item.id==='mapungubwe');state.villages.push({id:'legacy',culture:'saheliana',x:8,z:2,buildings:[{id:'large'}]});state.hiringPaidDay=state.day;
 const facts=projectConfirmedConstruction(state);assert.deepEqual(facts.villages,[{culture:state.culture,x:0,z:0},{culture:'saheliana',x:8,z:2}]);assert.equal(facts.hiringPaidDay,state.hiringPaidDay);assert.equal(provisionalCenterCulture(facts,7,2),'saheliana');assert.equal(provisionalCenterCulture(facts,4,1),state.culture);
 const pending=pendingVillagePreview(facts,state.culture,20,30,payload);assert.deepEqual(pending,{culture:state.culture,x:20,z:30,buildings:villageLayout(payload,20,30),cost:villageCost(state.villages.length+1),valid:false,pending:true});assert.equal('buildings' in facts.villages[1],false);
});

test('projection stays detached and rejects malformed, additional or nonfinite village fields',()=>{
 const state=newGame({seed:322}),facts=projectConfirmedConstruction(state);state.villages[0].x=9;assert.equal(facts.villages[0].x,0);assert.notEqual(validateConfirmedConstruction(facts),facts);assert.throws(()=>validateConfirmedConstruction({...facts,extra:true}),/projection/);assert.throws(()=>validateConfirmedConstruction({...facts,villages:[{...facts.villages[0],x:Infinity}]}),/village/);assert.throws(()=>pendingVillagePreview(facts,state.culture,0,NaN,{units:[]}),/village/);assert.equal(provisionalCenterCulture({...facts,villages:[]},0,0),state.culture);
});
