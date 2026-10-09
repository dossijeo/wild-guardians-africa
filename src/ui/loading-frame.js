// Existing HUD artwork, painted only at attachment/resize. Images are borrowed
// from the menu's retained frame cache; this presentation owns no GPU resources.
export function paintLoadingFrame(host,images,{dpr=Math.min(globalThis.devicePixelRatio||1,2)}={}){
 const canvas=host.querySelector('.loading-frame'),w=host.clientWidth,h=host.clientHeight;
 if(!canvas||!w||!h)return false;
 const width=Math.ceil(w*dpr),height=Math.ceil(h*dpr);
 if(canvas.width===width&&canvas.height===height&&canvas.dataset.painted==='true')return false;
 canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const cw=Math.min(58,h*.77,w*.28),ch=cw*330/400,x=cw*.966;
 ctx.drawImage(images.frame_top,x,cw*.22,Math.max(1,w-x*2),cw*.19);
 ctx.drawImage(images.frame_bottom,x,h-cw*.45,Math.max(1,w-x*2),cw*.1975);
 ctx.drawImage(images.frame_left,cw*.245,cw*.79,cw*.19,Math.max(1,h-cw*1.58));
 ctx.drawImage(images.frame_right,w-cw*.4325,cw*.79,cw*.19,Math.max(1,h-cw*1.58));
 ctx.drawImage(images.frame_tl,0,0,cw,ch);ctx.drawImage(images.frame_tr,w-cw,0,cw,ch);
 ctx.drawImage(images.frame_bl,0,h-ch,cw,ch);ctx.drawImage(images.frame_br,w-cw,h-ch,cw,ch);
 canvas.dataset.painted='true';return true;
}
