import {createWorkerHostedRuntime} from '../simulation/worker-hosted-runtime.js';

// The host is prepared before a graphical Worker exists. Its callbacks may be
// attached later, once the presentation has claimed the same session.
export function createEarlyWorkerAuthority({session,initial,adapter,clientOptions,runtimeOptions,recoveryOptions={},hidden=false,onError,runtimeFactory=createWorkerHostedRuntime}){
 if(typeof session!=='string'||!session||typeof initial?.snapshot!=='string'||!initial.navigationView||!adapter||!clientOptions||!runtimeOptions||runtimeOptions.startupSuspended!==true||typeof runtimeOptions.presentationInputs!=='boolean'||typeof hidden!=='boolean'||typeof onError!=='function'||typeof runtimeFactory!=='function')throw TypeError('Invalid early worker authority');
 const early={session,snapshot:initial.snapshot,navigationView:initial.navigationView,guardianPlacement:clientOptions.guardianPlacement,presentationInputs:runtimeOptions.presentationInputs===true,recoveryOptions,adapter,onEvents:null,onState:null,onVisualBackpressure:null,runtime:null,ready:null,desiredHidden:hidden};
 early.runtime=runtimeFactory({confirmedReceiver:adapter,session,clientOptions,runtimeOptions,onConfirmedEvents:events=>early.onEvents?.(events),onConfirmedState:sequence=>early.onState?.(sequence),...(recoveryOptions.qaVisualBackpressureRecovery||recoveryOptions.visualRecovery?.backpressure?{onVisualBackpressure:info=>early.onVisualBackpressure?.(info)}:{}),onError});
 return early;
}
