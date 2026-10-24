// Rendering-only source transform, shared by capture and benchmark harnesses.
export function patchRiverWear(source){
 const anchor="if([[.6,0],[-.6,0],[0,.6],[0,-.6],[.42,.42],[-.42,.42],[.42,-.42],[-.42,-.42]].some(([dx,dz])=>sample(c,x+dx,z+dz).ctx[3]>.27)){q.stats.masked++;continue;}";
 const height='(.65+.25*((bits>>>16)&255)/255)*';
 if(!source.includes(anchor)||!source.includes(height))throw Error('River wear anchors missing');
 return source.replace("const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));","const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));\nconst qaWearOffsets=[.6,0,-.6,0,0,.6,0,-.6,.42,.42,-.42,.42,.42,-.42,-.42,-.42];")
 .replace(anchor,"let edgeWear=wear;for(let k=0;k<qaWearOffsets.length;k+=2){edgeWear=Math.max(edgeWear,sample(c,x+qaWearOffsets[k]*((q.edgePadding??.6)/.6),z+qaWearOffsets[k+1]*((q.edgePadding??.6)/.6)).ctx[3]);if(edgeWear>.27)break;}if(edgeWear>.27){q.stats.masked++;continue;}")
 .replace(height,'clamp((.27-edgeWear)/.17,0,1)*'+height);
}
export async function installRiverWearRoute(page){
 await page.route('**/tools/experiments/qa-continuous-grass-river.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:patchRiverWear(await response.text())});});
}
