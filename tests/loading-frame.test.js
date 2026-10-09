import test from 'node:test';
import assert from 'node:assert/strict';
import {paintLoadingFrame} from '../src/ui/loading-frame.js';
const fixture=()=>{
 const draws=[],canvas={width:0,height:0,dataset:{},getContext:()=>({setTransform(){},clearRect(){},drawImage(...args){draws.push(args);}})};
 const host={clientWidth:440,clientHeight:82,querySelector:()=>canvas};
 const images=Object.fromEntries(['top','bottom','left','right','tl','tr','bl','br'].map(key=>['frame_'+key,{key}]));
 return {host,canvas,images,draws};
};
test('loading borrows HUD images and paints once per size, not per progress frame',()=>{
 const f=fixture();assert.equal(paintLoadingFrame(f.host,f.images,{dpr:2}),true);assert.equal(f.draws.length,8);
 assert.equal(f.canvas.width,880);assert.equal(f.canvas.height,164);
 for(let i=0;i<120;i++)assert.equal(paintLoadingFrame(f.host,f.images,{dpr:2}),false);
 assert.equal(f.draws.length,8);assert.equal(f.draws[0][0],f.images.frame_top);
 f.host.clientWidth=320;assert.equal(paintLoadingFrame(f.host,f.images,{dpr:2}),true);assert.equal(f.draws.length,16);
});
test('hidden loading controls defer painting and small cancel frames retain positive image dimensions',()=>{
 const f=fixture();f.host.clientWidth=0;assert.equal(paintLoadingFrame(f.host,f.images),false);
 f.host.clientWidth=132;f.host.clientHeight=52;assert.equal(paintLoadingFrame(f.host,f.images,{dpr:1}),true);
 for(const [,x,y,w,h] of f.draws){assert.ok(Number.isFinite(x)&&Number.isFinite(y));assert.ok(w>0&&h>0);}
});
