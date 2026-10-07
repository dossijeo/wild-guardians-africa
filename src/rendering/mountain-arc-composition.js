// Decorative landscape composition, independent of procedural object IDs.
export function mountainArcComposition(cells,seed){
 if(!Array.isArray(cells)||cells.length!==4||!Number.isSafeInteger(seed))throw Error('Invalid decorative mountain composition');
 let h=seed>>>0;h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);h=(h^(h>>>16))>>>0;
 const offset=(h/4294967296-.5)*.35;
 const angles=[0,95,185,275],heights=[110,90,100,80];
 return cells.map((cell,index)=>({angle:angles[index]*Math.PI/180+offset,height:heights[index],aspect:4,baseY:-35,baseline:cell.baseline,uv:[...cell.uv]}));
}
