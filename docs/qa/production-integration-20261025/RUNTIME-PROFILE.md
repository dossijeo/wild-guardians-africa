# Selección aprobada en partidas normales

La aplicación opta explícitamente por el perfil aprobado al crear WorldScene. Antes de conocer el bioma usa la receta común para cielo/precarga; cada mundo conserva su propia cadena de opciones y al recibir el estado añade solo las opciones de su bioma. No modifica la URL ni usa una variable global de bioma activo. Los consumidores aislados y controles QA conservan el comportamiento explícito anterior.

AfricanToon ya no especializa reflejos al importar el módulo: captura la receta y su clave de programa por instancia. Las dos especializaciones atmosféricas se comparten de manera inmutable. Agua, edificios/destrucción, terreno cercano y lejano reciben la selección del mismo dueño. Manglares selecciona holly y fixed512; el informe de cobertura identifica holly-fronds en lugar de arrastrar la etiqueta de la geometría sustituida.

## Evidencia inicial, no cierre de integración

- 28 pruebas: perfil, aislamiento por instancia, comparación de shaders de objetos/agua/destrucción en seis biomas, cielo, grupos de instancias y HDR.
- 65 pruebas adicionales: edificios, helechos, agua natural, horizonte, propiedad de vegetación lejana, perfiles y cielo de carga.
- verify:browser-syntax pasa.
- Renderer real: mangrove-normal-smoke.json/.png y mangrove-review-smoke.json/.png. Chrome 1280×720, calidad media, fixture poblado congelado, misma cámara/tiempo. URL de producción vacía; control con receta histórica explícita. Ambos cargan pthreads y 25 tiles fixed512, 35.209.000 bytes reportados por la caché. No es toda la VRAM del juego.
- 99,950195 % de píxeles idénticos, MAE RGB 0,000741/255. Cobertura total 1.972 instancias en ambos; clasificación cerca/lejos 1.526/446 frente a 1.525/447. Capturas inspeccionadas: helechos, musgo/barro localizado, agua y sombras conservados. La retirada de cupped no restaura hojas redondas; applyHollyFern reemplaza las geometrías.
- Sin errores de página no relacionados con el shader; aparecen 22 avisos ANGLE X4000 sobre environment4. Deben revisarse dentro de la validación general, no silenciarse.

Estas ejecuciones NO son un benchmark A/B de carga: corrida fría/caliente y carga externa no controladas; no atribuir los tiempos 40,3/30,2 s al cambio. No se midió GPU en estos smoke. La simulación está pausada tras cargar. El harness intercepta código para fixture, observación y pausa; no activa recetas gráficas. Aún falta arranque UI intacto/build publicado, día/noche, seis biomas y pruebas de streaming/calidad/cancelación.

## Reproducción

PowerShell, servidor Vite en 5190, desde el worktree:

```powershell
$env:WG_THREAD_PORT='5190'
$env:WG_THREAD_BIOME='manglares'
$env:WG_THREAD_QUALITY='media'
$env:WG_THREAD_FROZEN='1'
$env:WG_THREAD_BENCH='1'
$env:WG_THREAD_FRAMES='60'
$env:WG_THREAD_DISTANCE='0'
$env:WG_PRODUCTION_PROFILE_MODE='production' # repetir con review
$env:WG_THREAD_REPORT='docs/qa/production-integration-20261025/repeat-production.json'
node tools/experiments/check-approved-production-profile.mjs
```

La primera corrida usó una copia local del mismo harness; la segunda registra su SHA256. El harness compartido tenía cambios de diagnóstico preexistentes sin publicar, que no se han incluido en este commit. El wrapper guardado usa un ancla existente en HEAD y no depende de esos cambios para observar la selección. Las pruebas Node locales usaron el loader existente de wild-three porque falta el build de Three en node_modules; queda pendiente validar dependencias limpias oficiales y distribución.
