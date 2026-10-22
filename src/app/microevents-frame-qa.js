// Development-only DOM-backed frame evidence, including while the feature is Off.
const samples={off:[],quiet:[],event:[]};
export function recordMicroeventFrame(canvas,interval,{off=false,event=false,blocked=false}={}){
  if(!canvas||blocked||interval<=0||interval>500)return;
  const key=off?'off':event?'event':'quiet',values=samples[key];values.push(interval);if(values.length>256)values.shift();
  if(values.length%10===0)canvas.dataset.microeventFrameMetrics=JSON.stringify(samples);
}
