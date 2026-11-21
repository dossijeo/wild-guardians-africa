import {decodeRadiance} from './sky-source.js';
import {buildEnvironmentPixels} from './fluid-lighting-source.js';
import {createWaterSlopePixels} from './water-slope-pixels.js';
export function prepareSkyPixels(buffer,index,{waterSlope=false}={}){const image=decodeRadiance(buffer);return {image,environment:buildEnvironmentPixels(image,index),...(waterSlope&&index===0?{waterSlope:createWaterSlopePixels()}:{})};}
