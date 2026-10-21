# Transición por cobertura: resultado limitado

Seis parejas reales de Manglares media, semilla 712, 1280×720, cámaras normal/elevada/cercana, día/noche. Control: hojas con material toned. Candidata: crecimiento geométrico multiplicado por smoothstep(0.10, 0.48, cobertura). Sin alpha blending, nuevas muestras de textura ni cambios de densidad. Cámara, objetivo, hora, instancias, triángulos y bytes de buffers verificados iguales. Sin errores WebGL/página.

[Comparación diurna](comparison-day.jpg) y [nocturna](comparison-night.jpg). La diferencia es pequeña y persiste la frontera principal. No promover como solución del borde. Se conserva para diagnóstico; no se descarta por rendimiento.

El código también excluye posiciones con cortes binarios de desgaste (>0.25 y comprobaciones periféricas >0.27), pendiente (>0.42), agua y ocupación. El factor de cobertura no atenúa esos cortes. Falta atribuir qué exclusión domina cada tramo del borde mediante visualización diagnóstica; no afirmar que se ha identificado espacialmente la causa solo por leer estos umbrales. Siguiente paso: medir proximidad al límite admisible conservando las exclusiones, para reducir tamaño de hojas desde el interior de la región.

Coste geométrico conservado: 92088/112256/114736 triángulos de cobertura, dos draw calls y 1203376 bytes de atributos/índices en las tres cámaras. Se añade únicamente smoothstep y multiplicación en vertex shader; no se han medido GPU, FPS ni overdraw. Crecimiento menor puede cambiar fragmentos cubiertos sin alterar estos contadores. Persisten limitaciones de streaming, LOD y movimiento del prototipo anterior.

Reproducir con Vite 5190: `node tools/experiments/capture-mangrove-leaf-edge-20261021.mjs` y `python tools/experiments/package-mangrove-leaf-edge-20261021.py`. Láminas y metadata publicadas; PNG completos locales regenerables. Sin cambios de producción ni de main.
