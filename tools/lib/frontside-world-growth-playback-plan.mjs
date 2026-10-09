// Prospective visual path through the actual native sampler. Deliberately
// slow near its four bridges; this is not elapsed biological gameplay.
export const worldGrowthPlaybackFractions=Object.freeze([0,.03,.065,.20,.228,.23105,.234,.27,.45,.477,.4806,.484,.53,.70,.729,.7325,.736,.78,.94,.954,.9582,.962,.97,1]);
export const worldGrowthPlaybackSeconds=24;
export function worldGrowthPlaybackFraction(elapsed){if(!Number.isFinite(elapsed)||elapsed<0)throw Error('Invalid growth playback elapsed');const p=Math.min(1,elapsed/worldGrowthPlaybackSeconds)*(worldGrowthPlaybackFractions.length-1),i=Math.floor(p),a=worldGrowthPlaybackFractions[i],b=worldGrowthPlaybackFractions[Math.min(i+1,worldGrowthPlaybackFractions.length-1)];return a+(b-a)*(p-i);}
