# Profundidad de helechos cercanos: coste activo

## Decision

Conservar candidato QA sin promover aun. Reutilizar profundidad de sombra cercana reduce coste por captura de mundo en las cuatro parejas (0.105–0.251ms), pero el fotograma completo/cadencia es mixto. No es solucion principal al coste acumulado de Manglares. No seguir simplificando arte para perseguir este ahorro pequeno. La equivalencia de profundidad anterior permanece documentada por separado.

## Metodo

Sobre12a47980f. Intel UHD/ANGLE1280x720/media,fixture712,camera normal movil8m. A/B/A/B dia/noche; nueva pagina y misma fixture por registro. LOD nativo, viento, geometria y densidad iguales. Solo QA cambia worldDepthCompatible del material de profundidad cercano. Lejano intacto. Tres ventanas separadas por registro: GPU completa, GPU por pasada, cadencia;60 calentamiento+60 muestras cada una.480 consultas completas validas, consultas de pasadas sin perdida/disjoint/overflow; cero errores registrados. Auditor confirma inicio de simulacion y secuencias de camara iguales.

Simulacion en tiempo real: diferentes estados finales y cargas dinamicas. La captura de profundidad diurna es condicional; su frecuencia no equivale a coste de shader. Se informa coste por captura ademas del fotograma completo. No readback de pixeles durante las mediciones.

|Variante|Fase|GPU completa ms|Intervalo ms|p95 ms|Capturas profundidad/60|GPU por captura ms|
|---|---|---:|---:|---:|---:|---:|
|base|day|27.009|32.735|48.9|43|3.603|
|base|night|26.691|36.063|43.4|60|3.633|
|fast|day|26.342|33.822|39.5|25|3.415|
|fast|night|26.183|37.343|43.3|60|3.42|
|base|day|25.974|35.83|44.4|23|3.437|
|base|night|26.498|37.35|46.5|60|3.647|
|fast|day|24.239|33.847|40.8|28|3.332|
|fast|night|28.027|36.318|42.5|60|3.396|

Por captura: dia -0.188/-0.105ms; noche -0.213/-0.251ms. GPU completa: dia -0.667/-1.735ms; noche -0.508/+1.529ms. Cadencia: dia +1.087/-1.983ms; noche +1.280/-1.032ms. No extrapolar el ahorro de pasada a FPS globales. Estados/cargas distintos y ventanas independientes impiden atribuir todo el delta a la modificacion.

Se conservan ocho capturas finales, no son pares pixel-equivalentes al evolucionar el mundo. La prueba de silueta controlada esta en fern-depth-equivalence-20261023. Sin modificacion del renderer nativo, simulacion ni main.

Reproducir con Vite5190:

```sh
node tools/experiments/measure-fern-depth-active-20261023.mjs
python tools/experiments/audit-fern-depth-active-20261023.py docs/qa/global-visual-lab/fern-depth-active-cost-20261023
```
