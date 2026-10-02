"""Reuse V8 hand geometry/curves; expose explicit world-adapter hooks."""
import hashlib,json,pathlib,re
root=pathlib.Path(__file__).resolve().parents[1]
source=root/'references/extracted/Guardian_Tutorial_V8_Avatar_y_Manos_3D/script-0.js'
code=source.read_text(encoding='utf-8')
constants=code[code.index('const HAND_ASSETS ='):code.index('const $ =')]
vectors=code[code.index('const V3='):code.index('const M4=')]
helpers=code[code.index('const clamp ='):code.index('const reducedMotion =')]
body=code[code.index('function clipQuadXZ('):code.index('class FarmWorld3D {')]
body=body.replace('class HandHints3D {','export class HandHints3D {')
body=body.replace('function clipQuadXZ(','export function clipQuadXZ(')
body=body.replace("route(u){return [-2.1+u*4.25,0,1.8-u*4.1];}","route(u){return this.scene.handRoute?.(u)||[-2.1+u*4.25,0,1.8-u*4.1];}")
body=body.replace("let highest=.03;", "let highest=this.scene.routeTerrainCeiling?.()??.03;")
body=body.replace("const floor=pose.type==='drag'?Math.max(.035,this.routeFloor):.035;", "const floor=this.scene.terrainClearance? -Infinity : (pose.type==='drag'?Math.max(.035,this.routeFloor):.035);")
body=body.replace("let required=Math.max(0,floor-Math.min(...pose.corners.map(p=>p[1])));", "let required=Math.max(0,floor-Math.min(...pose.corners.map(p=>p[1])),this.scene.terrainClearance?.(pose.corners)??0);")
body=body.replace("if(Math.min(...pose.corners.map(p=>p[1]))<-.00001)", "if(this.scene.terrainClearance?this.scene.terrainClearance(pose.corners)>.03501:Math.min(...pose.corners.map(p=>p[1]))<-.00001)")
body=body.replace(".includes(phase)",".includes(this.scene.phase??'reading')")
geometry=code[code.index('const rgb8='):code.index('function compileWorldProgram(')]
effects=code[code.index(' drawEffects(p,cam){'):code.index('  gl.enable(gl.BLEND);gl.depthMask(false);',code.index(' drawEffects(p,cam){'))]
effects=effects.replace(' drawEffects(p,cam){','export function handEffects(p,hands){').replace('const gl=this.gl,a=this.hands.opacity,','const a=hands.opacity,').replace('this.hands','hands')
effects+='return {triangles:g.array(),lines:l.array(),ringAlpha:a*.90,lineAlpha:a*.70};\n}\n'
module='// Generated from Guardian V8 by tools/prepare_hands.py.\n'+constants.replace('const HAND_','export const HAND_')+helpers+vectors+geometry+body+effects
target=root/'src/rendering/hands-native.js';target.write_text(module,encoding='utf-8')
manifest={'source':str(source.relative_to(root)).replace('\\','/'),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'moduleSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'adapterHooks':['phase','handRoute','routeTerrainCeiling','terrainClearance']}
(root/'content/manifests/hands-native.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('Six original hand curves, pivots and quad protection extracted')
