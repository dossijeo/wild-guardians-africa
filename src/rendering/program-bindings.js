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
