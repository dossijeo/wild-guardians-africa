// Initial weights are estimates from the native Sabana/Mapungubwe pilot; each
// progress update is actual completed work. Recalibrate with the coverage runs.
export const LOADING_STAGES=Object.freeze([
 {id:'configuration',weight:8},{id:'sky',weight:4},{id:'biome',weight:4},
 {id:'buildings',weight:8},{id:'animals',weight:10},{id:'crops',weight:6},
 {id:'walls',weight:4},{id:'vfx',weight:2},{id:'chunks',weight:8},
 {id:'gpu',weight:15},{id:'far-assets',weight:25},{id:'visible-ready',weight:6}
]);
