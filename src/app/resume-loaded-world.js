// These interruptions belonged to the disposed world, not to saved gameplay.
export function resumeLoadedWorld(state){
 state.pauses=state.pauses.filter(reason=>!['menu','hidden','context-lost','runtime-error'].includes(reason));
}
