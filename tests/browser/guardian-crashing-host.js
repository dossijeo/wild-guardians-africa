// Exercise the real host, but inject one uncaught Worker error on demand.
import '../../src/simulation/worker-runtime-host.js';
const hostMessage=self.onmessage;
self.onmessage=event=>{
 if(event.data?.kind==='qaUncaughtHostFailure')throw Error('Injected uncaught host failure');
 return hostMessage(event);
};
