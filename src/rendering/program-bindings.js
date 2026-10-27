// Three 0.180 defers diagnostics and uniform/attribute reflection until first
// use, even after compileAsync resolves. Pay that cost behind the loading screen
// for every already-compiled resident variant, including currently hidden ones.
export function initializeProgramBindings(renderer){
  const stats={initialized:0,unsupported:0};
  for(const program of new Set(renderer.info.programs??[])){
    // Keep the existing real-draw warmup if a future renderer changes this API.
    if(typeof program?.getUniforms!=='function'||typeof program?.getAttributes!=='function'){stats.unsupported++;continue;}
    program.getUniforms();program.getAttributes();stats.initialized++;
  }
  return stats;
}

// Prepare one program per cooperative batch. Reflection is real synchronous GL
// work, so the budget is checked after each program rather than disguising it.
export async function initializeProgramBindingsAsync(renderer,{cancelled=()=>false,budgetMs=4,now=()=>performance.now(),nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve))}={}){
 const stats={initialized:0,unsupported:0};let start=now();
 for(const program of new Set(renderer.info.programs??[])){
  if(cancelled())throw Error('Loading program bindings cancelled');
  if(typeof program?.getUniforms!=='function'||typeof program?.getAttributes!=='function'){stats.unsupported++;continue;}
  program.getUniforms();program.getAttributes();stats.initialized++;
  if(now()-start>=budgetMs){await nextFrame();start=now();}
 }
 return stats;
}

// Validate the actual linked program before initializing Three r180 bindings.
// Successful shader log strings can force expensive driver round trips even
// after KHR readiness. Preserve full Three diagnostics on failure; never disable
// checking for unrelated programs or across an asynchronous boundary.
export function initializeValidatedProgramBindings(renderer,program){
 const gl=renderer.getContext();
 if(!program?.program||typeof program.getUniforms!=='function'||typeof program.getAttributes!=='function')throw Error('Unsupported program binding validation');
 if(gl.isContextLost())throw Error('Program binding validation cancelled');
 const linked=gl.getProgramParameter(program.program,gl.LINK_STATUS);
 if(linked!==true){
  const before=renderer.debug.checkShaderErrors;
  try{renderer.debug.checkShaderErrors=true;program.getUniforms();}finally{renderer.debug.checkShaderErrors=before;}
  throw Error('GPU program failed link validation: '+(program.name??''));
 }
 const before=renderer.debug.checkShaderErrors;
 try{renderer.debug.checkShaderErrors=false;program.getUniforms();program.getAttributes();}
 finally{renderer.debug.checkShaderErrors=before;}
 if(gl.isContextLost())throw Error('Program binding validation cancelled');
}
