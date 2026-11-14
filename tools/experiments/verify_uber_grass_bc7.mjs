import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const entries=[
 {id:'fcd30bb609c499813ca0615ffdb64dfbbc7213eb416a974da6188ce545683ddc',source:'public/assets/fcd30bb609c499813ca0615ffdb64dfbbc7213eb416a974da6188ce545683ddc.webp',native:'f86a14bfd452b14234886336d2d96085f4c38281ae92baeb0266c8a84456fe0b'},
 {id:'a77f70a2f13515cfb143a47e7155dea4f66f223e2680d33956cdab08977990a6',source:'public/assets/images/a77f70a2f13515cfb143a47e7155dea4f66f223e2680d33956cdab08977990a6.webp',native:'e5445c8a8267aea82b24d8584799c9dd88326a48047e1efb51526e421a76970d'},
];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),signature=Buffer.from([0xab,0x4b,0x54,0x58,0x20,0x32,0x30,0xbb,0x0d,0x0a,0x1a,0x0a]);
for(const item of entries){const source=await readFile(item.source),path=`content/ktx2-native/ground/${item.id}-data-uastc2-bc7.ktx2`,native=await readFile(path);if(hash(source)!==item.id||hash(native)!==item.native||!native.subarray(0,12).equals(signature)||native.readUInt32LE(12)!==145||native.readUInt32LE(20)!==1024||native.readUInt32LE(24)!==1024||native.readUInt32LE(40)!==11||native.readUInt32LE(44)!==0)throw Error(`Invalid native KTX2 asset: ${path}`);console.log(JSON.stringify({source:item.source,sourceBytes:source.length,sourceSha256:item.id,native:path,nativeBytes:native.length,nativeSha256:item.native,vkFormat:145,levels:11,supercompression:0}));}
