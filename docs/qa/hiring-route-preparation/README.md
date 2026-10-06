# Preparación de rutas durante contratación

El panel prepara en un worker las primeras consultas de navegación del equipo elegido mientras la simulación está pausada. Se aplica también a la contratación adicional. No se esperan resultados para confirmar: si no están listos o han cambiado el estado, la selección, la geometría o el encuadre, se utiliza la navegación habitual.

La preparación deserializa una copia, ejecuta la contratación y un paso de simulación en esa copia y devuelve únicamente cachés de navegación y rutas exitosas. No devuelve dinero, trabajadores, tareas, RNG ni eventos para sustituir el estado real. Las rutas se reutilizan solo ante una consulta exactamente equivalente y la misma versión de navegación. Límites: 128 rutas, 20.000 puntos, ocho chunks y las cachés acotadas existentes. Solo hay un trabajo pendiente; los cambios de selección conservan la última solicitud. Cerrar el panel o destruir la escena termina el worker.

## Verificación

- 265 pruebas ampliadas correctas de contratación, navegación, tareas, trabajadores, reloj, ciclo de vida, presupuesto, audio de interfaz y agua.
- 46 pruebas dirigidas correctas. Incluyen contratación proporcional, cambios rápidos, respuestas obsoletas, fallos del worker y el error tardío de un worker ya cancelado.
- Seis biomas, apertura nativa de seed 712/Mapungubwe: ocho semillas pagadas y dos trabajadores pagados; 2.000 pasos de 0,05 s por caso. El estado serializado completo coincide en cada paso con la misma partida sin preparación. No se inyectan ingresos ni riegos. La comparación preserva también cualquier limitación de accesibilidad previa del terreno.
- La comparación adicional de Sabana verifica 600 pasos de 0,05 s después de ampliar el equipo a mitad de jornada. El caso inicial comprueba menos búsquedas reales y primer riego efectuado por trabajadores.
- Navegador integrado, aplicación real y worker de módulo real: nueva partida Sabana/Mapungubwe, centro de 800, brote de cinco y hombre mayor de 30. Saldo 695 → 665; respuesta aceptada y utilizada, sin worker vivo tras confirmar; el brote recibe su primer riego manual mediante trabajo físico. Después, contratación adicional de mujer joven por 29 monedas proporcionales: saldo 665 → 636, dos trabajadores y segundo resultado utilizado. Evidencia en `native-production.json`, `native-additional.json` y capturas.
- Build correcto, incluyendo `hiring-route-worker` como asset relativo. Paquete web: 587 archivos, 388.197.992 bytes, 859 enlaces relativos y 20 GLB distribuidos.

## Alcance y límites

La prueba de navegador es de escritorio en formato horizontal, con base de guardados aislada y audio silenciado. No acredita móvil físico, RAM, FPS ni ausencia de todos los tirones. La contratación adicional observada ya tenía el primer cultivo regado: prueba el protocolo y el cobro real, no una nueva ruta de riego en ese instante. Las pruebas de simulación cubren la igualdad de navegación y tareas.

La copia serializada y la transferencia de cachés tienen coste; solo se solicitan al cambiar la selección, no cada frame. Las rutas nuevas posteriores siguen calculándose por la ruta ordinaria. La mejora no sustituye la optimización pendiente de esas búsquedas.

Durante esta apertura horizontal, la indicación 3D del primer centro quedó inicialmente fuera del encuadre y fue necesario desplazar la cámara. Revisar el encuadre automático de la guía en una siguiente corrección de tutorial; esta preparación no modifica cámaras ni manos.
