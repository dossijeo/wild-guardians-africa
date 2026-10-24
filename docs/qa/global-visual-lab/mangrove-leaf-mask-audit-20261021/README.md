# Diagnóstico espacial de exclusiones

Región real de Manglares centrada en (76,-28), 48×48 unidades, rejilla regular de 96×96 muestras. Se reutiliza la función de rechazo del selector QA; cada punto registra el primer motivo, no todos los motivos simultáneos. No equivale al conjunto de instancias con jitter. [Mapa](mask.png): verde admisible, naranja desgaste, amarillo margen de desgaste, azul agua.

5703 admisibles, 3076 desgaste, 114 margen, 323 agua. Ningún punto se clasifica primero como cobertura, pendiente u ocupación. El desgaste domina la exclusión de esta región; no generalizar a todo el bioma. El agua utiliza cajas conservadoras y conserva bordes rectos.

La extracción del clasificador mantiene las seis imágenes exactamente iguales a la variante anterior (equivalence.json, día/noche y tres cámaras). Sin errores. No cambios de producción ni de reglas.

Reproducción: capture-mangrove-leaf-mask-audit-20261021.mjs y package-mangrove-leaf-mask-audit-20261021.py, en tools/experiments. Vite 5190. La segunda compara PNG regenerables con mangrove-leaf-edge-20261021.
