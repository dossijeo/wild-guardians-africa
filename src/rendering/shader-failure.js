export const SHADER_FAILURE_MESSAGE='No se pudo dibujar el mundo. Vuelve al menú para reintentarlo.';

// Three reports link failures on first use. Promote that diagnostic to the
// normal loading/runtime error path rather than displaying an invalid world.
export function installShaderFailureGuard(renderer){
  const failure={current:null};
  renderer.debug.checkShaderErrors=true;
  renderer.debug.onShaderError=(gl,program,vertex,fragment)=>{
    failure.current??=Object.assign(new Error(SHADER_FAILURE_MESSAGE),{
      code:'WORLD_SHADER_FAILURE',
      details:{program:gl.getProgramInfoLog(program),vertex:gl.getShaderInfoLog(vertex),fragment:gl.getShaderInfoLog(fragment)}
    });
    throw failure.current;
  };
  return failure;
}
