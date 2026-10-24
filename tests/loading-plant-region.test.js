import test from 'node:test';
import assert from 'node:assert/strict';
import {LoadingPlants} from '../src/rendering/loading-plants.js';
import {createLoadingPlantRegion} from '../src/rendering/loading-plant-region.js';
test('fixed-view region restricts new loading crops without removing original plants',()=>{
 const plants=new LoadingPlants(),initial=plants.plants.slice();plants.validPosition=createLoadingPlantRegion(plants.radius);
 for(let k=0;k<240;k++){const a=k*2.399963229728653,r=4.25*Math.sqrt(((k*73)%239)/239);plants.plantNearby(r*Math.cos(a),r*Math.sin(a));}
 assert.deepEqual(plants.plants.slice(0,4),initial);assert.ok(plants.plants.length>4);assert.ok(plants.plants.length<18);
 assert.ok(plants.plants.slice(4).every(p=>plants.validPosition(p.x,p.z)));
 assert.equal(plants.plant(4,0),null);
});
test('default loading placement retains the original radial region',()=>{
 const plants=new LoadingPlants();assert.ok(plants.plant(4,0));
});
