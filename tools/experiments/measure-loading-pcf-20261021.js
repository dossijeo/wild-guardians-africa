export async function measureLoadingPcf(d){
 const renderer=d.world.renderer,gl=renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
 if(!ext)throw Error('GPU timer unavailable');
 d.orbit.step=()=>0;d.state.time=150;
 const frames=[],debug=gl.getExtension('WEBGL_debug_renderer_info');
 for(const wind of [false,true])for(const enabled of [false,true,false,true]){
  d.sun.castShadow=true;d.qaPcf.value=enabled?1:0;d.orbit.reducedMotion=!wind;
  for(let i=0;i<40;i++){d.plants.time=i/30;d.render(0,.75);await new Promise(requestAnimationFrame);}
  for(let i=0;i<30;i++){
   d.plants.time=i/30;renderer.info.reset();
   const query=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,query);
   const start=performance.now();d.render(0,.75);const cpu=performance.now()-start;
   gl.endQuery(ext.TIME_ELAPSED_EXT);
   const calls=renderer.info.render.calls,triangles=renderer.info.render.triangles;
   const waitStart=performance.now();
   while(!gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE)){if(performance.now()-waitStart>10000)throw Error('GPU query timeout');await new Promise(r=>setTimeout(r,8));}
   const disjoint=gl.getParameter(ext.GPU_DISJOINT_EXT),gpu=gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6;gl.deleteQuery(query);
   frames.push({wind,enabled,i,cpu,gpu,disjoint,calls,triangles});
  }
 }
 d.sun.castShadow=true;d.orbit.reducedMotion=true;
 return {renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),note:'Isolated real diorama render CPU and GPU queries; ABAB original (soil PCFSoft, crop native nine) / four taps, 30 samples each, 40 RAF warmup. Fixed camera, identical wind clock per block. Not load duration or presented FPS. External GPU contention not excluded.',frames};
}
