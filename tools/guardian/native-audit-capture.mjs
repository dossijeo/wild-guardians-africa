// Keep visual acceptance intact, and make intrusive GPU readbacks explicit in
// timing experiments. A timing run is never evidence of visual acceptance.
export function createNativeAuditCapture(page,{output,mode='visual'}={}){
  if(!['visual','timing'].includes(mode))throw Error('QA_NATIVE_CAPTURE_MODE must be visual or timing');
  if(typeof output!=='string'||!output.endsWith('.json'))throw Error('Capture output must end in .json');
  const checkpoints=[];
  return {
    async checkpoint(label){
      if(typeof label!=='string'||!/^[a-z0-9-]+$/i.test(label))throw Error('Invalid native capture label');
      const record={label,mode,startedAt:await page.evaluate(()=>performance.timeOrigin+performance.now()),image:null,finishedAt:null};
      checkpoints.push(record);
      try{
        if(mode==='visual'){
          const image=output.replace(/\.json$/,`-${label}.png`);
          await page.locator('#native-first-task').screenshot({path:image});record.image=image;
        }
      }finally{record.finishedAt=await page.evaluate(()=>performance.timeOrigin+performance.now());}
    },
    evidence(){return {mode,clock:'browser-performance-epoch-ms',visualEvidence:mode==='visual'&&checkpoints.length>0&&checkpoints.every(c=>c.image),checkpoints:checkpoints.map(c=>({...c}))};},
  };
}
