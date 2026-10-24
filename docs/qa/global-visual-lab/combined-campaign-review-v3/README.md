# Revisión conjunta V3: seis biomas

[Conjunto diurno](six-biomes-day.webp) · [Conjunto nocturno](six-biomes-night.webp).

El objetivo global sigue incompleto. Esta revisión reúne las mejoras conservadas para localizar las carencias que dominan la imagen, sin aprobar el conjunto por haber pasado comprobaciones técnicas.

## Condiciones y variantes

Campañas reales seed712, calidad media1280×720, día150/noche350, tres cámaras (normal, elevada y reversa),72 capturas/36 parejas. Simulación pausada, materiales y viento congelados, chunks asentados. A conserva la receta V2; B añade paleta de cobertura del Gran Río, canyonSand=1 y volcanicAsh=procedural. Ambos usan cobertura continua C/viento8 en Sabana y Río, wear feather del Río, warm-floor del Cañón, barro/musgo QA en Manglares y sandRelief=1 en Desierto. Grava del Cañón .08 en ambos.

Sabana/Manglares/Desierto son controles sin cambios A/B. No son comparaciones con el juego predeterminado. No se incluye suelo V2 del Río, atenuación de POM enterrado ni máscaras de depósitos descartadas. Cámara elevada sustituye la antigua oblicua para esta ronda; no atribuir diferencias frente a rondas antiguas al material sin igualar cámaras.

Auditoría completada:36 parejas con cámara, objetivo, hora, draws y triángulos iguales; cobertura near/far/buffers iguales y sin overflow. Sin errores registrados. Manglares y Desierto controles RGB exactos; Sabana residual máximo MAE0.00000760/255. Los cambios RGB de los otros biomas no son por sí solos evidencia de mejora.

## Revisión artística

Inspección: mosaicos normal día/noche de los seis biomas; imágenes normales completas de Río y Volcanes; mockup original de Volcanes vuelto a consultar. No equivale a inspección completa de las72 imágenes o comparación exhaustiva de cada mockup.

- Sabana: cobertura con volumen y separación de sombra visible; todavía hay transición amplia hacia suelo plano. Sin cambio A/B en este pase.
- Gran Río: la cobertura forma una superficie continua en primer plano. La paleta no elimina el claro amplio y uniforme alrededor del poblado. Sigue siendo una prioridad visual.
- Gran Cañón: arena y grava se distinguen y aparecen ondulaciones; falta revisar continuidad temporal y aceptar expresamente el coste cercano antes de promover a valor por defecto.
- Manglares: musgo demasiado repetitivo, con formas similares distribuidas por casi toda la superficie. Los círculos de suelo desnudo refuerzan el aspecto de patrón. Prioridad del siguiente experimento: romper repetición y organizar cobertura sin modificar reglas de ocupación ni siluetas.
- Volcanes: ceniza separa zonas lisas y rugosas, pero genera masas planas demasiado evidentes. El mockup tiene continuidad de estructura rocosa y acumulaciones; no se alcanza solo con contraste o color. No declarar alcanzada esa calidad.
- Desierto: ondulaciones y calidez legibles; no hay mejora nueva en esta ronda. No demuestra equivalencia artística global.

De noche se conservan edificios reconocibles; Río y Volcanes pierden lectura de suelo en zonas oscuras. El mosaico orienta prioridades, no permite certificar detalle fino nocturno.

## Coste y límites

No benchmark nuevo durante las capturas. Se mantienen costes y limitaciones de cada experimento: arena cercana +0.23/+0.54ms GPU día en Intel UHD, ceniza y barro con sus informes previos. No sumar o restar cifras de ejecuciones distintas para anunciar rendimiento del conjunto. Calidad baja no se repitió aquí. No hay validación de campañas completas, streaming de todo el conjunto o movimientos en este pase. No cambios a main.

## Reproducción

```powershell
node tools/experiments/capture-combined-campaign-review-v3.mjs
python tools/experiments/package-combined-campaign-review-v3.py
```

Vite5190. [Registros](captures.json), [comparaciones](comparison.json). PNG y WebP individuales completos locales; pares normales y mosaicos publicados. Referencias originales indexadas en ../ART-REFERENCES.md.
