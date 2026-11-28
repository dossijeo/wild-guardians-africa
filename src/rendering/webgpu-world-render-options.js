// Match the legacy world renderer's anti-aliasing by default. Auxiliary render
// targets retain their own sample counts; this only configures the main canvas.
export function webGpuWorldRenderOptions(canvas,antialiasSetting){
 if(!canvas||antialiasSetting!==undefined&&!['true','false'].includes(antialiasSetting))throw TypeError('Invalid WebGPU world render options');
 return {canvas,antialias:antialiasSetting!=='false'};
}
