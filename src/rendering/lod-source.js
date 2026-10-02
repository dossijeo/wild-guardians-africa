// Original Bioma Lab V4.0 updateAssetLods distance selection, verbatim.
export const LOD_SOURCE_SHA256='c1eaa6a1fa947b53110bacc5d776672159217350d40ded570b7f53fd85591ebe';
export function nativeLodBins(instances,prototype,group,eye,quality,levels){
 const b={instances,group,slot:0,variants:Array(levels)},prototypes=[prototype],cam={eye},mode='terrain';
 const state={assetLOD:true,quality:quality==='alta'?'high':['muy_baja','baja'].includes(quality)?'eco':'normal'};
   const bins=[[],[],[]],offX=b.chunk?b.chunk.cx*48:0,offZ=b.chunk?b.chunk.cz*48:0,p=prototypes[b.slot],q=state.quality==='eco'?.80:state.quality==='high'?1.25:1;
   for(let i=0;i<b.instances.length;i++){
    const a=b.instances[i];let level=0;
    if(mode==='terrain'&&state.assetLOD){
     const radius=Math.max(p.size[0]*a.sx,p.size[2]*a.sz)*.25;
     const d=Math.max(0,Math.hypot(a.x+offX-cam.eye[0],a.y+p.centerY*a.sy-cam.eye[1],a.z+offZ-cam.eye[2])-radius);
     const ranges=p.role==='formation'?[50,105,10000]:b.group===2?[10,25,64]:b.group===1?[16,38,95]:b.group===4?[17,42,110]:b.group===0?[38,85,10000]:b.group===5?[35,75,10000]:[24,55,160];
     if(d>ranges[2]*q)continue;level=d<ranges[0]*q?0:d<ranges[1]*q?1:2;
    }
    bins[Math.min(level,b.variants.length-1)].push(i);
   }
 return bins;
}
