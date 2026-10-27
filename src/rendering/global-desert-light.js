// Experimental terrain lighting: preserve palette/endpoints and soften four-level bands.
export function patchDesertLight(source){
 const from='float toonRamp4(float x,float levels){x=clamp(x,0.,1.);return floor(x*(levels-.0001))/max(levels-1.,1.);}';
   const to=`float toonRamp4(float x,float levels){
    x=clamp(x,0.,1.);
    if(levels>3.5)return (smoothstep(.13,.37,x)+smoothstep(.38,.62,x)+smoothstep(.63,.87,x))/3.;
    return (smoothstep(.213333,.453333,x)+smoothstep(.546667,.786667,x))*.5;
   }`;
   if(!source.includes(from))throw Error('Terrain lighting ramp anchor missing');
   return source.replace(from,to);
}
