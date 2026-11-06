import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../src/simulation/game.js';
import {createPlant} from '../src/simulation/crops.js';
import {createTutorialGuideRevision} from '../src/simulation/tutorial-guide-revision.js';

test('subscribed revisions change only for discrete inputs or sampled crop heights',()=>{
 const state=newGame({seed:712,slotId:'tutorial-revision'}),a=createPlant('a','platano',0,0,'center'),b=createPlant('b','platano',5,0,'center');state.plants.push(a,b);const tracker=createTutorialGuideRevision();
 assert.equal(tracker.publication(state),null);const initial=tracker.subscribe(state,{toolKind:'spell',toolSpell:'growth'});tracker.bindHeights(state,[{id:a.id,species:a.species,growth:a.growth}]);
 b.growth+=.5;assert.equal(tracker.publication(state),initial);a.growth+=.5;assert.equal(tracker.publication(state),initial+1);assert.equal(tracker.publication(state),initial+1);tracker.bindHeights(state,[{id:a.id,species:a.species,growth:a.growth}]);
 state.ledger.balance.n++;assert.equal(tracker.publication(state),initial+2);state.workers.push({id:'worker',status:'walking',x:1,z:2});assert.equal(tracker.publication(state),initial+3);tracker.clear();state.ledger.balance.n++;assert.equal(tracker.publication(state),null);assert.equal(tracker.status().active,false);
});

test('stale height binding is invalidated immediately and subscriptions do not reuse versions',()=>{
 const state=newGame({seed:713,slotId:'tutorial-revision-stale'}),plant=createPlant('p','platano',0,0,'center');state.plants.push(plant);const tracker=createTutorialGuideRevision(),first=tracker.subscribe(state,{toolKind:'plant'});assert.equal(tracker.bindHeights(state,[{id:'p',species:'platano',growth:plant.growth+1}]),first+1);assert.equal(tracker.status().heightsValid,false);assert.equal(tracker.publication(state),first+1);tracker.clear();assert.ok(tracker.subscribe(state,{toolKind:'center'})>first+1);assert.throws(()=>tracker.bindHeights(state,[{id:'p'}]),/Invalid/);
});
