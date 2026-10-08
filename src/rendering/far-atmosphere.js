// Settings only: reuse Three's existing linear fog, with no added shader pass.
export function farAtmosphere({fogStart=160,fogEnd=380,fogDayColor='#b5d9e8',fogNightColor='#263747'}={}) {
  if(!Number.isFinite(fogStart)||!Number.isFinite(fogEnd)||fogStart<0||fogEnd<=fogStart)throw Error('Invalid far atmosphere distances');
  if(![fogDayColor,fogNightColor].every(c=>typeof c==='string'&&/^#[\da-f]{6}$/i.test(c)))throw Error('Invalid far atmosphere colors');
  return {fogStart,fogEnd,fogDayColor,fogNightColor};
}
