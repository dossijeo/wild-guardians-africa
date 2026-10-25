"""Adapt supplied V2.8 menu, preserving its renderer, routes and artwork."""
import json,pathlib
from font_styles import typography_markup
root=pathlib.Path(__file__).resolve().parents[1]
manifest=json.loads((root/'content/manifests/assets.json').read_text(encoding='utf-8'))
source=next(s for s in manifest['sources'] if 'Africa_Menu_V2_8' in s['file'])
markup=typography_markup((root/source['markup']).read_text(encoding='utf-8'))
markup=markup.replace('</head>','<link rel="stylesheet" href="../ui-theme.css?v=2"></head>')
# Keep the tagline readable against the illustrated, bright sky.
markup=markup.replace('</style>',"""
#brand .sub{width:fit-content;max-width:100%;margin:4px auto 0;padding:6px 12px;font-size:clamp(11px,.9vw,13px);line-height:1.45;font-weight:600;letter-spacing:.12em;color:#fff5df;background:#211a14e8;border:1px solid #e4be7959;border-radius:5px;text-shadow:0 1px 2px #000}
</style>""")
code=(root/source['code'][0]).read_text(encoding='utf-8')
code=code.replace("const b=decode64(el.textContent);", "if(el.textContent.trim().startsWith('/assets/'))return await (await fetch(el.textContent.trim())).arrayBuffer();const b=decode64(el.textContent);")
code=code.replace("async function imageFromData(data){", "async function imageFromData(data){if(data.startsWith('/assets/'))return await createImageBitmap(await (await fetch(data)).blob(),{premultiplyAlpha:'none',colorSpaceConversion:'none'});")
code=code.replace("function initSurface(){const bytes=decode64($('#surfacedata').textContent);", "async function initSurface(){const bytes=new Uint8Array(await (await fetch($('#surfacedata').textContent.trim())).arrayBuffer());")
code=code.replace('initSurface();','await initSurface();')
integration=(root/'src/ui/menu-integration.js').read_text(encoding='utf-8')
code=code.replace('function libraryTab(tab){',integration+'\nfunction libraryTab(tab){')
code=code.replace('if(!ready||paused||document.hidden||manualPreview)return;', 'if(productionLabViewer||!ready||paused||document.hidden||manualPreview)return;')
# Production landscape layers replace the old photographic relief without changing navigation.
landscape=(root/'src/ui/menu-landscape.js').read_text(encoding='utf-8')
code=code.replace('const progress=(p,text)=>',landscape+'\nconst progress=(p,text)=>',1)
code=code.replace('bg:compile(bgVS,bgFS),','plate:compile(quadVS,menuPlateFS),',1)
start=code.index(' gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.useProgram(p.bg);')
end=code.index('\n',start)
code=code[:start]+' drawMenuPlate(false);'+code[end:]
code=code.replace(' gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.useProgram(p.blur);',' drawMenuPlate(true);\n gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.useProgram(p.blur);',1)
code=code.replace("bgTex=makeTexture(await imageFromData($('#backgrounddata').textContent.trim()));", "[bgTex,menuForegroundTex]=await Promise.all([loadMenuPlate('./art/sanctuary-valley-v1.png'),loadMenuPlate('./art/sanctuary-foreground-v1.png')]);",1)
code=code.replace("skyTex=makeTexture(await imageFromData($('#skydata').textContent.trim()));terrainMaskTex=makeTexture(await imageFromData($('#terrainmaskdata').textContent.trim()));",'')
code=code.replace('createBackgroundRelief();','')
for unused in ('skydata','terrainmaskdata'):
    code=code.replace(f"$('#{unused}').textContent='';",'')
nodes=''.join(f'<script type="application/octet-stream" id="{p["id"]}">{p["url"]}</script>' for p in source['payloads'] if p['id'] not in ('backgrounddata','skydata','terrainmaskdata'))
out=root/'public/menu';out.mkdir(exist_ok=True)
(out/'native.js').write_text(code,encoding='utf-8')
(out/'index.html').write_text(markup.replace('</body>',nodes+'<script src="/menu/native.js"></script></body>'),encoding='utf-8')
print('Original V2.8 menu prepared with production navigation')
