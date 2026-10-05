// One queue per audio system bounds music fetch/decode work across pack changes.
// WebAudio cannot cancel a decode already in progress; stale queued jobs can be
// discarded before fetching, and fetched stale data is checked before decode.
export class MusicLoadQueue {
  constructor(limit=2){this.limit=limit;this.active=0;this.pending=[];}
  run(current,load){
    return new Promise((resolve,reject)=>{this.pending.push({current,load,resolve,reject});this.pump();});
  }
  pump(){
    while(this.active<this.limit&&this.pending.length){
      const job=this.pending.shift();
      if(!job.current()){job.resolve(null);continue;}
      this.active++;
      Promise.resolve().then(()=>job.current()?job.load():null).then(job.resolve,job.reject).finally(()=>{this.active--;this.pump();});
    }
  }
}
