import test from 'node:test';
import assert from 'node:assert/strict';
import {createShadowRecipeRenderer} from '../src/rendering/shadow-recipe-renderer.js';

for (const fails of [false, true]) test(`shadow recipe restores live state on ${fails ? 'failure' : 'success'}`, () => {
 let invalidations = 0;
 const material = {set needsUpdate(value) {assert.equal(value, true); invalidations++;}};
 const scene = {traverse: fn => {fn({material}); fn({material: [material]});}};
 const result = new Set([material]);
 const renderer = {shadowMap: {enabled: true}, compile() {
  assert.equal(this, renderer); assert.equal(this.shadowMap.enabled, false);
  if (fails) throw Error('driver failure'); return result;
 }, getContext() {assert.equal(this, renderer); return result;}};
 const view = createShadowRecipeRenderer(renderer, false);
 if (fails) assert.throws(() => view.compile(scene, {}, scene), /driver failure/);
 else assert.equal(view.compile(scene, {}, scene), result);
 assert.equal(renderer.shadowMap.enabled, true);
 assert.equal(invalidations, 1);
 assert.equal(view.getContext(), result);
 assert.equal(view.getContext, view.getContext);
});
