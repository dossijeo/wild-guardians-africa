// The renderer may forward only direct player commands; all game rules are
// still validated by the authoritative simulation.
export function isPresentationInputCommand(command){
 if(!command||typeof command.id!=='string'||!command.id)return false;
 if(command.kind==='castAttack')return !!command.guardianContext;
 return ['plant','placeStructure','buildWallChain','castAgricultural','bless'].includes(command.kind);
}
