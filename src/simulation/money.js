// Rational accounting preserves repair fractions and modifiers without rounding.
const gcd = (a,b) => b ? gcd(b,a%b) : a;
export function rational(n, d=1n) {
  n=BigInt(n); d=BigInt(d);
  if(d<=0n) throw new Error('Denominador monetario inválido');
  const g=gcd(n<0n?-n:n,d);
  return {n:String(n/g),d:String(d/g)};
}
export const numberOf = v => Number(v.n)/Number(v.d);
export function add(a,b) { return rational(BigInt(a.n)*BigInt(b.d)+BigInt(b.n)*BigInt(a.d),BigInt(a.d)*BigInt(b.d)); }
export function negate(a) { return {...a,n:String(-BigInt(a.n))}; }
export function multiply(a,n,d=1) { return rational(BigInt(a.n)*BigInt(n),BigInt(a.d)*BigInt(d)); }
export function compare(a,b) { const diff=BigInt(a.n)*BigInt(b.d)-BigInt(b.n)*BigInt(a.d); return diff<0n?-1:diff>0n?1:0; }
export function transact(ledger,id,delta) {
  if(!id || typeof id!=='string') throw new Error('Transacción sin identidad');
  if(Object.hasOwn(ledger.entries,id)) return false;
  // Fractions exist only while calculating an operation, never in the ledger.
  const negative=BigInt(delta.n)<0n;
  const abs=negative?-BigInt(delta.n):BigInt(delta.n);
  const whole=(abs+BigInt(delta.d)-1n)/BigInt(delta.d);
  delta=rational(negative?-whole:whole);
  const next=add(ledger.balance,delta);
  if(compare(next,rational(0))<0) throw new Error('Fondos insuficientes');
  ledger.balance=next;
  ledger.entries[id]=delta;
  return true;
}
export function formatMoney(value) {
  const n=numberOf(value);
  const scale=n>=1e9?1e9:n>=1e6?1e6:n>=1e3?1e3:1;
  const suffix=scale===1e9?'B':scale===1e6?'M':scale===1e3?'K':'';
  return new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(n/scale)+suffix;
}
