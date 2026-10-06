// Every control and candidate pair contributes to the verdict. A single matching
// native/candidate pair cannot establish equivalence of the complete sequence.
export function summarizeDepthComparisons(comparisons){
 if(!comparisons.length||comparisons.some(c=>!(c.depth.nonUniformPixels>0)))throw Error('Nonconstant depth readbacks required');
 const affectedPairs=comparisons.filter(c=>c.depth.differentPixels>0).map(c=>c.pair);
 return {
  differentPixels:Math.max(...comparisons.map(c=>c.depth.differentPixels)),
  maxDepthDelta:Math.max(...comparisons.map(c=>c.depth.maxDepthDelta)),
  depthIdentical:affectedPairs.length===0,
  affectedPairs,
 };
}
