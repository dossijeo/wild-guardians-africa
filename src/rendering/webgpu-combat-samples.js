import {MAX_SPRITES,packVfxSprites} from './vfx-native.js';

// Whole visual frames, not interpolated vertex identities: the authored
// ribbons change topology at attack boundaries. Sample their original output
// at 60 Hz and choose a complete frame on GPU without morphing unrelated faces.
export function bakeWebGpuCombatWindow({native,rects,camera,seconds=.5}){
 if(!native?.beginCombatTransaction||!rects||!camera||!Number.isFinite(seconds)||seconds<=0||seconds>1)throw TypeError('Invalid combat sample window');
 const transaction=native.beginCombatTransaction(),start=native.time,frames=[],scratch=new Float32Array(MAX_SPRITES*25);let maxSprites=0,maxVertices=0;
 try{
  const count=Math.max(2,Math.ceil(seconds*60)+1);
  for(let i=0;i<count;i++){
   if(i)native.advance(1/60);
   const packed=packVfxSprites(native.sprites(),rects,camera,scratch),geometry=native.geometry();
   if(native.lights.colors.some(color=>color.some(value=>value!==0)))throw Error('Combat sample contains dynamic world lights');
   frames.push({sprites:packed.data.slice(0,packed.count*25),count:packed.count,geometry,phase:native.time});
   maxSprites=Math.max(maxSprites,packed.count);maxVertices=Math.max(maxVertices,geometry.length/11);
  }
 }finally{transaction.rollback();}
 const width=1024,spriteTexels=Math.max(1,maxSprites)*7,geometryOffset=1+spriteTexels,rows=Math.max(1,Math.ceil((geometryOffset+Math.max(1,maxVertices)*3)/width)),height=rows*frames.length;
 const data=new Float32Array(width*height*4);
 for(let frame=0;frame<frames.length;frame++){
  const value=frames[frame],base=frame*rows*width*4;data.set([value.count,value.geometry.length/11,value.phase,0],base);
  for(let i=0;i<value.count;i++)data.set(value.sprites.subarray(i*25,i*25+25),base+4+i*28);
  for(let i=0;i<value.geometry.length/11;i++)data.set(value.geometry.subarray(i*11,i*11+11),base+geometryOffset*4+i*12);
 }
 return {data,width,height,rows,frameCount:frames.length,start,end:frames.at(-1).phase,duration:native.definition.duration,sprites:maxSprites,vertices:maxVertices,geometryOffset};
}
