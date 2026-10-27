# Gran Río: irregularidad sobre la máscara residente

**Candidato QA no promovido.** La copia visual de la máscara nativa sí llega al terreno y a la cobertura. Introduce pequeñas irregularidades en el contorno, pero el claro circular sigue dominando y se pierde cobertura en su periferia. La inspección de las vistas normales media diurna y nocturna no justifica integrar esta receta.

[Antes / candidata, día](gran-rio-media-day-pair.webp) · [Noche](gran-rio-media-night-pair.webp)

## Implementación y alcance

`riverFringeMask` copia los bytes al crear la DataTexture de BiomeGround. Conserva RGB y nunca reduce alfa/desgaste. Aplica un incremento máximo .20 en la banda de desgaste .04–.60, con ruido interpolado en celdas mundiales de 4 m. Semilla de ruido fija 712 para este piloto; no se ha validado variación de semilla. Interiores con desgaste >=.60 y suelo con desgaste cero permanecen exactos. Las franjas de caminos pueden ensancharse: no se afirma preservación exacta de su anchura visual. Al no reducir desgaste, no habilita nuevas hojas en superficies previamente excluidas. Ocupación, agua y pendiente conservan sus exclusiones independientes.

Es una transformación de presentación; no escribe la memoria nativa ni consulta navegación. Terreno y cobertura leen la misma copia. No hay nuevas texturas de detalle, samplers, pasadas o modelos. La selección de instancias cambia, por lo que no es una comparación de geometría idéntica ni una prueba de aceleración.

## Evidencia

24 capturas / 12 parejas, seed 712, 1280×720, baja/media, día150/noche350, tres cámaras. Cámara, objetivo y hora iguales; sin errores ni overflow. Contador positivo obligatorio antes de guardar cada captura candidata: 633 texeles modificados acumulados, 25 máscaras creadas al primer encuadre y 35 al llegar a noche. Son eventos acumulados, no conteo de texeles únicos del mundo.

Reducción de triángulos enviados por pose: media 3.224 / 5.380 / 11.992; baja 1.264 / 1.728 / 1.560, igual de día y noche. Se registran conteos completos en comparison.json. No medir esta disminución como mejora de rendimiento: dibuja menos cobertura. Sin benchmark GPU/CPU, vídeo, streaming prolongado ni aceptación artística de todas las vistas.

Prueba automatizada del transformador: conserva entrada/RGB, desgaste monótono, extremos protegidos, solape exacto de tres columnas entre chunks contiguos para seis valores de desgaste. Es una prueba sintética de coordenadas e invariantes, no validación completa de streaming real.

## Reproducción

```powershell
node tools/experiments/check-river-fringe-mask.mjs
node tools/experiments/capture-river-fringe-mask.mjs
python tools/experiments/package-river-fringe-mask.py
```

Vite 5190. Opción `fringeMask` falsa por defecto en helper QA. Producción/main intactos. El siguiente diseño debe mejorar la continuidad de la franja sin limitarse a retirar hojas: este resultado no cumple por sí solo el objetivo global.
