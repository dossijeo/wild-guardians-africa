// A queued RAF timestamp can precede performance.now() sampled at load completion.
export function frameDelta(now,lastFrame){return lastFrame?Math.max(0,Math.min(.1,(now-lastFrame)/1000)):0;}
