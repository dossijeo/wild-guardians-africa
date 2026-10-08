import {decodeRadiance} from './sky-source.js';
import {buildEnvironmentPixels} from './fluid-lighting-source.js';
export function prepareSkyPixels(buffer,index){const image=decodeRadiance(buffer);return {image,environment:buildEnvironmentPixels(image,index)};}
