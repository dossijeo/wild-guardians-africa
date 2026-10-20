# Reproducción del experimento

Rama independiente `codex/webgpu-renderer-evaluation`, basada en el commit `719510cec` del laboratorio para reutilizar la cobertura aprobada. Ningún cambio del experimento se aplica a `src/`, `main` o la PR #159. Prototipos fijados en `b0b4b406c` (protocolo V3). Three 0.180.0, Vite 6.4.3, Playwright 1.64.1, Sharp 0.35.5 y Node 20.11.0. Chrome se usa mediante `channel: 'chrome'`; la versión efectiva y el adaptador constan en cada JSON.

Desde este worktree:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm install --no-save --package-lock=false --ignore-scripts playwright@1.64.1
node tools/webgpu-evaluation/serve.mjs
```

Mantener ese servidor abierto. Desactiva HMR y exige el puerto **5294** libre; no debe sustituirse por otro servidor del proyecto que esté usando un checkout diferente.

En otra terminal del mismo worktree:

```powershell
node tools/webgpu-evaluation/run.mjs
node tools/webgpu-evaluation/analyze.mjs
```

El runner cierra cada página antes de abrir la siguiente. No ejecutar otros prototipos, vídeos o benchmarks GPU a la vez. No modifica el plan de energía del equipo ni detiene aplicaciones ajenas. En esta máquina se cerraron los navegadores auxiliares del experimento; la carga externa del escritorio no está controlada.

Por defecto ejecuta Sabana, Gran Río, terreno y escena compleja. En hierba y escena compleja usa `legacy,webgpu,legacy,webgpu,webgl-tsl,webgpu,webgl-tsl,webgpu`. Terreno usa `webgl-tsl,webgpu,webgl-tsl,webgpu`. Cada backend se mide de día y de noche, a 1280×720, DPR 1, sin MSAA, con poses y tiempos idénticos.

Cada bloque incluye 45 fotogramas previos, 120 muestras GPU serializadas, y una secuencia RAF independiente de 30 fotogramas previos más 180 registrados. El recorrido temporizado alcanza 1,983 s y cruza la relocalización de chunks de la escena compleja a 1,5 s. El recorrido RAF es más largo. No son segundos de simulación real: los tiempos de animación se fijan por índice para que la carga sea reproducible.

Variables opcionales:

```powershell
$env:WG_GPU_SCENARIOS='terrain'
$env:WG_GPU_ORDER='webgl-tsl,webgpu,webgl-tsl,webgpu'
$env:WG_GPU_OUT='docs/qa/webgpu-evaluation/another-run'
$env:WG_GPU_SAMPLES='120'
$env:WG_GPU_FRAMES='180'
node tools/webgpu-evaluation/run.mjs
```

Eliminar esas variables o abrir una terminal nueva antes de repetir el protocolo predeterminado.

El harness detiene el RAF interno de Three r180 y avanza `NodeFrame` una vez por render externo. Así las sombras se actualizan en todos los frames de la comparación, independientemente de cuánto tarde una consulta GPU. Este control es exclusivo del diagnóstico; no modifica el juego. `analyze.mjs` verifica draw calls y triángulos por índice de frame, descontando únicamente la pasada de salida adicional del renderer común frente al legacy.

## Interpretación de los medidores

- `timed[].cpuMs`: envío CPU del renderer, excluye `fixture.update()` y la espera del temporizador.
- `interactive[].cpuMs`: envío CPU sin lecturas GPU bloqueantes.
- `interactive[].updateMs`: cámara, animación y cambios de la escena de prueba; no es simulación de Wild Engine.
- `interactive[].intervalMs`: intervalo entre callbacks RAF. Incluye el límite de refresco y planificación del navegador. Corresponde al fotograma anterior, indicado por `intervalSincePreviousFrame`; no representa FPS sin límite.
- WebGL: una consulta externa `EXT_disjoint_timer_query_webgl2` envuelve todos los comandos de `renderer.render`, incluidas sombras y salida.
- WebGPU: suma de timestamps de pases de Three, con comprobación de consultas nuevas y errores. Excluye transferencias y huecos entre pases: **el alcance no es estrictamente idéntico al de WebGL**. No se presenta como aceleración del frame completo de campaña.
- Los ceros cuantizados se conservan y se marcan; no significan trabajo gratuito. Las consultas inválidas no entran en medias.
- Memoria JS es una lectura de heap sin aislamiento ni GC forzado. `renderer.info.memory` cuenta objetos; no son bytes VRAM ni una prueba de ausencia de fugas.
- Se ejecuta `dispose()` antes de cerrar cada página. No sustituye una prueba prolongada de pérdida de dispositivo o de streaming.

## Fixtures de hierba

Los JSON de `tools/webgpu-evaluation/fixtures/` contienen atributos y selección reales, no una distribución inventada. Sabana procede de campaña inicial pausada; Gran Río del fixture AfricanToon case 6 con WorldScene real. Ambos usan semilla 712 y perfil media. Los metadatos identifican esta diferencia; no se compara rendimiento entre biomas como si fueran la misma escena.

Se pueden regenerar:

```powershell
$env:WG_GRASS_FIXTURE='1'
$env:WG_GRASS_BIOME='sabana'
node tools/webgpu-evaluation/export-fixture.mjs
$env:WG_GRASS_BIOME='gran-rio'
node tools/webgpu-evaluation/export-fixture.mjs
```

Regenerar Sabana usando el fixture cambia su procedencia frente al JSON archivado de campaña. Para reproducir exactamente las mediciones guardadas, usar los snapshots versionados. `WG_GRASS_QUALITY=baja` permite exportar otro snapshot; no convierte automáticamente la serie registrada de perfil media en una validación del perfil bajo.

La hierba aislada conserva geometría, tinte específico de cada bioma, viento 8×, altura, LOD en shader y textura. Congela la selección CPU y omite suelo/objetos/visibilidad solar. Su coste de buffers recortados al número visible no debe confundirse con el de las capacidades reservadas en el juego.

## Compute

```powershell
$env:WG_COMPUTE_RESIDENT='1'
$env:WG_COMPUTE_SAMPLES='120'
$env:WG_COMPUTE_WARMUP='30'
$env:WG_COMPUTE_OUTPUT='docs/qa/webgpu-evaluation/compute-resident.json'
node tools/webgpu-evaluation/compute-smoke.mjs
```

Sin `WG_COMPUTE_RESIDENT=1` usa una cuadrícula sintética de 32.768 candidatos. Con ella usa los candidatos de tiles visitados por la selección real de Sabana. Compara un predicado de distancia horizontal, compactación y argumentos indirectos; verifica igualdad de conjuntos de IDs fuera de los intervalos medidos. **No implementa el selector completo de frustum/LOD/streaming ni utiliza ese buffer para dibujar la escena.** Sus tiempos no justifican por sí solos una migración.

Para inspección manual: `http://127.0.0.1:5294/tools/webgpu-evaluation/index.html?scenario=grass&backend=webgpu`. Escenarios: `grass`, `grass-river`, `terrain`, `complex`. Backends: `legacy`, `webgl-tsl`, `webgpu`; terreno no admite `legacy`. La API QA `window.qa.capture()` y `window.qa.run()` permite repetir poses y bloques. No hay bucle de animación permanente fuera del runner.

## Validación de entrega

- `npm run verify:browser-syntax`: 181 archivos inspeccionados, 176 scripts, cero fallos.
- `node --check` en todos los JS/MJS nuevos del prototipo: correcto.
- `npm run build`: correcto (8,93 s); advertencias de tamaño de chunks y un módulo importado tanto estática como dinámicamente.
- `git diff 719510cec -- src public package.json package-lock.json`: vacío.
- Ejecución real V3, auditoría por frame, capturas y dispose: sin errores. No equivale a ejecutar campañas ni a una prueba prolongada de recursos.

Se conservan todos los JSON finales. Las capturas PNG repetidas de la misma pose se omiten de Git salvo la primera ejecución de cada backend/condición; el runner las vuelve a generar. Las comparativas WebP son de revisión, no la entrada del cálculo numérico. Los informes preliminares y smoke están comprimidos en `pilot-reports.json.gz`; se pueden leer con `JSON.parse(gunzipSync(readFileSync(path)))` usando `node:fs` y `node:zlib`. No hay que mezclarlos con V3.
