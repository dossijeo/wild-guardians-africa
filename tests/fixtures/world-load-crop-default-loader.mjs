import {load as fakeWorldDependencies} from './world-load-cpu-loader.mjs';
export async function load(url,context,next){
 const path=new URL(url).pathname;
 if(path.endsWith('/src/rendering/assets.js')||path.endsWith('/src/rendering/crop-library.js'))return next(url,context);
 return fakeWorldDependencies(url,context,next);
}
