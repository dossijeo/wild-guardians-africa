import fs from 'node:fs';const p=process.argv[2],events=JSON.parse(fs.readFileSync(p+'-focused.trace.json')).traceEvents;
const owner=events.find(e=>e.name==='FunctionCall'&&e.args?.data?.functionName==='present'&&e.args.data.url?.includes('remote-webgpu-host.js'));
const profiles=new Map();for(const e of events)if(e.name==='Profile')profiles.set(e.pid+':'+e.id,{pid:e.pid,tid:e.tid,time:e.args.data.startTime,nodes:new Map(),samples:[]});
for(const e of events)if(e.name==='ProfileChunk'){const q=profiles.get(e.pid+':'+e.id);if(!q)throw Error('missingprofile');const d=e.args.data;for(const n of d.cpuProfile?.nodes??[])q.nodes.set(n.id,n);for(let i=0;i<(d.cpuProfile?.samples?.length??0);i++){q.time+=d.timeDeltas[i];q.samples.push({time:q.time,id:d.cpuProfile.samples[i],delta:d.timeDeltas[i]});}}
const q=[...profiles.values()].find(q=>q.pid===owner.pid&&q.tid===owner.tid);if(!q)throw Error('no Host profile');
const micros=events.filter(e=>e.pid===owner.pid&&e.tid===owner.tid&&e.name==='RunMicrotasks'&&e.dur).sort((a,b)=>b.dur-a.dur).slice(0,12).map(e=>{
 const stacks=new Map();for(const s of q.samples.filter(s=>s.time>=e.ts&&s.time<e.ts+e.dur)){let n=q.nodes.get(s.id),stack=[];while(n){stack.push(n.callFrame.functionName+'@'+(n.callFrame.url??'')+':'+n.callFrame.lineNumber);n=q.nodes.get(n.parent);}const key=stack.join(' <- ');stacks.set(key,(stacks.get(key)??0)+1);}
 return {at:e.ts,ms:e.dur/1000,cpuMs:e.tdur/1000,stacks:[...stacks].sort((a,b)=>b[1]-a[1]).slice(0,6)};
});
const task=events.filter(e=>e.name==='WebGPUDecoderImpl::HandleDawnCommands'&&e.dur>60000&&e.args?.bytes===104)[0];
const around=task?events.filter(e=>e.pid===task.pid&&e.tid===task.tid&&Math.abs(e.ts-task.ts)<500).map(e=>({name:e.name,ph:e.ph,ts:e.ts,id:e.id,id2:e.id2,args:e.args})):[];
const ids=new Set(around.filter(e=>e.name==='DawnCommands'&&e.ph!=='X').map(e=>e.id2?.global??e.id));
const flows=events.filter(e=>e.name==='DawnCommands'&&ids.has(e.id2?.global??e.id)).map(e=>({name:e.name,ph:e.ph,pid:e.pid,tid:e.tid,ts:e.ts,id:e.id,id2:e.id2,args:e.args}));
const sender=flows.filter(e=>e.pid!==task?.pid).map(e=>({event:e,nearby:events.filter(x=>x.pid===e.pid&&x.tid===e.tid&&x.ph==='X'&&x.ts<=e.ts&&x.ts+x.dur>=e.ts).map(x=>({name:x.name,ts:x.ts,ms:x.dur/1000,args:x.args}))}));
const senderStacks=sender.map(({event:e})=>q.samples.filter(s=>s.time>=e.ts-12000&&s.time<=e.ts+1000).map(s=>{let n=q.nodes.get(s.id),stack=[];while(n){stack.push(n.callFrame.functionName+'@'+(n.callFrame.url??'')+':'+n.callFrame.lineNumber);n=q.nodes.get(n.parent);}return {time:s.time,stack};}));
const result={senderStacks,owner:{pid:owner.pid,tid:owner.tid},profiles:[...profiles.values()].map(q=>({pid:q.pid,tid:q.tid,samples:q.samples.length})),micros,task,around,flows,sender};fs.writeFileSync(p+'-profile.json',JSON.stringify(result,null,2));console.log(JSON.stringify({senderStacks,around,flows,sender}));
