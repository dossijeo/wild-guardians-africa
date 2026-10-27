# Arena seca: integración opcional

La receta ya se puede abrir en el juego con `?visualLab=global-lighting&sandRelief=1`. Sin ambos parámetros, conserva el comportamiento anterior. Solo se sustituye la normal del Desierto; no añade geometría, draw calls ni pasadas.

BiomeGround carga el PNG mediante Assets, crea su clon con filtros propios y lo libera por la ruta de dispose existente. No carga primero la normal sustituida ni necesita ejecutar helpers en el navegador. La identidad de programa distingue la receta; AfricanToon aplica el mismo tratamiento a suelo residente y horizonte. La implementación no cambia simulación, navegación, edificios ni otros biomas.

## Paridad artística

Doce capturas integradas y 24 controles actuales (original/helper): tres cámaras, día/noche y media/baja, campaña inicial real semilla712, 1280×720. Las doce parejas integración/helper coinciden en cámara, hora, draw calls y triángulos. Diez son RGB idénticas; dos vistas oblicuas nocturnas difieren en un único píxel/un nivel RGB. Sin errores HTTP/JS o WebGL al capturar. [Comparación](comparison.json), [metadatos integrados](captures.json), [metadatos de referencia](../integration-reference/captures.json).

Capturas: [día media](media-day-0.webp), [oblicua](media-day-1.webp), [noche media](media-night-0.webp), [noche baja](baja-night-0.webp). Los doce WebP son RGB sin pérdida y se verifican contra los PNG generados.

Once pruebas Node pasan: AfricanToon, iluminación global, luz del Desierto y nueva opción de arena. La prueba nueva cubre activación explícita, compilación de suelo/horizonte e identidad de programa; no reemplaza las capturas reales.

## Recurso y límites

Normal original Aerial Beach 01, Rob Tuytel/Poly Haven, CC0. [Fuente y licencia](../SOURCE.md). La copia pública conserva exactamente los bytes del PNG QA; SHA-256: 61d8b0051df9c8516555f9eddf1dfbaa57ffee734153da100606db818c82aaca.

No se afirma todavía ausencia de fugas en sesiones prolongadas ni streaming validado en esta nueva ruta. La gestión usa el propietario existente, pero requiere prueba de cierre, reapertura y nuevos chunks. Las métricas de la receta anterior están en [cadencia](../dry-specular/campaign-final/README.md); paridad visual no equivale a un nuevo benchmark completo de lifecycle. La opción permanece desactivada por defecto y la calidad global sigue pendiente.

## Reproducción

Vite5190, `WG_SAND_NATIVE=1`, `WG_SAND_OUTPUT=docs/qa/global-visual-lab/desert-aerial-sand/integration`, ejecutar `node tools/experiments/capture-desert-sand-settlement.mjs`.

Para referencia quitar WG_SAND_NATIVE, definir WG_SAND_STUDY=desert-sand-dry-specular y WG_SAND_OUTPUT=docs/qa/global-visual-lab/desert-aerial-sand/integration-reference. Ejecutar el mismo capturador y luego `python tools/experiments/compare-desert-sand-integration.py`.
