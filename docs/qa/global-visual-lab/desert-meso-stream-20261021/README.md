# Arena: streaming y retorno con origen flotante

Seis parejas off/on de sandMeso=1, Desierto, semilla 712, media, 1280×720, día/noche. Recorrido asentado desde aldea a 192 unidades y regreso. El objetivo de cámara se desplaza con la cámara y fuerza rebases. No es vídeo continuo ni benchmark.

Las parejas activada/desactivada coinciden en cámara, objetivo, hora, chunks, origen, calls y triángulos. El retorno recupera las mismas claves de chunks y cámara; calls 44 y triángulos 221404 en ambos extremos. No errores capturados.

De día el origen pasa 0→240→48; de noche 48→240→48. La imagen nocturna regresa exactamente igual en ambas variantes. La diurna tiene diferencias mínimas: original 981 píxeles cambiados y candidata 984, con 18 píxeles por encima de 8 niveles en ambos casos. Error medio normalizado aproximado 0.00000259 y 0.00000262. La discrepancia ocurre también sin la capa y coincide con origen inicial/final distinto; no se ha aislado su causa y no se atribuye concluyentemente a precisión numérica.

Inspección de la hoja diurna: no se aprecia desplazamiento de la capa al regresar; la zona lejana mantiene el relieve simulado sin cambiar siluetas. Esta evidencia cubre un recorrido y dos iluminaciones, no todos los cambios de origen ni estabilidad temporal completa. Pendientes movimiento continuo, recorrido prolongado/fugas y coste GPU. Mantener opción experimental desactivada por defecto.

Reproducir capture-desert-meso-stream-20261021.mjs y audit-desert-meso-stream-20261021.py con Vite 5190, Pillow y numpy. PNG regenerables, metadatos, auditoría y hojas publicados. Main intacta.
