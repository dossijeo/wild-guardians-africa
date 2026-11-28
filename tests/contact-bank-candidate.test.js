import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {AnimationMixer,Group} from 'three';
import {actorAsset} from './helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {prepareAnimalModel,prepareAnimalClips,animalGroundSamples,applyAnimalPose} from '../src/rendering/animal-actions.js';
import {supportAnimalOnTerrain} from '../src/rendering/animal-terrain-support.js';
import {createContactBankCandidate} from './browser/contact-bank-candidate.js';

test('QA contact bank uses stored walking poses and falls back during recovery',async()=>{
 execFileSync(process.execPath,['tools/guardian/export_contact_banks_qa.mjs'],{stdio:'ignore'});
 const banks=JSON.parse(await readFile('.cache/contact-bank-qa/walking.json','utf8')),species='lion',asset=await actorAsset('public'+ANIMAL_ACTIONS.animals[species].url),model=prepareAnimalModel(asset.scene,species),root=new Group();root.add(model);root.position.set(4,0,3);root.rotation.y=.7;
 const data={model,mixer:new AnimationMixer(model),clips:prepareAnimalClips(asset.animations),groundSamples:animalGroundSamples(model),cachedSkinning:2},actor={id:'test',species,status:'walking',motionPhase:banks[species].times[10]},surface=(x,z)=>.2*(x-4)-.1*(z-3),candidate=createContactBankCandidate(banks,true,{beastPhysics:{entries:new Map()}});
 const pose=()=>{applyAnimalPose(data,actor,actor.motionPhase);root.updateMatrixWorld(true);};
 pose();const expected=supportAnimalOnTerrain(data,surface);pose();const actual=candidate.apply(data,actor,surface);
 assert.ok(Math.abs(actual-expected)<1e-5,`Stored-sample support differs: ${actual} vs ${expected}`);assert.equal(candidate.stats.candidate,1);
 pose();data.recoveryExit={};const fallback=candidate.apply(data,actor,surface);delete data.recoveryExit;
 assert.ok(Math.abs(fallback-expected)<1e-9);assert.equal(candidate.stats.fallback['recovery-exit'],1);assert.equal(candidate.stats.candidate,1);
});
