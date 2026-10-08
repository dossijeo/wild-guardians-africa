// Fault-injected binding restoration contract, not a real GPU texel test.
import assert from 'node:assert/strict';
import {readSourceColorTexels} from './lib/frontside-source-color-texel-audit.mjs';
for(const mode of ['complete','incomplete','throw','tail']){
 const keys=['ACTIVE_TEXTURE','READ_FRAMEBUFFER_BINDING','READ_BUFFER','PIXEL_PACK_BUFFER_BINDING','PACK_ALIGNMENT','PACK_ROW_LENGTH','PACK_SKIP_ROWS','PACK_SKIP_PIXELS','SAMPLER_2D','SAMPLER_2D_SHADOW','READ_FRAMEBUFFER','PIXEL_PACK_BUFFER','TEXTURE0','TEXTURE_BINDING_2D','TEXTURE_2D','COLOR_ATTACHMENT0','FRAMEBUFFER_COMPLETE','IMPLEMENTATION_COLOR_READ_FORMAT','IMPLEMENTATION_COLOR_READ_TYPE','RGBA','UNSIGNED_BYTE','FLOAT'];
 const gl=Object.fromEntries(keys.map((key,i)=>[key,i+100])),bound={},textureHandle={},oldFramebuffer={},oldPackBuffer={};
 const state=new Map([[gl.ACTIVE_TEXTURE,gl.TEXTURE0+5],[gl.READ_FRAMEBUFFER_BINDING,oldFramebuffer],[gl.READ_BUFFER,999],[gl.PIXEL_PACK_BUFFER_BINDING,oldPackBuffer],[gl.PACK_ALIGNMENT,8],[gl.PACK_ROW_LENGTH,7],[gl.PACK_SKIP_ROWS,2],[gl.PACK_SKIP_PIXELS,3]]),before=new Map(state);
 let deleted=0,reads=0;
 gl.getParameter=p=>p===gl.TEXTURE_BINDING_2D?textureHandle:p===gl.IMPLEMENTATION_COLOR_READ_FORMAT?gl.RGBA:p===gl.IMPLEMENTATION_COLOR_READ_TYPE?gl.UNSIGNED_BYTE:state.get(p);
 gl.createFramebuffer=()=>bound;gl.deleteFramebuffer=f=>{assert.equal(f,bound);deleted++;};
 gl.bindFramebuffer=(target,v)=>{assert.equal(target,gl.READ_FRAMEBUFFER);state.set(gl.READ_FRAMEBUFFER_BINDING,v);};gl.readBuffer=v=>state.set(gl.READ_BUFFER,v);
 gl.bindBuffer=(target,v)=>{assert.equal(target,gl.PIXEL_PACK_BUFFER);state.set(gl.PIXEL_PACK_BUFFER_BINDING,v);};gl.pixelStorei=(p,v)=>state.set(p,v);gl.activeTexture=v=>state.set(gl.ACTIVE_TEXTURE,v);
 gl.framebufferTexture2D=(target,attachment,type,texture,level)=>{assert.equal(target,gl.READ_FRAMEBUFFER);assert.equal(texture,textureHandle);assert.equal(level,mode==='tail'?1:0);};
 gl.checkFramebufferStatus=()=>mode==='incomplete'?888:gl.FRAMEBUFFER_COMPLETE;
 gl.readPixels=(x,y,w,h,format,type,data)=>{reads++;assert.equal(state.get(gl.PIXEL_PACK_BUFFER_BINDING),null);assert.equal(state.get(gl.PACK_ROW_LENGTH),0);if(mode==='throw')throw Error('Injected readback failure');data.fill(13);};
 const texture={isTexture:true,image:{width:2,height:2},generateMipmaps:mode==='tail',mipmaps:[]},material={};
 const renderer={getContext:()=>gl,properties:{get:o=>o===material?{uniforms:{map:{value:texture}}}:{__webglTexture:textureHandle}}};
 let result;
 if(mode==='throw')assert.throws(()=>readSourceColorTexels(renderer,material,[{name:'map',type:gl.SAMPLER_2D,value:3}]),/Injected/);
 else result=readSourceColorTexels(renderer,material,[{name:'map',type:gl.SAMPLER_2D,value:3}],mode==='tail'?1:0);
 assert.deepEqual(state,before);assert.equal(deleted,1);
 if(mode==='complete'){assert.equal(reads,1);assert.equal(result.rows[0].status,'EXPECTED_COLOR_LEVELS_READ');assert.equal(result.rows[0].levels[0].fingerprint.bytes,16);}
 if(mode==='incomplete'){assert.equal(reads,0);assert.equal(result.rows[0].status,'PARTIAL_OR_UNSUPPORTED_NOT_EQUALITY');}
 if(mode==='tail'){assert.equal(reads,1);assert.equal(result.rows[0].status,'REQUESTED_MIP_TAIL_READ');assert.equal(result.rows[0].levels.length,1);assert.equal(result.rows[0].levels[0].level,1);assert.equal(result.rows[0].levels[0].fingerprint.bytes,4);}
}
console.log(JSON.stringify({status:'MOCK_BINDING_RESTORATION_CONTRACT_ONLY',cases:4,limitations:['Fault injection proves helper restoration paths in this mock; actual WebGL attachment support, source texels and source stability remain untested.']}));
