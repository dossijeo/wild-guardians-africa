"""Adapt supplied V2.8 menu, preserving its renderer, routes and artwork."""
import json,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
manifest=json.loads((root/'content/manifests/assets.json').read_text(encoding='utf-8'))
source=next(s for s in manifest['sources'] if 'Africa_Menu_V2_8' in s['file'])
markup=(root/source['markup']).read_text(encoding='utf-8')
code=(root/source['code'][0]).read_text(encoding='utf-8')
code=code.replace("const b=decode64(el.textContent);", "if(el.textContent.trim().startsWith('/assets/'))return await (await fetch(el.textContent.trim())).arrayBuffer();const b=decode64(el.textContent);")
code=code.replace("async function imageFromData(data){", "async function imageFromData(data){if(data.startsWith('/assets/'))return await createImageBitmap(await (await fetch(data)).blob(),{premultiplyAlpha:'none',colorSpaceConversion:'none'});")
code=code.replace("function initSurface(){const bytes=decode64($('#surfacedata').textContent);", "async function initSurface(){const bytes=new Uint8Array(await (await fetch($('#surfacedata').textContent.trim())).arrayBuffer());")
code=code.replace('initSurface();','await initSurface();')
integration=(root/'src/ui/menu-integration.js').read_text(encoding='utf-8')
code=code.replace('function libraryTab(tab){',integration+'\nfunction libraryTab(tab){')
nodes=''.join(f'<script type="application/octet-stream" id="{p["id"]}">{p["url"]}</script>' for p in source['payloads'])
out=root/'public/menu';out.mkdir(exist_ok=True)
(out/'native.js').write_text(code,encoding='utf-8')
(out/'index.html').write_text(markup.replace('</body>',nodes+'<script src="/menu/native.js"></script></body>'),encoding='utf-8')
print('Original V2.8 menu prepared with production navigation')
