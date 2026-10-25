export async function measureNativeMotion(d){
 const r=d.world.renderer,gl=r.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');if(!ext)throw Error('GPU timer unavailable');
 const debug=gl.getExtension('WEBGL_debug_renderer_info'),frames=[];r.info.autoReset=false;let angle=0;d.orbit.step=()=>angle;
 for(const phase of ['day','night'])for(const motion of ['static','wind','orbit','both'])for(const [block,force] of [false,true,true,false].entries()){
  d.state.time=phase==='day'?150:350;d.orbit.reducedMotion=motion!=='wind'&&motion!=='both';
  const pose=i=>{d.plants.time=i/30;angle=motion==='orbit'||motion==='both'?Math.sin(i/30*.7)*Math.PI/18:0;if(force)r.shadowMap.needsUpdate=true;};
  for(let i=0;i<30;i++){pose(i);d.render(0,.75);await new Promise(requestAnimationFrame);}
  const pending=[];let lastRaf=null;
  for(let i=0;i<24;i++){
   const raf=await new Promise(requestAnimationFrame),rafDelta=lastRaf===null?null:raf-lastRaf;lastRaf=raf;
   pose(i+30);r.info.reset();const q=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,q);const t=performance.now();d.render(0,.75);const cpu=performance.now()-t;gl.endQuery(ext.TIME_ELAPSED_EXT);
   pending.push({q,frame:{phase,motion,block,force,i,cpu,rafDelta,calls:r.info.render.calls,triangles:r.info.render.triangles}});
  }
  for(const {q,frame} of pending){const wait=performance.now();while(!gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)){if(performance.now()-wait>15000)throw Error('GPU query timeout');await new Promise(res=>setTimeout(res,8));}const gpu=gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6,disjoint=gl.getParameter(ext.GPU_DISJOINT_EXT);gl.deleteQuery(q);frames.push({...frame,gpu,disjoint});}

 }
 return {renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),note:'Native diffuse option only; no visual QA routes. ABBA natural shadow cache / forced refresh, identical camera and wind clocks within blocks. Four plants at .75, 1280x720. Thirty RAF warmups and 24 RAF-paced pipelined GPU queries per block. CPU is render submission; GPU excludes query waiting. Not FPS, loading time, or an original-vs-diffuse quality comparison.',frames};
}
