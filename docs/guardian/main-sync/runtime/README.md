# Revalidación gráfica tras integrar main

Fecha: 2026-10-28. Rama `codex/guardian-3d-animation`, motor integrado desde main `d0382bd4d`.

## Fixture y concurrencia

La fixture anterior alternaba Grow y Multiply sobre una sola planta, incompatible con las reglas agrícolas actuales. Ahora planta doce cultivos mediante comandos reales, busca destinos válidos mediante `previewSpell` y conserva sus efectos activos. Registra destino y posición de cada lanzamiento. La ráfaga de seis órdenes a intervalos de 180 ms terminó sin errores, en seis plantas diferentes, con un máximo de un Guardián visible (`crop-burst.json`).

El ensayo sigue siendo controlado: reinicia recargas para forzar concurrencia. Sólo los medidores borran áreas mágicas entre muestras. No sirve como prueba del equilibrio económico ni de una incursión completa. Los controles explican estas condiciones.

La grabación diurna recorre Grow/Multiply, cambio de ángulo, zoom y dos órdenes cercanas en el tiempo. Los seis comandos terminaron sin errores y sin Guardianes residuales (`day.json`, `day.mp4`).

## Coste específico de las invocaciones

Intel UHD integrada, ANGLE/D3D11, 1600×900, pixel ratio 1. Veinte bestias visibles en fixture; navegación y físicas de impacto no se avanzan en este ensayo. Misma secuencia Attack cada 600 ms, ocho bloques ABBA/BAAB, 1,2 s de calentamiento y 4 s medidos por bloque. Ningún fotograma oculto. Se compara desactivar únicamente la presentación del Guardián con activarla; el resto de la escena permanece.

| Medida | Sin presentación | Con presentación |
|---|---:|---:|
| Mediana de FPS medios de los cuatro bloques | 27,71 | 24,15 |
| Rango de p95 de fotograma | 49,91–50,02 ms | 66,49–66,56 ms |
| Draw calls p95 | 83 | 96 |
| Actualización de animación del Guardián p95 | 0 | 0,14–0,22 ms |
| Actualización VFX del Guardián p95 | ~0,005 ms | 0,435–0,550 ms |

Esto es una regresión observada en esta prueba; no se declara satisfactoria. No diagnostica los problemas de fluidez anteriores ni atribuye la diferencia a una causa concreta.

Una segunda prueba intercalada de 240 fotogramas, mundo y pose congelados a 0,12 s del ataque, utilizó consultas GPU asíncronas. Medianas GPU: sin Guardián 23,609 ms; sólo cuerpo 23,917 ms; sólo efectos 23,577 ms; conjunto 24,319 ms. La diferencia del conjunto es +0,710 ms en esa pose. No basta para explicar la diferencia de FPS anterior ni cubre el clímax, desaparición o ragdoll. Los percentiles no se restan como si fueran muestras emparejadas. Los JSON completos se conservan para repetir y ampliar el análisis.

Pendiente: medir otras fases y repeticiones comparables, aislar la regresión específica sin alterar el motor general, evaluar memoria y el ciclo físico completo, y revisar de cerca todas las especies/obstáculos. La fase 2 sigue incompleta.

## Revisión visual y limitaciones de la grabación

El contacto diurno muestra las apariciones al lado de los cultivos, la diferencia de color verde/violeta, el cambio de encuadre y la desaparición. La saturación de los anillos merece revisión artística de cerca: en esta iluminación se ven muy blancos. Esta hoja no prueba por sí sola la naturalidad temporal de la tela.

La primera grabación nocturna quedó cortada en recuperación: `night-truncated.json` conserva 14 cuerpos físicos y fase `recovering`. Se preserva como evidencia rechazada. La herramienta usaba una espera de nueve segundos reales y después desactivaba la simulación; con fotogramas lentos avanzaba menos tiempo simulado. Ahora espera a que terminen todos los estados de derribo, con límite de 90 segundos reales y error explícito. Esto corrige la captura de QA, no cambia la recuperación del juego.

La repetición corregida (`night.mp4`, 25,57 s; `night.json`) completa seis comandos —Attack y Shield—, cambios de cámara/zoom e impactos repetidos. Termina sin errores, con máximo de un Guardián y cero cuerpos físicos o estados de derribo activos. La hoja `night-contact.png` muestra escudo, ataques y caída; las reacciones de especies pesadas requieren todavía revisión próxima de naturalidad. La grabación no certifica colisiones con todas las estructuras ni el equilibrio de combate.

## Agrupación de materiales faciales

Se descartó la hipótesis de una doble pasada del vórtice: `ShaderMaterial` ya configura `forceSinglePass=true` en esta versión de Three.js. El cambio redundante fue retirado. `gpu-impact-before.json` y `gpu-impact-after.json` son repeticiones sin una optimización efectiva entre ellas; su variación no demuestra mejora.

La optimización implementada agrupa los cuatro materiales planos de boca interior, dientes, lengua y párpados en una sola primitiva con `COLOR_0` lineal. El material del Guardián en el mundo ahora respeta colores de vértice. No se simplifica ni elimina geometría. El Blender conserva sus materiales editables; `finalize_glb.py` aplica automáticamente `batch_face.py` después de la exportación. El script rechaza materiales incompatibles y conserva los morph targets dispersos al leerlos; elimina los buffers no referenciados al escribir.

La auditoría `audit_face_batch.py` compara el export previo con el resultado. Pasan 472 comprobaciones exactas de geometría, índices, normales, tangentes, UV, pesos, articulaciones, morphs y animaciones, además de los colores con precisión FLOAT. La referencia está en el GLB del commit `fce2d9df7`; las huellas están en `face-batch-parity.json`. El GLB pasa de 2.694.836 a 2.765.144 bytes (+70.308 bytes por los colores y los morphs empaquetados), y de seis a tres primitivas. No se modifica la fuente original ni el Blender editable.

Validación real:

- WorldScene, impacto a 0,30 s: sólo cuerpo pasa de 89 a 86 draw calls; conjunto pasa de 96 a 93, con fondo constante de 83. `gpu-face-batched.json` y `face-batched.png`.
- Laboratorio Three.js: 84 aserciones aprobadas, incluyendo los nueve visemas, parpadeos, mirada, capas corporales, duración de los 54 audios y reproducción/seek ES/EN. `face-batch-browser.json`. La foto `face-batched-viseme-d.png` muestra apertura D y materiales.
- 13 pruebas Node específicas aprobadas; compilación y paquete aprobados: 993 archivos / 495.011.229 bytes.
- Validador glTF: cero errores y dos advertencias de jerarquía de mallas con skin. La jerarquía no cambió; se conserva el informe completo.

La reducción de draw calls es verificable. Los tiempos GPU entre ejecuciones siguen teniendo demasiada variación para atribuir una ganancia de FPS al cambio. No se da por corregida la regresión previa. El selector GPU ahora permite congelar llegada, impacto, estabilización y desaparición; en esta iteración se ejecutó el impacto, las dos fases posteriores siguen pendientes.
