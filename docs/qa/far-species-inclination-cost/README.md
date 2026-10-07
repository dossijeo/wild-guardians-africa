# Baobab: inclinación y coste del puente 3D

Fuente 75f1fab, Sabana/Mapungubwe/media, semilla 712. Árbol 0:-6:-4 a 220 m horizontales y elevación de cámara 21,84°. La banda ampliada 200–240 m afecta solo al baobab; otras especies mantienen 120–160 m. Los seis pares elevados día/noche comparan modelo, sprite y transición con cámara idéntica y atlas original de ocho vistas / elevación de horneado 8°. No se acredita equivalencia de contorno/color por estos controles ni aceptación artística.

ABBA nocturno terminal, 120 muestras por lote, 45 de calentamiento; cuatro lotes con estado exacto, 480 consultas GPU resueltas, cero disjoint y GL0. GPU mediana: 4,0616 → 10,2476 → 10,2784 → 4,5631 ms. Llamadas: 14 → 19; triángulos: 53.762 → 303.025. Resultado negativo; deriva A1/A2 de +12,35%. El piloto mantiene recursos de atlas al desactivarse A y no acredita memoria de una sesión que nunca cargó impostores. Las campañas CPU preexistentes 40968/41304 permanecieron como carga de fondo; no hubo otra escena ni benchmark/build raíz durante los cuatro lotes.

La continuidad funcional no justifica activar esta variante: falta desglosar el puente y evitar su geometría innecesaria sin romper readiness, identidad ni cámara libre. OFF en el juego normal; sin recomendación de activación ni ganancia FPS. Los estimados RGBA+mips son contabilidad de texturas, no medición del driver.
