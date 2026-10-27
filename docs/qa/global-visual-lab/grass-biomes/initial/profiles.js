import {applyMaterialStudy as applyStreaming} from './qa-grass-streaming.js';
export const grassProfiles={
 'sabana':{color:[1,1,1],density:.55,minGroup:3,maxGroup:7,scale:1},
 'gran-rio':{color:[.42,1,.55],density:.55,minGroup:3,maxGroup:7,scale:1},
 'manglares':{color:[.32,.72,.40],density:.38,minGroup:3,maxGroup:6,scale:.9},
 'volcanes':{color:[.60,.62,.38],density:.10,minGroup:2,maxGroup:4,scale:.7},
 'gran-canon':{color:[.90,.82,.55],density:.18,minGroup:2,maxGroup:4,scale:.8},
 'desierto':{color:[1,.90,.65],density:.06,minGroup:1,maxGroup:3,scale:.65},
};
export async function applyMaterialStudy(world){return applyStreaming(world,{assetPath:'/assets/visual-lab/grass-arched.glb',profiles:grassProfiles,naturalGroups:true});}
