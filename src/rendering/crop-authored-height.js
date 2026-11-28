const MARKS=[.065,.27,.53,.78,1];
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const smooth=value=>{const t=clamp(value,0,1);return t*t*(3-2*t);};

// The same height used by the original crop batch; metadata must come from
// its authored stages, not rendered mesh bounds or a provisional LOD.
export function authoredCropHeight(heights,growth){
 if(!Array.isArray(heights)||heights.length!==5||!heights.every(Number.isFinite)||!Number.isFinite(growth))throw TypeError('Missing authored crop heights');
 if(growth<MARKS[0]){const t=smooth(growth/MARKS[0]),sy=.045+(1-.045)*t;return .10+(heights[0]-.10)*sy;}
 if(growth>=1)return heights[4];
 let a=0;while(a<3&&growth>=MARKS[a+1])a++;
 const local=clamp((growth-MARKS[a])/(MARKS[a+1]-MARKS[a]),0,1),e=smooth(local);
 return heights[a]+(heights[a+1]-heights[a])*e;
}
