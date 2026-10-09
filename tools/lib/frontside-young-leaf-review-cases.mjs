// Independent prospective young-state controls; geometry is not selected by view.
const base={clock:1.75,biome:'sabana',night:0,elevation:32.5,azimuth:26.25};
const half=1/270,incoming=.065+(.27-.065)*.81,outgoing=.27+(.53-.27)*.81;
export const youngLeafReviewCases=Object.freeze([
 {id:'young-training',...base,growth:.31,expectedPhase:'original',expectedYoungActive:true},
 ...[incoming,outgoing].flatMap((mid,i)=>[-half-.00011,-half+.00011,0,half-.00011,half+.00011].map((delta,j)=>({id:(i?'young-outgoing':'young-incoming')+'-'+j,...base,clock:6.1875,biome:'gran-rio',azimuth:142.875,elevation:23.75,growth:mid+delta,expectedPhase:j>=1&&j<=3?'morph':'original',expectedYoungActive:i?j===0:j===4}))),
 {id:'young-night',...base,growth:.31,expectedPhase:'original',expectedYoungActive:true,biome:'volcanes',night:1,azimuth:218.375,elevation:30.625,clock:5.5625}
]);

