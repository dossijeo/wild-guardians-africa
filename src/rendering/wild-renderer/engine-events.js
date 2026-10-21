import {EnginePackedWildRenderer} from './engine-packed.js';
import {observeSuppressionRecords} from './suppression-events.js';

export class EngineEventsWildRenderer extends EnginePackedWildRenderer {
 constructor(wasm,state,onChange){
  super(wasm,()=>{throw Error('Event variant must not scan suppression sets');});
  this.suppressionObserver=observeSuppressionRecords(state,onChange);
 }
 suppressionRecords(){return this.suppressionObserver.records;}
 dispose(){this.suppressionObserver.dispose();super.dispose();}
}
export async function createEngineEventsWildRenderer(state,onChange){
 const {instance}=await WebAssembly.instantiate(await(await fetch(new URL('./core.wasm',import.meta.url))).arrayBuffer(),{wasi_snapshot_preview1:{proc_exit(code){throw Error(`Wild Renderer exited ${code}`)}}});
 return new EngineEventsWildRenderer(instance.exports,state,onChange);
}
