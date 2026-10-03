// Preserve the received HDR recipe, including extrapolation outside [0,1].
// Uniform branches only bypass the unused sampler at exact day/night endpoints;
// the QA switch restores both reads without recompilation or texture changes.
export const endpointGuard='\n if(uEnvEndpoints>.5){\n  if(uNight==0.)return textureLod(uEnvDay,uv,rough*7.).rgb*4.;\n  if(uNight==1.)return textureLod(uEnvNight,uv,rough*7.).rgb*4.+vec3(.025,.045,.10);\n }';
export function endpointEnvironment(source){
  const marker='\n vec3 day=textureLod(uEnvDay,uv,rough*7.).rgb*4.;\n vec3 night=textureLod(uEnvNight,uv,rough*7.).rgb*4.;\n return mix(day,night+vec3(.025,.045,.10),uNight);';
  if(!source.includes(marker))throw Error('HDR endpoint sampling requires the authored environment recipe');
  return source.replace(marker,endpointGuard+marker);
}
