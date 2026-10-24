# Ambiente volcánico tras reemplazo de chunks

Original frente a opción integrada volcanicNight=ambient; media,semilla712,1280x720,día150/noche350. Ruta0→z96→z192→0 repetida dos veces por fase.32 capturas,16 parejas verificadas en cámara/objetivo/hora/chunks/draws/triángulos, sin errores. Sombras se actualizan al viajar.

[Regreso nocturno final](night-7-pair.webp): control izquierda, opción derecha. La comparación revisada mantiene la lectura adicional del suelo tras reconstruir los chunks. No cambia geometría ni modelos.

En regresos3 y7:25 chunks,110 geometrías en ambas variantes,53 texturas en control y51 en candidata, iguales entre regresos de cada fase. La distinta residencia no es ahorro VRAM atribuible al ajuste, que no cambia texturas; no se mide memoria física. Sin crecimiento observado en este recorrido acotado, no garantía de ausencia de fugas a largo plazo.

Tiempo combinado carga/render/auditoría: control día12.3–770.4ms,noche11.7–759.9ms; candidata día10.5–714.4ms,noche10.2–696.4ms. Incluye pasos ya cargados y carga asíncrona; no es frametime ni benchmark de FPS. No atribuir mejora de streaming a estos rangos. Los chunks se esperan antes de cada captura: falta movimiento continuo durante carga.

[Benchmark integrado](../volcanic-night-integrated-20261021/performance/README.md) sigue sin aprobación temporal por variabilidad. Mantener opción, preservar resultado artístico y resolver esa incertidumbre antes de promoverla. El objetivo global sigue abierto.

```text
node tools/experiments/trace-volcanic-night-streaming-20261021.mjs
python tools/experiments/audit-volcanic-night-streaming-20261021.py
```

Vite5190. PNG locales; diez parejas representativas y todos los metadatos publicados.
