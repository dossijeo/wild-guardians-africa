// Pair untouched real-game captures before and after the HUD usability changes.
import {mkdir,writeFile,access} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const root='docs/qa/despertares';
const [before='hud-usability-before',after='hud-usability-final',out='hud-usability-comparison']=process.argv.slice(2);
const sizes=[[320,568],[360,640],[390,844],[768,1024],[568,320],[844,390],[1280,592],[1280,720]];
const pairs=[...sizes.map(([w,h])=>({w,h,value:100})),{w:360,h:640,value:78},{w:568,h:320,value:78}];
for(const {w,h,value} of pairs){
  await access(`${root}/${before}/${w}x${h}-${value}.png`);
  await access(`${root}/${after}/final-${w}x${h}-${value}.png`);
}
const header=`<!doctype html><meta charset="utf-8"><title>Despertar: HUD antes y después</title><style>body{margin:0;background:#15251e;color:#f6ecd5;font:16px system-ui}header{padding:24px}h1{font-size:23px;margin:0}p{color:#c2d6ca}section{border-top:1px solid #516b59;padding:16px 20px 28px}h2{font-size:17px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0}figcaption{padding:8px;color:#c7e4d3}img{display:block;width:100%;height:auto}.portrait{max-width:960px;margin:auto}</style><header><h1>HUD real: antes y después</h1><p>Capturas del juego a la misma resolución y progreso. La cámara, la escena y la fase del tutorial pueden diferir; los píxeles del juego no se han retocado.</p></header>`;
const html=header+pairs.map(({w,h,value},i)=>`<section id="pair-${i}" class="${h>w?'portrait':''}"><h2>${w} × ${h} · ${value}/100</h2><div class="pair"><figure><figcaption>Antes</figcaption><img src="../${before}/${w}x${h}-${value}.png"></figure><figure><figcaption>Después</figcaption><img src="../${after}/final-${w}x${h}-${value}.png"></figure></div></section>`).join('');
await mkdir(`${root}/${out}`,{recursive:true});await writeFile(`${root}/${out}/index.html`,html);
if(!process.env.WG_QA_PLAYWRIGHT_MODULE)throw Error('Set WG_QA_PLAYWRIGHT_MODULE');
const {chromium}=await import(pathToFileURL(process.env.WG_QA_PLAYWRIGHT_MODULE).href),browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
  await page.goto(`${process.env.WG_QA_URL??'http://127.0.0.1:5214'}/${root}/${out}/index.html`);
  await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));
  for(let i=0;i<pairs.length;i++)await page.locator(`#pair-${i}`).screenshot({path:`${root}/${out}/pair-${i}.png`});
}finally{await browser.close();}
console.log(JSON.stringify({pairs:pairs.length,output:`${root}/${out}`}));
