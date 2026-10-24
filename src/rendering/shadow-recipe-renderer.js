// A preparation-only view. The live renderer keeps its current quality between
// synchronous submissions; readiness polling must never hold renderer state.
export function createShadowRecipeRenderer(renderer, enabled) {
 const bound = new Map();
 const compile = (scene, camera, targetScene) => {
  const materials = new Set();
  scene.traverse(object => {
   for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
    if (material) materials.add(material);
   }
  });
  const previous = renderer.shadowMap.enabled;
  try {
   renderer.shadowMap.enabled = enabled;
   return renderer.compile(scene, camera, targetScene);
  } finally {
   renderer.shadowMap.enabled = previous;
   // compile selects currentProgram even though it does not draw. Make the
   // next live draw reselect its own cached recipe rather than the staged one.
   for (const material of materials) material.needsUpdate = true;
  }
 };
 return new Proxy(renderer, {
  get(target, key) {
   if (key === 'compile') return compile;
   const value = Reflect.get(target, key, target);
   if (typeof value !== 'function') return value;
   if (bound.get(key)?.original !== value) bound.set(key, {original: value, call: value.bind(target)});
   return bound.get(key).call;
  },
 });
}
