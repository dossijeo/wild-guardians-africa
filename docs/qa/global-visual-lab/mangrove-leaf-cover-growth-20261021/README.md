# Manglares: prueba de crecimiento por cobertura sin efecto visible

Seis parejas reales,semilla712,media,1280×720,cámaras normal/elevada/inversa,día/noche. Control helper stream V10; candidata cambia exclusivamente smoothstep(.10,.48,coverageData.z) por smoothstep(.10,.28,coverageData.z). Mantiene todas las exclusiones de desgaste,agua,pendiente yocupación, así como módulos e instancias.

Resultado negativo: seis parejas exactamente idénticas píxel a píxel. No promover ni atribuir mejora al cambio de umbral. Instancias near1/0/138 yfar452/1847/190;triángulos3648/14776/5936. Cámaras,horas,geometría,buffers iguales,sin errores. No benchmark GPU porque no hay beneficio artístico observado; igualdad de imágenes no prueba igualdad de coste.

La prueba no identifica por sí sola la causa de invisibilidad: las muestras visibles pueden estar fuera del intervalo modificado o no contribuir por distancia/oclusión. La muy baja presencia cercana en cámara normal justifica diagnosticar espacialmente los rechazos en esta misma región antes de alterar más el crecimiento. No relajar exclusiones de caminos o edificios sin evidencia.

Capturas comparison-day.jpg ycomparison-night.jpg,metadata captures.json,diferencias difference.json. Reproducir scripts capture/package del mismo nombre con Vite5190. Candidata archivada experimentalmente; V10 no cambia. Objetivo global pendiente.
