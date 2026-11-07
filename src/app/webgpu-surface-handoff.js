// A recovery canvas stays hidden and the old binding stays owned until the
// replacement has submitted a frame for the current camera and viewport.
// A submitted frame is not a compositor presentation guarantee.
export async function handoffWebGpuSurface({client,canvas,previous,isCurrent,readCamera,readSize,bind,commit,beforeCommit=()=>{},beforePublish=()=>{},afterPublish=()=>{},minSequence,timeoutMs=20000,requestFrame=globalThis.requestAnimationFrame,cancelFrame=globalThis.cancelAnimationFrame}={}){
 if(!client||!canvas||typeof isCurrent!=='function'||typeof readCamera!=='function'||typeof readSize!=='function'||typeof bind!=='function'||typeof commit!=='function'||typeof beforeCommit!=='function'||typeof beforePublish!=='function'||typeof afterPublish!=='function'||!Number.isSafeInteger(minSequence)||minSequence<0||!Number.isFinite(timeoutMs)||timeoutMs<=0||typeof requestFrame!=='function'||typeof cancelFrame!=='function')throw TypeError('Invalid surface handoff');
 const abort=new AbortController();let syncFrame=null;const timer=setTimeout(()=>abort.abort(),timeoutMs);
 function sync(){if(!isCurrent()){abort.abort();return;}client.setCamera(readCamera());const {width,height}=readSize();client.resize(width,height);}
 function tick(){sync();if(!abort.signal.aborted)syncFrame=requestFrame(tick);}
 try{tick();const waitCurrent=async()=>{for(;;){await client.waitForCurrentFrame({minSequence,signal:abort.signal});if(!isCurrent())throw Error('World changed during visual recovery');sync();if(client.hasCurrentFrame())return;}};await waitCurrent();await beforeCommit();await waitCurrent();const next=bind();if(!isCurrent()){next.dispose();throw Error('World changed during visual recovery');}try{beforePublish();commit(next);canvas.style.visibility='';afterPublish();}catch(error){next.dispose();throw error;}previous?.dispose();return next;}finally{clearTimeout(timer);if(syncFrame!==null)cancelFrame(syncFrame);}
}
