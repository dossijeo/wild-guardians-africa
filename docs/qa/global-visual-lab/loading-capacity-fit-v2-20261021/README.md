# Jardín completo: capacidad, crecimiento y encuadre

Se llenó la capacidad original de **18 plantas** mediante la API de presentación, con distribución determinista dentro del radio y separación existentes. No se cambian reglas, modelos, capacidad ni simulación.

32 pares base/fit V2: progreso 15/40/75/100 %, horizontal 1280×720 y vertical 390×844, día 150/noche 350, sombras on/off. Semilla 712, movimiento reducido. Las cámaras cambian deliberadamente para estudiar encuadre; no comparar rendimiento como si fueran idénticas. Sombras originales, no el filtro de cuatro muestras descartado.

## Hallazgo y corrección experimental

La cámara fija del pase de cinco plantas no cubre el jardín lleno: una raíz fuera del viewport horizontal y cuatro en vertical. El primer fit alejaba la cámara pero conservaba niebla 18–28, haciendo casi invisible la plantación vertical. V2 desplaza la zona de encuadre horizontal hacia arriba y traslada las distancias de niebla con la cámara.

V2 calcula una envolvente conservadora alrededor de las posiciones, con margen lateral .55 y altura 2.7. Mantiene la dirección de vista y encaja ese volumen fuera del cartel. Recalcula cuando cambia aspecto, número de plantas o dirección de cámara; no cambia geometría. Todos los pares conservan progreso, plantas y triángulos; cero raíces fuera de pantalla y cero errores JS/WebGL. Las capturas maduras horizontal diurna y vertical nocturna se revisaron visualmente. El test de raíces NO prueba por sí solo que todas las hojas encajen en cualquier orientación.

| Progreso | Triángulos estáticos por frame, sombras cacheadas |
| --- | ---: |
| 15 % | 20608 |
| 40 % | 26602 |
| 75 % | 64582 |
| 100 % | 96694 |

Seis draws en esas capturas. Estos contadores incluyen el diorama completo; la caché evita regenerar sombras en la captura fija. No representan coste con viento o durante crecimiento. No se midió CPU/GPU en esta prueba de encuadre y capacidad.

## Estado y límites

Candidata QA, no integración final. La presentación vertical completa ocupa menos pantalla, compromiso necesario con esta vista y distribución. Pendiente suavizar cambios de distancia al plantar, probar rotación y confirmar encuadre cercano con cuatro plantas. También falta adaptar el mensaje de ayuda al alcanzar capacidad: el harness todavía muestra la invitación a plantar aunque haya 18 plantas. No se valida el flujo real de carga/cancelación ni recuperación de recursos.

La primera variante fit queda rechazada por ocultación con niebla; V2 conserva la legibilidad sin eliminar las sombras. No afirmar alcanzada la dirección artística global.

## Artefactos y reproducción

Las cuatro hojas comparison-* muestran base a la izquierda y V2 a la derecha en las cuatro etapas. `captures.json` contiene los 32 resultados V2, `audit.json` comprueba invariantes frente a ../loading-capacity-20261021/captures.json. PNG completos de la etapa madura conservados para inspección; el resto se recrea.

Con Vite 5190: `node tools/experiments/capture-loading-capacity-20261021.mjs` para base; repetir con WG_LOADING_FIT=1 para V2. Después `python tools/experiments/package-loading-capacity-20261021.py`. Las herramientas reemplazan sus salidas. Usan el diorama real después de preparar una partida, sin medir tiempos reales de carga.
