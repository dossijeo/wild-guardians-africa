// Fixed chronological seam plans, independent of camera/metrics or repaired faces.
export function youngLeafContinuousPlan(seam){
 if(![0,1].includes(seam))throw Error('Unexpected young seam');const mid=seam===0?.065+(.27-.065)*.81:.27+(.53-.27)*.81,half=1/270;
 return Object.freeze({profile:'YOUNG_LEAF_DOUBLE_CONTINUITY_V1',seam,durationSeconds:16,growthStart:mid-.014,growthSeconds:270,windClockStart:6.1875,plants:9,grid:3,spacing:1.5,fov:42,viewport:[640,720],gameCamera:[9,9,12],closeupCamera:[2,2.5,3],target:[0,.6,0],captureGrowth:[mid-half-.00011,mid-half+.00011,mid,mid+half-.00011,mid+half+.00011],biome:'gran-rio'});
}
