# Contraejemplo de profundidad alpha en Volcanes

Base c8d48c9, Volcanes/Mapungubwe, semilla 712, calidad media; centro/brote/contratación pagados. Reloj pausado, trabajador llegando, cultivo en crecimiento cero, sin ataque ni VFX de trabajo. Se comparan seis renders N1/N2/G/B1/B2/N3: receta nativa completa, guardas de producción y alpha especializado en un recorrido. Framebuffer real 1600×900, 1.440.000 píxeles.

Tres secuencias (inicial, recarga independiente y repetición con shaders calientes) reproducen tres diferencias de profundidad en B1/B2 y B2/N3. N1/N2, N2/G, G/B1, N2/B1 y N2/N3 coinciden exactamente. Por tanto **no existe equivalencia de toda la secuencia**. B2 cambia tres valores respecto a B1/nativo; no se atribuye todavía su causa a geometría, shader, orden o estado de GPU.

Coordenadas de readback GL (origen inferior izquierdo): (635,790), (633,791), (631,792). En la repetición el canal azul cambia 146→185, 152→192 y 158→199; delta máximo de profundidad desempaquetada 0,0000024437904357910156. Valores completos y cámaras/preparaciones están en repeat.json; la repetición caliente queda en warm.json.

El color también cambia entre controles nativos: 21/43/41 píxeles N1/N2 y 21/22/52 N2/N3 en las tres secuencias. No se declara identidad visual ni se explica esa variación mediante el resultado de profundidad. Estado lógico conservado y consolas sin errores/avisos. No se midieron CPU/GPU/FPS/RAM ni se probó móvil, noche o colapso.

La cabecera de la fixture anterior mostraba únicamente N2/B1 (cero), aunque el detalle conservaba las discrepancias. El nuevo resumen toma el máximo de todos los pares e incluye depthIdentical/affectedPairs; cuatro regresiones impiden ocultar una diferencia tardía o de control y rechazan readbacks vacíos/constantes. Pasan 22 pruebas dirigidas junto a profundidad/recetas. Se preserva la fixture inicial comprimida y los hashes actuales en proof.json. El candidato alpha continúa desactivado en gameplay. Siguiente paso: identificar el renderable/estado de los tres píxeles antes de integrarlo, sin elevar tolerancias para hacer pasar la prueba.

Un cuarto diagnóstico conserva explícitamente el orden de materiales originales en la pasada (original-order.json). La discrepancia se reduce a dos píxeles, pero persiste en B1/B2 y B2/N3; los controles nativos siguen coincidiendo en profundidad. Por tanto, conservar ese orden no basta para corregirla. No se capturó una consola independiente de este cuarto diagnóstico; el informe de página registra cero errores. No se elevó tolerancia ni se activó el candidato.
