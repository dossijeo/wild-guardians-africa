// Explicit QA-only coverage comparison. Geometry, atlas orientation, resource
// epochs and readiness remain untouched; unprepared trees keep their fallback.
export function inspectFarTransition(layer,standby,start,end){
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start)throw Error('Invalid inspection transition');
 layer.options.start=start;layer.options.end=end;
 layer.fade.start=start;layer.fade.end=end;layer.fade.cache=new WeakMap();
 standby.start=start;standby.end=end;
 const uniforms=layer.current?.prototype.uniforms;
 if(uniforms){uniforms.uStart.value=start;uniforms.uEnd.value=end;}
}
