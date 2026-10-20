# Ocultación cercana: sustituir la cuadrícula por MSAA

Primera prueba de la propuesta del usuario de suavizar las transiciones. **No adoptar alpha-to-coverage 4× como solución final.** Elimina la cuadrícula ordenada8×8 de obstructionMaterial, pero dispone de pocos niveles de cobertura y puede mantener demasiado opacos los objetos cercanos. No equivale a un fundido continuo.

## Qué se probó

Ruta QA de color: conserva nativeVisibility y su evolución temporal, sustituye el descarte Bayer por alpha de diffuseColor, y activa material.alphaToCoverage. Mantiene discard por debajo de0,002. No modifica distancias, modelos, geometría ni reglas de ocultación. El contexto real devuelve4 muestras MSAA en las16 capturas.

Sabana baja,semilla712,1280×720, cuatro posiciones del recorrido, día/noche. Izquierda A original; derecha B MSAA. Cámara/objetivo/hora y cobertura de hierba iguales. Draw calls y triángulos coinciden por pose; sin errores registrados. Vista normal idéntica en ambos periodos porque no interviene una ocultación parcial relevante.

- [Ocultación cercana de día](day-0009-pair.webp): desaparece el tramado, pero cambia la percepción de opacidad de copas y vegetación próxima.
- [Vista más oblicua](day-0017-pair.webp).
- [Misma pose de noche](night-0009-pair.webp).

[Datos](captures.json), [diferencias](comparison.json). Los deltas RGB grandes son esperables por cambiar la representación; no son una medida de calidad. Inspección visual principal: pose9 diurna. No hay benchmark de CPU/GPU de esta candidata, porque el resultado artístico y la cuantización ya impiden recomendarla como solución completa. No se afirma ahorro de rendimiento.

## Límites y siguiente candidata

Far vegetation está desactivada en esta prueba. No evalúa el cambio impostor/modelo3D. La receta de profundidad secundaria mantiene el comportamiento anterior: efectos que consultan profundidad y contextos sin MSAA siguen sin validar. No activar esta ruta en producción.

Investigar por separado:

1. Ocultación cercana: mantener las instancias opacas en su lote habitual y fundir solo las que se están ocultando. Debe medirse el coste de clasificación, ordenación, overdraw y posibles errores de profundidad; no hacer transparente todo el mundo.
2. Impostores: coordinar la transición de las dos representaciones para evitar siluetas dobles. Cambiar solo la opacidad de una de ellas no demuestra una transición correcta.

Las diferencias residuales de las comparaciones anteriores no se atribuyen causalmente al dithering solo por observarlo; esta es una investigación artística distinta.

## Reproducción

Vite5190: `node tools/experiments/capture-obstruction-msaa.mjs`, después `python tools/experiments/package-obstruction-msaa.py`. Original por defecto; solo interceptación QA.
