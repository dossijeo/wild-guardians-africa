// QA-only: recreate the rejected per-actor graph-reuse candidate.
const edits=[['bindings=new Map(),graphsByBase=new WeakMap();','bindings=new Map();'],['const transform=base=>{const cached=graphsByBase.get(base);if(cached)return cached;const graph=Fn(()=>{','const transform=base=>Fn(()=>{'],['})();graphsByBase.set(base,graph);return graph;};','})();']];
function replace(source,changes){
 for(const [before,after] of changes){if(source.split(before).length!==2)throw Error('Motion graph anchor missing');source=source.replace(before,after);}return source;
}
export const motionGraphBaseline=source=>replace(source,edits);
export const motionGraphCandidate=source=>replace(source,edits.map(([candidate,baseline])=>[baseline,candidate]));
