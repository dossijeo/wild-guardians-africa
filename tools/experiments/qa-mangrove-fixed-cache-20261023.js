import {createMangroveMaterialCache} from '/src/rendering/mangrove-material-cache.js';
export async function installFixedCache(w){
 const c=createMangroveMaterialCache(w),original=w.render;
 const render=function(...args){c.update();return original.apply(this,args);};w.render=render;
 const dispose=c.dispose;c.dispose=()=>{if(w.render===render)w.render=original;dispose();};
 w.qaFixedGround=c;return c.stats;
}
