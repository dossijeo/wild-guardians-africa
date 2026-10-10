export function drainGeometrySteps(iterator){let step;do{step=iterator.next();}while(!step.done);return step.value;}
