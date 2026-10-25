# Azul de Sabana: atribución al asset original

Prueba real a 720p, calidad baja, fixture de Sabana pausada, receta actual, distancia de cámara 0. El harness captura antes y después de ocultar únicamente los grupos de color del slot 8, plant_02 (Hierba seca corta). No cambia terreno, texturas, shaders ni reglas. El filtro inicial por nombre falló; su failure.json se conserva y no cuenta como comparación.

Se inspeccionaron ambas capturas completas. Los detalles azules alrededor de las rocas desaparecen al retirar plant_02, sin descubrir huecos azules en el suelo. En el recorte [780,520,1080,720], el umbral de cian usado en la auditoría del atlas pasa de 145 a 0 píxeles. La inspección UV previa encuentra ese color en el atlas original del mismo asset.

Conclusión: en esta vista, los elementos investigados son parte del asset original, no un fallo de cobertura del terreno ni una regresión exclusiva de noche/calidad baja. No se afirma intención artística de sus autores. Conservar el modelo y cerrar esta sospecha; no recolorear ni eliminar vegetación por este diagnóstico.

Reproducción: capture-savanna-blue-isolation.mjs utiliza el harness existente con un hook temporal, sin modificar su archivo. WG_THREAD_PORT=5190, WG_CURRENT_REVIEW=1, WG_THREAD_BIOME=sabana, WG_THREAD_QUALITY=baja, WG_THREAD_FROZEN=1, WG_THREAD_RETAIN_APP=1, WG_THREAD_DEFAULT_STREAMING=1, WG_FRAME_SCHEDULER=1, WG_THREAD_BENCH=1, WG_THREAD_FRAMES=20, WG_THREAD_DISTANCE=0, WG_THREAD_REPORT a un archivo nuevo. El navegador se cierra al terminar. La prueba oculta solo la pasada de color y no es un benchmark ni una validación de sombras de un asset eliminado.
