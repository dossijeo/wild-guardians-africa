# Culling del puente: continuidad correcta, coste insuficiente

Fuente6ffd056/runtimefe243c0, pose elevada nocturna idéntica a la prueba anterior de Sabana (baobab220m, resto120–160m, media, Mapungubwe, semilla712). El frustum por árbol conserva la preparación y reduce303.024→273.986 triángulos. De199.984 del puente,19.475 pertenecen a15 instancias activas;180.509 siguen en filas interiores ocultas. No es una compacción completa.

ABBA terminal: GPU mediana4,3235 →10,9696 →12,6968 →4,8290ms. 480queries resueltas, disjoint0, estado exacto, errores0/GL0. La candidata no acredita mejora; deriva A1/A2 +11,69%. Los cambios de carga y variación no permiten atribuir directamente tiempos a los triángulos.

Órbita elevada nocturna completa20s después de repetir el recorrido (el benchmark borra la motion anterior): objetivo sin descensos, estado exacto, errores0/GL0. Se conservan los dos agregados de descensos globales, incluyendo todos los fuera del frustum. Las campañas40968/41304 seguían de fondo; sin otra escena ni benchmark/build raíz durante ABBA.

Pendiente compacción de subconjunto preparado con ID→fila y comprobación de los buffers realmente enviados. Normal gameplay OFF; no PR de integración aceptada ni promesa de FPS.
