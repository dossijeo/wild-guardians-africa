# Montañas HQ Sabana — candidato reflejado rechazado visualmente

Revisión independiente del 7 de octubre de 2026, rama `codex/far-hq-mountains`,
fuente/harness fijados en f6083dd1. Vite 5192, seed 712, Mapungubwe, calidad media,
IAB tab 692, cerrado tras disponer mundo. No había otra escena GPU durante QA;
no es benchmark y las campañas CPU originales seguían activas.

El candidato preserva 2048×512, un sampler, un draw de backdrop y el shader
existente; duplica las UV del cilindro y usa MirroredRepeatWrapping para resolver
la discontinuidad entre bordes de la fuente. Carga inicial y giros completos
diurno/nocturno concluyen sin errores JS/GL, con la simulación sin cambios según
el recibo exportado. Capturas originales conservadas y recibo completo gzip.

El relieve mejora claramente frente al fondo poligonal, pero **no se acepta
como solución final**: la imagen en `sabana-hq-seam180.png` muestra una mesa y
sus flancos exactamente bilaterales en el eje de reflexión. El empalme técnico
correcto no compensa esa composición artificial. También debe revisarse la
proporción: UV 0–2 distribuye un panorama 4:1 en media circunferencia del cilindro
de radio 430 y altura 110, una relación espacial aproximada 12,3:1. No atribuir
ausencia de deformación a la mera conservación de dimensiones del archivo.

Las fuentes, recetas y evidencia negativa quedan conservadas. El subagente
estudia composición por sectores/variantes y bordes compatibles dentro de la
bruma sin multiplicar innecesariamente el coste por fragmento. Aún no se han
revisado los otros cinco biomas en este harness ni se han promovido sus assets
públicos. No se cambia main para aprobar una costura a costa de naturalidad.
