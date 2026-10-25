// QA only: shared night-light uniform, no change to simulation time or daytime sun.
export function applyMaterialStudy(world){
 const update=world.toon.update;let enabled=true;
 world.toon.update=function(...args){update.apply(this,args);if(enabled)this.uniforms.uNightLight.value=1.55;};
 world.qaNightSetEnabled=value=>{enabled=!!value;};
 return {baselineNightLight:1.12,candidateNightLight:1.55,newTextures:0,newGeometry:0,scope:'Shared lighting uniform for ground, objects and water; day/night interpolation remains in existing shaders'};
}
