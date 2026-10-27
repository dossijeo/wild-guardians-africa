// QA only: balanced ABBA blocks, bounded samples, no GPU queries or forced draws.
const ORDER=[false,true,true,false,true,false,false,true];
const quantile=(v,p)=>{if(!v.length)return null;const a=[...v].sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor(a.length*p))];};
export class GuardianFramePairs{
 constructor({setVisible,cast,done,now=()=>performance.now()}){this.setVisible=setVisible;this.cast=cast;this.done=done;this.now=now;this.blocks=[];this.index=-1;this.samples=[];this.next();}
 next(){this.index++;if(this.index===ORDER.length){this.setVisible(true);this.done({scope:'8 balanced ABBA/BAAB blocks; 1.2s warmup + 4s sample each; identical Attack commands every 600ms; no forced render or GPU queries',visibility:document.visibilityState,blocks:this.blocks});return false;}this.samples=[];this.setVisible(ORDER[this.index]);this.started=this.now();this.lastCast=-Infinity;return true;}
 before(){const t=this.now();if(t-this.started>=5200){const rows=this.samples;this.blocks.push({guardian:ORDER[this.index],frames:rows.length,averageFps:1000/(rows.reduce((s,r)=>s+r.dt,0)/rows.length),frameP50:quantile(rows.map(r=>r.dt),.5),frameP95:quantile(rows.map(r=>r.dt),.95),frameP99:quantile(rows.map(r=>r.dt),.99),renderP95:quantile(rows.map(r=>r.renderMs),.95),animationP95:quantile(rows.map(r=>r.animationMs),.95),vfxP95:quantile(rows.map(r=>r.vfxMs),.95),drawP95:quantile(rows.map(r=>r.draws),.95),hiddenFrames:rows.filter(r=>r.hidden).length,stagesP95:rows[0]?.stages.map((_,i)=>quantile(rows.map(r=>r.stages[i]),.95))??[]});if(!this.next())return false;}if(t-this.lastCast>=600){this.cast();this.lastCast=t;}return true;}
 sample(row){if(this.now()-this.started>=1200)this.samples.push(row);}
}
