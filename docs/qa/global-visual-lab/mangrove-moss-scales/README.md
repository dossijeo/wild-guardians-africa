# Musgo a dos escalas: mejora parcial, coste desproporcionado

**Descartar la mezcla doble en tiempo real.** Reduce la repetición de formas grandes, pero suaviza el volumen y añade aproximadamente1.81ms GPU diurnos y2.12ms nocturnos. Conservar la evidencia para estudiar una composición offline del material, no activar esta receta.

[Día](manglares-media-day-pair.webp) · [Noche](manglares-media-night-pair.webp).

## Receta y revisión

Rama real uGroundPureMoss: mezcla mapas Moss002 en escala original y3.7 veces más fina, sin rotación diferencial. Peso fino.18–.92, campo procedural world-locked frecuencia.065. Color, normal y ARH usan el mismo peso; normal interpolada renormalizada. Tres lecturas adicionales sobre los mismos mapas y un campo de ruido; no texturas, geometría o draws nuevos. No POM en esta rama. Barro toon-interior QA igual en control/candidata; ocupación autoritativa intacta.

24 capturas,12 parejas, media/baja1280×720, día150/noche350, seed712, cámaras normal/elevada/reversa. Cámaras,objetivos,hora,draws y triángulos iguales; sin errores registrados. Inspección de candidata normal diurna completa y pareja normal nocturna: disminuye el aspecto de filas de bultos, pero pierde relieve grueso y sigue pareciendo una cubierta uniforme. No alcanza acumulaciones y transiciones del mockup. No se afirma inspección completa de todas las imágenes.

## Benchmark directo

Intel UHD0x9A60, ANGLE D3D11, WebGL2, baja1280×720. A/B/A/B, páginas nuevas, día/noche por página,180frames de calentamiento,240muestras GPU y240frames CPU/cadencia separados por bloque. Cámara móvil determinista, simulación pausada, sin capturas simultáneas.1920 muestras GPU/1920frames verificados; cámaras/geometría/dispositivo/hora iguales, estado sin cambios, sin errores GL/disjoint/consultas perdidas o pendientes.

| Dos medias, ms | Control | Dos escalas |
|---|---:|---:|
| GPU día | 8.725 / 9.456 | 10.754 / 11.050 |
| GPU noche | 9.318 / 8.910 | 11.369 / 11.093 |
| CPU render día | 4.239 / 4.147 | 4.114 / 4.136 |
| CPU render noche | 4.203 / 4.262 | 3.989 / 4.150 |

GPU agrupada +1.812ms día (~19.9%),+2.117ms noche (~23.2%). Todas las parejas empeoran1.59–2.18ms. Dos medias no son intervalos de confianza. CPU menor no prueba optimización; hay variación y no aislamiento térmico/carga externa. Cadencia18.71–18.92ms,p95 48.6–50.2ms en ambas: no es presentación ni se atribuyen sus picos solo a esta receta. Uploads assetGroups5.4/frame iguales, no todo tráfico GPU. No VRAM medida. El coste adicional no se justifica por el cambio artístico parcial.

[Datos](performance/benchmarks.json), [resumen](performance/summary.json), [capturas](captures.json), [comparación](comparison.json).

## Siguiente dirección

Estudiar material reutilizable precalculado con variación de escala y composición, para preservar tres lecturas por fragmento. Evitar simplemente difuminar normales: el objetivo sigue siendo volumen y distribución natural. Esa alternativa todavía no existe ni tiene ahorro demostrado. Sin cambio de main, modelos, simulación ni renderer por defecto.

## Reproducción

```powershell
node tools/experiments/capture-mangrove-moss-scales.mjs
python tools/experiments/package-mangrove-moss-scales.py
node tools/experiments/measure-mangrove-moss-scales.mjs
python tools/experiments/audit-mangrove-moss-scales.py
```

Vite5190. Recursos Moss002 existentes, sin nuevas fuentes externas. PNG y WebP individuales locales; pares normales y registros publicados.
