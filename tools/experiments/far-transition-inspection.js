import {treeTransitionRange,validateTreeTransitionPolicy} from './tree-transition-range.js';
// Explicit QA-only coverage comparison. Geometry, atlas orientation, resource
// epochs and readiness remain untouched; unprepared trees keep their fallback.
export function inspectFarTransition(layer,standby,start,end,transitionHeight=null){
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start)throw Error('Invalid inspection transition');
 transitionHeight=validateTreeTransitionPolicy(transitionHeight,start,end);
 layer.options.transitionHeight=transitionHeight;layer.fade.transitionHeight=transitionHeight;standby.transitionHeight=transitionHeight;
 for(const bank of standby.banks??[])for(const entry of bank?.entries?.values()??[])entry.transitionRange=treeTransitionRange(entry,standby.treeHeight,start,end,transitionHeight);
 layer.options.start=start;layer.options.end=end;
 layer.fade.start=start;layer.fade.end=end;layer.fade.cache=new WeakMap();
 standby.start=start;standby.end=end;
 const uniforms=layer.current?.prototype.uniforms;
 if(uniforms){uniforms.uStart.value=start;uniforms.uEnd.value=end;if(layer.current.prototype.setTransitionHeight)layer.current.prototype.setTransitionHeight(transitionHeight);else if(uniforms.uLargeRange)uniforms.uLargeRange.value.set(transitionHeight?.start??start,transitionHeight?.end??end);}
}
