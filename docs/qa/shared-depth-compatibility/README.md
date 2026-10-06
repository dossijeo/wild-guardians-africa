# Compatibilidad de profundidad compartida por captura

Sobre `35ba81f`, se reutiliza la decisión de compatibilidad de cada material Standard/Basic conocido dentro del mismo recorrido de preparación. La receta ya se sincronizaba una vez por fuente; antes se repetía la comprobación de rasterización por cada mesh que la compartía. El Map local guarda ahora receta y compatibilidad. Se descarta al terminar la captura: cambios de side, flags, mapas o compile hooks se vuelven a comprobar en la siguiente. Los `customDepthMaterial` authored mantienen su comprobación individual, incluso compartiendo fuente con otros propietarios.

No cambia elegibilidad, orden, geometría, shader o render. La restauración sigue en finally. Alpha y lotes vacíos experimentales permanecen apagados por defecto. Esta reducción de comprobaciones sí se aplica a la preparación estándar de producción; no equivale a activar el candidato alpha.

28 pruebas dirigidas pasan, incluyendo múltiples propietarios, refresco al cambiar side/polygon offset/hook, authored incompatibles individuales, guardas y restauración ante errores. Build correcto: 204 módulos, 9,32 s; advertencia habitual de bundle >500 kB.

## CPU nativa aislada

Manglares/Mapungubwe, semilla 712, escena pausada. Comparación A/B/B/A entre función anterior congelada de QA y función actual; ambas con alpha=true, filtro de vacíos=false, mismas selecciones y restauraciones. Veinte llamadas de calentamiento y veinte muestras de 25 llamadas por lote. Callback de dibujo vacío: excluye renderer/GPU y no es una medida de FPS. Sin ediciones ni tests/builds propios mientras medía; dos campañas congeladas siguieron activas.

| Lote | Función | Mediana por 25 llamadas (ms) |
| --- | --- | ---: |
| A1 | Anterior | 21,50 |
| B1 | Actual | 14,70 |
| B2 | Actual | 14,10 |
| A2 | Anterior | 18,50 |

Ahorro ~31,6 % y ~23,8 % por pares; ~0,272/~0,176 ms por captura. Todos preparan 903 specialized, 25 fallback, 842 alpha aceptados, cero emptySkipped. Estado lógico y referencias/flags de material conservados. No presentar esta cifra como ahorro GPU o FPS, ni como coste medido de la configuración de producción con alpha=false.

## Profundidad e imagen

Seis renders nativos N/N/G/B/B/N, donde N es shader nativo completo, G salvaguarda actual, B alpha experimental. Catorce pares de 1.440.000 píxeles de profundidad no constante: cero diferencias, tanto intacto como colapso visual controlado 85 %. Sin errores ni cambios lógicos. Un trabajador `arriving` real cargado y mijo a crecimiento cero, sin incursión ni VFX de trabajo activo. No cubre todas las poses/biomas/culturas/efectos/móvil.

Color intacto, pares N1/N2 · N2/G · G/B1 · N2/B1 · B1/B2 · B2/N3 · N2/N3: 0 · 17 · 31 · 14 · 14 · 21 · 21 píxeles. Colapso: 24 · 44 · 73 · 55 · 48 · 11 · 18. También cambian controles de la misma ruta; no se atribuye su causa a esta reutilización ni se declara igualdad de color global. La [traza previa de cámara](../static-camera-color/README.md) descarta deriva de cámara en aquella secuencia, pero aún faltan otros inputs.

[CPU completa](cpu.json), [intacto](intact.json), [colapso](collapse.json), [captura](collapse.png) y [fuentes/hashes](proof.json). Pendiente: variación de color y aceptación amplia del candidato alpha; coste integrado de esta reutilización y optimización del dibujo final.
