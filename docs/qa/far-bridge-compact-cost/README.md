# Puente compacto: subidas exactas, coste aún negativo

Fuente 1d1d79a, Sabana/Mapungubwe/media, semilla 712. Pose nocturna elevada idéntica a los controles previos: baobab a 220 m, transición 200–240 m solo para él; resto 120–160 m. Cámara libre de otras escenas GPU y de builds/benchmarks raíz durante ambos ABBA; campañas históricas 40968/41304 vivas. No es una muestra CPU de sistema vacío.

La compactación conserva las matrices preparadas originales y empaqueta solo filas visibles en los mismos buffers. En la pose inicial: 15 filas positivas, cero filas ocultas; puente 19.475 triángulos y total 93.477. Lectura real de buffers de atributos durante los dibujos: matrices y fades 15/15 exactos, ID→fila lógico 15/15. Los IDs no están codificados en GPU: la identidad se verifica contra la fila canónica CPU y su matriz GPU. La órbita nocturna y aproximación de 20 s no pierden readiness del objetivo; readbacks finales 19/19 y 5/5 exactos. Se conservan también los descensos globales y sus clasificaciones en las trazas completas, sin excluirlos del agregado.

ABBA con suelo: GPU medianas 4,601249 → 8,159010 → 8,587604 → 4,495469 ms. 480 consultas, disjoint 0, estado exacto, errores/GL 0. La reducción geométrica no basta: permanece un sobrecoste y no se acepta la variante por rendimiento.

Control separado ocultando solo el suelo lejano: 4,582474 → 6,639947 → 8,245677 → 4,574505 ms; total del candidato 67.468 triángulos. 480 consultas válidas, estado exacto, GL 0. Conserva puente, impostores y backdrop. La deriva entre B1/B2 y las diferencias entre ensayos impiden atribuir todo el coste al suelo. Este aislamiento no es una propuesta visual final.

Las capturas y trazas gzip mantienen los resultados completos por fuente. Normal gameplay sigue OFF, sin PR de integración aceptada ni promesa de FPS. Pendiente aislamiento del coste restante, visuales del horizonte y validación final de la variante que llegue a aceptarse.
