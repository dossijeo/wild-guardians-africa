# Kofi joven: candidato facial editable

No instalado todavía en el catálogo del juego. Original preservado: a748ca0cea0d4d0d4abd95071577a8457e63f22433e618be77934c079f4cf89c.glb.

Fuente Blender con texturas empaquetadas hasta 2048; GLB web comprimido directamente desde la exportación de máxima resolución. Conserva 28 huesos y cuatro clips originales. Diez enlaces de morph: ocho correctivos de párpados y mouthOpen en piel e interior. Cavidad continua, lengua y dientes; tres draw calls en la herramienta Three.js.

Reconstrucción: add_actor_eyelids.py con youngMale/eyelid-profile.json → prototype_worker_jaw.py con mouth-closeup-landmarks.json → add_worker_oral_cavity.py. Pasar siempre el original a --source-glb para restaurar los canales nativos al exportar. La fuente portable conserva geometría; sus texturas reducidas no sustituyen la exportación de máxima resolución usada para el GLB publicado.

Evidencia y límites: docs/guardian/phase2/face-authoring/youngMale. Se han revisado muestras de carrera, alerta, salto y caída; esto no equivale a aprobar todos los fotogramas. Pendiente integración y eventos reales de huida/golpe. La boca debe permanecer cerrada durante el trabajo normal.

## Corrección de uniones faciales

Aplicar repair_worker_face_material.py después de la cavidad. El color original permanece intacto: las manchas poligonales procedían principalmente del mapa de normales. La cabeza usa un material sin ese mapa, rugosidad 0.82 y normales suaves por posición coincidente, sin soldar ni mover vértices. El cuerpo conserva su material y relieve. Coste observado: cuatro draw calls en lugar de tres; GLB 5,309,848 bytes (+5,012). Pruebas: comparación unlit/sin normales, renders frontales/tres cuartos y neutral/dolor en Three.js; 164 poses de animación pasan la auditoría.
