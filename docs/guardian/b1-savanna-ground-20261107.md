# Suelo de sabana WebGPU Worker

El perfil Worker prepara el atlas de sabana y aplica el detalle sobre el color de vértice confirmado, usando la máscara de cobertura y desgaste de cada chunk. Conserva el desplazamiento de atlas ligado a la semilla nativa, el relieve, normales, sombra y entorno mediante el mismo esquema de residencia y admisión que el suelo volcánico. Si no puede preparar el proveedor se informa y se conserva el suelo de vértice anterior.

La fórmula TSL traslada la rama de sabana de `groundMaterial417`; la iluminación del proveedor aún no incluye el AO de contacto. Las pruebas verifican ciclo de vida, máscaras independientes y generación WGSL sin dispositivo. Falta contrastar color, relieve, iluminación, carga y rendimiento en partida con GPU real. No se declara paridad visual ni mejora de FPS.
