import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=path=>readFileSync(new URL('../'+path,import.meta.url));
const bundle=JSON.parse(read('public/content/fonts.json'));
function table(bytes,tag){for(let i=0;i<bytes.readUInt16BE(4);i++){const at=12+i*16;if(bytes.toString('ascii',at,at+4)===tag)return bytes.subarray(bytes.readUInt32BE(at+8),bytes.readUInt32BE(at+8)+bytes.readUInt32BE(at+12));}return null;}
function names(bytes){const data=table(bytes,'name'),out=new Map(),strings=data.readUInt16BE(4);for(let i=0;i<data.readUInt16BE(2);i++){const at=6+i*12,platform=data.readUInt16BE(at);if(platform!==0&&platform!==3)continue;const id=data.readUInt16BE(at+6),length=data.readUInt16BE(at+8),offset=strings+data.readUInt16BE(at+10);let text='';for(let p=offset;p<offset+length;p+=2)text+=String.fromCharCode(data.readUInt16BE(p));if(!out.has(id)||data.readUInt16BE(at+4)===0x409)out.set(id,text);}return out;}

test('supplied font bytes identify actual families, licenses and variable weight ranges',()=>{
 assert.equal(bundle.fonts.length,3);
 for(const font of bundle.fonts){
  const bytes=read('public'+font.data.url),name=names(bytes),hash=createHash('sha256').update(bytes).digest('hex');
  assert.ok(font.data.url.includes(hash));assert.equal(bytes.length,font.bytes);assert.equal(name.get(16)??name.get(1),font.family);
  assert.equal(name.get(13),font.license);assert.equal(name.get(14),font.licenseURL);assert.equal(name.get(0),font.copyright);
  const fvar=table(bytes,'fvar');
  if(font.weightRange){assert.ok(fvar);const start=fvar.readUInt16BE(4),size=fvar.readUInt16BE(10);let weight;for(let i=0;i<fvar.readUInt16BE(8);i++){const at=start+i*size;if(fvar.toString('ascii',at,at+4)==='wght')weight=[fvar.readInt32BE(at+4)/65536,fvar.readInt32BE(at+12)/65536];}assert.deepEqual(weight,[200,800]);assert.deepEqual(weight,font.weightRange);}
  else assert.equal(fvar,null);
  assert.equal(table(bytes,'post').readInt32BE(4)/65536,font.style==='italic'?-8:0);
 }
});

test('Banga normal and italic expose independent 200–800 faces and full bundled notices',()=>{
 const css=read('public/content/fonts.css').toString(),faces=[...css.matchAll(/@font-face\{([^}]+)\}/g)].map(m=>m[1]);assert.equal(faces.length,3);
 for(const font of bundle.fonts){const face=faces.find(f=>f.includes('..'+font.data.url));assert.ok(face);assert.ok(face.includes('font-style:'+font.style));assert.ok(face.includes('font-weight:'+(font.weightRange?'200 800':'400')));}
 assert.ok(css.includes('font-synthesis:none'));
 for(const [name,text] of Object.entries(bundle.licences)){assert.equal(read(`public/licenses/${name}.txt`).toString(),text);}
 assert.ok(bundle.licences.ga.includes('SIL OPEN FONT LICENSE Version 1.1'));assert.ok(bundle.licences.banga.includes('SIL OPEN FONT LICENSE Version 1.1'));
});

test('native menu, selector and HUD use approved families with relative font resources',()=>{
 for(const path of ['public/menu/index.html','public/selector/index.html'])assert.ok(read(path).toString().includes('href="../content/fonts.css"'));
 const hud=read('public/content/hud.css').toString(),selector=read('public/selector/index.html').toString(),menu=read('public/menu/index.html').toString();
 assert.ok(hud.includes("font-family:'Banga',sans-serif"));assert.ok(hud.includes("font-family:'Ga Maamli'"));assert.ok(!hud.includes('Trebuchet MS'));
 assert.ok(selector.includes("--sans: 'Banga', sans-serif"));assert.ok(selector.includes("--serif: 'Ga Maamli'"));assert.ok(menu.includes("font-family:'Banga',sans-serif"));
 assert.ok(read('src/app/main.js').toString().includes("assetUrl('/content/fonts.css')"));assert.ok(!read('src/ui/styles.css').toString().includes('@font-face'));
 for(const notice of ['ga','banga','bangaAuthors'])assert.ok(read('public/menu/native.js').toString().includes(`../licenses/${notice}.txt`));
});
