// QA-only uniform switch. The authored recipes and their default appearance
// remain intact; the disabled branch uses mean noise values, not a new palette.
const pigment='float brush=materialNoise(worldP*.85)*.42+materialNoise(worldP*2.2)*.22;';
export function diagnosticPigment(source){
  if(!source.includes(pigment))throw new Error('Unrecognized pigment recipe');
  return source.replace(pigment,'float brush=.32;\n if(uFineNoise>.5){'+pigment.replace('float brush=','brush=')+'}');
}

export function diagnosticGroundNoise(source){
  const fine='fine=materialNoise(worldPatternPosition(worldP)*2.6);';
  if(!source.includes(fine))throw new Error('Unrecognized ground noise recipe');
  return source.replace(fine,'fine=.5;\n if(uFineNoise>.5)fine=materialNoise(worldPatternPosition(worldP)*2.6);');
}
