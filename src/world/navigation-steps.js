export function consumeSteps(iterator){
 try{let step;do{step=iterator.next();}while(!step.done);return step.value;}
 finally{iterator.return?.();}
}

// Geometry boundaries are genuine resumable points. Native route generators
// preserve caches and eight-node A* batches instead of restarting a search.
export function* navigationCall(nav,method,...args){
 const stepped=nav[`${method}Steps`];
 if(typeof stepped==='function')return yield* stepped.apply(nav,args);
 yield {kind:'geometry',method};return nav[method](...args);
}
