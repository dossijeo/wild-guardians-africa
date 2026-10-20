import {applyMaterialStudy as applyStreaming} from './qa-grass-streaming.js';
export const grassProfiles={
 'sabana':{color:[1,1,1],density:.55,minGroup:3,maxGroup:7,scale:1},
 'gran-rio':{color:[.42,1,.55],density:.55,minGroup:3,maxGroup:7,scale:1},
 'manglares':{color:[.40,.85,.45],density:.38,minGroup:3,maxGroup:6,scale:1},
 'volcanes':{color:[1,.78,.32],density:.30,minGroup:3,maxGroup:6,scale:1},
 'gran-canon':{color:[.90,.82,.55],density:.55,minGroup:3,maxGroup:7,scale:1},
 'desierto':{color:[1,.90,.65],density:.10,minGroup:2,maxGroup:4,scale:1},
};
export async function applyMaterialStudy(world){return applyStreaming(world,{assetPath:'/assets/visual-lab/grass-arched.glb',profiles:grassProfiles,naturalGroups:true});}
