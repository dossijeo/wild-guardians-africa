// Exact candidate prices. Integer coins remain JSON-compatible through rational().
// 1.4/1.6/1.8 are fractions, never floating-point exponentiation.
const RATIOS=Object.freeze({moderate:[7n,5n],proposed:[8n,5n],demanding:[9n,5n]});
export function expansionVillagePrice(ordinal,variant='proposed') {
  if(typeof ordinal==='number'&&!Number.isSafeInteger(ordinal))throw Error('Invalid village ordinal');
  if(typeof ordinal!=='number'&&typeof ordinal!=='bigint')throw Error('Invalid village ordinal');
  const n=BigInt(ordinal),ratio=RATIOS[variant];
  if(n<2n||!ratio)throw Error('Invalid village price candidate');
  const exponent=n-2n,numerator=50n*ratio[0]**exponent,denominator=ratio[1]**exponent;
  // Nearest thousand, half upward; round once after the exact power.
  return ((2n*numerator+denominator)/(2n*denominator))*1000n;
}
export function expansionVillagePriceForRuntime(ordinal,variant='proposed') {
  const exact=expansionVillagePrice(ordinal,variant);
  return exact<=BigInt(Number.MAX_SAFE_INTEGER)?Number(exact):exact;
}
