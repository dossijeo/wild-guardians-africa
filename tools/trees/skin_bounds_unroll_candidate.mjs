// Keep operation order and branch behavior identical to the production loop.
export function unrollSkinBounds(source){
 const start=source.indexOf('    for(let k=0;k<4;k++){const w=weights[n*4+k]');
 const end=source.indexOf('\n    const px=',start);
 if(start<0||end<0)throw Error('sampler implementation changed');
 const branch=k=>`{const w=weights[n*4+${k}];if(w){const o=joints[n*4+${k}];sx+=w*(matrices[o]*x+matrices[o+4]*y+matrices[o+8]*z+matrices[o+12]);sy+=w*(matrices[o+1]*x+matrices[o+5]*y+matrices[o+9]*z+matrices[o+13]);sz+=w*(matrices[o+2]*x+matrices[o+6]*y+matrices[o+10]*z+matrices[o+14]);}}`;
 return source.slice(0,start)+[0,1,2,3].map(branch).join('\n')+source.slice(end);
}
