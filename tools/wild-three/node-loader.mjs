// Resolve QA tests against the isolated pinned dependency, not the shared junction.
export async function resolve(specifier,context,nextResolve){
 if(specifier==='three')return {url:new URL('./node_modules/three/build/three.module.js',import.meta.url).href,shortCircuit:true};
 if(specifier.startsWith('three/'))return {url:new URL('./node_modules/three/'+specifier.slice(6).replace(/^addons\//,'examples/jsm/'),import.meta.url).href,shortCircuit:true};
 return nextResolve(specifier,context);
}
