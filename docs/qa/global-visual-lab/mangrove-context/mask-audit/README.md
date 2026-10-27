# Máscaras reales: no calibrar Manglares con el generador JS antiguo

Auditoría en campaña real: semilla712, calidad media, sesión espacial activa, objetivo [60,4.22,0], 25 chunks cargados. Extrae uGroundMask desde los materiales enlazados, no reconstruye una máscara hipotética. [Canales](channels.png) · [Estadísticas](summary.json) · [Bytes y metadatos](masks.json).

| Canal | Mínimo | P10 | Mediana | P90 | Máximo |
|---|---:|---:|---:|---:|---:|
| R cobertura | 5 | 116 | 235 | 245 | 245 |
| G variación amplia | 13 | 72 | 129 | 175 | 240 |
| B humedad | 137 | 150 | 159 | 218 | 250 |
| A desgaste | 0 | 0 | 0 | 0 | 240 |

Valores RGBA8 de 0 a255. Las 30.625 muestras incluyen bordes duplicados, agua y terreno fuera de pantalla: no son porcentajes de superficie terrestre visible. La visualización usa el núcleo32×32 de cada textura35×35 para evitar repetir bordes; presenta x creciente a la derecha y z creciente hacia abajo, sin normalizar contraste por canal. La cuadrícula se escala por vecino más cercano deliberadamente para mostrar los datos, no el filtrado lineal del shader.

## Hallazgo que cambia la siguiente implementación

El generador JS groundSample417 limita la cobertura wetland a0.42. La campaña espacial recibe bytes del worker WASM; el código nativo buildGroundMask utiliza para Manglares una fórmula compartida de cobertura que llega a0.96, coherente con el máximo observado245/255. No se pueden intercambiar sus rangos al elegir umbrales de mezcla. El material actual puro ignora todos estos canales, y la rama contextual probada los combina con humedad y especular, por lo que aquella prueba no aislaba cobertura.

La imagen muestra variación espacial útil en G y B, con R mayormente elevado; A concentra zonas de asentamiento. Esto justifica probar una mezcla visual controlada que use variación/humedad junto a desgaste, en vez de aplicar literalmente R como fracción de musgo. No justifica modificar el generador del motor ni convertir humedad directamente en brillo. Debe mantenerse la semántica del motor y adaptar solo el material experimental.

## Límites

Una semilla, una región, solo chunks cercanos mapeados. No se auditó el horizonte sin máscara, otras semillas, navegación ni el rango de todos los biomas. No cambia el resultado visual del juego ni es un benchmark. La siguiente candidata aún debe implementar y validar mezcla de materiales reales, continuidad con horizonte, día/noche y coste. La auditoría no aprueba la ruta contextual descartada.

## Reproducción

Vite5190:

```powershell
node tools/experiments/audit-mangrove-context-masks.mjs
python tools/experiments/package-mangrove-context-masks.py
```

Se conserva la escena original y se leen máscaras ya existentes. Sin cambios de motor, simulación, modelos ni main.
