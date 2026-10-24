# Gran Cañón: depósitos con mapas de arena

**Candidata para continuar, no aprobada para integración.** Sustituye la arena plana del piloto de composición por Diffuse y normal GL de Aerial Beach 01. La vista cercana diurna inspeccionada muestra ondulaciones reconocibles; las crestas destacan demasiado en sombra. Faltan vista normal/elevada, coste temporal y validación del ciclo de recursos antes de adoptar.

[Grava / candidata](media-day-2-pair.webp) · [Pareja nocturna](media-night-2-pair.webp)

## Receta

Mismo campo de depósitos que canyon-sediment (ruido mundial .10/.27, pesos .75/.25, smoothstep .32–.62 y máscara de suelo plano). Mapas de arena a 30 m por repetición, rotación igual para color y normal, sin POM propio. Pigmento (1,.83,.59), intensidad normal .65 atenuada por huella de píxel. Mezcla máxima .90. Rugosidad .98 y AO de arena neutro, sin multiplicación duplicada. Conserva grava y su POM en la capa subyacente; todavía calcula ese POM incluso donde domina arena. No se ha implementado mezcla de alturas o estratificación física.

BiomeGround carga dos clones en layerTextures y usa sus uniformes existentes. El propietario dispone ya de liberación de layerTextures, pero este piloto no ha verificado eventos de dispose ni streaming prolongado. No afirmar ausencia de fugas por inspección de código. Ruta QA desactivada por defecto.

## Evidencia y coste pendiente

24 capturas reales, 12 parejas, semilla712, 1280×720, media/baja, día150/noche350, tres posiciones cercanas despejadas. Auditoría: cámara, objetivo, hora, llamadas y triángulos idénticos; sin errores. Inspección artística de la candidata cercana media diurna; la matriz no sustituye revisión visual de cada encuadre ni representa cámara normal de juego.

Dos lecturas de textura adicionales por fragmento de terreno de cañón (también se calculan en pendientes aunque la máscara anule su contribución) en esta implementación, además de dos evaluaciones de ruido y mezclas. Dos mapas 1024²: estimación nominal conjunta 10.67 MiB RGBA8 con mipmaps, no VRAM medida; caché y clones pueden aumentar residencia. Archivos y hashes en resources.json. No se ha ejecutado benchmark GPU/CPU; no existe aprobación de rendimiento. No añade geometría, draw calls ni pasadas.

## Fuente

Recursos CC0 existentes: [Poly Haven, Aerial Beach 01](https://polyhaven.com/a/aerial_beach_01), Rob Tuytel. Procedencia y descargas documentadas previamente en ../desert-aerial-sand/asset-audit.json. No se crean ni descargan recursos nuevos. El Diffuse se sirve desde el directorio QA; antes de integrar habría que trasladarlo al catálogo de assets y verificar empaquetado.

```powershell
node tools/experiments/capture-canyon-sand-maps.mjs
python tools/experiments/package-canyon-sand-maps.py
```

Vite5190. PNG fuente locales; pares, recursos y trazas publicados. Main, siluetas y simulación intactos. Próxima puerta: comparar cámara normal y elevada, corregir respuesta en sombra sin borrar relieve y medir ABBA en Intel UHD si supera revisión artística.
