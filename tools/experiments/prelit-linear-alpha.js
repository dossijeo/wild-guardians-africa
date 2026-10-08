// Offline RGBA8 transform. The PNG/WebP RGB stores sRGB-encoded premultiplied
// linear light. Upload it as sRGB with UNPACK_PREMULTIPLY_ALPHA disabled; the
// existing linear atlas interpolation/unpremultiply then has correct ordering.
export function premultiplyPrelitLinear(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length%4)throw Error('Expected RGBA8 bytes');
 const out=new Uint8Array(bytes.length),decode=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4,encode=x=>x<=.0031308?x*12.92:1.055*x**(1/2.4)-.055;
 for(let i=0;i<bytes.length;i+=4){const alpha=bytes[i+3]/255;out[i+3]=bytes[i+3];for(let c=0;c<3;c++)out[i+c]=Math.round(encode(decode(bytes[i+c]/255)*alpha)*255);}
 return out;
}
