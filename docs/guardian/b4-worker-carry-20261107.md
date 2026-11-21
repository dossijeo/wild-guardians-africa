# Transporte de cajas de trabajadores

La reparación normal se resuelve al llegar al objetivo, sin fase de animación `Dig`; no se modificó la mecánica para crearla. En su lugar, el Worker gráfico solicita bajo demanda el clip `Carry_Crate` para cada perfil. El banco incluye el esqueleto y las nueve mallas rígidas de la caja con la misma fase. El rig CPU sigue siendo alternativa cuando no están listos el recurso o su admisión; una admisión tardía comprueba la identidad y propiedad de la caja antes de publicar.

El historial captura `crateId` y `carryPhase`; un intervalo móvil solo se certifica si la caja sigue vinculada al trabajador, las muestras y la trayectoria son continuas y la animación GPU está disponible. Recogida, entrega, caída y cambios de portador invalidan el tramo previo. Las cajas sueltas siguen bajo el roster de cajas confirmadas, y las transportadas se dibujan una sola vez como parte del trabajador.

Las pruebas comparan las nueve mallas con el rig CPU para los cuatro perfiles, comprueban selección y generación WGSL, y ejecutan con Wild Engine/WASM movimiento, entrega y caída de caja frente a una autoridad de referencia. No hay aún comparación visual en dispositivo ni medición de rendimiento o memoria GPU. Los cuatro bancos ocupan 208.736 bytes cada uno; `node tools/guardian/build-worker-gpu-walk.mjs --clip=Carry_Crate --check` verifica su reproducibilidad.
