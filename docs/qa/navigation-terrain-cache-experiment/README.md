# Experimento de caché de terreno en navegación — no incorporado

Referencia: main 6a8c1f5. Se perfiló `node --cpu-prof --cpu-prof-dir=.cache --cpu-prof-name=integrated-navigation-6a8c1f5.cpuprofile tools/check_integrated_load.mjs --warm-navigation --trace`. El perfil conserva la trayectoria del escenario nativo: 1630 pasos, 161 búsquedas, hash `9ea59d5816db79085aafff2ec796d4322ab680afde6209555befa8d0baf0fd54`.

La agregación de muestras por función señala consultas de terreno como parte considerable del trabajo de rutas: terrainValid ~962 ms acumulados, slope ~677 ms y surface ~567 ms en esta ejecución. Son tiempos inclusivos solapados, no deben sumarse ni interpretarse como frametime. El diagnóstico serializa y calcula hashes en cada paso; esa verificación también consume CPU. El archivo de perfil original se conserva comprimido.

## Candidato descartado

`candidate.patch` implementa una caché FIFO de 8192 consultas exactas de terreno nativo, sin redondear coordenadas, separada de obstáculos y con invalidación por identidad del campo. Campos sintéticos o con métodos sustituidos quedan fuera. La prueba de seis biomas compara 11520 combinaciones y sus repeticiones con las consultas originales; 75 pruebas dirigidas aprobadas, además de la suite ampliada archivada. No acredita móvil, GPU ni todas las rutas de todas las culturas.

Tres pares de procesos secuenciales alternados conservan exactamente la trayectoria. La caché reduce evaluaciones de 33638 a 20827. Sin embargo, los picos siguen cerca de medio segundo en los primeros pares, y el último par muestra variabilidad considerable por carga concurrente del equipo. No hay evidencia suficiente de una mejora consistente del tiempo de fotograma que justifique añadir memoria y mantenimiento al runtime.

Por eso se retiró el candidato de `src` y de la herramienta integrada. Los dos archivos JS aquí son únicamente el test y benchmark experimentales, archivados para reproducirlos aplicando el parche y copiándolos a sus ubicaciones originales; no son parte de la suite del juego ni se distribuyen. La optimización de colas de cultivos del commit de referencia sí permanece incorporada.

## Siguiente prioridad

Repartir entre pasos la búsqueda completa de rutas utilizada al reservar tareas y al empezar huidas/ataques. Debe conservar FIFO, no permitir contactos ni riego antes de llegar físicamente, respetar cambios de obstáculos y restauración, y verificarse en escenarios nativos además de los tests de geometría. El perfil confirma que los picos siguen sin resolver; esta nota no acredita esa futura implementación.
