// Exact bijection on a bounded integer grid. Every other coordinate remains
// native; no quantization/clamping. Exclude zero axes to preserve signed-zero
// behavior without a sign check on every successful lookup.
export function qaFlatLatticeKey(x,z){
 if(!Number.isInteger(x)||!Number.isInteger(z)||x===0||z===0||x< -8192||x>=8192||z< -8192||z>=8192)return null;
 return (x+8192)*16384+z+8192;
}
