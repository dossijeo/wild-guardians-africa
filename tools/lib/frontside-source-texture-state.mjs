// Source-only QA metadata. Does not read GPU texels or establish causal equality.
// Kept separate until the pending crop pilot finishes: no live fixture imports.
export function captureSourceTextureState(gl, uniforms, identity) {
  const samplerTargets = new Map([
    [gl.SAMPLER_2D, gl.TEXTURE_2D],
    [gl.SAMPLER_2D_SHADOW, gl.TEXTURE_2D],
    [gl.INT_SAMPLER_2D, gl.TEXTURE_2D],
    [gl.UNSIGNED_INT_SAMPLER_2D, gl.TEXTURE_2D],
    [gl.SAMPLER_CUBE, gl.TEXTURE_CUBE_MAP],
    [gl.SAMPLER_CUBE_SHADOW, gl.TEXTURE_CUBE_MAP],
    [gl.INT_SAMPLER_CUBE, gl.TEXTURE_CUBE_MAP],
    [gl.UNSIGNED_INT_SAMPLER_CUBE, gl.TEXTURE_CUBE_MAP],
    [gl.SAMPLER_3D, gl.TEXTURE_3D],
    [gl.INT_SAMPLER_3D, gl.TEXTURE_3D],
    [gl.UNSIGNED_INT_SAMPLER_3D, gl.TEXTURE_3D],
    [gl.SAMPLER_2D_ARRAY, gl.TEXTURE_2D_ARRAY],
    [gl.SAMPLER_2D_ARRAY_SHADOW, gl.TEXTURE_2D_ARRAY],
    [gl.INT_SAMPLER_2D_ARRAY, gl.TEXTURE_2D_ARRAY],
    [gl.UNSIGNED_INT_SAMPLER_2D_ARRAY, gl.TEXTURE_2D_ARRAY],
  ]);
  const bindings = new Map([
    [gl.TEXTURE_2D, gl.TEXTURE_BINDING_2D],
    [gl.TEXTURE_CUBE_MAP, gl.TEXTURE_BINDING_CUBE_MAP],
    [gl.TEXTURE_3D, gl.TEXTURE_BINDING_3D],
    [gl.TEXTURE_2D_ARRAY, gl.TEXTURE_BINDING_2D_ARRAY],
  ]);
  const params = {
    minFilter: gl.TEXTURE_MIN_FILTER, magFilter: gl.TEXTURE_MAG_FILTER,
    wrapS: gl.TEXTURE_WRAP_S, wrapT: gl.TEXTURE_WRAP_T,
    baseLevel: gl.TEXTURE_BASE_LEVEL, maxLevel: gl.TEXTURE_MAX_LEVEL,
    minLod: gl.TEXTURE_MIN_LOD, maxLod: gl.TEXTURE_MAX_LOD,
    compareMode: gl.TEXTURE_COMPARE_MODE, compareFunc: gl.TEXTURE_COMPARE_FUNC,
  };
  const active = gl.getParameter(gl.ACTIVE_TEXTURE), result = [];
  try {
    for (const uniform of uniforms) {
      const target = samplerTargets.get(uniform.type);
      if (target === undefined) continue;
      for (const unit of Array.isArray(uniform.value) ? uniform.value : [uniform.value]) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        const texture = gl.getParameter(bindings.get(target));
        const sampler = gl.getParameter(gl.SAMPLER_BINDING);
        const textureParameters = texture ? Object.fromEntries(Object.entries(params).map(([name, parameter]) => [name, gl.getTexParameter(target, parameter)])) : null;
        const samplerParameters = sampler ? Object.fromEntries(Object.entries(params).filter(([name]) => name !== 'baseLevel' && name !== 'maxLevel').map(([name, parameter]) => [name, gl.getSamplerParameter(sampler, parameter)])) : null;
        result.push({ uniform: uniform.name, type: uniform.type, unit, target, texture: identity(texture), sampler: identity(sampler), textureParameters, samplerParameters });
      }
    }
  } finally { gl.activeTexture(active); }
  return result;
}
