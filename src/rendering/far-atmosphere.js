// Settings only: reuse Three's existing linear fog, with no added shader pass.
export function farAtmosphere({fogStart=160,fogEnd=380}={}) {
  if(!Number.isFinite(fogStart)||!Number.isFinite(fogEnd)||fogStart<0||fogEnd<=fogStart)throw Error('Invalid far atmosphere distances');
  return {fogStart,fogEnd};
}
