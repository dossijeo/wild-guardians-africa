# Desierto: relieve residual en suelo desgastado

QA conserva45% de normales en desgaste máximo, frente a15% del control: normalAmount=.65*up*(1-wear*.55), antes wear*.85. No modifica intensidad de arena intacta, color, máscaras, geometría ni reglas. El desgaste sigue reduciendo relieve; no se pretende cubrir caminos con dunas intactas.

12 capturas reales, semilla712,media,1280x720,tres cámaras,día150/noche350. Seis parejas verificadas: cámara, objetivo, hora, draws y triángulos idénticos; sin errores. [Día normal](day-0-pair.webp), [noche normal](night-0-pair.webp), [día elevado](day-1-pair.webp). Control izquierda, candidata derecha.

La vista diurna normal revisada muestra ondulaciones suaves recuperadas entre edificios sin perder calidez ni contraste con terreno intacto. Los claros siguen uniformes y las áreas en sombra carecen de respuesta direccional fuerte: no confundirlo con ausencia del mapa normal. Conservar como candidata, no declarar resuelta toda la variedad del suelo. Pendientes valoración nocturna detallada, movimiento y perfiles bajos.

No añade lecturas de textura, instancias, geometría ni pasadas. Contadores de captura iguales no prueban coste temporal idéntico: falta benchmark GPU/CPU de esta variante. No integrada. Mantener original y medir antes de promover.

```text
node tools/experiments/capture-desert-wear-relief-20261021.mjs
python tools/experiments/package-desert-wear-relief-20261021.py
```

Vite5190. PNG locales, parejas y metadatos publicados. Ningún cambio en edificios o atlas.
