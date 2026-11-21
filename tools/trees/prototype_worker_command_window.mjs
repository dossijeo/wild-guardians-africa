// Experimental sender-side backpressure. Rejected commands remain the caller's responsibility.
export function createCommandWindow(session, send) {
 if (!session || typeof send !== 'function') throw Error('Invalid command window');
 let nextSequence=1, advance=null, pause=null, resume=null, paused=false;
 function submit(action, extra={}) {
  const sequence=nextSequence, command={session,sequence,request:sequence,action,...extra};
  // postMessage is asynchronous; leave state unchanged if the send fails.
  send(command); nextSequence++; return command;
 }
 return {
  advance(steps,mode='cooperative') {
   if (!Number.isInteger(steps)||steps<1||steps>100||!['sync','cooperative'].includes(mode)) throw Error('Invalid advance');
   if (paused) return {accepted:false,reason:'paused'};
   if (advance||pause||resume) return {accepted:false,reason:'busy'};
   const command=submit('advance',{steps,mode}); advance={sequence:command.sequence,steps}; return {accepted:true,sequence:command.sequence};
  },
  pause() {
   if (paused||pause||resume) return {accepted:false,reason:paused?'paused':'busy'};
   const command=submit('pause'); pause=command.sequence; return {accepted:true,sequence:command.sequence};
  },
  resume() {
   if (!paused||advance||pause||resume) return {accepted:false,reason:'busy'};
   const command=submit('resume'); resume=command.sequence; return {accepted:true,sequence:command.sequence};
  },
  ack(message) {
   if (!message||message.session!==session||message.request!==message.sequence) return {accepted:false};
   if (message.kind==='advance-result'&&advance?.sequence===message.sequence&&Number.isInteger(message.performed)&&message.performed>=0&&message.performed<=advance.steps) {
    const remaining=advance.steps-message.performed; advance=null; return {accepted:true,remaining};
   }
   if (message.kind==='pause-result'&&pause===message.sequence&&message.state?.pauses?.includes('diagnostic')) {pause=null;paused=true;return {accepted:true};}
   if (message.kind==='resume-result'&&resume===message.sequence&&Array.isArray(message.state?.pauses)&&!message.state.pauses.includes('diagnostic')) {resume=null;paused=false;return {accepted:true};}
   return {accepted:false};
  },
  state(){return {nextSequence,advance:advance&&{...advance},pause,resume,paused};}
 };
}
