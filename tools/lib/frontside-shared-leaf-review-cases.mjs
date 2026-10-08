// Prospective views of the fixed derivative, not inputs to geometry selection.
// Maize duration270s, source MARKS[3..4]=.78..1, morphSeconds2:
// final bridge start .9544962962962963/end .9619037037037037.
const base={growth:1,clock:1.75,biome:'sabana',night:0,elevation:32.5,azimuth:26.25,expectedPhase:'original',expectedMatureActive:true};
const transition={clock:6.1875,biome:'gran-rio',night:.5,elevation:23.75,azimuth:142.875};
export const sharedLeafReviewCases=Object.freeze([
 {id:'training-mature',...base},
 {id:'mature-day-gran-rio',...base,clock:2.8125,biome:'gran-rio',elevation:18.75,azimuth:83.875},
 {id:'mature-night-volcanes',...base,clock:5.5625,biome:'volcanes',night:1,elevation:30.625,azimuth:218.375},
 {id:'mature-dawn-manglares',...base,clock:.9375,biome:'manglares',night:.5,elevation:58.125,azimuth:332.875},
 {id:'before-final-bridge',...base,...transition,growth:.9543862962962963,expectedMatureActive:false},
 {id:'start-final-bridge',...base,...transition,growth:.9546062962962963,expectedPhase:'morph',expectedMatureActive:false},
 {id:'mid-final-bridge',...base,...transition,growth:.9582,expectedPhase:'morph',expectedMatureActive:false},
 {id:'end-final-bridge',...base,...transition,growth:.9617937037037037,expectedPhase:'morph',expectedMatureActive:false},
 {id:'first-derived-native',...base,...transition,growth:.9620137037037037},
 {id:'later-derived-native',...base,...transition,growth:.9865}
]);
