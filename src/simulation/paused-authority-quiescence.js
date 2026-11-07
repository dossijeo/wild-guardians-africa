// This certificate authorizes skipping future paused advances only until the
// next admitted command. Unknown maintenance or physical ownership fails shut.
export function pausedAuthorityQuiescent({enabled,hasSnapshot,game,physics,trackMicroIncome,nav,resident,terrainGeneration,reportedTerrainGeneration}){
 return enabled===true&&hasSnapshot===true&&Array.isArray(game?.pauses)&&game.pauses.length>0&&(!physics||Array.isArray(physics.actorIds)&&physics.actorIds.length===0)&&(!trackMicroIncome||game.microevents?.day===game.day)&&typeof nav?.serviceRaidConnectivityDemand!=='function'&&Array.isArray(resident?.missing)&&resident.missing.length===0&&Number.isSafeInteger(terrainGeneration)&&terrainGeneration===reportedTerrainGeneration;
}
